/**
 * Backend abstraction used by `access/service.ts`.
 *
 * The service layer depends on this, not on a storage mechanism, so the same
 * business rules (validation, error shaping, result wrapping) run whether the
 * data lives on the server or in an in-process store used by tests.
 *
 * Passwords cross this boundary as PLAINTEXT, to be hashed server-side. That is a
 * deliberate change from the Phase 0 browser-only build, which hashed in the
 * browser: the hash was never a secret, the algorithm was never server-enforced,
 * and it prevented a real server from owning authentication at all. The transport
 * must be TLS in any deployment.
 */

import type { Theme } from '../domain/types'

export interface BackendUser {
  id: string
  email: string
  displayName: string
}

export interface BackendWorkspace {
  id: string
  name: string
  ownerId: string
  createdAt: string
}

export interface BackendProject {
  id: string
  workspaceId: string
  name: string
  description: string
  colourToken: string | null
  state: 'ACTIVE' | 'ARCHIVED'
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface BackendTask {
  id: string
  projectId: string
  title: string
  description: string
  stage: 'BACKLOG' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'
  priority: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'
  assigneeId: string | null
  dueDate: string | null
  createdAt: string
  updatedAt: string
}

export interface BackendComment {
  id: string
  taskId: string
  authorId: string
  body: string
  createdAt: string
}

export interface BackendNotification {
  id: string
  kind: string
  message: string
  projectId: string | null
  readAt: string | null
  createdAt: string
}

export interface DashboardData {
  projectId: string
  projectName: string
  totalTasks: number
  byStage: Array<{
    stage: BackendTask['stage']
    label: string
    count: number
  }>
  dueSoon: number
  overdue: number
  isEmpty: boolean
}

export interface SearchHit {
  task: BackendTask
  matchedIn: 'title' | 'description' | 'both'
}

export interface AuthOutcome {
  user: BackendUser
  csrfToken: string | null
}

export interface SessionOutcome {
  user: BackendUser | null
  csrfToken: string | null
}

export interface WorkspaceListOutcome {
  workspaces: BackendWorkspace[]
  owned: number
  limit: number
}

/**
 * Raised for a failure the service should report. `fieldErrors` targets specific
 * controls; absent means a whole-form message.
 */
export class BackendError extends Error {
  constructor(
    message: string,
    readonly fieldErrors: Record<string, string> = {},
    readonly formError: string | null = null,
  ) {
    super(formError ?? Object.values(fieldErrors)[0] ?? message)
    this.name = 'BackendError'
  }
}

export interface Backend {
  register(input: {
    email: string
    password: string
    displayName: string
  }): Promise<AuthOutcome>

  signIn(input: { email: string; password: string }): Promise<AuthOutcome>

  signOut(): Promise<void>

  currentSession(): Promise<SessionOutcome>

  listWorkspaces(): Promise<WorkspaceListOutcome>

  createWorkspace(name: string): Promise<BackendWorkspace>

  // -- projects (FR-PRJ) --------------------------------------------------

  listProjects(
    workspaceId: string,
    state: 'ACTIVE' | 'ARCHIVED',
  ): Promise<BackendProject[]>

  createProject(input: {
    workspaceId: string
    name: string
    description?: string
    colourToken?: string | null
  }): Promise<BackendProject>

  updateProject(
    projectId: string,
    patch: { name?: string; description?: string },
  ): Promise<BackendProject>

  setProjectArchived(projectId: string, archived: boolean): Promise<BackendProject>

  // -- tasks (FR-TASK, FR-KAN) --------------------------------------------

  listTasks(projectId: string): Promise<BackendTask[]>

  createTask(input: {
    projectId: string
    title: string
    description?: string
    priority?: BackendTask['priority']
    dueDate?: string | null
  }): Promise<BackendTask>

  updateTask(
    taskId: string,
    patch: {
      title?: string
      description?: string
      stage?: BackendTask['stage']
      priority?: BackendTask['priority']
      dueDate?: string | null
    },
  ): Promise<BackendTask>

  // -- comments (FR-CMT) --------------------------------------------------

  listComments(taskId: string): Promise<BackendComment[]>

  addComment(taskId: string, body: string): Promise<BackendComment>

  // -- search and dashboard (FR-SEARCH, FR-DASH) -------------------------

  search(projectId: string, query: string): Promise<SearchHit[]>

  dashboard(projectId: string): Promise<DashboardData>

  // -- notifications (FR-NOTIF, in-app only) ------------------------------

  listNotifications(): Promise<{ items: BackendNotification[]; unread: number }>

  markNotificationRead(id: string): Promise<void>

  // -- profile (FR-AUTH-008) ----------------------------------------------

  /**
   * Display name only.
   *
   * `FR-AUTH-008` also mentions an avatar, but no avatar storage exists in the
   * schema, no endpoint exists, and design-system 10.4 marks the avatar
   * specification Proposed. Implementing one would mean inventing storage,
   * transport, and presentation — three unapproved decisions. Deferred, and
   * deliberately not a blocker for display-name editing.
   */
  updateDisplayName(displayName: string): Promise<BackendUser>

  /** Theme is presentation-only and deliberately NOT authoritative server data. */
  readTheme(): Theme | null
  writeTheme(theme: Theme): boolean
}
