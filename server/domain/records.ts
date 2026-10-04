/**
 * Domain records.
 *
 * Deliberately plain structural types rather than Prisma model types. Services
 * depend on these, not on Prisma, which keeps every authorization and business
 * rule unit-testable against an in-memory store (no database required) while
 * the Prisma-backed store satisfies the same interface at runtime.
 */

export type ISODateString = string

export interface UserRecord {
  id: string
  email: string
  displayName: string
  /** argon2id PHC string, or a legacy PBKDF2 record pending upgrade. */
  passwordHash: string
  createdAt: Date
  updatedAt: Date
}

export interface SessionRecord {
  id: string
  tokenHash: string
  csrfToken: string
  userId: string
  createdAt: Date
  expiresAt: Date
  revokedAt: Date | null
}

export type MembershipRole = 'OWNER' | 'MEMBER'

export interface MembershipRecord {
  userId: string
  workspaceId: string
  role: MembershipRole
  createdAt: Date
}

export interface WorkspaceRecord {
  id: string
  name: string
  ownerId: string
  createdAt: Date
  updatedAt: Date
}

export type ProjectState = 'ACTIVE' | 'ARCHIVED'

export interface ProjectRecord {
  id: string
  workspaceId: string
  name: string
  description: string
  colourToken: string | null
  state: ProjectState
  archivedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type TaskStage = 'BACKLOG' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'
export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'

export interface TaskRecord {
  id: string
  projectId: string
  title: string
  description: string
  stage: TaskStage
  priority: TaskPriority
  assigneeId: string | null
  dueDate: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CommentRecord {
  id: string
  taskId: string
  authorId: string
  body: string
  createdAt: Date
  updatedAt: Date
}

export type NotificationKind =
  | 'TASK_COMMENTED'
  | 'TASK_ASSIGNED'
  | 'TASK_STAGE_CHANGED'
  | 'PROJECT_ARCHIVED'
  | 'PROJECT_RESTORED'

export interface NotificationRecord {
  id: string
  userId: string
  projectId: string | null
  kind: NotificationKind
  message: string
  readAt: Date | null
  createdAt: Date
}
