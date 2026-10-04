/**
 * Workspace-scoped routes: projects, tasks, comments, search, dashboard,
 * notifications.
 *
 * Every handler resolves its resource chain and verifies workspace membership
 * before reading or writing. There is intentionally NO route that creates a
 * membership, invites a user, or permanently deletes anything.
 */

import { Router } from 'express'
import { actorOf, parse, requireAuth, requireCsrf } from '../middleware'
import { asyncHandler } from '../http/errors'
import {
  toCommentDto,
  toNotificationDto,
  toProjectDto,
  toTaskDto,
} from '../http/dto'
import {
  createCommentBodySchema,
  createProjectBodySchema,
  createTaskBodySchema,
  notificationQuerySchema,
  projectStateQuerySchema,
  searchQuerySchema,
  updateProjectBodySchema,
  updateTaskBodySchema,
} from '../validation/schemas'
import { humanStage, type ProjectService, type TaskService } from '../services/project.service'
import type { NotificationService } from '../services/notification.service'
import type { DashboardService, SearchService } from '../services/insight.service'
import type { AuthService } from '../services/auth.service'

export interface WorkRouterDeps {
  auth: AuthService
  projects: ProjectService
  tasks: TaskService
  search: SearchService
  dashboard: DashboardService
  notifications: NotificationService
}

