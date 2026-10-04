/**
 * Authentication service.
 *
 * Identity is established here and nowhere else. Every function takes a `Store`
 * and returns domain records or throws an `ApiError`; no Express types leak in,
 * which keeps the rules unit-testable without a database or HTTP layer.
 *
 * Security properties:
 *  - Sign-in failures are indistinguishable between "no such account" and "wrong
 *    password": same status, same code, same message (AC-AUTH-04).
 *  - A dummy hash is computed when the account is unknown, so response time does
 *    not reveal whether an address is registered.
 *  - A legacy PBKDF2 record that verifies successfully is immediately re-hashed
 *    with argon2id, so the legacy path does not persist.
 */

import { conflict, unauthenticated, ApiError } from '../http/errors'
import {
  generateCsrfToken,
  generateSessionToken,
  hashSessionToken,
} from '../auth/session'
import {
  hashPassword,
  validatePasswordStrength,
  verifyPassword,
} from '../auth/password'
import type { Actor } from '../domain/authorize'
import type { SessionRecord, UserRecord } from '../domain/records'
import type { Store } from '../repositories/store'

export const GENERIC_SIGN_IN_FAILURE =
  'Sign-in failed. Check your email and password.'

/** Verified against when the account is unknown, purely to equalise timing. */
const DECOY_HASH_PREFIX = '$argon2id$'

export interface RegisterInput {
  email: string
  displayName: string
  password: string
}

export interface AuthenticatedResult {
  user: UserRecord
  session: SessionRecord
  /** Raw token. Returned to the caller only so it can be set as a cookie. */
  sessionToken: string
}

export class AuthService {
  constructor(
    private readonly store: Store,
    private readonly sessionTtlHours: number,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async register(input: RegisterInput): Promise<AuthenticatedResult> {
    const email = normaliseEmail(input.email)

    const fieldErrors: Record<string, string> = {}
    const passwordError = validatePasswordStrength(input.password)
    if (passwordError) fieldErrors.password = passwordError
    const displayNameError = validateDisplayName(input.displayName)
    if (displayNameError) fieldErrors.displayName = displayNameError
    if (Object.keys(fieldErrors).length > 0) {
      throw new ApiError(
        422,
        'validation_failed',
        Object.values(fieldErrors)[0] as string,
        fieldErrors,
      )
    }

    const existing = await this.store.users.findByEmail(email)
    if (existing) {
      throw conflict('An account already exists for this email address.', {
        email: 'An account already exists for this email address.',
      })
    }

    const passwordHash = await hashPassword(input.password)

    try {
      const user = await this.store.users.insert({
        email,
        displayName: input.displayName.trim(),
        passwordHash,
      })
      const { session, sessionToken } = await this.issueSession(user.id)
      return { user, session, sessionToken }
    } catch (error) {
      // Lost a race with a concurrent registration for the same address.
      if (isUniqueViolation(error)) {
        throw conflict('An account already exists for this email address.', {
          email: 'An account already exists for this email address.',
        })
      }
      throw error
    }
  }

  async signIn(input: {
    email: string
    password: string
  }): Promise<AuthenticatedResult> {
    const email = normaliseEmail(input.email)
    const user = await this.store.users.findByEmail(email)

    if (!user) {
      // Equalise timing so a missing account is not detectable by response time.
      await verifyPassword(input.password, `${DECOY_HASH_PREFIX}$invalid`)
      throw new ApiError(401, 'unauthenticated', GENERIC_SIGN_IN_FAILURE)
    }

    const verification = await verifyPassword(input.password, user.passwordHash)
    if (!verification.ok) {
      throw new ApiError(401, 'unauthenticated', GENERIC_SIGN_IN_FAILURE)
    }

    if (verification.scheme === 'pbkdf2-legacy') {
      // Transparent upgrade. The user is not interrupted and never has to
      // re-register.
      const upgraded = await hashPassword(input.password)
      await this.store.users.setPasswordHash(user.id, upgraded)
    }

    const { session, sessionToken } = await this.issueSession(user.id)
    return { user: { ...user, passwordHash: '' }, session, sessionToken }
  }

  /**
   * Resolves a raw cookie token to an actor.
   *
   * Returns null for an unknown, revoked, or expired token — the caller turns
   * that into a 401. Rejects never leak why.
   */
  async resolveActor(rawToken: string | undefined): Promise<Actor | null> {
    if (!rawToken) return null

    const session = await this.store.sessions.findByTokenHash(
      hashSessionToken(rawToken),
    )
    if (!session) return null
    if (session.revokedAt) return null
    if (session.expiresAt.getTime() <= this.now().getTime()) return null

    const user = await this.store.users.findById(session.userId)
    if (!user) return null

    return {
      userId: user.id,
      email: user.email,
      sessionId: session.id,
    }
  }

  async signOut(sessionId: string): Promise<void> {
    await this.store.sessions.revoke(sessionId)
  }

  /** Looks up an actor's own record. Used by `GET /api/auth/session`. */
  async userById(id: string): Promise<UserRecord | null> {
    return this.store.users.findById(id)
  }

  /**
   * FR-AUTH-008: update the signed-in user's own display name.
   *
   * Takes the actor, never a user id from the request, so a caller can only ever
   * change their own profile. Avatar editing is deliberately absent — no storage
   * column exists and design-system 10.4 marks the avatar specification
   * Proposed.
   */
  async updateDisplayName(
    actor: Actor,
    displayName: string,
  ): Promise<UserRecord> {
    const fieldErrors: Record<string, string> = {}
    const error = validateDisplayName(displayName)
    if (error) fieldErrors.displayName = error
    if (Object.keys(fieldErrors).length > 0) {
      throw new ApiError(
        422,
        'validation_failed',
        Object.values(fieldErrors)[0] as string,
        fieldErrors,
      )
    }
    return this.store.users.updateOwnProfile(actor.userId, {
      displayName: displayName.trim(),
    })
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.store.sessions.revokeAllForUser(userId)
  }

  /** Returns the CSRF token bound to a session, for `GET /api/auth/session`. */
  async csrfTokenFor(sessionId: string): Promise<string | null> {
    const session = await this.store.sessions.findById(sessionId)
    return session?.csrfToken ?? null
  }

  private async issueSession(userId: string): Promise<{
    session: SessionRecord
    sessionToken: string
  }> {
    const sessionToken = generateSessionToken()
    const session = await this.store.sessions.insert({
      tokenHash: hashSessionToken(sessionToken),
      csrfToken: generateCsrfToken(),
      userId,
      createdAt: this.now(),
      expiresAt: new Date(
        this.now().getTime() + this.sessionTtlHours * 60 * 60 * 1000,
      ),
      revokedAt: null,
    })
    return { session, sessionToken }
  }
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function validateDisplayName(displayName: string): string | null {
  const value = displayName.trim()
  if (value === '') return 'Display name is required.'
  if (value.length > 80) return 'Display name must be 80 characters or fewer.'
  return null
}

/**
 * Recognises a unique-constraint violation from either the Prisma client or the
 * underlying pg driver, without importing either.
 */
export function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const code = (error as { code?: unknown }).code
  if (code === 'P2002') return true
  if (code === '23505') return true
  const message = (error as { message?: unknown }).message
  return typeof message === 'string' && message.includes('UNIQUE constraint failed')
}

export { unauthenticated }
