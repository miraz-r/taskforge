/**
 * DATABASE-DEPENDENT INTEGRATION TESTS.
 *
 * ⚠️  THIS SUITE IS DESTRUCTIVE AND OPT-IN.  ⚠️
 * It empties every table between and after tests, so it only runs against the
 * disposable `taskforge_test` database — never the application database. The
 * guard below verifies that by querying the live PostgreSQL connection, not by
 * trusting an environment variable. Running this suite against `taskforge` once
 * deleted a real registered account; the guard exists so that cannot recur.
 *
 * A plain `npm run verify` SKIPS this file with a warning naming `npm run
 * test:db`. A green `npm run verify` therefore does NOT mean the database layer
 * is verified — it means the database layer was not exercised.
 *
 * What only a real database can prove, and what the in-memory store cannot:
 *   - Prisma migrations apply cleanly to a real schema.
 *   - Unique constraints actually reject a concurrent duplicate registration
 *     (the `P2002` / `23505` path the service relies on).
 *   - `ON DELETE CASCADE` removes children (deleting a workspace removes its
 *     projects, tasks and comments; deleting a user removes sessions,
 *     memberships and notifications while tasks assigned to them are kept with
 *     their assignee set to NULL).
 *   - Transaction rollback is real: a failure inside `store.transaction` leaves
 *     no partial rows, even though the migration service performs many writes.
 *   - Query-level workspace isolation: `listByMember` filters in SQL via the
 *     membership join, not in application memory.
 *   - Prisma enum mapping for TaskStage, TaskPriority, ProjectState, NotificationKind.
 *   - Real connection pooling and the pg driver adapter.
 *
 * To run:
 *   1. Provide PostgreSQL and set DATABASE_URL and TEST_DATABASE_URL in `.env`.
 *   2. `npm run test:db` — it verifies the target, migrates the test database,
 *      then runs this suite. Do not invoke vitest here directly.
 *
 * The tests deliberately use a THROWAWAY database and clean up after themselves.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { PrismaStore } from '../../repositories/prisma'
import type { Store } from '../../repositories/store'
import { AuthService, isUniqueViolation } from '../../services/auth.service'
import { MigrateService } from '../../services/migrate.service'
import { WorkspaceService } from '../../services/workspace.service'
import { ProjectService } from '../../services/project.service'
import { NotificationService } from '../../services/notification.service'
import { TaskService } from '../../services/project.service'
import { createApp, createServices } from '../../app'
import { loadConfig } from '../../config'
import { makeLegacyPbkdf2Record } from '../../auth/password'
import {
  assertDisposableDatabase,
  describeIdentity,
  probeDatabaseIdentity,
} from '../../testing/dbSafety'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

const DATABASE_URL = process.env.DATABASE_URL
const RUN_DB_TESTS = process.env.RUN_DB_TESTS === 'true'

/**
 * THIS SUITE DELETES EVERY ROW between tests, so it must only ever be pointed at
 * a disposable development database. It was once run against the application
 * database and deleted a real registered account, so the guard below is the
 * load-bearing part of this file.
 *
 * The rule is that the target must be *positively identified* as disposable by
 * asking PostgreSQL, not by reading a variable that merely claims the target is
 * safe. A stale `.env`, a typo, or a copied shell export could otherwise point
 * this suite at the application database, and a skipped suite that reports green
 * is worse than one that refuses to start.
 *
 * Checks, in order of authority:
 *
 *   1. `NODE_ENV=production` is refused outright.
 *   2. The connected database name, read from the live connection with
 *      `current_database()`, must end in `_test`. `taskforge` cannot match, so no
 *      configuration mistake alone can target the application database.
 *   3. It must not be the application database named by
 *      `TASKFORGE_APPLICATION_DATABASE`, when the runner supplies one.
 *   4. The server must be on loopback, so a remote database can never be wiped.
 *   5. `TASKFORGE_DB_TEST_TARGET` must equal the name the SERVER reported, so
 *      running destructively requires naming the target on purpose.
 *
 * This runs at module scope with `await` so it completes before either
 * `describe` block can reach a destructive hook. A throw here fails the file
 * loudly instead of quietly skipping it.
 *
 * The teardown needs DELETE, which `taskforge_app` deliberately does not have, so
 * the suite must be given the migration role's URL — see `npm run test:db`.
 */
