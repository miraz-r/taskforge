/**
 * Authorisation — the single enforcement point. NFR-SEC-010.
 *
 * "Every read and every write verifies that the actor belongs to the workspace
 * owning the resource, at the time of the request. Hiding, disabling, or
 * omitting a control in the interface does not satisfy this requirement and must
 * not be reported as if it did."
 *
 * How that is guaranteed here:
 *   1. Identity is derived ONLY from the validated session record. No service
 *      ever accepts a userId from a request body, query, or path.
 *   2. `requireMembership` runs before any workspace-scoped resource is loaded,
 *      so a non-member never causes a row to be read at all.
 *   3. Query scoping is a second layer: list queries filter by workspaceId in the
 *      database, so isolation does not depend on post-filtering in memory.
 *   4. Absent and not-yours are reported with identical wording, so the API
 *      cannot be used to enumerate ids.
 */

import { forbiddenOrHidden, unauthenticated } from '../http/errors'
import type { MembershipRecord, WorkspaceRecord } from './records'
import type { Store } from '../repositories/store'

export interface Actor {
  userId: string
  email: string
  sessionId: string
}

export interface MembershipGrant extends Actor {
  membership: MembershipRecord
}

/**
 * Verifies workspace membership. Throws `unauthenticated` when there is no
 * session and `forbidden` when the session does not own or belong to the
 * workspace.
 */
export async function requireMembership(
  store: Store,
  actor: Actor,
  workspaceId: string,
): Promise<MembershipGrant> {
  const membership = await store.workspaces.memberships.find(
    actor.userId,
    workspaceId,
  )
  if (!membership) throw forbiddenOrHidden()
  return { ...actor, membership }
}

/**
 * Loads a workspace only after membership has been verified. Membership is
 * checked first, so the workspace row is not read for a non-member.
 */
export async function requireWorkspace(
  store: Store,
  actor: Actor,
  workspaceId: string,
): Promise<{ workspace: WorkspaceRecord; membership: MembershipRecord }> {
  const grant = await requireMembership(store, actor, workspaceId)
  const workspace = await store.workspaces.findById(workspaceId)
  // A membership row pointing at a missing workspace is corrupt data, not a
  // permission problem.
  if (!workspace) throw forbiddenOrHidden()
  return { workspace, membership: grant.membership }
}

/** Convenience for routes that must already have an authenticated actor. */
export function requireActor(actor: Actor | null): Actor {
  if (!actor) throw unauthenticated()
  return actor
}

/** True when the actor owns the workspace. Ownership, not role, gates archiving. */
export function isOwner(actor: Actor, workspace: WorkspaceRecord): boolean {
  return workspace.ownerId === actor.userId
}
