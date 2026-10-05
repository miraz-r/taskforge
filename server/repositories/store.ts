/**
 * Data-store interface.
 *
 * AUTHORISATION-UNAWARE BY DESIGN. `workspaces.findById` returns any workspace
 * by id, and `tasks.findById` returns any task. That is deliberate: the
 * membership rule lives in exactly one place (domain/authorize.ts) rather than
 * being scattered across query builders where it can be forgotten. Every service
 * method that touches workspace-scoped data calls `requireMembership` first.
 *
 * Two implementations satisfy this interface:
 *   - repositories/prisma.ts  — PostgreSQL, used at runtime
 *   - repositories/memory.ts  — in-process, used by unit tests
 *
 * Because services depend only on this interface, the authorization rules are
 * fully testable with no database present.
 */

import type {
  CommentRecord,
  MembershipRecord,
  NotificationKind,
  NotificationRecord,
  ProjectRecord,
  ProjectState,
  SessionRecord,
  TaskPriority,
  TaskRecord,
  TaskStage,
  UserRecord,
  WorkspaceRecord,
} from '../domain/records'

export interface CreateUserInput {
  email: string
  displayName: string
  passwordHash: string
}

export interface CreateWorkspaceInput {
  workspace: Omit<WorkspaceRecord, 'createdAt' | 'updatedAt'>
  membership: Omit<MembershipRecord, 'createdAt'>
}

export interface CreateProjectInput {
  /**
   * Optional explicit id. Used ONLY by the legacy import, which retains an id
   * only when it is already a valid UUID and free — id columns are `uuid`, so a
   * prefixed legacy id must be replaced. Normal callers omit it and let the
   * store generate one.
   */
  id?: string
  workspaceId: string
  name: string
  description: string
  colourToken: string | null
}

export interface ProjectPatch {
  name?: string | undefined
  description?: string | undefined
  colourToken?: string | null | undefined
}

export interface CreateTaskInput {
  /** See CreateProjectInput — legacy import only. */
  id?: string
  projectId: string
  title: string
  description: string
  priority: TaskPriority
  assigneeId: string | null
  dueDate: Date | null
}

export interface TaskPatch {
  title?: string | undefined
  description?: string | undefined
  stage?: TaskStage | undefined
  priority?: TaskPriority | undefined
  assigneeId?: string | null | undefined
  dueDate?: Date | null | undefined
}

export interface Store {
  users: {
    findByEmail(email: string): Promise<UserRecord | null>
    findById(id: string): Promise<UserRecord | null>
    insert(input: CreateUserInput): Promise<UserRecord>
    setPasswordHash(id: string, hash: string): Promise<void>
    /**
     * FR-AUTH-008. Display name only.
     *
     * There is no avatar column and no upload endpoint, and design-system 10.4
     * marks the avatar specification Proposed — so avatar editing is deferred
     * rather than invented. The acting user is passed in from the validated
     * session, so a request can never name whose profile to change.
     */
    updateOwnProfile(
      userId: string,
      patch: { displayName: string },
    ): Promise<UserRecord>
  }

  sessions: {
    findByTokenHash(tokenHash: string): Promise<SessionRecord | null>
    findById(sessionId: string): Promise<SessionRecord | null>
    insert(session: Omit<SessionRecord, 'id'>): Promise<SessionRecord>
    revoke(sessionId: string): Promise<void>
    revokeAllForUser(userId: string): Promise<void>
  }

  workspaces: {
    /** AUTHORISATION-UNAWARE. */
    findById(id: string): Promise<WorkspaceRecord | null>
    /** Only workspaces the given user is a member of. */
    listByMember(userId: string): Promise<WorkspaceRecord[]>
    countOwnedBy(userId: string): Promise<number>
    insert(input: CreateWorkspaceInput): Promise<WorkspaceRecord>
    memberships: {
      find(userId: string, workspaceId: string): Promise<MembershipRecord | null>
      listByWorkspace(workspaceId: string): Promise<MembershipRecord[]>
      insert(input: Omit<MembershipRecord, 'createdAt'>): Promise<MembershipRecord>
    }
  }

  projects: {
    /** Scoped to a workspace by the query itself. */
    listByWorkspace(workspaceId: string, state: ProjectState): Promise<ProjectRecord[]>
    /** AUTHORISATION-UNAWARE. */
    findById(id: string): Promise<ProjectRecord | null>
    insert(input: CreateProjectInput): Promise<ProjectRecord>
    update(id: string, patch: ProjectPatch): Promise<ProjectRecord>
    setState(id: string, state: ProjectState): Promise<ProjectRecord>
  }

  tasks: {
    listByProject(projectId: string): Promise<TaskRecord[]>
    /** AUTHORISATION-UNAWARE. */
    findById(id: string): Promise<TaskRecord | null>
    insert(input: CreateTaskInput): Promise<TaskRecord>
    update(id: string, patch: TaskPatch): Promise<TaskRecord>
  }

  comments: {
    listByTask(taskId: string): Promise<CommentRecord[]>
    findById(id: string): Promise<CommentRecord | null>
    insert(input: {
      taskId: string
      authorId: string
      body: string
    }): Promise<CommentRecord>
  }

  notifications: {
    listForUser(userId: string, limit: number): Promise<NotificationRecord[]>
    countUnread(userId: string): Promise<number>
    markRead(userId: string, id: string): Promise<boolean>
    markAllRead(userId: string): Promise<void>
    insert(input: {
      userId: string
      projectId: string | null
      kind: NotificationKind
      message: string
    }): Promise<NotificationRecord>
  }

  /**
   * Runs `work` inside a transaction. Used where a partial write would leave
   * inconsistent state — notably the legacy import, which must be all-or-nothing.
   */
  transaction<T>(work: (store: Store) => Promise<T>): Promise<T>
}
