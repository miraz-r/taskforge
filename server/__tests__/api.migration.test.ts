/**
 * Legacy migration tests. Section 9 of the milestone.
 *
 * Verifies the import cannot be used to claim an account, another user's
 * workspace, or another user's identity; that it replaces any legacy id which is
 * not already a storable UUID, retains one that is, remaps on collision, is
 * idempotent, and rolls back on failure.
 *
 * Id policy: id columns are `uuid`, and PostgreSQL rejects the prefixed strings
 * the Phase 0 browser build minted (`wsp_…`). A legacy id is therefore retained
 * ONLY when it already matches UUID_TEXT and nothing occupies it; anything else
 * becomes a fresh UUID and is reported in `remapped`.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { startTestServer, type TestContext } from './support'
import { makeLegacyPbkdf2Record } from '../auth/password'

let ctx: TestContext

beforeEach(async () => {
  ctx = await startTestServer()
})
afterEach(async () => {
  await ctx.close()
})

const PASSWORD = 'a-good-password'
const EMAIL = 'ada@example.com'

/** Canonical 8-4-4-4-12 form, i.e. what a `uuid` column accepts. */
const UUID_TEXT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface RemapEntry {
  kind: string
  legacyId: string
  newId: string
}

interface Legacy {
  email: string
  password: string
  passwordHash: string
  workspaces: unknown[]
  projects: unknown[]
  tasks: unknown[]
  comments: unknown[]
}

async function legacyPayload(
  overrides: Partial<Legacy> = {},
): Promise<Legacy> {
  const passwordHash = await makeLegacyPbkdf2Record(PASSWORD)
  return {
    email: EMAIL,
    password: PASSWORD,
    passwordHash,
    workspaces: [],
    projects: [],
    tasks: [],
    comments: [],
    ...overrides,
  }
}

const migrate = (payload: unknown) =>
  ctx.client().post<{ report: Record<string, unknown> }>('/api/migrate/legacy', payload)

describe('ownership proof', () => {
  it('refuses a payload whose password does not match the supplied hash', async () => {
    const payload = await legacyPayload({
      workspaces: [
        { id: 'wsp_1', name: 'Acme', ownerEmail: EMAIL, createdAt: '2026-01-01' },
      ],
    })

    const attempt = await migrate({ ...payload, password: 'not-the-password' })

    expect(attempt.status).toBe(401)
    // Nothing was created.
    expect(ctx.store.counts().users).toBe(0)
    expect(ctx.store.counts().workspaces).toBe(0)
  })

  it('refuses a record whose iteration count is below the floor', async () => {
    // A tampered record claiming iterations=1 must not be accepted, or
    // verification becomes a no-op.
    const weak = `pbkdf2-sha256$1$${Buffer.from('salt').toString('base64')}$${Buffer.from(
      'hash',
    ).toString('base64')}`
    const attempt = await migrate({
      email: EMAIL,
      password: PASSWORD,
      passwordHash: weak,
      workspaces: [],
      projects: [],
      tasks: [],
      comments: [],
    })
    expect(attempt.status).toBe(422)
    expect(ctx.store.counts().users).toBe(0)
  })
})

