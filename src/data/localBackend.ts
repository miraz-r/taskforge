/**
 * In-process backend — TEST SUPPORT ONLY.
 *
 * Implements `Backend` on top of the original browser-style repository so the
 * service layer's rules (validation, error shaping) can be exercised without a
 * server. Never wired into the running application.
 *
 * Hashing happens HERE rather than in the service, mirroring where it happens in
 * production: the server hashes, the client does not.
 */

import {
  Repository,
  BrowserStorage,
  MemoryStorage,
  type StorageDriver,
} from './repository'
import type {
  AuthOutcome,
  Backend,
  BackendComment,
  BackendNotification,
  BackendProject,
  BackendTask,
  BackendUser,
  BackendWorkspace,
  DashboardData,
  SearchHit,
  SessionOutcome,
  WorkspaceListOutcome,
} from './backend'
import { hashPassword, verifyPassword } from '../lib/password'
import { applyTheme, readStoredTheme, writeStoredTheme } from '../theme/storage'
import type { Theme } from '../domain/types'

export class LocalBackend implements Backend {
  private readonly repository: Repository
  private readonly latencyMs: number

  constructor(options: { storage?: StorageDriver; latencyMs?: number } = {}) {
    this.latencyMs = options.latencyMs ?? 0
    this.repository = new Repository({
      storage: options.storage ?? new MemoryStorage(),
      latencyMs: this.latencyMs,
    })
  }

  /**
   * Every operation crosses an asynchronous boundary, exactly as a real HTTP
   * call does.
   *
   * This is a property of the test double, not a delay added to production
   * code. Without it `listWorkspaces` would resolve within a single tick, the
   * loading state would never paint, and NFR-STATE-003 / AC-DATA-07 could not be
   * observed at all — a UI that can never show "loading" is a UI that has not
   * been tested for loading.
   */
  private async settle(): Promise<void> {
    if (this.latencyMs <= 0) return
    await new Promise<void>((resolve) => setTimeout(resolve, this.latencyMs))
  }

  /** Exposed so tests can assert on what was persisted. */
  get store(): Repository {
    return this.repository
  }

  private toUser(user: {
    id: string
    email: string
    displayName: string
  }): BackendUser {
    return { id: user.id, email: user.email, displayName: user.displayName }
  }

  private toWorkspace(workspace: {
    id: string
    name: string
    ownerId: string
    createdAt: string
  }): BackendWorkspace {
    return {
      id: workspace.id,
      name: workspace.name,
      ownerId: workspace.ownerId,
      createdAt: workspace.createdAt,
    }
  }

  async register(input: {
    email: string
    password: string
    displayName: string
  }): Promise<AuthOutcome> {
    await this.settle()
    const email = input.email.trim().toLowerCase()
    if (await this.repository.findUserByEmail(email)) {
      const error = new Error('duplicate')
      ;(error as Error & { code: string }).code = 'DUPLICATE_EMAIL'
      throw error
    }
    const created = await this.repository.insertUser({
      id: `usr_${crypto.randomUUID()}`,
      email,
      displayName: input.displayName.trim(),
      passwordHash: await hashPassword(input.password),
      createdAt: this.repository.timestamp(),
    })
    if (!created) {
      const error = new Error('duplicate')
      ;(error as Error & { code: string }).code = 'DUPLICATE_EMAIL'
      throw error
    }
    await this.repository.startSession({
      userId: created.id,
      issuedAt: this.repository.timestamp(),
    })
    return { user: this.toUser(created), csrfToken: null }
  }

  async signIn(input: {
    email: string
    password: string
  }): Promise<AuthOutcome> {
    await this.settle()
    const user = await this.repository.findUserByEmail(input.email)
    const ok =
      user !== null &&
      (await verifyPassword(input.password, user.passwordHash))
    if (!user || !ok) {
      const error = new Error('invalid credentials')
      ;(error as Error & { code: string }).code = 'INVALID_CREDENTIALS'
      throw error
    }
    await this.repository.startSession({
      userId: user.id,
      issuedAt: this.repository.timestamp(),
    })
    return { user: this.toUser(user), csrfToken: null }
  }

  async signOut(): Promise<void> {
    await this.settle()
    await this.repository.endSession()
  }

  async currentSession(): Promise<SessionOutcome> {
    await this.settle()
    const session = this.repository.getSession()
    if (!session) return { user: null, csrfToken: null }
    const user = await this.repository.findUserById(session.userId)
    return { user: user ? this.toUser(user) : null, csrfToken: null }
  }

  async listWorkspaces(): Promise<WorkspaceListOutcome> {
    await this.settle()
    const session = this.repository.getSession()
    if (!session) return { workspaces: [], owned: 0, limit: 2 }
    const memberships = this.repository
      .listMemberships()
      .filter((m) => m.userId === session.userId)
    const all = this.repository.listWorkspaces()
    const workspaces = memberships
      .map((m) => all.find((w) => w.id === m.workspaceId))
      .filter((w): w is NonNullable<typeof w> => w !== undefined)
      .map((w) => this.toWorkspace(w))
    return {
      workspaces,
      owned: all.filter((w) => w.ownerId === session.userId).length,
      limit: 2,
    }
  }