const describeDb = RUN_DB_TESTS ? describe : describe.skip

if (!RUN_DB_TESTS) {
  console.warn(
    '[db tests] SKIPPED — this suite deletes all rows, so it is opt-in. Run ' +
      '`npm run test:db` to exercise it against the disposable test database. ' +
      'The database layer is NOT verified by a plain `npm run verify`.',
  )
}

if (RUN_DB_TESTS) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[db tests] REFUSING TO RUN with NODE_ENV=production. This suite deletes ' +
        'all rows in the target database.',
    )
  }
  if (!DATABASE_URL) {
    throw new Error(
      '[db tests] RUN_DB_TESTS=true but DATABASE_URL is unset. Use ' +
        '`npm run test:db`, which supplies it from .env.',
    )
  }

  // Authoritative check: query the live server rather than trust any variable.
  const identity = await probeDatabaseIdentity(DATABASE_URL)
  assertDisposableDatabase(identity, process.env.TASKFORGE_APPLICATION_DATABASE ?? '')

  // Secondary: the runner must have named the same target deliberately.
  const confirmed = process.env.TASKFORGE_DB_TEST_TARGET
  if (confirmed !== identity.database) {
    throw new Error(
      '[db tests] REFUSING TO RUN. TASKFORGE_DB_TEST_TARGET is ' +
        `${confirmed ?? '(unset)'} but the server reports "${identity.database}". ` +
        'This suite deletes all rows, so the target must be named explicitly and ' +
        'must match. Use `npm run test:db`.',
    )
  }

  console.log(
    `[db tests] target verified against the server: ${describeIdentity(identity)}`,
  )
}

/**
 * Empties every table, children before parents, inside one transaction.
 *
 * Lives at module scope so both describe blocks share it. Uses the generated
 * client directly rather than the `Store` interface, because the interface
 * deliberately exposes no bulk delete — test teardown is not a product
 * operation, and no permanent-deletion path exists in the API.
 */
async function cleanAll(store: PrismaStore): Promise<void> {
  const client = (
    store as unknown as { prisma: Record<string, { deleteMany: (a: unknown) => Promise<unknown> }> }
  ).prisma
  await client.notification.deleteMany({})
  await client.comment.deleteMany({})
  await client.task.deleteMany({})
  await client.project.deleteMany({})
  await client.membership.deleteMany({})
  await client.workspace.deleteMany({})
  await client.session.deleteMany({})
  await client.user.deleteMany({})
}

/**
 * Row counts for every application table, read through the generated client
 * directly because the `Store` interface deliberately exposes no bulk read.
 *
 * Teardown is not a product operation either, so reaching past the interface
 * here is consistent with `cleanAll` above.
 */
async function countRows(
  store: PrismaStore,
): Promise<Record<string, number>> {
  const client = (
    store as unknown as {
      prisma: Record<string, { count: () => Promise<number> }>
    }
  ).prisma
  const entries = await Promise.all(
    (
      [
        'user',
        'session',
        'workspace',
        'membership',
        'project',
        'task',
        'comment',
        'notification',
      ] as const
    ).map(
      async (model) => [model, await client[model]!.count()] as const,
    ),
  )
  return Object.fromEntries(entries)
}

/**
 * Wraps a store so that `tasks.insert` fails on a chosen call.
 *
 * The payload row limit cannot demonstrate rollback: `assertWithinLimits` runs
 * before `store.transaction` opens, so exceeding it rejects without a single
 * write having been attempted. This injects the failure at the repository
 * boundary instead, mid-transaction, which is the only way to prove that earlier
 * writes are undone.
 *
 * A decorator local to this file. No production-only failure hook is added.
 *
 * `calls` is shared with the decorated transaction-scoped store, which
 * `PrismaStore.transaction` constructs itself, so counting has to be by
 * reference rather than by closure over one instance.
 */