describe('successful import', () => {
  it('imports the full hierarchy, replacing ids that are not storable UUIDs', async () => {
    const payload = await legacyPayload({
      workspaces: [
        { id: 'wsp_legacy', name: 'Acme Product', ownerEmail: EMAIL, createdAt: '2026-01-01' },
      ],
      projects: [
        {
          id: 'prj_legacy',
          workspaceId: 'wsp_legacy',
          name: 'Platform',
          description: 'Core platform work',
          colourToken: 'brand-600',
          createdAt: '2026-01-02',
        },
      ],
      tasks: [
        {
          id: 'tsk_legacy',
          projectId: 'prj_legacy',
          title: 'Ship it',
          description: '',
          stage: 'IN_PROGRESS',
          priority: 'HIGH',
          assigneeEmail: null,
          dueDate: null,
          createdAt: '2026-01-03',
        },
      ],
      comments: [
        {
          id: 'cmt_legacy',
          taskId: 'tsk_legacy',
          authorEmail: EMAIL,
          body: 'Started on this.',
          createdAt: '2026-01-04',
        },
      ],
    })

    const result = await migrate(payload)
    expect(result.status).toBe(200)

    const report = result.body.report as {
      alreadyMigrated: boolean
      counts: Record<string, number>
      rejected: unknown[]
      remapped: RemapEntry[]
    }
    expect(report.alreadyMigrated).toBe(false)
    expect(report.counts).toEqual({
      workspacesCreated: 1,
      projectsCreated: 1,
      tasksCreated: 1,
      commentsCreated: 1,
    })
    expect(report.rejected).toEqual([])

    // None of `wsp_legacy` / `prj_legacy` / `tsk_legacy` is a UUID, so every one
    // of them must be replaced, and every replacement must be reported.
    expect(report.remapped).toHaveLength(3)
    for (const entry of report.remapped) {
      expect(entry.newId).toMatch(UUID_TEXT)
      expect(entry.newId).not.toBe(entry.legacyId)
    }
    expect(report.remapped.map((entry) => entry.kind).sort()).toEqual([
      'project',
      'task',
      'workspace',
    ])

    const workspaceId = report.remapped.find((e) => e.kind === 'workspace')!.newId
    const projectId = report.remapped.find((e) => e.kind === 'project')!.newId
    const taskId = report.remapped.find((e) => e.kind === 'task')!.newId

    // Dependent references follow the remapped parents, so the hierarchy is
    // intact rather than pointing at ids that were never written.
    expect(await ctx.store.workspaces.findById(workspaceId)).not.toBeNull()
    expect((await ctx.store.projects.findById(projectId))?.workspaceId).toBe(
      workspaceId,
    )
    expect((await ctx.store.tasks.findById(taskId))?.projectId).toBe(projectId)
    expect(await ctx.store.comments.listByTask(taskId)).toHaveLength(1)

    // The legacy ids resolve to nothing: they were hints, never identities.
    expect(await ctx.store.workspaces.findById('wsp_legacy')).toBeNull()
    expect(await ctx.store.projects.findById('prj_legacy')).toBeNull()
    expect(await ctx.store.tasks.findById('tsk_legacy')).toBeNull()

    const counts = ctx.store.counts()
    expect(counts).toMatchObject({
      users: 1,
      workspaces: 1,
      projects: 1,
      tasks: 1,
      comments: 1,
      // Exactly one membership: the importer's own ownership.
      memberships: 1,
    })

    // The imported account can sign in with the legacy password.
    const client = ctx.client()
    expect(await client.signIn(EMAIL, PASSWORD)).toBe(200)
  })
})

describe('never trusts imported identities', () => {
  it('rejects a workspace the importer does not own, and reports it', async () => {
    const payload = await legacyPayload({
      workspaces: [
        { id: 'wsp_mine', name: 'Mine', ownerEmail: EMAIL, createdAt: '2026-01-01' },
        {
          id: 'wsp_theirs',
          name: 'Someone Elses',
          ownerEmail: 'victim@example.com',
          createdAt: '2026-01-01',
        },
      ],
    })

    const result = await migrate(payload)
    const report = result.body.report as {
      counts: Record<string, number>
      rejected: Array<{ kind: string; legacyId: string; reason: string }>
    }

    expect(report.counts.workspacesCreated).toBe(1)
    expect(report.rejected).toHaveLength(1)
    expect(report.rejected[0]).toMatchObject({
      kind: 'workspace',
      legacyId: 'wsp_theirs',
    })
    expect(report.rejected[0]?.reason).toContain('not owned')

    // The foreign workspace was never created, so its id is unusable.
    const foreign = await ctx
      .client()
      .get<{ workspaces: Array<{ id: string }> }>('/api/workspaces')
    expect(foreign.status).toBe(401)
    expect(ctx.store.counts().workspaces).toBe(1)
  })

  it('never accepts a memberships array, so no access can be granted', async () => {
    const payload = {
      ...(await legacyPayload({
        workspaces: [
          { id: 'wsp_mine', name: 'Mine', ownerEmail: EMAIL, createdAt: '2026-01-01' },
        ],
      })),
      // Every one of these is stripped by Zod before a handler sees it.
      memberships: [
        { userId: 'usr_attacker', workspaceId: 'wsp_mine', role: 'OWNER' },
      ],
      userId: 'usr_attacker',
    }

    const result = await migrate(payload)
    expect(result.status).toBe(200)

    // Exactly one membership exists, belonging to the newly created user.
    const memberships = ctx.store.counts().memberships
    expect(memberships).toBe(1)

    const session = await ctx
      .client()
      .post<{ user: { id: string } }>('/api/auth/sign-in', {
        email: EMAIL,
        password: PASSWORD,
      })
    expect(session.body.user.id).not.toBe('usr_attacker')
  })

  it('rejects a comment authored by a different account', async () => {
    const payload = await legacyPayload({
      workspaces: [
        { id: 'wsp_mine', name: 'Mine', ownerEmail: EMAIL, createdAt: '2026-01-01' },
      ],
      projects: [
        {
          id: 'prj_1',
          workspaceId: 'wsp_mine',
          name: 'P',
          description: '',
          colourToken: null,
          createdAt: '2026-01-02',
        },
      ],
      tasks: [
        {
          id: 'tsk_1',
          projectId: 'prj_1',
          title: 'T',
          description: '',
          stage: 'BACKLOG',
          priority: 'NONE',
          assigneeEmail: 'someone@else.com',
          dueDate: null,
          createdAt: '2026-01-03',
        },
      ],
      comments: [
        {
          id: 'cmt_1',
          taskId: 'tsk_1',
          authorEmail: 'someone@else.com',
          body: 'not mine',
          createdAt: '2026-01-04',
        },
      ],
    })

    const result = await migrate(payload)
    const report = result.body.report as {
      counts: Record<string, number>
      rejected: Array<{ kind: string; legacyId: string; reason: string }>
    }

    expect(report.counts.commentsCreated).toBe(0)
    expect(report.counts.tasksCreated).toBe(1)
    // Both the foreign author and the foreign assignee are reported, not dropped.
    const kinds = report.rejected.map((r) => r.kind).sort()
    expect(kinds).toEqual(['comment', 'task-assignee'])
  })

  it('reports an orphan project rather than importing it', async () => {
    const payload = await legacyPayload({
      projects: [
        {
          id: 'prj_orphan',
          workspaceId: 'wsp_missing',
          name: 'Orphan',
          description: '',
          colourToken: null,
          createdAt: '2026-01-02',
        },
      ],
    })
    const result = await migrate(payload)
    const report = result.body.report as {
      counts: Record<string, number>
      rejected: Array<{ kind: string; reason: string }>
    }
    expect(report.counts.projectsCreated).toBe(0)
    expect(report.rejected[0]).toMatchObject({ kind: 'project' })
    expect(report.rejected[0]?.reason).toContain('parent workspace')
  })
})

