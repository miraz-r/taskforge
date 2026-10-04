/**
 * Session tokens and cookie construction.
 *
 * A session is an opaque 256-bit random token. Only its SHA-256 digest is
 * stored server-side, so a database disclosure does not yield usable sessions.
 * The raw token exists solely in the client's `HttpOnly` cookie and is never
 * returned in a response body, logged, or included in an error.
 *
 * CSRF uses the synchronizer-token pattern rather than double-submit: the token
 * is stored on the session row, handed to the client once via
 * `GET /api/auth/session`, and must be echoed in the `X-CSRF-Token` header on
 * every state-changing request. Because it is never readable from a cookie, a
 * cross-site attacker cannot obtain it.
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export const SESSION_TOKEN_BYTES = 32
export const CSRF_TOKEN_BYTES = 32

/** URL-safe, no padding — safe as a cookie value. */
export function generateSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString('base64url')
}

export function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_BYTES).toString('base64url')
}

/** SHA-256 digest, hex. Deterministic, so lookup is a single indexed read. */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8')
  const right = Buffer.from(b, 'utf8')
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

// --- cookies --------------------------------------------------------------

export interface SessionCookieOptions {
  maxAgeSeconds: number
  secure: boolean
  path?: string
}

function serialiseCookie(
  name: string,
  value: string,
  options: SessionCookieOptions,
): string {
  const parts = [`${name}=${value}`, 'Path=' + (options.path ?? '/')]

  if (options.maxAgeSeconds > 0) {
    parts.push(`Max-Age=${Math.floor(options.maxAgeSeconds)}`)
  }
  parts.push('HttpOnly')
  if (options.secure) parts.push('Secure')
  // Lax still sends the cookie on top-level GET navigations, which is what the
  // hash-router app needs, while blocking cross-site POSTs.
  parts.push('SameSite=Lax')

  return parts.join('; ')
}

export function buildSessionCookie(
  name: string,
  token: string,
  options: SessionCookieOptions,
): string {
  return serialiseCookie(name, token, options)
}

export function buildExpiredSessionCookie(
  name: string,
  options: Omit<SessionCookieOptions, 'maxAgeSeconds'>,
): string {
  return serialiseCookie(name, '', { ...options, maxAgeSeconds: 0 })
}
