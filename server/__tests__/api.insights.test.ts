/**
 * Archiving, task due-date/assignee editing, and dashboard summaries, driven over
 * real HTTP.
 *
 * The client journey tests in `src/app/insights.journeys.test.tsx` run against
 * `LocalBackend`, a test double. These run against the production Express
 * application and its real handlers, so they are what actually prove the
 * endpoints behind this slice.
 *
 * WHAT THIS DOES NOT PROVE: PostgreSQL behaviour. See `db/` for that, which is
 * skipped unless a database is available.
 */

import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  startTestServer,
  VALID_PASSWORD,
  type TestClient,
  type TestContext,
} from './support'

let ctx: TestContext

beforeEach(async () => {
  ctx = await startTestServer()
})
afterEach(async () => {
  await ctx.close()
})

interface TaskDto {
  id: string
  title: string
  stage: string
  dueDate: string | null
  assigneeId: string | null
}

async function makeUser(email: string): Promise<{
  client: TestClient
  userId: string
}> {
  const client = ctx.client()
  await client.register({
    email,
    password: VALID_PASSWORD,
    displayName: email.split('@')[0] as string,
  })
  const session = await client.get<{ user: { id: string } }>('/api/auth/session')
  return { client, userId: session.body.user.id }
}

async function makeWorkspace(client: TestClient, name: string): Promise<string> {
  const result = await client.post<{ workspace: { id: string } }>('/api/workspaces', {
    name,
  })
  expect(result.status).toBe(201)
  return result.body.workspace.id
}

async function makeProject(
  client: TestClient,
  workspaceId: string,
  name: string,
): Promise<string> {
  const result = await client.post<{ project: { id: string } }>(
    `/api/workspaces/${workspaceId}/projects`,
    { name },
  )
  expect(result.status).toBe(201)
  return result.body.project.id
}

async function makeTask(
  client: TestClient,
  projectId: string,
  title: string,
): Promise<string> {
  const result = await client.post<{ task: { id: string } }>(
    `/api/projects/${projectId}/tasks`,
    { title },
  )
  expect(result.status).toBe(201)
  return result.body.task.id
}

// --- archiving ------------------------------------------------------------

