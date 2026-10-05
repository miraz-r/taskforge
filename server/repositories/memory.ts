/**
 * In-memory store.
 *
 * Used by unit tests so that authorization and business rules can be verified
 * with NO database present. It satisfies the same `Store` interface as the
 * Prisma implementation, so tests exercise the real service code rather than a
 * parallel mock of it.
 *
 * It is NOT a production store and is never wired into `server/index.ts` — the
 * app factory receives a `Store` and the only production constructor is
 * `createPrismaStore`.
 */

import { randomUUID } from 'node:crypto'
import type {
  CommentRecord,
  MembershipRecord,
  NotificationKind,
  NotificationRecord,
  ProjectRecord,
  ProjectState,
  SessionRecord,
  TaskRecord,
  TaskStage,
  UserRecord,
  WorkspaceRecord,
} from '../domain/records'
import type {
  CreateProjectInput,
  CreateTaskInput,
  CreateUserInput,
  CreateWorkspaceInput,
  ProjectPatch,
  Store,
  TaskPatch,
} from './store'

export class MemoryStore implements Store {
  private readonly userRows: UserRecord[] = []
  private readonly sessionRows: SessionRecord[] = []
  private readonly workspaceRows: WorkspaceRecord[] = []
  private readonly membershipRows: MembershipRecord[] = []
  private readonly projectRows: ProjectRecord[] = []
  private readonly taskRows: TaskRecord[] = []
  private readonly commentRows: CommentRecord[] = []
  private readonly notificationRows: NotificationRecord[] = []

  constructor(private readonly now: () => Date = () => new Date()) {}

  // --- fixtures (tests only) ---------------------------------------------

  seedUser(input: CreateUserInput & { id?: string }): UserRecord {
    const user: UserRecord = {
      // A bare UUID, matching PostgreSQL's `User.id uuid` column.
      //
      // Only user ids need this. `assigneeId` is the one identifier a client can
      // send across the API boundary, and `updateTaskBodySchema` validates it as a
      // canonical UUID — so a prefixed id here would let a test assert behaviour
      // the real database rejects. Workspace, project and task ids are generated
      // server-side and never appear in a request body, so their prefixed form is
      // invisible to validation and is left alone.
      id: input.id ?? randomUUID(),
      email: input.email,
      displayName: input.displayName,
      passwordHash: input.passwordHash,
      createdAt: this.now(),
      updatedAt: this.now(),
    }
    this.userRows.push(user)
    return user
  }

  seedWorkspace(
    workspace: Omit<WorkspaceRecord, 'createdAt' | 'updatedAt'> & { id?: string },
  ): WorkspaceRecord {
    const record: WorkspaceRecord = {
      ...workspace,
      id: workspace.id ?? `wsp_${randomUUID()}`,
      createdAt: this.now(),
      updatedAt: this.now(),
    }
    this.workspaceRows.push(record)
    return record
  }

  seedMembership(
    membership: Omit<MembershipRecord, 'createdAt'>,
  ): MembershipRecord {
    const record: MembershipRecord = { ...membership, createdAt: this.now() }
    this.membershipRows.push(record)
    return record
  }

  seedProject(input: CreateProjectInput & { id?: string }): ProjectRecord {
    const record: ProjectRecord = {
      id: input.id ?? `prj_${randomUUID()}`,
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description,
      colourToken: input.colourToken,
      state: 'ACTIVE',
      archivedAt: null,
      createdAt: this.now(),
      updatedAt: this.now(),
    }
    this.projectRows.push(record)
    return record
  }

  seedTask(
    input: CreateTaskInput & { id?: string; stage?: TaskStage },
  ): TaskRecord {
    const record: TaskRecord = {
      id: input.id ?? `tsk_${randomUUID()}`,
      projectId: input.projectId,
      title: input.title,
      description: input.description,
      stage: input.stage ?? 'BACKLOG',
      priority: input.priority,
      assigneeId: input.assigneeId,
      dueDate: input.dueDate,
      createdAt: this.now(),
      updatedAt: this.now(),
    }
    this.taskRows.push(record)
    return record
  }

  /** Row counts, so a test can assert that nothing extra was written. */
  counts(): Record<string, number> {
    return {
      users: this.userRows.length,
      sessions: this.sessionRows.length,
      workspaces: this.workspaceRows.length,
      memberships: this.membershipRows.length,
      projects: this.projectRows.length,
      tasks: this.taskRows.length,
      comments: this.commentRows.length,
      notifications: this.notificationRows.length,
    }
  }

  // --- Store interface ----------------------------------------------------