export function createWorkRouter(deps: WorkRouterDeps): Router {
  const { auth, projects, tasks, search, dashboard, notifications } = deps
  const router = Router()

  // Everything below requires a session. CSRF is applied per mutating route.
  router.use(requireAuth)

  // --- projects -----------------------------------------------------------

  router.get(
    '/workspaces/:workspaceId/projects',
    asyncHandler(async (req, res) => {
      const { state } = parse(projectStateQuerySchema, req.query)
      const list = await projects.list(
        actorOf(req),
        String(req.params.workspaceId),
        state,
      )
      res.status(200).json({ projects: list.map(toProjectDto) })
    }),
  )

  router.post(
    '/workspaces/:workspaceId/projects',
    requireCsrf(auth),
    asyncHandler(async (req, res) => {
      const body = parse(createProjectBodySchema, req.body)
      const project = await projects.create(
        actorOf(req),
        String(req.params.workspaceId),
        body,
      )
      res.status(201).json({ project: toProjectDto(project) })
    }),
  )

  router.get(
    '/projects/:projectId',
    asyncHandler(async (req, res) => {
      const project = await projects.get(actorOf(req), String(req.params.projectId))
      res.status(200).json({ project: toProjectDto(project) })
    }),
  )

  router.patch(
    '/projects/:projectId',
    requireCsrf(auth),
    asyncHandler(async (req, res) => {
      const body = parse(updateProjectBodySchema, req.body)
      const project = await projects.update(
        actorOf(req),
        String(req.params.projectId),
        body,
      )
      res.status(200).json({ project: toProjectDto(project) })
    }),
  )

  router.post(
    '/projects/:projectId/archive',
    requireCsrf(auth),
    asyncHandler(async (req, res) => {
      const project = await projects.setArchived(
        actorOf(req),
        String(req.params.projectId),
        true,
      )
      res.status(200).json({ project: toProjectDto(project) })
    }),
  )

  router.post(
    '/projects/:projectId/restore',
    requireCsrf(auth),
    asyncHandler(async (req, res) => {
      const project = await projects.setArchived(
        actorOf(req),
        String(req.params.projectId),
        false,
      )
      res.status(200).json({ project: toProjectDto(project) })
    }),
  )

  // NOTE: there is deliberately no DELETE /projects/:id. Permanent deletion is
  // excluded from the initial milestone (FR-PRJ-012), so no control exists to
  // invoke — not disabled, not "Coming Soon", simply absent.

  // --- tasks --------------------------------------------------------------

  router.get(
    '/projects/:projectId/tasks',
    asyncHandler(async (req, res) => {
      const list = await tasks.list(actorOf(req), String(req.params.projectId))
      res.status(200).json({ tasks: list.map(toTaskDto) })
    }),
  )

  router.post(
    '/projects/:projectId/tasks',
    requireCsrf(auth),
    asyncHandler(async (req, res) => {
      const body = parse(createTaskBodySchema, req.body)
      const task = await tasks.create(actorOf(req), String(req.params.projectId), {
        ...body,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      })
      res.status(201).json({ task: toTaskDto(task) })
    }),
  )

  router.patch(
    '/tasks/:taskId',
    requireCsrf(auth),
    asyncHandler(async (req, res) => {
      const body = parse(updateTaskBodySchema, req.body)
      // Built field by field so a partial patch sends only the keys that were
      // actually supplied, and so the due-date string is converted to a Date
      // rather than widening the patch type.
      const task = await tasks.update(actorOf(req), String(req.params.taskId), {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.stage !== undefined ? { stage: body.stage } : {}),
        ...(body.priority !== undefined ? { priority: body.priority } : {}),
        ...(body.assigneeId !== undefined ? { assigneeId: body.assigneeId } : {}),
        ...(body.dueDate !== undefined
          ? { dueDate: body.dueDate === null ? null : new Date(body.dueDate) }
          : {}),
      })
      res.status(200).json({ task: toTaskDto(task) })
    }),
  )

  // --- comments -----------------------------------------------------------

  router.get(
    '/tasks/:taskId/comments',
    asyncHandler(async (req, res) => {
      const list = await tasks.listComments(actorOf(req), String(req.params.taskId))
      res.status(200).json({ comments: list.map(toCommentDto) })
    }),
  )

  router.post(
    '/tasks/:taskId/comments',
    requireCsrf(auth),
    asyncHandler(async (req, res) => {
      const body = parse(createCommentBodySchema, req.body)
      const comment = await tasks.addComment(
        actorOf(req),
        String(req.params.taskId),
        body.body,
      )
      res.status(201).json({ comment: toCommentDto(comment) })
    }),
  )

  // --- search and dashboard ----------------------------------------------

  router.get(
    '/projects/:projectId/search',
    asyncHandler(async (req, res) => {
      const { q } = parse(searchQuerySchema, req.query)
      const hits = await search.search(actorOf(req), String(req.params.projectId), q)
      res.status(200).json({
        query: q,
        count: hits.length,
        results: hits.map((hit) => ({
          task: toTaskDto(hit.task),
          matchedIn: hit.matchedIn,
        })),
      })
    }),
  )

  router.get(
    '/projects/:projectId/dashboard',
    asyncHandler(async (req, res) => {
      const summary = await dashboard.forProject(
        actorOf(req),
        String(req.params.projectId),
      )
      res.status(200).json({
        dashboard: {
          projectId: summary.projectId,
          projectName: summary.projectName,
          totalTasks: summary.totalTasks,
          byStage: summary.byStage,
          dueSoon: summary.dueSoon,
          overdue: summary.overdue,
          isEmpty: summary.isEmpty,
        },
      })
    }),
  )

  // --- notifications ------------------------------------------------------

  router.get(
    '/notifications',
    asyncHandler(async (req, res) => {
      const { limit } = parse(notificationQuerySchema, req.query)
      const actor = actorOf(req)
      const [items, unread] = await Promise.all([
        notifications.list(actor.userId, limit),
        notifications.unreadCount(actor.userId),
      ])
      res.status(200).json({
        notifications: items.map(toNotificationDto),
        unread,
      })
    }),
  )

  router.post(
    '/notifications/:id/read',
    requireCsrf(auth),
    asyncHandler(async (req, res) => {
      const ok = await notifications.markRead(
        actorOf(req).userId,
        String(req.params.id),
      )
      if (!ok) {
        // Scoped to the actor, so a foreign id is indistinguishable from absent.
        res.status(404).json({
          error: { code: 'not_found', message: 'That resource does not exist.' },
        })
        return
      }
      res.status(204).end()
    }),
  )

  router.post(
    '/notifications/read-all',
    requireCsrf(auth),
    asyncHandler(async (req, res) => {
      await notifications.markAllRead(actorOf(req).userId)
      res.status(204).end()
    }),
  )

  return router
}

export { humanStage }
