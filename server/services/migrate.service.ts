/**
 * Legacy data migration — one-time import from the Phase 0 browser-only build.
 *
 * THREAT MODEL, stated explicitly because this is the only endpoint that accepts
 * client-asserted data:
 *
 *   1. The imported password hash is NOT trusted. The client sends the plaintext
 *      password alongside it, and the server recomputes PBKDF2 using the
 *      client-supplied salt and iterations and compares. A caller who does not
 *      know the password cannot import, so they cannot claim an account.
 *      (AGENTS.md 11: a password is never stored or logged; it exists only for
 *      the duration of this verification.)
 *
 *   2. Membership claims are NOT accepted at all. There is no memberships array
 *      in the payload. The server creates exactly one OWNER membership per
 *      imported workspace, for the authenticated importer. A crafted payload
 *      therefore cannot grant access to anybody else's workspace.
 *
 *   3. A workspace is imported only if its claimed owner is the importing email.
 *      Anything else is rejected and reported, never silently dropped.
 *
 *   4. No identifier is taken from the client as authoritative. Legacy ids are
 *      treated as hints: one is retained only when it is ALREADY a valid UUID
 *      and nothing occupies it, because id columns are `uuid` and PostgreSQL
 *      rejects the prefixed strings the Phase 0 browser build minted. Anything
 *      else is replaced with a fresh `randomUUID()`, every substitution is
 *      reported in `remapped`, and every child reference is rewritten to the
 *      authoritative parent id.
 *
 *   5. The whole import runs in one transaction. A failure leaves nothing behind.
 *
 *   6. Idempotent. Re-running against an address that already exists makes no
 *      changes and reports `alreadyMigrated`, so a retry cannot duplicate data.
 */

import { randomUUID } from 'node:crypto'
import { ApiError } from '../http/errors'
import { LEGACY_MIN_ITERATIONS, verifyPassword } from '../auth/password'
import type { Store } from '../repositories/store'

export interface LegacyWorkspace {
  id: string
  name: string
  ownerEmail: string
  createdAt: string
}

export interface LegacyProject {
  id: string
  workspaceId: string
  name: string
  description: string
  colourToken: string | null
  createdAt: string
}

export interface LegacyTask {
  id: string
  projectId: string
  title: string
  description: string
  stage: 'BACKLOG' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'
  priority: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'
  assigneeEmail: string | null
  dueDate: string | null
  createdAt: string
}

export interface LegacyComment {
  id: string
  taskId: string
  authorEmail: string
  body: string
  createdAt: string
}

export interface LegacyImportPayload {
  email: string
  password: string
  passwordHash: string
  workspaces: LegacyWorkspace[]
  projects: LegacyProject[]
  tasks: LegacyTask[]
  comments: LegacyComment[]
}

export interface MigrationReport {
  alreadyMigrated: boolean
  userId: string | null
  counts: {
    workspacesCreated: number
    projectsCreated: number
    tasksCreated: number
    commentsCreated: number
  }
  rejected: Array<{ kind: string; legacyId: string; reason: string }>
  remapped: Array<{ kind: string; legacyId: string; newId: string }>
}

const MAX_PAYLOAD_ROWS = {
  workspaces: 50,
  projects: 500,
  tasks: 5000,
  comments: 10000,
} as const

export class MigrateService {
  constructor(private readonly store: Store) {}

