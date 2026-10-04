/**
 * Password hashing — server side, production grade.
 *
 * Primary scheme: argon2id via @node-rs/argon2 (prebuilt native binary; no
 * compilation step). Parameters follow the OWASP Password Storage Cheat Sheet
 * minimums (19 MiB memory, 2 iterations, parallelism 1).
 *
 * Legacy scheme: PBKDF2-HMAC-SHA256, `pbkdf2-sha256$<iterations>$<salt>$<hash>`.
 * This exists ONLY so accounts created by the Phase 0 browser-only build can be
 * imported without losing them (see services/migrate.service.ts). After a
 * successful legacy verification the caller MUST re-hash with argon2id and
 * upgrade the stored record, so the legacy path self-destructs.
 *
 * The plaintext password is never stored, logged, or echoed in a response
 * (NFR-SEC-005, AGENTS.md 11.3).
 */

import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2'
import {
  pbkdf2 as pbkdf2Callback,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'
import { promisify } from 'node:util'

const pbkdf2 = promisify(pbkdf2Callback)

export const ARGON2_OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const

const LEGACY_PREFIX = 'pbkdf2-sha256'
const LEGACY_SALT_BYTES = 16
const LEGACY_KEY_BYTES = 32

/**
 * Floor for legacy PBKDF2 iterations.
 *
 * The iteration count travels inside the stored record, so a tampered record
 * could otherwise claim `iterations=1` and turn verification into a no-op. This
 * rejects such a record outright rather than trusting it.
 */
export const LEGACY_MIN_ITERATIONS = 210_000

export type PasswordScheme = 'argon2id' | 'pbkdf2-legacy'

export type PasswordVerification =
  | { ok: true; scheme: 'argon2id' }
  | { ok: true; scheme: 'pbkdf2-legacy' }
  | { ok: false }

export function isArgon2id(stored: string): boolean {
  return stored.startsWith('$argon2id$')
}

export function isLegacyPbkdf2(stored: string): boolean {
  return stored.startsWith(`${LEGACY_PREFIX}$`)
}

export async function hashPassword(password: string): Promise<string> {
  return argonHash(password, ARGON2_OPTIONS)
}

/**
 * Verifies against whichever scheme the record uses.
 *
 * Returns the scheme on success so the caller can decide whether to upgrade the
 * stored hash. A legacy success MUST be followed by an argon2id re-hash.
 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<PasswordVerification> {
  if (isArgon2id(stored)) {
    try {
      const ok = await argonVerify(stored, password)
      return ok ? { ok: true, scheme: 'argon2id' } : { ok: false }
    } catch {
      // A malformed argon2 string must read as a failed verification, never as
      // a 500 that tells an attacker the record shape is unusual.
      return { ok: false }
    }
  }

  if (isLegacyPbkdf2(stored)) {
    return verifyLegacyPbkdf2(password, stored)
  }

  return { ok: false }
}

async function verifyLegacyPbkdf2(
  password: string,
  stored: string,
): Promise<PasswordVerification> {
  const parts = stored.split('$')
  if (parts.length !== 4 || parts[0] !== LEGACY_PREFIX) return { ok: false }

  const iterations = Number.parseInt(parts[1] as string, 10)
  if (!Number.isInteger(iterations) || iterations < LEGACY_MIN_ITERATIONS) {
    return { ok: false }
  }

  let salt: Buffer
  let expected: Buffer
  try {
    salt = Buffer.from(parts[2] as string, 'base64')
    expected = Buffer.from(parts[3] as string, 'base64')
  } catch {
    return { ok: false }
  }
  if (salt.length === 0 || expected.length === 0) return { ok: false }

  const derived = await pbkdf2(
    password,
    salt,
    iterations,
    LEGACY_KEY_BYTES,
    'sha256',
  )
  const a = Buffer.from(derived)
  const b = expected
  if (a.length !== b.length) return { ok: false }
  return timingSafeEqual(a, b)
    ? { ok: true, scheme: 'pbkdf2-legacy' }
    : { ok: false }
}

/** Builds a legacy-shaped record. Used only by migration tests. */
export function makeLegacyPbkdf2Record(
  password: string,
  iterations = LEGACY_MIN_ITERATIONS,
): Promise<string> {
  const salt = randomBytes(LEGACY_SALT_BYTES)
  return pbkdf2(password, salt, iterations, LEGACY_KEY_BYTES, 'sha256').then(
    (derived) =>
      `${LEGACY_PREFIX}$${iterations}$${salt.toString('base64')}$${Buffer.from(
        derived,
      ).toString('base64')}`,
  )
}

/**
 * Minimum password length.
 *
 * Deliberately the only length rule. Composition rules are specified by no
 * ACTIVE document, and inventing one would be assuming an unapproved product
 * decision (FR-AUTH-004 requires field-specific reporting, nothing more).
 */
export const MIN_PASSWORD_LENGTH = 8

export const PASSWORD_MAX_LENGTH = 200

export function validatePasswordStrength(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  // argon2 is not password-length safe beyond its input limits; bound it so a
  // multi-megabyte body cannot be used to burn server CPU.
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer.`
  }
  return null
}