describe('project archive and restore (FR-PRJ-010, FR-PRJ-011)', () => {
  it('moves a project out of the active list and back, with no data loss', async () => {
    const { client } = await makeUser('ada@example.com')
    const workspaceId = await makeWorkspace(client, 'Acme')
    const projectId = await makeProject(client, workspaceId, 'Retired work')
    const taskId = await makeTask(client, projectId, 'Kept task')

    const archived = await client.post<{ project: { archivedAt: string | null } }>(
      `/api/projects/${projectId}/archive`,
    )
    expect(archived.status).toBe(200)
    expect(archived.body.project.archivedAt).toBeTruthy()

    // FR-DASH-002: excluded from the active list, present in the archived one.
    const active = await client.get<{ projects: unknown[] }>(
      `/api/workspaces/${workspaceId}/projects?state=ACTIVE`,
    )
    expect(active.body.projects).toHaveLength(0)

    const archivedList = await client.get<{ projects: Array<{ id: string }> }>(
      `/api/workspaces/${workspaceId}/projects?state=ARCHIVED`,
    )
    expect(archivedList.body.projects.map((p) => p.id)).toEqual([projectId])

    const restored = await client.post<{ project: { archivedAt: string | null } }>(
      `/api/projects/${projectId}/restore`,
    )
    expect(restored.status).toBe(200)
    expect(restored.body.project.archivedAt).toBeNull()

    const backInActive = await client.get<{ projects: Array<{ id: string }> }>(
      `/api/workspaces/${workspaceId}/projects?state=ACTIVE`,
    )
    expect(backInActive.body.projects.map((p) => p.id)).toEqual([projectId])

    // The task survived the round trip (FR-PRJ-011).
    const tasks = await client.get<{ tasks: TaskDto[] }>(
      `/api/projects/${projectId}/tasks`,
    )
    expect(tasks.body.tasks.map((t) => t.id)).toEqual([taskId])
  })

  it('keeps project-level indicators available on an archived project', async () => {
    const { client } = await makeUser('ada@example.com')
    const workspaceId = await makeWorkspace(client, 'Acme')
    const projectId = await makeProject(client, workspaceId, 'Retired work')
    await makeTask(client, projectId, 'Still counted task')

    const before = await client.get<{ dashboard: { totalTasks: number } }>(
      `/api/projects/${projectId}/dashboard`,
    )
    expect(before.body.dashboard.totalTasks).toBe(1)

    await client.post(`/api/projects/${projectId}/archive`)

    const after = await client.get<{
      dashboard: { totalTasks: number; isEmpty: boolean }
    }>(`/api/projects/${projectId}/dashboard`)
    // SCOPE, stated plainly: `FR-DASH-002` excludes archived projects from the
    // WORKSPACE dashboard. This endpoint is the PROJECT-level summary
    // (`FR-DASH-001`, `AC-DASH-02`), and it keeps working on an archived project
    // so a user can review progress before restoring. No workspace-level
    // dashboard exists yet — see the report.
    expect(after.body.dashboard.totalTasks).toBe(1)
  })

  it('refuses to archive a project the caller does not own', async () => {
    const ada = await makeUser('ada@example.com')
    const bob = await makeUser('bob@example.com')
    const workspaceId = await makeWorkspace(ada.client, 'Ada Team')
    const projectId = await makeProject(ada.client, workspaceId, 'Private')

    const result = await bob.client.post(`/api/projects/${projectId}/archive`)
    // Absent and not-yours are indistinguishable (docs/api.md 2.1).
    expect(result.status).toBe(403)
  })

  it('requires CSRF to archive', async () => {
    const { client } = await makeUser('ada@example.com')
    const workspaceId = await makeWorkspace(client, 'Acme')
    const projectId = await makeProject(client, workspaceId, 'Retired work')

    const result = await client.post(
      `/api/projects/${projectId}/archive`,
      undefined,
      { csrf: null },
    )
    expect(result.status).toBe(403)
  })
})

// --- due date and assignee -------------------------------------------------

describe('task due date (FR-TASK-009)', () => {
  it('sets, replaces and clears a due date', async () => {
    const { client } = await makeUser('ada@example.com')
    const workspaceId = await makeWorkspace(client, 'Acme')
    const projectId = await makeProject(client, workspaceId, 'Platform')
    const taskId = await makeTask(client, projectId, 'Deadline task')

    const created = await client.get<{ tasks: TaskDto[] }>(
      `/api/projects/${projectId}/tasks`,
    )
    // FR-TASK-009: a due date is optional; unset is null, not a placeholder.
    expect(created.body.tasks[0]?.dueDate).toBeNull()

    const set = await client.patch<{ task: TaskDto }>(`/api/tasks/${taskId}`, {
      dueDate: '2026-12-24T23:59:59.000Z',
    })
    expect(set.status).toBe(200)
    expect(set.body.task.dueDate).toBe('2026-12-24T23:59:59.000Z')

    const cleared = await client.patch<{ task: TaskDto }>(`/api/tasks/${taskId}`, {
      dueDate: null,
    })
    expect(cleared.body.task.dueDate).toBeNull()
  })

  it('rejects a malformed due date and leaves the task untouched', async () => {
    const { client } = await makeUser('ada@example.com')
    const workspaceId = await makeWorkspace(client, 'Acme')
    const projectId = await makeProject(client, workspaceId, 'Platform')
    const taskId = await makeTask(client, projectId, 'Deadline task')

    const bad = await client.patch(`/api/tasks/${taskId}`, {
      dueDate: 'next tuesday',
    })
    expect(bad.status).toBe(422)

    const after = await client.get<{ tasks: TaskDto[] }>(
      `/api/projects/${projectId}/tasks`,
    )
    expect(after.body.tasks[0]?.dueDate).toBeNull()
  })
})