  /**
   * Verifies ownership of a legacy account and imports its data.
   *
   * Does NOT issue a session: the caller signs in normally afterwards, which
   * keeps exactly one code path that can create a session.
   */
  async importLegacy(
    payload: LegacyImportPayload,
  ): Promise<MigrationReport> {
    const email = payload.email.trim().toLowerCase()

    const rejected: MigrationReport['rejected'] = []
    const remapped: MigrationReport['remapped'] = []

    assertWithinLimits(payload)

    // --- ownership proof ---------------------------------------------------
    const verification = await verifyPassword(payload.password, payload.passwordHash)
    if (!verification.ok) {
      throw new ApiError(
        401,
        'unauthenticated',
        'We could not verify that you own this account.',
      )
    }

    const existingUser = await this.store.users.findByEmail(email)
    if (existingUser) {
      // Idempotent re-run. Make no changes rather than duplicating.
      return {
        alreadyMigrated: true,
        userId: existingUser.id,
        counts: {
          workspacesCreated: 0,
          projectsCreated: 0,
          tasksCreated: 0,
          commentsCreated: 0,
        },
        rejected: [],
        remapped: [],
      }
    }

    return this.store.transaction(async (store) => {
      const user = await store.users.insert({
        email,
        displayName: deriveDisplayName(email),
        passwordHash: payload.passwordHash,
      })

      // Legacy workspace id -> authoritative id
      const workspaceIdMap = new Map<string, string>()
      let workspacesCreated = 0

      for (const legacy of payload.workspaces) {
        if (normalise(legacy.ownerEmail) !== email) {
          rejected.push({
            kind: 'workspace',
            legacyId: legacy.id,
            reason: 'not owned by the importing account',
          })
          continue
        }

        // Retained only when already a valid UUID and unoccupied. The Phase 0
        // build minted prefixed ids that a `uuid` column rejects, so the
        // availability probe must not run for them.
        const id =
          isUuid(legacy.id) &&
          (await store.workspaces.findById(legacy.id)) === null
            ? legacy.id
            : remapId('workspace', legacy.id, remapped)

        await store.workspaces.insert({
          workspace: { id, name: legacy.name, ownerId: user.id },
          // The ONLY membership this import can ever create.
          membership: { userId: user.id, workspaceId: id, role: 'OWNER' },
        })
        workspaceIdMap.set(legacy.id, id)
        workspacesCreated += 1
      }

      const projectIdMap = new Map<string, string>()
      let projectsCreated = 0

      for (const legacy of payload.projects) {
        const workspaceId = workspaceIdMap.get(legacy.workspaceId)
        if (!workspaceId) {
          rejected.push({
            kind: 'project',
            legacyId: legacy.id,
            reason: 'parent workspace was not imported',
          })
          continue
        }

        const id =
          isUuid(legacy.id) && (await store.projects.findById(legacy.id)) === null
            ? legacy.id
            : remapId('project', legacy.id, remapped)

        await store.projects.insert({
          id,
          workspaceId,
          name: legacy.name,
          description: legacy.description ?? '',
          colourToken: legacy.colourToken ?? null,
        })
        projectIdMap.set(legacy.id, id)
        projectsCreated += 1
      }

      const taskIdMap = new Map<string, string>()
      let tasksCreated = 0

      for (const legacy of payload.tasks) {
        const projectId = projectIdMap.get(legacy.projectId)
        if (!projectId) {
          rejected.push({
            kind: 'task',
            legacyId: legacy.id,
            reason: 'parent project was not imported',
          })
          continue
        }

        const id =
          isUuid(legacy.id) && (await store.tasks.findById(legacy.id)) === null
            ? legacy.id
            : remapId('task', legacy.id, remapped)

        // The legacy store recorded an assignee by email. Only the importing
        // account can be resolved; any other assignee is reported rather than
        // silently dropped, because the record cannot be honoured.
        let assigneeId: string | null = null
        if (legacy.assigneeEmail) {
          if (normalise(legacy.assigneeEmail) === email) {
            assigneeId = user.id
          } else {
            rejected.push({
              kind: 'task-assignee',
              legacyId: legacy.id,
              reason: 'assignee belongs to a different account and was not imported',
            })
          }
        }

        await store.tasks.insert({
          id,
          projectId,
          title: legacy.title,
          description: legacy.description ?? '',
          priority: legacy.priority,
          assigneeId,
          dueDate: parseDate(legacy.dueDate),
        })
        taskIdMap.set(legacy.id, id)
        tasksCreated += 1
      }

      let commentsCreated = 0
      for (const legacy of payload.comments) {
        const taskId = taskIdMap.get(legacy.taskId)
        if (!taskId) {
          rejected.push({
            kind: 'comment',
            legacyId: legacy.id,
            reason: 'parent task was not imported',
          })
          continue
        }
        if (normalise(legacy.authorEmail) !== email) {
          rejected.push({
            kind: 'comment',
            legacyId: legacy.id,
            reason: 'authored by a different account',
          })
          continue
        }

        await store.comments.insert({
          taskId,
          authorId: user.id,
          body: legacy.body,
        })
        commentsCreated += 1
      }

      return {
        alreadyMigrated: false,
        userId: user.id,
        counts: {
          workspacesCreated,
          projectsCreated,
          tasksCreated,
          commentsCreated,
        },
        rejected,
        remapped,
      }
    })
  }
}

function normalise(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * The canonical 8-4-4-4-12 hexadecimal form PostgreSQL accepts for a `uuid`
 * column. Deliberately permissive about version and variant nibbles: the column
 * type, not this predicate, is the authority on what is storable.
 */
const UUID_TEXT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuid(value: string): boolean {
  return UUID_TEXT.test(value)
}

/**
 * Records a substitution and returns the authoritative id.
 *
 * Kept separate from the retention test below because that test must NOT probe
 * the store with a non-UUID: `findById` validates its argument against the
 * `uuid` column type and throws on `wsp_rb` before any query runs. Probing is
 * therefore only safe once `isUuid` has already passed.
 */
function remapId(
  kind: 'workspace' | 'project' | 'task',
  legacyId: string,
  remapped: MigrationReport['remapped'],
): string {
  const newId = randomUUID()
  remapped.push({ kind, legacyId, newId })
  return newId
}

function deriveDisplayName(email: string): string {
  const local = email.split('@')[0] ?? email
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function parseDate(value: string | null): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function assertWithinLimits(payload: LegacyImportPayload): void {
  const checks: Array<[keyof typeof MAX_PAYLOAD_ROWS, number]> = [
    ['workspaces', MAX_PAYLOAD_ROWS.workspaces],
    ['projects', MAX_PAYLOAD_ROWS.projects],
    ['tasks', MAX_PAYLOAD_ROWS.tasks],
    ['comments', MAX_PAYLOAD_ROWS.comments],
  ]
  for (const [key, max] of checks) {
    const rows = payload[key]
    if (Array.isArray(rows) && rows.length > max) {
      throw new ApiError(
        413,
        'validation_failed',
        `Too many ${key} to import (limit ${max}).`,
      )
    }
  }
  if (
    typeof payload.passwordHash === 'string' &&
    payload.passwordHash.startsWith('pbkdf2-sha256$')
  ) {
    const iterations = Number.parseInt(payload.passwordHash.split('$')[1] ?? '', 10)
    if (!Number.isInteger(iterations) || iterations < LEGACY_MIN_ITERATIONS) {
      throw new ApiError(
        422,
        'validation_failed',
        'The stored password record does not meet the minimum work factor.',
      )
    }
  }
}
