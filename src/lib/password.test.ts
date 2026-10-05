import { describe, expect, it } from 'vitest'
import {
  MIN_PASSWORD_LENGTH,
  hashPassword,
  verifyPassword,
} from './password'

describe('password hashing', () => {
  it('produces a serialised PBKDF2 record with the documented shape', async () => {
    const serialised = await hashPassword('correct horse battery', 1000)
    const parts = serialised.split('$')

    expect(parts).toHaveLength(4)
    expect(parts[0]).toBe('pbkdf2-sha256')
    expect(Number(parts[1])).toBe(1000)
    // The plaintext must never appear anywhere in the stored value.
    expect(serialised).not.toContain('correct horse battery')
  })

  it('verifies the correct password', async () => {
    const serialised = await hashPassword('a-good-password', 1000)
    await expect(verifyPassword('a-good-password', serialised)).resolves.toBe(
      true,
    )
  })

  it('rejects an incorrect password', async () => {
    const serialised = await hashPassword('a-good-password', 1000)
    await expect(verifyPassword('a-bad-password', serialised)).resolves.toBe(
      false,
    )
  })

  it('salts each hash, so the same password never produces the same record', async () => {
    const first = await hashPassword('a-good-password', 1000)
    const second = await hashPassword('a-good-password', 1000)
    expect(first).not.toBe(second)
    // Both still verify.
    await expect(verifyPassword('a-good-password', first)).resolves.toBe(true)
    await expect(verifyPassword('a-good-password', second)).resolves.toBe(true)
  })

  it('rejects a malformed or corrupted record instead of throwing', async () => {
    await expect(verifyPassword('x', 'not-a-hash')).resolves.toBe(false)
    await expect(verifyPassword('x', 'pbkdf2-sha256$1000$only3')).resolves.toBe(
      false,
    )
    await expect(
      verifyPassword('x', 'pbkdf2-sha256$notanumber$c2FsdA==$aGFzaA=='),
    ).resolves.toBe(false)
    await expect(
      verifyPassword('x', 'md5$1000$c2FsdA==$aGFzaA=='),
    ).resolves.toBe(false)
  })

  it('is case sensitive', async () => {
    const serialised = await hashPassword('PassWord1', 1000)
    await expect(verifyPassword('password1', serialised)).resolves.toBe(false)
  })

  it('exposes a minimum length that the service enforces', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8)
  })
})