  async createWorkspace(name: string): Promise<BackendWorkspace> {
    await this.settle()
    const session = this.repository.getSession()
    if (!session) throw new Error('unauthenticated')
    const id = `wsp_${crypto.randomUUID()}`
    const created = await this.repository.insertWorkspace({
      workspace: {
        id,
        name: name.trim(),
        ownerId: session.userId,
        createdAt: this.repository.timestamp(),
      },
      membership: {
        userId: session.userId,
        workspaceId: id,
        role: 'owner',
        createdAt: this.repository.timestamp(),
      },
    })
    return this.toWorkspace(created.workspace)
  }

  // -- projects ------------------------------------------------------------

  private readonly projectRows: BackendProject[] = []
  private readonly taskRows: BackendTask[] = []
  private readonly commentRows: BackendComment[] = []
  /**
   * Local notification rows keep the owning user id, which the API response
   * deliberately omits — a notification is per-user data, so the wire format has
   * no reason to expose who it belongs to. The in-process store needs it to
   * reproduce the server's per-user scoping.
   */
  private readonly notificationRows: Array<
    BackendNotification & { userId: string }
  > = []

  async listProjects(
    workspaceId: string,
    state: 'ACTIVE' | 'ARCHIVED',
  ): Promise<BackendProject[]> {
    await this.settle()
    return this.projectRows.filter(
      (project) =>
        project.workspaceId === workspaceId && project.state === state,
    )
  }

  async createProject(input: {
    workspaceId: string
    name: string
    description?: string
    colourToken?: string | null
  }): Promise<BackendProject> {
    await this.settle()
    if (!this.workspaceBelongsToCurrentUser(input.workspaceId)) {
      throw notYours()
    }
    const now = new Date().toISOString()
    const project: BackendProject = {
      id: `prj_${crypto.randomUUID()}`,
      workspaceId: input.workspaceId,
      name: input.name.trim(),
      description: input.description ?? '',
      colourToken: input.colourToken ?? null,
      state: 'ACTIVE',
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    }
    this.projectRows.push(project)
    return project
  }

  async updateProject(
    projectId: string,
    patch: { name?: string; description?: string },
  ): Promise<BackendProject> {
    await this.settle()
    const project = this.projectRows.find((p) => p.id === projectId)
    if (!project || !this.workspaceBelongsToCurrentUser(project.workspaceId)) {
      throw notYours()
    }
    if (patch.name !== undefined) project.name = patch.name.trim()
    if (patch.description !== undefined) project.description = patch.description
    project.updatedAt = new Date().toISOString()
    return project
  }

  async setProjectArchived(
    projectId: string,
    archived: boolean,
  ): Promise<BackendProject> {
    await this.settle()
    const project = this.projectRows.find((p) => p.id === projectId)
    if (!project || !this.workspaceBelongsToCurrentUser(project.workspaceId)) {
      throw notYours()
    }
    project.state = archived ? 'ARCHIVED' : 'ACTIVE'
    project.archivedAt = archived ? new Date().toISOString() : null
    project.updatedAt = new Date().toISOString()
    return project
  }

  // -- tasks ---------------------------------------------------------------

