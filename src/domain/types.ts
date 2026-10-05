/**
 * TaskForge domain types — Phase 0.
 *
 * Scope: authentication and workspace membership only. Project, task, comment,
 * and every other entity are deliberately absent; they are Phase 1 and later
 * (docs/01_PRODUCT_REQUIREMENTS.md 7.1).
 *
 * Source of truth: docs/01_PRODUCT_REQUIREMENTS.md sections 5.1 (FR-AUTH) and
 * 5.2 (FR-WS).
 */

export type UserId = string
export type WorkspaceId = string

/** ISO-8601 timestamp. */
export type Timestamp = string

export interface User {
  id: UserId
  /** Stored lowercased; uniqueness is enforced (FR-AUTH-003). */
  email: string
  displayName: string
  /**
   * PBKDF2-SHA256 derived key, serialised as
   * `pbkdf2-sha256$<iterations>$<salt>$<hash>`.
   *
   * The plaintext password is never stored, logged, or rendered
   * (NFR-SEC-005, AGENTS.md 11.3). See lib/password.ts.
   */
  passwordHash: string
  createdAt: Timestamp
}

export interface Workspace {
  id: WorkspaceId
  name: string
  /** The creator. Membership, not this field, is what authorises access
   *  (NFR-SEC-010). */
  ownerId: UserId
  createdAt: Timestamp
}

/**
 * Membership is the authorisation fact. `role` records ownership only; there is
 * no role-based permission matrix, because role permissions are deferred for
 * the initial milestone (resolved D-03, FR-ROLE-006).
 *
 * Deferring roles does NOT relax membership scoping: every read and every
 * write verifies membership at the time of the request (NFR-SEC-010).
 */
export interface Membership {
  userId: UserId
  workspaceId: WorkspaceId
  role: 'owner' | 'member'
  createdAt: Timestamp
}

export interface Session {
  userId: UserId
  issuedAt: Timestamp
}

export type Theme = 'light' | 'dark'