  readonly users = {
    findByEmail: async (email: string): Promise<UserRecord | null> =>
      this.userRows.find((u) => u.email === email) ?? null,

    findById: async (id: string): Promise<UserRecord | null> =>
      this.userRows.find((u) => u.id === id) ?? null,

    insert: async (input: CreateUserInput): Promise<UserRecord> => {
      if (this.userRows.some((u) => u.email === input.email)) {
        throw new Error('duplicate email')
      }
      return this.seedUser(input)
    },

    setPasswordHash: async (id: string, hash: string): Promise<void> => {
      const user = this.userRows.find((u) => u.id === id)
      if (!user) throw new Error('no such user')
      user.passwordHash = hash
      user.updatedAt = this.now()
    },

    updateOwnProfile: async (
      userId: string,
      patch: { displayName: string },
    ): Promise<UserRecord> => {
      const user = this.userRows.find((u) => u.id === userId)
      if (!user) throw new Error('no such user')
      user.displayName = patch.displayName
      user.updatedAt = this.now()
      return user
    },
  }

  readonly sessions = {
    findByTokenHash: async (tokenHash: string): Promise<SessionRecord | null> =>
      this.sessionRows.find((s) => s.tokenHash === tokenHash) ?? null,

    insert: async (session: Omit<SessionRecord, 'id'>): Promise<SessionRecord> => {
      const record: SessionRecord = { ...session, id: `ses_${randomUUID()}` }
      this.sessionRows.push(record)
      return record
    },

    findById: async (sessionId: string): Promise<SessionRecord | null> =>
      this.sessionRows.find((s) => s.id === sessionId) ?? null,

    revoke: async (sessionId: string): Promise<void> => {
      const session = this.sessionRows.find((s) => s.id === sessionId)
      if (session && !session.revokedAt) session.revokedAt = this.now()
    },

    revokeAllForUser: async (userId: string): Promise<void> => {
      for (const session of this.sessionRows) {
        if (session.userId === userId && !session.revokedAt) {
          session.revokedAt = this.now()
        }
      }
    },
  }

  readonly workspaces = {
    findById: async (id: string): Promise<WorkspaceRecord | null> =>
      this.workspaceRows.find((w) => w.id === id) ?? null,

    listByMember: async (userId: string): Promise<WorkspaceRecord[]> =>
      this.workspaceRows.filter((w) =>
        this.membershipRows.some(
          (m) => m.userId === userId && m.workspaceId === w.id,
        ),
      ),

    countOwnedBy: async (userId: string): Promise<number> =>
      this.workspaceRows.filter((w) => w.ownerId === userId).length,

    insert: async (input: CreateWorkspaceInput): Promise<WorkspaceRecord> => {
      const workspace = this.seedWorkspace(input.workspace)
      await this.workspaces.memberships.insert(input.membership)
      return workspace
    },

    memberships: {
      find: async (
        userId: string,
        workspaceId: string,
      ): Promise<MembershipRecord | null> =>
        this.membershipRows.find(
          (m) => m.userId === userId && m.workspaceId === workspaceId,
        ) ?? null,

      listByWorkspace: async (
        workspaceId: string,
      ): Promise<MembershipRecord[]> =>
        this.membershipRows.filter((m) => m.workspaceId === workspaceId),

      insert: async (
        input: Omit<MembershipRecord, 'createdAt'>,
      ): Promise<MembershipRecord> => {
        const existing = this.membershipRows.find(
          (m) => m.userId === input.userId && m.workspaceId === input.workspaceId,
        )
        if (existing) return existing
        const record: MembershipRecord = { ...input, createdAt: this.now() }
        this.membershipRows.push(record)
        return record
      },
    },
  }

  readonly projects = {
    listByWorkspace: async (
      workspaceId: string,
      state: ProjectState,
    ): Promise<ProjectRecord[]> =>
      this.projectRows
        .filter((p) => p.workspaceId === workspaceId && p.state === state)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),

    findById: async (id: string): Promise<ProjectRecord | null> =>
      this.projectRows.find((p) => p.id === id) ?? null,

    insert: async (input: CreateProjectInput): Promise<ProjectRecord> =>
      this.seedProject(input),

    update: async (id: string, patch: ProjectPatch): Promise<ProjectRecord> => {
      const project = this.projectRows.find((p) => p.id === id)
      if (!project) throw new Error('no such project')
      if (patch.name !== undefined) project.name = patch.name
      if (patch.description !== undefined) project.description = patch.description
      if (patch.colourToken !== undefined) project.colourToken = patch.colourToken
      project.updatedAt = this.now()
      return project
    },

