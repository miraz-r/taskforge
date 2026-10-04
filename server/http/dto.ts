/**
 * API response shapes.
 *
 * Domain records are never returned directly. Each mapper emits a deliberate
 * DTO so that:
 *   - internal columns (password hashes, tokens, ownership ids) can never leak by
 *     accident when a record gains a field;
 *   - the wire format is an explicit contract rather than a serialisation of the
 *     database shape.
 */

import type {
  CommentRecord,
  NotificationRecord,
  ProjectRecord,
  SessionRecord,
  TaskRecord,
  UserRecord,
  WorkspaceRecord,
} from '../domain/records'

export interface UserDto {
  id: string
  email: string
  displayName: string
}

export interface WorkspaceDto {
  id: string
  name: string
  ownerId: string
  createdAt: string
}

export interface ProjectDto {
  id: string
  workspaceId: string
  name: string
  description: string
  colourToken: string | null
  state: ProjectRecord['state']
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface TaskDto {
  id: string
  projectId: string
  title: string
  description: string
  stage: TaskRecord['stage']
  priority: TaskRecord['priority']
  assigneeId: string | null
  dueDate: string | null
  createdAt: string
  updatedAt: string
}

export interface CommentDto {
  id: string
  taskId: string
  authorId: string
  body: string
  createdAt: string
}

export interface NotificationDto {
  id: string
  kind: NotificationRecord['kind']
  message: string
  projectId: string | null
  readAt: string | null
  createdAt: string
}

const iso = (value: Date): string => value.toISOString()
const isoOrNull = (value: Date | null): string | null =>
  value === null ? null : iso(value)

export const toUserDto = (user: UserRecord): UserDto => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
})

export const toWorkspaceDto = (workspace: WorkspaceRecord): WorkspaceDto => ({
  id: workspace.id,
  name: workspace.name,
  ownerId: workspace.ownerId,
  createdAt: iso(workspace.createdAt),
})

export const toProjectDto = (project: ProjectRecord): ProjectDto => ({
  id: project.id,
  workspaceId: project.workspaceId,
  name: project.name,
  description: project.description,
  colourToken: project.colourToken,
  state: project.state,
  archivedAt: isoOrNull(project.archivedAt),
  createdAt: iso(project.createdAt),
  updatedAt: iso(project.updatedAt),
})

export const toTaskDto = (task: TaskRecord): TaskDto => ({
  id: task.id,
  projectId: task.projectId,
  title: task.title,
  description: task.description,
  stage: task.stage,
  priority: task.priority,
  assigneeId: task.assigneeId,
  dueDate: isoOrNull(task.dueDate),
  createdAt: iso(task.createdAt),
  updatedAt: iso(task.updatedAt),
})

export const toCommentDto = (comment: CommentRecord): CommentDto => ({
  id: comment.id,
  taskId: comment.taskId,
  authorId: comment.authorId,
  body: comment.body,
  createdAt: iso(comment.createdAt),
})

export const toNotificationDto = (
  notification: NotificationRecord,
): NotificationDto => ({
  id: notification.id,
  kind: notification.kind,
  message: notification.message,
  projectId: notification.projectId,
  readAt: isoOrNull(notification.readAt),
  createdAt: iso(notification.createdAt),
})

/** Expiry is needed by the client to schedule re-authentication. */
export const sessionExpiryDto = (session: SessionRecord): string =>
  iso(session.expiresAt)
