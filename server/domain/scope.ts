/**
 * Resource-chain resolution.
 *
 * Workspace-scoped resources are reachable through their parents: a task through
 * its project, a project through its workspace. Each hop must be verified, so
 * this module walks the chain and performs the membership check at the
 * workspace boundary — once — before returning any row.
 *
 * Order matters: the membership lookup happens BEFORE the parent row is loaded,
 * so a non-member's request never causes a project or task row to be read.
 */

import { forbiddenOrHidden } from '../http/errors'
import type { Actor } from './authorize'
import type {
  CommentRecord,
  ProjectRecord,
  TaskRecord,
  WorkspaceRecord,
} from './records'
import type { MembershipRecord } from './records'
import type { Store } from '../repositories/store'

export interface WorkspaceScope {
  workspace: WorkspaceRecord
  membership: MembershipRecord
}

export interface ProjectScope extends WorkspaceScope {
  project: ProjectRecord
}

export interface TaskScope extends ProjectScope {
  task: TaskRecord
}

export async function resolveWorkspaceScope(
  store: Store,
  actor: Actor,
  workspaceId: string,
): Promise<WorkspaceScope> {
  const membership = await store.workspaces.memberships.find(
    actor.userId,
    workspaceId,
  )
  if (!membership) throw forbiddenOrHidden()

  const workspace = await store.workspaces.findById(workspaceId)
  if (!workspace) throw forbiddenOrHidden()

  return { workspace, membership }
}

export async function resolveProjectScope(
  store: Store,
  actor: Actor,
  projectId: string,
): Promise<ProjectScope> {
  const project = await store.projects.findById(projectId)
  if (!project) throw forbiddenOrHidden()

  const { workspace, membership } = await resolveWorkspaceScope(
    store,
    actor,
    project.workspaceId,
  )
  return { workspace, membership, project }
}

export async function resolveTaskScope(
  store: Store,
  actor: Actor,
  taskId: string,
): Promise<TaskScope> {
  const task = await store.tasks.findById(taskId)
  if (!task) throw forbiddenOrHidden()

  const scope = await resolveProjectScope(store, actor, task.projectId)
  return { ...scope, task }
}

export async function resolveCommentScope(
  store: Store,
  actor: Actor,
  commentId: string,
): Promise<TaskScope & { comment: CommentRecord }> {
  const comment = await store.comments.findById(commentId)
  if (!comment) throw forbiddenOrHidden()

  const scope = await resolveTaskScope(store, actor, comment.taskId)
  return { ...scope, comment }
}