function failingOnTaskInsert(
  inner: PrismaStore,
  calls: { count: number },
  failOnCall: number,
): Store {
  const decorate = (base: PrismaStore): Store =>
    ({
      ...base,
      tasks: {
        ...base.tasks,
        insert: (input: Parameters<Store['tasks']['insert']>[0]) => {
          calls.count += 1
          if (calls.count === failOnCall) {
            return Promise.reject(new Error('simulated task insert failure'))
          }
          return base.tasks.insert(input)
        },
      },
      transaction: <T,>(work: (s: Store) => Promise<T>) =>
        base.transaction((tx) =>
          work(decorate(tx as unknown as PrismaStore)),
        ),
    }) as Store

  return decorate(inner)
}

describeDb('database layer', () => {
  let store: PrismaStore

  beforeAll(() => {
    store = PrismaStore.fromUrl(DATABASE_URL as string)
  })

  afterAll(async () => {
    await cleanAll(store)
  })

  beforeEach(async () => {
    // Clean slate between tests so isolation assertions are meaningful.
    await cleanAll(store)
  })

  it('enforces unique email at the database level', async () => {
    const auth = new AuthService(store, 24)
    const first = await auth.register({
      email: 'dup@example.com',
      password: 'a-good-password',
      displayName: 'First',
    })
    expect(first.user.email).toBe('dup@example.com')

    // The service checks first, so drive the constraint directly to prove the
    // database would also reject it — this is what the P2002 handler relies on.
    await expect(
      store.users.insert({
        email: 'dup@example.com',
        displayName: 'Second',
        passwordHash: 'irrelevant',
      }),
    ).rejects.toThrow()
  })

  it('rejects a truly concurrent duplicate insert: exactly one wins', async () => {
    // Sequential attempts cannot prove the race path: the service checks first,
    // so only simultaneous inserts collide inside the database. Firing both
    // without awaiting either is what makes the loser hit the constraint.
    const attempt = () =>
      store.users.insert({
        email: 'race@example.com',
        displayName: 'Racer',
        passwordHash: 'irrelevant',
      })
    const [first, second] = await Promise.allSettled([attempt(), attempt()])

    const winners = [first, second].filter((r) => r.status === 'fulfilled')
    const losers = [first, second].filter((r) => r.status === 'rejected')
    expect(winners).toHaveLength(1)
    expect(losers).toHaveLength(1)

    // The loser hit the unique constraint, not some other failure. This is the
    // P2002/23505 path AuthService.register relies on when it loses the race.
    const reason = (losers[0] as PromiseRejectedResult).reason
    expect(isUniqueViolation(reason)).toBe(true)

    // Exactly one row survived.
    expect(await store.users.findByEmail('race@example.com')).not.toBeNull()
    expect((await countRows(store)).user).toBe(1)
  })

  it('persists and reads back every entity', async () => {
    const auth = new AuthService(store, 24)
    const workspaces = new WorkspaceService(store, 2)
    const notifications = new NotificationService(store)
    const projects = new ProjectService(store, notifications)
    const tasks = new TaskService(store, notifications)

    const { user } = await auth.register({
      email: 'full@example.com',
      password: 'a-good-password',
      displayName: 'Full',
    })
    const actor = { userId: user.id, email: user.email, sessionId: 'x' }

    const workspace = await workspaces.create(actor, { name: 'Acme' })
    const project = await projects.create(actor, workspace.id, {
      name: 'Platform',
      colourToken: 'brand-600',
    })
    const task = await tasks.create(actor, project.id, {
      title: 'Ship it',
      priority: 'HIGH',
      dueDate: new Date('2026-12-01T00:00:00.000Z'),
    })
    const updated = await tasks.update(actor, task.id, { stage: 'IN_REVIEW' })
    expect(updated.stage).toBe('IN_REVIEW')

    const comment = await tasks.addComment(actor, task.id, 'On it.')
    expect(comment.authorId).toBe(user.id)

    const loaded = await tasks.list(actor, project.id)
    expect(loaded).toHaveLength(1)
    expect(loaded[0]?.dueDate).toBeInstanceOf(Date)

    // Enum mapping survived the round trip.
    const archived = await projects.setArchived(actor, project.id, true)
    expect(archived.state).toBe('ARCHIVED')
    expect(archived.archivedAt).toBeInstanceOf(Date)
  })

  it('round-trips every NotificationKind and MembershipRole through PostgreSQL', async () => {
    const auth = new AuthService(store, 24)
    const workspaces = new WorkspaceService(store, 2)

    const { user } = await auth.register({
      email: 'enums@example.com',
      password: 'a-good-password',
      displayName: 'Enums',
    })
    const actor = { userId: user.id, email: user.email, sessionId: 'x' }
    const workspace = await workspaces.create(actor, { name: 'Enum Team' })

    // Every notification kind survives the write-read cycle, not just the ones
    // the other tests happen to emit.
    const kinds = [
      'TASK_COMMENTED',
      'TASK_ASSIGNED',
      'TASK_STAGE_CHANGED',
      'PROJECT_ARCHIVED',
      'PROJECT_RESTORED',
    ] as const
    for (const kind of kinds) {
      await store.notifications.insert({
        userId: user.id,
        projectId: null,
        kind,
        message: `kind:${kind}`,
      })
    }
    const listed = await store.notifications.listForUser(user.id, 10)
    expect(listed.map((n) => n.kind).sort()).toEqual([...kinds].sort())
    expect(listed.every((n) => n.createdAt instanceof Date)).toBe(true)
    expect(await store.notifications.countUnread(user.id)).toBe(kinds.length)

    // Both membership roles persist. The OWNER row is written by workspace
    // creation; MEMBER is inserted directly because invitations are Coming Soon
    // (D-10) while the column still has to store the value correctly.
    const other = await auth.register({
      email: 'enums-member@example.com',
      password: 'a-good-password',
      displayName: 'Member',
    })
    await store.workspaces.memberships.insert({
      userId: other.user.id,
      workspaceId: workspace.id,
      role: 'MEMBER',
    })
    expect(
      (await store.workspaces.memberships.find(user.id, workspace.id))?.role,
    ).toBe('OWNER')
    expect(
      (await store.workspaces.memberships.find(other.user.id, workspace.id))?.role,
    ).toBe('MEMBER')
  })

  it('scopes listByMember in SQL, not in memory', async () => {
    const auth = new AuthService(store, 24)
    const workspaces = new WorkspaceService(store, 2)

    const a = await auth.register({
      email: 'a@example.com',
      password: 'a-good-password',
      displayName: 'A',
    })
    const b = await auth.register({
      email: 'b@example.com',
      password: 'a-good-password',
      displayName: 'B',
    })

    await workspaces.create(
      { userId: a.user.id, email: a.user.email, sessionId: 'x' },
      { name: 'A Team' },
    )
    await workspaces.create(
      { userId: b.user.id, email: b.user.email, sessionId: 'x' },
      { name: 'B Team' },
    )

    const bList = await workspaces.list({
      userId: b.user.id,
      email: b.user.email,
      sessionId: 'x',
    })
    expect(bList.map((w) => w.name)).toEqual(['B Team'])
  })

  it('isolates Ada and Bob task and comment data through the PG-backed store', async () => {
    const auth = new AuthService(store, 24)
    const workspaces = new WorkspaceService(store, 2)
    const notifications = new NotificationService(store)
    const projects = new ProjectService(store, notifications)
    const tasks = new TaskService(store, notifications)

    const ada = await auth.register({
      email: 'ada-iso@example.com',
      password: 'a-good-password',
      displayName: 'Ada',
    })
    const bob = await auth.register({
      email: 'bob-iso@example.com',
      password: 'a-good-password',
      displayName: 'Bob',
    })
    const adaActor = { userId: ada.user.id, email: ada.user.email, sessionId: 'x' }
    const bobActor = { userId: bob.user.id, email: bob.user.email, sessionId: 'x' }

    const adaWorkspace = await workspaces.create(adaActor, { name: 'Ada Team' })
    const adaProject = await projects.create(adaActor, adaWorkspace.id, {
      name: 'Ada Project',
    })
    const adaTask = await tasks.create(adaActor, adaProject.id, { title: 'Ada Task' })
    await tasks.addComment(adaActor, adaTask.id, 'Ada note.')

    const bobWorkspace = await workspaces.create(bobActor, { name: 'Bob Team' })
    const bobProject = await projects.create(bobActor, bobWorkspace.id, {
      name: 'Bob Project',
    })

    // Bob is a stranger to Ada's workspace: reads and writes fail identically,
    // revealing nothing about whether the rows exist.
    await expect(tasks.list(bobActor, adaProject.id)).rejects.toThrow(
      'You do not have access to that resource.',
    )
    await expect(
      tasks.update(bobActor, adaTask.id, { title: 'Hijacked' }),
    ).rejects.toThrow('You do not have access to that resource.')
    await expect(
      tasks.addComment(bobActor, adaTask.id, 'Snooping.'),
    ).rejects.toThrow('You do not have access to that resource.')
    await expect(tasks.listComments(bobActor, adaTask.id)).rejects.toThrow(
      'You do not have access to that resource.',
    )

    // The refusal works both ways.
    await expect(
      tasks.create(adaActor, bobProject.id, { title: 'Intruder' }),
    ).rejects.toThrow('You do not have access to that resource.')

    // Nothing changed and nothing leaked.
    const adaTasks = await tasks.list(adaActor, adaProject.id)
    expect(adaTasks).toHaveLength(1)
    expect(adaTasks[0]?.title).toBe('Ada Task')
    expect(await tasks.listComments(adaActor, adaTask.id)).toHaveLength(1)
    expect((await workspaces.list(bobActor)).map((w) => w.name)).toEqual([
      'Bob Team',
    ])
  })

  it('cascades deletes from workspace to tasks and comments', async () => {
    const auth = new AuthService(store, 24)
    const workspaces = new WorkspaceService(store, 2)
    const notifications = new NotificationService(store)
    const projects = new ProjectService(store, notifications)
    const tasks = new TaskService(store, notifications)

    const { user } = await auth.register({
      email: 'cascade@example.com',
      password: 'a-good-password',
      displayName: 'C',
    })
    const actor = { userId: user.id, email: user.email, sessionId: 'x' }
    const workspace = await workspaces.create(actor, { name: 'Doomed' })
    const project = await projects.create(actor, workspace.id, { name: 'P' })
    const task = await tasks.create(actor, project.id, { title: 'T' })
    await tasks.addComment(actor, task.id, 'bye')

    // Remove the parent through a raw delete so cascade is what does the work.
    //
    // Reached via `store.prisma`, the same way `cleanAll` above does, because the
    // `Store` interface deliberately exposes no delete at all (FR-PRJ-012). It is
    // NOT reached through `store.transaction`: that callback receives a
    // PrismaStore whose collections are plural (`workspaces`), whereas Prisma's
    // model delegates are singular (`workspace`). Casting one to the other type-
    // checked cleanly and then failed at runtime.
    const client = (
      store as unknown as {
        prisma: { workspace: { delete: (a: unknown) => Promise<unknown> } }
      }
    ).prisma
    await client.workspace.delete({ where: { id: workspace.id } })

    // The whole ownership chain went with it: project, task and comment.
    expect(await store.workspaces.findById(workspace.id)).toBeNull()
    expect(await store.projects.findById(project.id)).toBeNull()
    expect(await store.tasks.findById(task.id)).toBeNull()
    expect(await store.comments.listByTask(task.id)).toEqual([])
  })

  it('cascades a user delete to sessions, memberships and notifications, and nulls assignees', async () => {
    const auth = new AuthService(store, 24)
    const workspaces = new WorkspaceService(store, 2)
    const notifications = new NotificationService(store)
    const projects = new ProjectService(store, notifications)
    const tasks = new TaskService(store, notifications)

    // Ada owns the workspace so the chain survives Bob. Bob is the member whose
    // deletion is under test.
    const ada = await auth.register({
      email: 'owner-cascade@example.com',
      password: 'a-good-password',
      displayName: 'Ada',
    })
    const adaActor = { userId: ada.user.id, email: ada.user.email, sessionId: 'x' }
    const workspace = await workspaces.create(adaActor, { name: 'Ada Team' })
    const project = await projects.create(adaActor, workspace.id, { name: 'P' })
    const task = await tasks.create(adaActor, project.id, { title: 'T' })

    const bob = await auth.register({
      email: 'member-cascade@example.com',
      password: 'a-good-password',
      displayName: 'Bob',
    })
    const bobActor = { userId: bob.user.id, email: bob.user.email, sessionId: 'x' }

    // Bob joins as MEMBER through the store directly: invitations are Coming
    // Soon (D-10), so no service path can add him, but the row is what the
    // foreign key constrains.
    await store.workspaces.memberships.insert({
      userId: bob.user.id,
      workspaceId: workspace.id,
      role: 'MEMBER',
    })
    await tasks.update(adaActor, task.id, { assigneeId: bob.user.id })
    expect((await store.tasks.findById(task.id))?.assigneeId).toBe(bob.user.id)

    // One notification from the assignment above, plus one explicit.
    await store.notifications.insert({
      userId: bob.user.id,
      projectId: project.id,
      kind: 'TASK_COMMENTED',
      message: 'Someone commented.',
    })
    await tasks.addComment(bobActor, task.id, 'Bob was here.')
    await tasks.addComment(adaActor, task.id, 'Ada was here.')

    // Two users, two sessions, two memberships, two comments.
    const before = await countRows(store)
    expect(before.user).toBe(2)
    expect(before.session).toBe(2)
    expect(before.membership).toBe(2)
    expect(before.comment).toBe(2)

    // Delete Bob through a raw delete. The Store interface deliberately exposes
    // no delete (FR-PRJ-012); reached via `store.prisma` like `cleanAll` and the
    // workspace-cascade test above.
    const client = (
      store as unknown as {
        prisma: { user: { delete: (a: unknown) => Promise<unknown> } }
      }
    ).prisma
    await client.user.delete({ where: { id: bob.user.id } })

    expect(await store.users.findById(bob.user.id)).toBeNull()
    // Sessions, memberships and notifications follow the user.
    expect((await countRows(store)).session).toBe(1)
    expect(
      await store.workspaces.memberships.find(bob.user.id, workspace.id),
    ).toBeNull()
    expect(
      await store.workspaces.memberships.find(ada.user.id, workspace.id),
    ).not.toBeNull()
    expect(await notifications.list(bob.user.id, 10)).toEqual([])
    // The task survives with its assignee cleared, not deleted: the assignee
    // foreign key is ON DELETE SET NULL.
    const surviving = await store.tasks.findById(task.id)
    expect(surviving).not.toBeNull()
    expect(surviving?.assigneeId).toBeNull()
    // Bob's comment went with him (author cascade); Ada's remains.
    const comments = await store.comments.listByTask(task.id)
    expect(comments.map((c) => c.body)).toEqual(['Ada was here.'])
  })

  it('rolls back a multi-write migration atomically', async () => {
    const passwordHash = await makeLegacyPbkdf2Record('a-good-password')

    // Seed data that predates the import, so "rolled back" can be distinguished
    // from "wiped": the baseline is not zero.
    const auth = new AuthService(store, 24)
    const workspaces = new WorkspaceService(store, 2)
    const { user: preexistingUser } = await auth.register({
      email: 'preexisting@example.com',
      password: 'a-good-password',
      displayName: 'Pre',
    })
    const preexisting = await workspaces.create(
      { userId: preexistingUser.id, email: preexistingUser.email, sessionId: 'x' },
      { name: 'Untouched' },
    )
    const baseline = await countRows(store)
    expect(baseline.user).toBe(1)
    expect(baseline.workspace).toBe(1)
    expect(baseline.task).toBe(0)

    // A comment whose task id is unknown is *rejected*, not fatal, and exceeding
    // the payload row limit is checked before the transaction opens — neither can
    // demonstrate rollback. Duplicate task ids used to work here by colliding on
    // the primary key, but duplicate ids are now legitimately remapped to distinct
    // UUIDs, so the failure is injected at the store boundary instead: the second
    // task insert rejects, by which time the user, workspace, project and first
    // task have all already been written.
    const calls = { count: 0 }
    const migrate = new MigrateService(failingOnTaskInsert(store, calls, 2))

    const payload = {
      email: 'rollback@example.com',
      password: 'a-good-password',
      passwordHash,
      workspaces: [
        { id: 'wsp_rb', name: 'RB', ownerEmail: 'rollback@example.com', createdAt: '' },
      ],
      projects: [
        {
          id: 'prj_rb',
          workspaceId: 'wsp_rb',
          name: 'P',
          description: '',
          colourToken: null,
          createdAt: '',
        },
      ],
      tasks: [
        {
          id: 'tsk_one',
          projectId: 'prj_rb',
          title: 'One',
          description: '',
          stage: 'BACKLOG' as const,
          priority: 'NONE' as const,
          assigneeEmail: null,
          dueDate: null,
          createdAt: '',
        },
        {
          id: 'tsk_two',
          projectId: 'prj_rb',
          title: 'Two',
          description: '',
          stage: 'BACKLOG' as const,
          priority: 'NONE' as const,
          assigneeEmail: null,
          dueDate: null,
          createdAt: '',
        },
      ],
      comments: [],
    }

    await expect(migrate.importLegacy(payload)).rejects.toThrow(
      'simulated task insert failure',
    )

    // The failure really did land mid-transaction: one task insert was allowed
    // through before the second was refused.
    expect(calls.count).toBe(2)

    // Nothing survived. Checked by row count rather than by legacy id, because a
    // remapped id would be absent whether or not the transaction rolled back —
    // that assertion could not tell the two cases apart.
    expect(await store.users.findByEmail('rollback@example.com')).toBeNull()
    expect(await countRows(store)).toEqual(baseline)

    // Pre-existing data is untouched by the failed transaction.
    expect(await store.users.findByEmail('preexisting@example.com')).not.toBeNull()
    expect((await store.workspaces.findById(preexisting.id))?.name).toBe('Untouched')
  })
})

