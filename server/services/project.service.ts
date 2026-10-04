/**
 * Project and task services. FR-PRJ, FR-TASK, FR-KAN, FR-CMT.
 *
 * Every entry point resolves its resource chain and performs the workspace
 * membership check before reading or writing. No method accepts an actor id from
 * the caller — the actor comes from the validated session only.
 *
 * Archive is reversible and retains all child data (resolved D-19). There is no
 * permanent-deletion method anywhere in this file: `FR-PRJ-012` excludes it from
 * the initial milestone, so no interface control exists to invoke.
 */

import { randomUUID } from 'node:crypto'
import { conflict, forbiddenOrHidden } from '../http/errors'
import { resolveProjectScope, resolveTaskScope } from '../domain/scope'
import type { Actor } from '../domain/authorize'
import type {
  CommentRecord,
  ProjectRecord,
  ProjectState,
  TaskPriority,
  TaskRecord,
  TaskStage,
} from '../domain/records'
import type { Store } from '../repositories/store'

export const PROJECT_NAME_MAX = 120
export const TASK_TITLE_MAX = 200

export class ProjectService {
  constructor(
    private readonly store: Store,
    private readonly notifier: NotificationWriter,
  ) {}

  async list(
    actor: Actor,
    workspaceId: string,
    state: ProjectState,
  ): Promise<ProjectRecord[]> {
    const { workspace } = await resolveProjectListScope(
      this.store,
      actor,
      workspaceId,
    )
    void workspace
    return this.store.projects.listByWorkspace(workspaceId, state)
  }

  async get(actor: Actor, projectId: string): Promise<ProjectRecord> {
    const { project } = await resolveProjectScope(this.store, actor, projectId)
    return project
  }

  async create(
    actor: Actor,
    workspaceId: string,
    input: {
      name: string
      description?: string | undefined
      colourToken?: string | null | undefined
    },
  ): Promise<ProjectRecord> {
    await resolveProjectListScope(this.store, actor, workspaceId)

    const name = input.name.trim()
    if (name === '') {
      throw conflict('Project name is required.', {
        name: 'Project name is required.',
      })
    }
    if (name.length > PROJECT_NAME_MAX) {
      throw conflict('Project name must be 120 characters or fewer.', {
        name: 'Project name must be 120 characters or fewer.',
      })
    }

    return this.store.projects.insert({
      workspaceId,
      name,
      description: input.description?.trim() ?? '',
      colourToken: input.colourToken ?? null,
    })
  }

  async update(
    actor: Actor,
    projectId: string,
    patch: {
      name?: string | undefined
      description?: string | undefined
      colourToken?: string | null | undefined
    },
  ): Promise<ProjectRecord> {
    await resolveProjectScope(this.store, actor, projectId)

    if (patch.name !== undefined) {
      const name = patch.name.trim()
      if (name === '') {
        throw conflict('Project name is required.', {
          name: 'Project name is required.',
        })
      }
      if (name.length > PROJECT_NAME_MAX) {
        throw conflict('Project name must be 120 characters or fewer.', {
          name: 'Project name must be 120 characters or fewer.',
        })
      }
    }

    return this.store.projects.update(projectId, patch)
  }

  /**
   * Archive / restore. Reversible; every task, comment, and timestamp is
   * retained. Archiving an already-archived project is a no-op rather than an
   * error, so a retried request cannot fail.
   */
  async setArchived(
    actor: Actor,
    projectId: string,
    archived: boolean,
  ): Promise<ProjectRecord> {
    const { project } = await resolveProjectScope(this.store, actor, projectId)
    const target: ProjectState = archived ? 'ARCHIVED' : 'ACTIVE'
    if (project.state === target) return project

    const updated = await this.store.projects.setState(projectId, target)
    await this.notifier.notifyWorkspaceMembers(
      this.store,
      project.workspaceId,
      archived ? 'PROJECT_ARCHIVED' : 'PROJECT_RESTORED',
      archived
        ? `${actor.email} archived “${project.name}”.`
        : `${actor.email} restored “${project.name}”.`,
      projectId,
    )
    return updated
  }
}

export class TaskService {
  constructor(
    private readonly store: Store,
    private readonly notifier: NotificationWriter,
  ) {}

  async list(actor: Actor, projectId: string): Promise<TaskRecord[]> {
    await resolveProjectScope(this.store, actor, projectId)
    return this.store.tasks.listByProject(projectId)
  }

  async create(
    actor: Actor,
    projectId: string,
    input: {
      title: string
      description?: string | undefined
      priority?: TaskPriority | undefined
      assigneeId?: string | null | undefined
      dueDate?: Date | null | undefined
    },
  ): Promise<TaskRecord> {
    await resolveProjectScope(this.store, actor, projectId)

    const title = input.title.trim()
    if (title === '') {
      throw conflict('Task title is required.', { title: 'Task title is required.' })
    }
    if (title.length > TASK_TITLE_MAX) {
      throw conflict('Task title must be 200 characters or fewer.', {
        title: 'Task title must be 200 characters or fewer.',
      })
    }

    // An assignee must be a member of the same workspace, otherwise a task could
    // reference a user with no access to the data it describes.
    if (input.assigneeId) {
      await this.assertWorkspaceMember(
        this.store,
        (await resolveProjectScope(this.store, actor, projectId)).workspace.id,
        input.assigneeId,
      )
    }

    const task = await this.store.tasks.insert({
      projectId,
      title,
      description: input.description?.trim() ?? '',
      priority: input.priority ?? 'NONE',
      assigneeId: input.assigneeId ?? null,
      dueDate: input.dueDate ?? null,
    })

    if (task.assigneeId) {
      await this.notifier.notify(
        this.store,
        task.assigneeId,
        'TASK_ASSIGNED',
        `${actor.email} assigned you “${task.title}”.`,
        projectId,
      )
    }
    return task
  }

