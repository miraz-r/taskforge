/**
 * Production cookie guard: `NODE_ENV=production` with `COOKIE_SECURE=false`
 * must fail fast at startup. Development and test keep plain-http cookies.
 */

import { describe, expect, it } from 'vitest'
import { ConfigError, loadConfig } from '../config'

function env(overrides: Record<string, string>): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:1/unused',
    ...overrides,
  } as unknown as NodeJS.ProcessEnv
}

describe('production cookie guard', () => {
  it('rejects production with COOKIE_SECURE=false', () => {
    expect(() =>
      loadConfig(env({ NODE_ENV: 'production', COOKIE_SECURE: 'false' })),
    ).toThrow(ConfigError)
  })

  it('accepts production with COOKIE_SECURE=true', () => {
    const config = loadConfig(env({ NODE_ENV: 'production', COOKIE_SECURE: 'true' }))
    expect(config.NODE_ENV).toBe('production')
    expect(config.COOKIE_SECURE).toBe(true)
  })

  it('accepts development with COOKIE_SECURE=false', () => {
    const config = loadConfig(env({ NODE_ENV: 'development', COOKIE_SECURE: 'false' }))
    expect(config.COOKIE_SECURE).toBe(false)
  })

  it('accepts test with COOKIE_SECURE=false', () => {
    const config = loadConfig(env({ NODE_ENV: 'test', COOKIE_SECURE: 'false' }))
    expect(config.COOKIE_SECURE).toBe(false)
  })
})
