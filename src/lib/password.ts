/**
 * Password hashing — LEGACY / TEST SUPPORT ONLY.
 *
 * Plaintext passwords are never persisted (NFR-SEC-005, AGENTS.md 11.3).
 * Hashing uses PBKDF2-HMAC-SHA256 from the Web Crypto API — a platform
 * capability, so no dependency is added (AGENTS.md 13.2).
 *
 * Serialised form: `pbkdf2-sha256$<iterations>$<saltB64>$<hashB64>`
 *
 * The server hashes with argon2id (server/auth/password.ts). This module exists
 * only for LocalBackend, the in-process backend used by client tests, so those
 * tests still assert that no plaintext credential is ever written to storage.
 */

const ALGORITHM = 'PBKDF2'
const HASH = 'SHA-256'
const KEY_LENGTH_BITS = 256
const SALT_BYTES = 16
const PREFIX = 'pbkdf2-sha256'

/**
 * 210,000 iterations is the current OWASP recommendation for
 * PBKDF2-HMAC-SHA256.
 */
export const ITERATIONS = 210_000

function getCrypto(): Crypto {
  const c = globalThis.crypto
  if (!c || !c.subtle) {
    throw new Error(
      'Web Crypto is unavailable. A secure context (https or localhost) is required.',
    )
  }
  return c
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export async function hashPassword(
  password: string,
  iterations: number = ITERATIONS,
): Promise<string> {
  const crypto = getCrypto()
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    ALGORITHM,
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: ALGORITHM, hash: HASH, salt, iterations },
    key,
    KEY_LENGTH_BITS,
  )
  return `${PREFIX}$${iterations}$${toBase64(salt)}$${toBase64(
    new Uint8Array(bits),
  )}`
}

/**
 * Length-independent, data-independent comparison. Guards the hash against
 * timing observation and avoids short-circuiting on the first differing byte.
 */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  const length = Math.max(a.length, b.length)
  let difference = a.length ^ b.length
  for (let i = 0; i < length; i += 1) {
    difference |= (a[i] ?? 0) ^ (b[i] ?? 0)
  }
  return difference === 0
}

export async function verifyPassword(
  password: string,
  serialised: string,
): Promise<boolean> {
  const parts = serialised.split('$')
  if (parts.length !== 4 || parts[0] !== PREFIX) return false

  const iterations = Number.parseInt(parts[1] as string, 10)
  if (!Number.isFinite(iterations) || iterations <= 0) return false

  let salt: Uint8Array<ArrayBuffer>
  let expected: Uint8Array
  try {
    salt = fromBase64(parts[2] as string)
    expected = fromBase64(parts[3] as string)
  } catch {
    return false
  }

  const crypto = getCrypto()
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    ALGORITHM,
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: ALGORITHM, hash: HASH, salt, iterations },
    key,
    KEY_LENGTH_BITS,
  )
  return constantTimeEqual(new Uint8Array(bits), expected)
}

/**
 * Minimum password length. Deliberately the only length rule; composition rules
 * are not specified by any ACTIVE document and inventing them would be
 * assuming an unapproved product decision (FR-AUTH-004 is specified only as
 * field-specific reporting).
 */
export const MIN_PASSWORD_LENGTH = 8