describeDb('real HTTP against a real database', () => {
  let server: Server
  let baseUrl: string
  let store: PrismaStore
  let config: ReturnType<typeof loadConfig>

  beforeAll(async () => {
    config = loadConfig({
      NODE_ENV: 'test',
      DATABASE_URL: DATABASE_URL as string,
      COOKIE_SECURE: 'false',
      TRUST_PROXY: 'false',
      AUTH_RATE_LIMIT: '1000',
    } as unknown as NodeJS.ProcessEnv)

    store = PrismaStore.fromUrl(config.DATABASE_URL)
    const services = createServices(store, config)
    const app = createApp({ config, store, services })

    server = await new Promise((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener))
    })
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    // Leave the database as we found it. `beforeEach` already isolates each test,
    // but without this the rows these tests create survive the run and the
    // development database is left dirty.
    await cleanAll(store)
  })

  beforeEach(() => cleanAll(store))

  it('rejects a duplicate registration through the HTTP API (real constraint)', async () => {
    const body = JSON.stringify({
      email: 'http-dup@example.com',
      password: 'a-good-password',
      displayName: 'First',
    })
    const first = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    })
    expect(first.status).toBe(201)

    const second = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'http-dup@example.com',
        password: 'a-good-password',
        displayName: 'Second',
      }),
    })
    expect(second.status).toBe(409)
  })

  it('enforces workspace isolation through the HTTP API', async () => {
    const register = async (email: string) => {
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          password: 'a-good-password',
          displayName: email.split('@')[0],
        }),
      })
      expect(response.status).toBe(201)
      const cookie = response.headers.getSetCookie()[0] ?? ''
      const session = await fetch(`${baseUrl}/api/auth/session`, {
        headers: { cookie: cookie.split(';')[0] },
      })
      const body = (await session.json()) as { csrfToken: string }
      return {
        cookie: cookie.split(';')[0],
        csrfToken: body.csrfToken,
      }
    }

    const ada = await register('iso-a@example.com')
    const bob = await register('iso-b@example.com')

    const created = await fetch(`${baseUrl}/api/workspaces`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: ada.cookie,
        'x-csrf-token': ada.csrfToken,
      },
      body: JSON.stringify({ name: 'Ada Team' }),
    })
    expect(created.status).toBe(201)
    const { workspace } = (await created.json()) as { workspace: { id: string } }

    const attempt = await fetch(
      `${baseUrl}/api/workspaces/${workspace.id}/projects`,
      { headers: { cookie: bob.cookie } },
    )
    expect(attempt.status).toBe(403)
  })
})
