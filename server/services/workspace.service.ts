/**
 * Workspace service. FR-WS.
 *
 * The two-workspace ceiling is enforced HERE, server-side, against a count of
 * workspaces the user owns. It is not a client hint and not a UI concern.
 *
 * There is deliberately no route that creates a membership for an existing
 * workspace. Invitations and joining are a Coming Soon decision (resolved D-10),
 * so exposing one would be both a scope violation and a privilege-escalation
 * hole: any client could grant itself access to any workspace id.
 */

import { randomUUID } from 'node:crypto'
import { conflict, limitReached } from '../http/errors'
import type { Actor } from '../domain/authorize'
import type { WorkspaceRecord } from '../domain/records'
import type { Store } from '../repositories/store'

export const WORKSPACE_NAME_MAX = 60

export class WorkspaceService {
  constructor(
    private readonly store: Store,
    private readonly maxWorkspacesPerUser: number,
  ) {}

  /** Only workspaces the actor belongs to. Filtered in the query, not in memory. */
  async list(actor: Actor): Promise<WorkspaceRecord[]> {
    return this.store.workspaces.listByMember(actor.userId)
  }

  async create(
    actor: Actor,
    input: { name: string },
  ): Promise<WorkspaceRecord> {
    const name = input.name.trim()
    if (name === '') {
      throw conflict('Workspace name is required.', {
        name: 'Workspace name is required.',
      })
    }
    if (name.length > WORKSPACE_NAME_MAX) {
      throw conflict('Workspace name must be 60 characters or fewer.', {
        name: 'Workspace name must be 60 characters or fewer.',
      })
    }

    const owned = await this.store.workspaces.countOwnedBy(actor.userId)
    if (owned >= this.maxWorkspacesPerUser) {
      throw limitReached(
        `You have reached the maximum of ${this.maxWorkspacesPerUser} workspaces.`,
      )
    }

    // The owner is derived from the session actor, never from the request body.
    //
    // A bare UUID, with no type prefix. `Workspace.id` is a `uuid` column, so a
    // prefixed string is rejected by PostgreSQL. The earlier `wsp_${randomUUID()}`
    // form satisfied every MemoryStore test and still made workspace creation
    // fail against a real database with `invalid input syntax for type uuid`.
    const id = randomUUID()

    return this.store.workspaces.insert({
      workspace: { id, name, ownerId: actor.userId },
      membership: { userId: actor.userId, workspaceId: id, role: 'OWNER' },
    })
  }

  async counts(actor: Actor): Promise<{ owned: number; limit: number }> {
    return {
      owned: await this.store.workspaces.countOwnedBy(actor.userId),
      limit: this.maxWorkspacesPerUser,
    }
  }
}