describe('task assignee (FR-TASK-007, FR-TASK-008)', () => {
  it('assigns to the workspace owner and clears back to unassigned', async () => {
    const { client, userId } = await makeUser('ada@example.com')
    const workspaceId = await makeWorkspace(client, 'Acme')
    const projectId = await makeProject(client, workspaceId, 'Platform')
    const taskId = await makeTask(client, projectId, 'Assignable task')

    const initial = await client.get<{ tasks: TaskDto[] }>(
      `/api/projects/${projectId}/tasks`,
    )
    // FR-TASK-008: unassigned is an explicit state, not a missing field.
    expect(initial.body.tasks[0]?.assigneeId).toBeNull()

    const assigned = await client.patch<{ task: TaskDto }>(`/api/tasks/${taskId}`, {
      assigneeId: userId,
    })
    expect(assigned.status).toBe(200)
    expect(assigned.body.task.assigneeId).toBe(userId)

    // Clearing is not an error (FR-TASK-007).
    const cleared = await client.patch<{ task: TaskDto }>(`/api/tasks/${taskId}`, {
      assigneeId: null,
    })
    expect(cleared.status).toBe(200)
    expect(cleared.body.task.assigneeId).toBeNull()
  })

  it('refuses an assignee outside the workspace', async () => {
    const ada = await makeUser('ada@example.com')
    const bob = await makeUser('bob@example.com')
    const workspaceId = await makeWorkspace(ada.client, 'Acme')
    const projectId = await makeProject(ada.client, workspaceId, 'Platform')
    const taskId = await makeTask(ada.client, projectId, 'Assignable task')

    // Bob is a real user, but not a member of Ada's workspace, so assigning to
    // him would reference a user with no access to the data (docs/api.md 6).
    const result = await ada.client.patch<{ error: { message: string } }>(
      `/api/tasks/${taskId}`,
      { assigneeId: bob.userId },
    )
    // 403 with the shared authorization wording, not a distinguishable 422:
    // a different status here would let a caller probe for valid user ids.
    expect(result.status).toBe(403)

    // A well-formed UUID that simply does not exist must be indistinguishable
    // from a well-formed UUID that exists but is not a member. Both are refused
    // with identical wording, so the response cannot be used to enumerate users.
    const unknown = await ada.client.patch<{ error: { message: string } }>(
      `/api/tasks/${taskId}`,
      { assigneeId: randomUUID() },
    )
    expect(unknown.status).toBe(403)
    expect(result.body.error.message).toBe(unknown.body.error.message)

    // A malformed identifier is rejected as malformed, before any lookup happens.
    // `Membership.userId` is a `uuid` column, so the prefixed form could never be
    // stored; accepting it here used to surface as a PostgreSQL 500 instead.
    const malformed = await ada.client.patch<{
      error: { message: string; fieldErrors?: Record<string, string> }
    }>(`/api/tasks/${taskId}`, { assigneeId: 'usr_nonexistent' })
    expect(malformed.status).toBe(422)
    expect(malformed.body.error.fieldErrors?.assigneeId).toBeTruthy()

    const after = await ada.client.get<{ tasks: TaskDto[] }>(
      `/api/projects/${projectId}/tasks`,
    )
    expect(after.body.tasks[0]?.assigneeId).toBeNull()
  })

  it('refuses to edit a task in another user’s workspace', async () => {
    const ada = await makeUser('ada@example.com')
    const bob = await makeUser('bob@example.com')
    const workspaceId = await makeWorkspace(ada.client, 'Acme')
    const projectId = await makeProject(ada.client, workspaceId, 'Platform')
    const taskId = await makeTask(ada.client, projectId, 'Private task')

    const result = await bob.client.patch(`/api/tasks/${taskId}`, {
      dueDate: '2026-12-24T23:59:59.000Z',
    })
    expect(result.status).toBe(403)
  })
})