describe('id collisions', () => {
  it('remaps a colliding workspace id and rewrites child references', async () => {
    // Pre-create a workspace that already owns the id the payload claims.
    const existing = ctx.store.seedWorkspace({ id: 'wsp_legacy', name: 'Already Here', ownerId: 'usr_other' })

    const payload = await legacyPayload({
      workspaces: [
        { id: 'wsp_legacy', name: 'Imported', ownerEmail: EMAIL, createdAt: '2026-01-01' },
      ],
      projects: [
        {
          id: 'prj_child',
          workspaceId: 'wsp_legacy',
          name: 'Child',
          description: '',
          colourToken: null,
          createdAt: '2026-01-02',
        },
      ],
    })

    const result = await migrate(payload)
    const report = result.body.report as {
      counts: Record<string, number>
      remapped: Array<{ kind: string; legacyId: string; newId: string }>
    }

    expect(report.counts.workspacesCreated).toBe(1)
    expect(report.counts.projectsCreated).toBe(1)

    // Both legacy ids are unstorable, so both are replaced. The workspace is
    // replaced for two independent reasons: it collides, and it is not a UUID.
    expect(report.remapped).toHaveLength(2)
    const wsRemap = report.remapped.find((e) => e.kind === 'workspace')!
    const prjRemap = report.remapped.find((e) => e.kind === 'project')!
    expect(wsRemap.legacyId).toBe('wsp_legacy')
    expect(wsRemap.newId).toMatch(UUID_TEXT)
    expect(wsRemap.newId).not.toBe('wsp_legacy')
    expect(prjRemap.newId).toMatch(UUID_TEXT)

    // The pre-existing row is untouched.
    const stillThere = await ctx.store.workspaces.findById(existing.id)
    expect(stillThere?.name).toBe('Already Here')

    // The child was re-parented onto the NEW workspace id, not the old one.
    const listed = await ctx.store.projects.listByWorkspace(wsRemap.newId, 'ACTIVE')
    expect(listed).toHaveLength(1)
    expect(listed[0]?.id).toBe(prjRemap.newId)

    // And nothing was written under the colliding id.
    const underOld = await ctx.store.projects.listByWorkspace('wsp_legacy', 'ACTIVE')
    expect(underOld).toHaveLength(0)
  })

  it('retains a legacy id that is already a valid UUID and free', async () => {
    // The counterpart to the replacement rules above: remapping must not become
    // unconditional. An id the column can already store, and that nothing
    // occupies, has no reason to change.
    const keepWorkspace = '11111111-1111-4111-8111-111111111111'
    const keepProject = '22222222-2222-4222-8222-222222222222'

    const payload = await legacyPayload({
      workspaces: [
        {
          id: keepWorkspace,
          name: 'Kept',
          ownerEmail: EMAIL,
          createdAt: '2026-01-01',
        },
      ],
      projects: [
        {
          id: keepProject,
          workspaceId: keepWorkspace,
          name: 'Kept Child',
          description: '',
          colourToken: null,
          createdAt: '2026-01-02',
        },
      ],
    })

    const result = await migrate(payload)
    expect(result.status).toBe(200)

    const report = result.body.report as {
      counts: Record<string, number>
      remapped: RemapEntry[]
    }

    expect(report.counts.workspacesCreated).toBe(1)
    expect(report.counts.projectsCreated).toBe(1)
    expect(report.remapped).toEqual([])

    // Retained verbatim, and the child still points at it.
    expect(await ctx.store.workspaces.findById(keepWorkspace)).not.toBeNull()
    const child = await ctx.store.projects.findById(keepProject)
    expect(child?.workspaceId).toBe(keepWorkspace)
  })

  it('replaces a valid UUID that is already occupied', async () => {
    // Retention requires BOTH conditions. A syntactically valid id still yields
    // to an existing row rather than colliding with the primary key.
    const taken = '33333333-3333-4333-8333-333333333333'
    ctx.store.seedWorkspace({ id: taken, name: 'Occupied', ownerId: 'usr_other' })

    const payload = await legacyPayload({
      workspaces: [
        { id: taken, name: 'Imported', ownerEmail: EMAIL, createdAt: '2026-01-01' },
      ],
    })

    const result = await migrate(payload)
    expect(result.status).toBe(200)

    const report = result.body.report as { remapped: RemapEntry[] }
    expect(report.remapped).toHaveLength(1)
    expect(report.remapped[0]?.legacyId).toBe(taken)
    expect(report.remapped[0]?.newId).toMatch(UUID_TEXT)
    expect(report.remapped[0]?.newId).not.toBe(taken)

    // The pre-existing row kept its id and its name.
    const stillThere = await ctx.store.workspaces.findById(taken)
    expect(stillThere?.name).toBe('Occupied')
  })
})