    setState: async (
      id: string,
      state: ProjectState,
    ): Promise<ProjectRecord> => {
      const project = this.projectRows.find((p) => p.id === id)
      if (!project) throw new Error('no such project')
      project.state = state
      project.archivedAt = state === 'ARCHIVED' ? this.now() : null
      project.updatedAt = this.now()
      return project
    },
  }

  readonly tasks = {
    listByProject: async (projectId: string): Promise<TaskRecord[]> =>
      this.taskRows
        .filter((t) => t.projectId === projectId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),

    findById: async (id: string): Promise<TaskRecord | null> =>
      this.taskRows.find((t) => t.id === id) ?? null,

    insert: async (input: CreateTaskInput): Promise<TaskRecord> =>
      this.seedTask(input),

    update: async (id: string, patch: TaskPatch): Promise<TaskRecord> => {
      const task = this.taskRows.find((t) => t.id === id)
      if (!task) throw new Error('no such task')
      if (patch.title !== undefined) task.title = patch.title
      if (patch.description !== undefined) task.description = patch.description
      if (patch.stage !== undefined) task.stage = patch.stage
      if (patch.priority !== undefined) task.priority = patch.priority
      if (patch.assigneeId !== undefined) task.assigneeId = patch.assigneeId
      if (patch.dueDate !== undefined) task.dueDate = patch.dueDate
      task.updatedAt = this.now()
      return task
    },
  }

  readonly comments = {
    listByTask: async (taskId: string): Promise<CommentRecord[]> =>
      this.commentRows
        .filter((c) => c.taskId === taskId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),

    findById: async (id: string): Promise<CommentRecord | null> =>
      this.commentRows.find((c) => c.id === id) ?? null,

    insert: async (input: {
      taskId: string
      authorId: string
      body: string
    }): Promise<CommentRecord> => {
      const record: CommentRecord = {
        id: `cmt_${randomUUID()}`,
        taskId: input.taskId,
        authorId: input.authorId,
        body: input.body,
        createdAt: this.now(),
        updatedAt: this.now(),
      }
      this.commentRows.push(record)
      return record
    },
  }

  readonly notifications = {
    listForUser: async (
      userId: string,
      limit: number,
    ): Promise<NotificationRecord[]> =>
      this.notificationRows
        .filter((n) => n.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit),

    countUnread: async (userId: string): Promise<number> =>
      this.notificationRows.filter((n) => n.userId === userId && !n.readAt).length,

    markRead: async (userId: string, id: string): Promise<boolean> => {
      const notification = this.notificationRows.find(
        (n) => n.id === id && n.userId === userId,
      )
      if (!notification) return false
      notification.readAt ??= this.now()
      return true
    },

    markAllRead: async (userId: string): Promise<void> => {
      for (const n of this.notificationRows) {
        if (n.userId === userId && !n.readAt) n.readAt = this.now()
      }
    },

    insert: async (input: {
      userId: string
      projectId: string | null
      kind: NotificationKind
      message: string
    }): Promise<NotificationRecord> => {
      const record: NotificationRecord = {
        id: `ntf_${randomUUID()}`,
        userId: input.userId,
        projectId: input.projectId,
        kind: input.kind,
        message: input.message,
        readAt: null,
        createdAt: this.now(),
      }
      this.notificationRows.push(record)
      return record
    },
  }

  /**
   * Snapshot-and-rollback transaction, matching the all-or-nothing guarantee of
   * the Prisma implementation. Nested transactions are not supported.
   */
  async transaction<T>(work: (store: Store) => Promise<T>): Promise<T> {
    const backup = {
      userRows: [...this.userRows],
      sessionRows: [...this.sessionRows],
      workspaceRows: [...this.workspaceRows],
      membershipRows: [...this.membershipRows],
      projectRows: [...this.projectRows],
      taskRows: [...this.taskRows],
      commentRows: [...this.commentRows],
      notificationRows: [...this.notificationRows],
    }
    try {
      return await work(this)
    } catch (error) {
      this.userRows.splice(0, this.userRows.length, ...backup.userRows)
      this.sessionRows.splice(0, this.sessionRows.length, ...backup.sessionRows)
      this.workspaceRows.splice(0, this.workspaceRows.length, ...backup.workspaceRows)
      this.membershipRows.splice(0, this.membershipRows.length, ...backup.membershipRows)
      this.projectRows.splice(0, this.projectRows.length, ...backup.projectRows)
      this.taskRows.splice(0, this.taskRows.length, ...backup.taskRows)
      this.commentRows.splice(0, this.commentRows.length, ...backup.commentRows)
      this.notificationRows.splice(
        0,
        this.notificationRows.length,
        ...backup.notificationRows,
      )
      throw error
    }
  }
}