// --- dashboard ------------------------------------------------------------

describe('dashboard summary (FR-DASH-003, AC-DASH-03)', () => {
  it('reports isEmpty for a project with no tasks, not a zero-progress figure', async () => {
    const { client } = await makeUser('ada@example.com')
    const workspaceId = await makeWorkspace(client, 'Acme')
    const projectId = await makeProject(client, workspaceId, 'Platform')

    const result = await client.get<{
      dashboard: {
        totalTasks: number
        isEmpty: boolean
        byStage: Array<{ stage: string; label: string; count: number }>
      }
    }>(`/api/projects/${projectId}/dashboard`)

    expect(result.status).toBe(200)
    expect(result.body.dashboard.isEmpty).toBe(true)
    expect(result.body.dashboard.totalTasks).toBe(0)
    // Every fixed stage is present so the UI never has to invent a stage.
    expect(result.body.dashboard.byStage.map((s) => s.stage).sort()).toEqual([
      'BACKLOG',
      'DONE',
      'IN_PROGRESS',
      'IN_REVIEW',
    ])
  })

  it('counts tasks per stage and moves the count when a task changes stage', async () => {
    const { client } = await makeUser('ada@example.com')
    const workspaceId = await makeWorkspace(client, 'Acme')
    const projectId = await makeProject(client, workspaceId, 'Platform')
    const taskId = await makeTask(client, projectId, 'Counted task')

    const first = await client.get<{
      dashboard: {
        isEmpty: boolean
        totalTasks: number
        byStage: Array<{ stage: string; count: number }>
      }
    }>(`/api/projects/${projectId}/dashboard`)

    expect(first.body.dashboard.isEmpty).toBe(false)
    expect(first.body.dashboard.totalTasks).toBe(1)
    const countOf = (
      dashboard: { byStage: Array<{ stage: string; count: number }> },
      stage: string,
    ) => dashboard.byStage.find((s) => s.stage === stage)?.count
    expect(countOf(first.body.dashboard, 'BACKLOG')).toBe(1)
    expect(countOf(first.body.dashboard, 'DONE')).toBe(0)

    await client.patch(`/api/tasks/${taskId}`, { stage: 'DONE' })

    const second = await client.get<{
      dashboard: { byStage: Array<{ stage: string; count: number }> }
    }>(`/api/projects/${projectId}/dashboard`)
    expect(countOf(second.body.dashboard, 'BACKLOG')).toBe(0)
    expect(countOf(second.body.dashboard, 'DONE')).toBe(1)
  })

  it('counts overdue and due-soon tasks from real rows', async () => {
    const { client } = await makeUser('ada@example.com')
    const workspaceId = await makeWorkspace(client, 'Acme')
    const projectId = await makeProject(client, workspaceId, 'Platform')

    const past = await makeTask(client, projectId, 'Past due')
    const soon = await makeTask(client, projectId, 'Due soon')

    // 2020 is unambiguously past; 2099 is unambiguously not.
    await client.patch(`/api/tasks/${past}`, { dueDate: '2020-01-01T00:00:00.000Z' })
    await client.patch(`/api/tasks/${soon}`, { dueDate: '2099-01-01T00:00:00.000Z' })

    const result = await client.get<{
      dashboard: { overdue: number; dueSoon: number }
    }>(`/api/projects/${projectId}/dashboard`)

    expect(result.body.dashboard.overdue).toBe(1)
    expect(result.body.dashboard.dueSoon).toBe(0)
  })

  it('refuses a dashboard for a project the caller does not own', async () => {
    const ada = await makeUser('ada@example.com')
    const bob = await makeUser('bob@example.com')
    const workspaceId = await makeWorkspace(ada.client, 'Acme')
    const projectId = await makeProject(ada.client, workspaceId, 'Private')

    const result = await bob.client.get(`/api/projects/${projectId}/dashboard`)
    expect(result.status).toBe(403)
  })
})