describe('idempotency', () => {
  it('a second run makes no changes and reports alreadyMigrated', async () => {
    const payload = await legacyPayload({
      workspaces: [
        { id: 'wsp_mine', name: 'Mine', ownerEmail: EMAIL, createdAt: '2026-01-01' },
      ],
      projects: [
        {
          id: 'prj_1',
          workspaceId: 'wsp_mine',
          name: 'P',
          description: '',
          colourToken: null,
          createdAt: '2026-01-02',
        },
      ],
    })

    const first = await migrate(payload)
    expect((first.body.report as { alreadyMigrated: boolean }).alreadyMigrated).toBe(false)
    const afterFirst = ctx.store.counts()

    const second = await migrate(payload)
    expect(second.status).toBe(200)
    const report = second.body.report as {
      alreadyMigrated: boolean
      counts: Record<string, number>
    }
    expect(report.alreadyMigrated).toBe(true)
    expect(report.counts).toEqual({
      workspacesCreated: 0,
      projectsCreated: 0,
      tasksCreated: 0,
      commentsCreated: 0,
    })

    // Byte-for-byte the same row counts: no duplication.
    expect(ctx.store.counts()).toEqual(afterFirst)
  })
})

describe('atomicity', () => {
  it('rolls the whole import back when a step fails', async () => {
    const payload = await legacyPayload({
      workspaces: [
        { id: 'wsp_a', name: 'A', ownerEmail: EMAIL, createdAt: '2026-01-01' },
        { id: 'wsp_b', name: 'B', ownerEmail: EMAIL, createdAt: '2026-01-01' },
      ],
    })

    // Make the second workspace insertion fail, after the first has succeeded.
    const original = ctx.store.workspaces.insert.bind(ctx.store.workspaces)
    let calls = 0
    ctx.store.workspaces.insert = (async (input: Parameters<typeof original>[0]) => {
      calls += 1
      if (calls === 2) throw new Error('simulated storage failure')
      return original(input)
    }) as typeof original

    const result = await migrate(payload)
    expect(result.status).toBe(500)

    // Nothing survived: not the user, not the first workspace, not the membership.
    const counts = ctx.store.counts()
    expect(counts.users).toBe(0)
    expect(counts.workspaces).toBe(0)
    expect(counts.memberships).toBe(0)
  })
})

describe('payload limits', () => {
  it('rejects an oversized payload', async () => {
    const payload = await legacyPayload({
      workspaces: Array.from({ length: 51 }, (_, i) => ({
        id: `wsp_${i}`,
        name: `W${i}`,
        ownerEmail: EMAIL,
        createdAt: '2026-01-01',
      })),
    })
    const result = await migrate(payload)
    expect(result.status).toBe(422)
    expect(ctx.store.counts().users).toBe(0)
  })
})