  /**
   * Partial update. Stage and priority are plain enum fields — Done is terminal
   * for display ordering, not immutable in storage, because the product does not
   * forbid moving a task back (resolved D-09).
   */
  async update(
    actor: Actor,
    taskId: string,
    patch: {
      title?: string | undefined
      description?: string | undefined
      stage?: TaskStage | undefined
      priority?: TaskPriority | undefined
      assigneeId?: string | null | undefined
      dueDate?: Date | null | undefined
    },
  ): Promise<TaskRecord> {
    const { task, project } = await resolveTaskScope(this.store, actor, taskId)

    if (patch.title !== undefined) {
      const title = patch.title.trim()
      if (title === '') {
        throw conflict('Task title is required.', { title: 'Task title is required.' })
      }
      if (title.length > TASK_TITLE_MAX) {
        throw conflict('Task title must be 200 characters or fewer.', {
          title: 'Task title must be 200 characters or fewer.',
        })
      }
    }

    if (patch.assigneeId) {
      await this.assertWorkspaceMember(this.store, project.workspaceId, patch.assigneeId)
    }

    const updated = await this.store.tasks.update(taskId, patch)

    if (patch.stage !== undefined && patch.stage !== task.stage) {
      await this.notifier.notifyWorkspaceMembers(
        this.store,
        project.workspaceId,
        'TASK_STAGE_CHANGED',
        `${actor.email} moved “${updated.title}” to ${humanStage(patch.stage)}.`,
        project.id,
      )
    }
    if (patch.assigneeId && patch.assigneeId !== task.assigneeId) {
      await this.notifier.notify(
        this.store,
        patch.assigneeId,
        'TASK_ASSIGNED',
        `${actor.email} assigned you “${updated.title}”.`,
        project.id,
      )
    }

    return updated
  }

  // --- comments (FR-CMT) --------------------------------------------------

  async listComments(actor: Actor, taskId: string): Promise<CommentRecord[]> {
    await resolveTaskScope(this.store, actor, taskId)
    return this.store.comments.listByTask(taskId)
  }

  async addComment(
    actor: Actor,
    taskId: string,
    body: string,
  ): Promise<CommentRecord> {
    const { project } = await resolveTaskScope(this.store, actor, taskId)

    const trimmed = body.trim()
    if (trimmed === '') {
      throw conflict('Comment cannot be empty.', { body: 'Comment cannot be empty.' })
    }
    if (trimmed.length > 5000) {
      throw conflict('Comment must be 5000 characters or fewer.', {
        body: 'Comment must be 5000 characters or fewer.',
      })
    }

    const comment = await this.store.comments.insert({
      taskId,
      authorId: actor.userId,
      body: trimmed,
    })

    await this.notifier.notifyWorkspaceMembers(
      this.store,
      project.workspaceId,
      'TASK_COMMENTED',
      `${actor.email} commented on “${comment.body.slice(0, 80)}”.`,
      project.id,
      // Never notify the author about their own comment.
      actor.userId,
    )

    return comment
  }

  private async assertWorkspaceMember(
    store: Store,
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const membership = await store.workspaces.memberships.find(userId, workspaceId)
    if (!membership) {
      // Identical wording to every other authorization failure, so the response
      // cannot be used to probe for valid user ids.
      throw forbiddenOrHidden()
    }
  }
}

/** Minimal seam so services can notify without depending on each other. */
export interface NotificationWriter {
  notify(
    store: Store,
    userId: string,
    kind: 'TASK_COMMENTED' | 'TASK_ASSIGNED' | 'TASK_STAGE_CHANGED' | 'PROJECT_ARCHIVED' | 'PROJECT_RESTORED',
    message: string,
    projectId: string | null,
  ): Promise<void>
  notifyWorkspaceMembers(
    store: Store,
    workspaceId: string,
    kind: 'TASK_COMMENTED' | 'TASK_ASSIGNED' | 'TASK_STAGE_CHANGED' | 'PROJECT_ARCHIVED' | 'PROJECT_RESTORED',
    message: string,
    projectId: string | null,
    excludeUserId?: string,
  ): Promise<void>
}

export function humanStage(stage: TaskStage): string {
  switch (stage) {
    case 'BACKLOG':
      return 'Backlog'
    case 'IN_PROGRESS':
      return 'In Progress'
    case 'IN_REVIEW':
      return 'In Review'
    case 'DONE':
      return 'Done'
  }
}

async function resolveProjectListScope(
  store: Store,
  actor: Actor,
  workspaceId: string,
) {
  const membership = await store.workspaces.memberships.find(actor.userId, workspaceId)
  if (!membership) throw forbiddenOrHidden()
  const workspace = await store.workspaces.findById(workspaceId)
  if (!workspace) throw forbiddenOrHidden()
  return { workspace, membership }
}

export { randomUUID }