  async listTasks(projectId: string): Promise<BackendTask[]> {
    await this.settle()
    const project = this.projectRows.find((p) => p.id === projectId)
    if (!project || !this.workspaceBelongsToCurrentUser(project.workspaceId)) {
      throw notYours()
    }
    return this.taskRows
      .filter((task) => task.projectId === projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async createTask(input: {
    projectId: string
    title: string
    description?: string
    priority?: BackendTask['priority']
    dueDate?: string | null
  }): Promise<BackendTask> {
    await this.settle()
    const project = this.projectRows.find((p) => p.id === input.projectId)
    if (!project || !this.workspaceBelongsToCurrentUser(project.workspaceId)) {
      throw notYours()
    }
    const now = new Date().toISOString()
    const task: BackendTask = {
      id: `tsk_${crypto.randomUUID()}`,
      projectId: input.projectId,
      title: input.title.trim(),
      description: input.description ?? '',
      stage: 'BACKLOG',
      priority: input.priority ?? 'NONE',
      assigneeId: null,
      dueDate: input.dueDate ?? null,
      createdAt: now,
      updatedAt: now,
    }
    this.taskRows.push(task)
    return task
  }

  async updateTask(
    taskId: string,
    patch: {
      title?: string
      description?: string
      stage?: BackendTask['stage']
      priority?: BackendTask['priority']
      dueDate?: string | null
    },
  ): Promise<BackendTask> {
    await this.settle()
    const task = this.taskRows.find((t) => t.id === taskId)
    if (!task) throw notYours()
    const project = this.projectRows.find((p) => p.id === task.projectId)
    if (!project || !this.workspaceBelongsToCurrentUser(project.workspaceId)) {
      throw notYours()
    }
    if (patch.title !== undefined) task.title = patch.title.trim()
    if (patch.description !== undefined) task.description = patch.description
    if (patch.stage !== undefined) task.stage = patch.stage
    if (patch.priority !== undefined) task.priority = patch.priority
    if (patch.dueDate !== undefined) task.dueDate = patch.dueDate
    task.updatedAt = new Date().toISOString()
    return task
  }

  // -- comments ------------------------------------------------------------

  async listComments(taskId: string): Promise<BackendComment[]> {
    await this.settle()
    return this.commentRows
      .filter((comment) => comment.taskId === taskId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  async addComment(taskId: string, body: string): Promise<BackendComment> {
    await this.settle()
    const task = this.taskRows.find((t) => t.id === taskId)
    if (!task) throw notYours()
    const session = this.repository.getSession()
    const comment: BackendComment = {
      id: `cmt_${crypto.randomUUID()}`,
      taskId,
      authorId: session?.userId ?? 'unknown',
      body: body.trim(),
      createdAt: new Date().toISOString(),
    }
    this.commentRows.push(comment)
    return comment
  }

  // -- search and dashboard ------------------------------------------------

  async search(projectId: string, query: string): Promise<SearchHit[]> {
    await this.settle()
    await this.listTasks(projectId) // re-runs the membership check
    const needle = query.trim().toLowerCase()
    if (needle === '') return []
    return this.taskRows
      .filter((task) => task.projectId === projectId)
      .filter(
        (task) =>
          task.title.toLowerCase().includes(needle) ||
          task.description.toLowerCase().includes(needle),
      )
      .map((task) => ({
        task,
        matchedIn:
          task.title.toLowerCase().includes(needle) &&
          task.description.toLowerCase().includes(needle)
            ? ('both' as const)
            : task.title.toLowerCase().includes(needle)
              ? ('title' as const)
              : ('description' as const),
      }))
  }

  async dashboard(projectId: string): Promise<DashboardData> {
    await this.settle()
    const tasks = await this.listTasks(projectId)
    const project = this.projectRows.find((p) => p.id === projectId)
    const order: BackendTask['stage'][] = [
      'BACKLOG',
      'IN_PROGRESS',
      'IN_REVIEW',
      'DONE',
    ]
    const labels: Record<BackendTask['stage'], string> = {
      BACKLOG: 'Backlog',
      IN_PROGRESS: 'In Progress',
      IN_REVIEW: 'In Review',
      DONE: 'Done',
    }
    return {
      projectId,
      projectName: project?.name ?? '',
      totalTasks: tasks.length,
      byStage: order.map((stage) => ({
        stage,
        label: labels[stage],
        count: tasks.filter((task) => task.stage === stage).length,
      })),
      dueSoon: 0,
      overdue: 0,
      isEmpty: tasks.length === 0,
    }
  }

  // -- notifications -------------------------------------------------------

  async listNotifications(): Promise<{
    items: BackendNotification[]
    unread: number
  }> {
    await this.settle()
    const session = this.repository.getSession()
    if (!session) return { items: [], unread: 0 }
    const mine = this.notificationRows.filter(
      (n) => n.userId === session.userId,
    )
    return {
      // Strip the internal owner field before it leaves the store.
      items: mine.map((row) => {
        const { id, kind, message, projectId, readAt, createdAt } = row
        return { id, kind, message, projectId, readAt, createdAt }
      }),
      unread: mine.filter((n) => n.readAt === null).length,
    }
  }

  async markNotificationRead(id: string): Promise<void> {
    await this.settle()
    const session = this.repository.getSession()
    const notification = this.notificationRows.find(
      (n) => n.id === id && n.userId === session?.userId,
    )
    if (notification) notification.readAt = new Date().toISOString()
  }

  /** Membership gate mirroring the server's workspace scoping. */
  private workspaceBelongsToCurrentUser(workspaceId: string): boolean {
    const session = this.repository.getSession()
    if (!session) return false
    return this.repository
      .listMemberships()
      .some((m) => m.userId === session.userId && m.workspaceId === workspaceId)
  }

  /** FR-AUTH-008, display name only. Avatar is deferred (design-system 10.4). */
  async updateDisplayName(displayName: string): Promise<BackendUser> {
    await this.settle()
    const session = this.repository.getSession()
    if (!session) throw new Error('unauthenticated')
    await this.repository.updateUser(session.userId, { displayName: displayName.trim() })
    const user = await this.repository.findUserById(session.userId)
    if (!user) throw new Error('no such user')
    return this.toUser(user)
  }

  readTheme(): Theme | null {
    return readStoredTheme()
  }

  writeTheme(theme: Theme): boolean {
    const ok = writeStoredTheme(theme)
    applyTheme(theme)
    return ok
  }
}

export { BrowserStorage, MemoryStorage }

/** Mirrors the server's 403: absent and not-yours are indistinguishable. */
function notYours(): Error {
  const error = new Error('You do not have access to that resource.')
  ;(error as Error & { status: number }).status = 403
  return error
}