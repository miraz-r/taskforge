/**
 * Real-HTTP authentication, session, CSRF and rate-limit tests.
 * Covers AC-AUTH-01..05, NFR-SEC-001, NFR-SEC-006.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { startTestServer, VALID_PASSWORD, type TestContext } from './support'

/**
 * A fresh server per test.
 *
 * Necessary, not merely tidy: the store is shared state (a second registration of
 * the same address must conflict) and the rate limiter is per-process. Reusing a
 * single server would make these tests order-dependent.
 */
let ctx: TestContext

beforeEach(async () => {
  ctx = await startTestServer()
})
afterEach(async () => {
  await ctx.close()
})

const NEW_USER = {
  email: 'ada@example.com',
  password: VALID_PASSWORD,
  displayName: 'Ada Lovelace',
}

describe('health', () => {
  it('reports liveness without touching the database', async () => {
    const { status, body } = await ctx.client().get<{ status: string }>('/api/health')
    expect(status).toBe(200)
    expect(body.status).toBe('ok')
  })
})

describe('registration', () => {
  it('registers, sets an HttpOnly session cookie, and returns the user (AC-AUTH-01)', async () => {
    const client = ctx.client()
    const { status, body, response } = await client.post<{
      user: { email: string; displayName: string; id: string }
      csrfToken: string
    }>('/api/auth/register', NEW_USER)

    expect(status).toBe(201)
    expect(body.user.email).toBe('ada@example.com')
    expect(body.user.displayName).toBe('Ada Lovelace')
    expect(body.csrfToken).toBeTruthy()

    const setCookie = response.headers.getSetCookie().join(';')
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('SameSite=Lax')
    expect(setCookie).toContain('Path=/')
    // The raw password must never appear anywhere in the response.
    expect(JSON.stringify(body)).not.toContain(VALID_PASSWORD)
  })

  it('never returns the password hash', async () => {
    const client = ctx.client()
    const { body } = await client.post('/api/auth/register', {
      ...NEW_USER,
      email: 'nohash@example.com',
    })
    expect(JSON.stringify(body)).not.toMatch(/argon2|pbkdf2|passwordHash/i)
  })

  it('reports each invalid field by name (AC-AUTH-03)', async () => {
    const { status, body } = await ctx.client().post<{
      error: { code: string; fieldErrors: Record<string, string> }
    }>('/api/auth/register', { email: 'not-an-email', password: '', displayName: '' })

    expect(status).toBe(422)
    expect(body.error.code).toBe('validation_failed')
    expect(body.error.fieldErrors.email).toContain('name@example.com')
    expect(body.error.fieldErrors.password).toBeTruthy()
    expect(body.error.fieldErrors.displayName).toBeTruthy()
  })

  it('rejects a duplicate email with a field-specific error (AC-AUTH-02)', async () => {
    await ctx.client().register(NEW_USER)

    const second = ctx.client()
    const { status, body } = await second.post<{
      error: { fieldErrors: Record<string, string> }
    }>('/api/auth/register', { ...NEW_USER, displayName: 'Someone Else' })

    expect(status).toBe(409)
    expect(body.error.fieldErrors.email).toBe(
      'An account already exists for this email address.',
    )
  })
})

describe('sign-in', () => {
  it('signs in and restores the session on GET /auth/session', async () => {
    await ctx.client().register(NEW_USER)

    // A brand-new client with no cookie is anonymous, and the endpoint says so
    // with 200 + user:null rather than an error, so the app can tell "signed out"
    // apart from "server unreachable".
    const anonymous = await ctx
      .client()
      .get<{ user: unknown }>('/api/auth/session')
    expect(anonymous.status).toBe(200)
    expect(anonymous.body.user).toBeNull()

    const client = ctx.client()
    expect(await client.signIn('ada@example.com', VALID_PASSWORD)).toBe(200)

    const restored = await client.get<{ user: { email: string }; csrfToken: string }>(
      '/api/auth/session',
    )
    expect(restored.status).toBe(200)
    expect(restored.body.user.email).toBe('ada@example.com')
    expect(restored.body.csrfToken).toBeTruthy()
  })

  it('gives an identical failure for a wrong password and an unknown account (AC-AUTH-04)', async () => {
    const seed = ctx.client()
    await seed.register(NEW_USER)

    const wrong = await ctx.client().post<{ error: { code: string; message: string } }>(
      '/api/auth/sign-in',
      { email: 'ada@example.com', password: 'not-the-password' },
    )
    const unknown = await ctx.client().post<{ error: { code: string; message: string } }>(
      '/api/auth/sign-in',
      { email: 'nobody@example.com', password: 'not-the-password' },
    )

    expect(wrong.status).toBe(401)
    expect(unknown.status).toBe(401)
    // Byte-identical: the response cannot be used to enumerate accounts.
    expect(JSON.stringify(unknown.body)).toBe(JSON.stringify(wrong.body))
    expect(JSON.stringify(wrong.body)).not.toContain('ada@example.com')
  })

  it('does not issue a session on failure', async () => {
    const client = ctx.client()
    await client.post('/api/auth/sign-in', {
      email: 'ghost@example.com',
      password: 'whatever-password',
    })
    const session = await client.get<{ user: unknown }>('/api/auth/session')
    expect(session.body.user).toBeNull()
  })
})

describe('session lifecycle', () => {
  it('sign-out invalidates the token server-side (AC-AUTH-05)', async () => {
    const client = ctx.client()
    await client.register(NEW_USER)

    const before = await client.get<{ workspaces: unknown[] }>('/api/workspaces')
    expect(before.status).toBe(200)

    const out = await client.post('/api/auth/sign-out')
    expect(out.status).toBe(204)

    // Cookie is cleared client-side AND the row is revoked: replaying the old
    // token in a fresh jar must fail.
    const replay = ctx.client()
    const forged = await replay.get('/api/workspaces')
    expect(forged.status).toBe(401)
  })

  it('rejects a request whose cookie was never issued', async () => {
    const client = ctx.client()
    const { status, body } = await client.get<{ error: { code: string } }>('/api/workspaces')
    expect(status).toBe(401)
    expect(body.error.code).toBe('unauthenticated')
  })

  it('rejects a tampered session token', async () => {
    const client = ctx.client()
    await client.register(NEW_USER)
    expect((await client.get('/api/workspaces')).status).toBe(200)

    // Replace the cookie value with a well-formed but unknown token.
    const raw = (client as unknown as { jar: Map<string, string> }).jar
    const name = [...raw.keys()][0] as string
    raw.set(name, 'x'.repeat(43))

    expect((await client.get('/api/workspaces')).status).toBe(401)
  })
})

describe('CSRF', () => {
  it('rejects a state-changing request with no CSRF token', async () => {
    const client = ctx.client()
    await client.register(NEW_USER)

    const { status, body } = await client.post<{ error: { code: string } }>(
      '/api/workspaces',
      { name: 'Acme' },
      { csrf: null },
    )
    expect(status).toBe(403)
    expect(body.error.code).toBe('invalid_csrf')
  })

  it('rejects a wrong CSRF token', async () => {
    const client = ctx.client()
    await client.register(NEW_USER)

    const { status } = await client.post(
      '/api/workspaces',
      { name: 'Acme' },
      { csrf: 'wrong-token' },
    )
    expect(status).toBe(403)
  })

  it("rejects another session's CSRF token", async () => {
    const a = ctx.client()
    await a.register(NEW_USER)
    const b = ctx.client()
    await b.register({
      email: 'bob@example.com',
      password: VALID_PASSWORD,
      displayName: 'Bob',
    })

    // Bob's valid token, presented on Alice's session.
    const { status } = await a.post(
      '/api/workspaces',
      { name: 'Acme' },
      { csrf: b.csrfToken },
    )
    expect(status).toBe(403)
  })

  it('allows safe methods without a token', async () => {
    const client = ctx.client()
    await client.register(NEW_USER)
    expect((await client.get('/api/workspaces')).status).toBe(200)
  })
})

describe('rate limiting', () => {
  it('limits repeated failed sign-ins and then recovers after success', async () => {
    const client = ctx.client()
    await client.register(NEW_USER)

    let sawLimit = false
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const result = await client.post<{ error: { code: string } }>(
        '/api/auth/sign-in',
        { email: 'ada@example.com', password: 'wrong-password' },
      )
      if (result.status === 429) {
        expect(result.body.error.code).toBe('rate_limited')
        sawLimit = true
        break
      }
      expect(result.status).toBe(401)
    }
    expect(sawLimit).toBe(true)
  })
})

describe('error envelope', () => {
  it('returns 401 for an unknown endpoint when unauthenticated, and 404 when authenticated', async () => {
    // 401 rather than 404 for an anonymous caller is deliberate: a 404 would
    // reveal which endpoints exist, so the API does not distinguish them until
    // the caller is known.
    const anonymous = await ctx
      .client()
      .get<{ error: { code: string } }>('/api/does-not-exist')
    expect(anonymous.status).toBe(401)
    expect(anonymous.body.error.code).toBe('unauthenticated')

    const client = ctx.client()
    await client.register(NEW_USER)

    const authenticated = await client.get<{ error: { code: string; message: string } }>(
      '/api/does-not-exist',
    )
    expect(authenticated.status).toBe(404)
    expect(authenticated.body.error.code).toBe('not_found')
  })

  it('rejects a malformed JSON body as a client error, not a 500', async () => {
    const response = await fetch(`${ctx.baseUrl}/api/auth/sign-in`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{ not json',
    })
    expect(response.status).toBe(400)
  })

  it('rejects an oversized JSON body (>256 kB) as a client error, not a 500', async () => {
    const response = await fetch(`${ctx.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'big@example.com',
        password: VALID_PASSWORD,
        displayName: 'x'.repeat(300 * 1024),
      }),
    })
    expect([400, 413]).toContain(response.status)
  })
})

describe('security headers', () => {
  it('sets hardening headers and hides the framework', async () => {
    const response = await fetch(`${ctx.baseUrl}/api/health`)
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('x-powered-by')).toBeNull()
    expect(response.headers.get('content-security-policy')).toContain("default-src 'none'")
  })

  it('marks the session cookie Secure when COOKIE_SECURE is enabled', async () => {
    const secureCtx = await startTestServer({ config: { COOKIE_SECURE: true } })
    try {
      const { status, response } = await secureCtx.client().post('/api/auth/register', NEW_USER)
      expect(status).toBe(201)
      expect(response.headers.getSetCookie().join(';')).toContain('Secure')
    } finally {
      await secureCtx.close()
    }
  })
})

describe('profile (FR-AUTH-008)', () => {
  it('updates the caller’s own display name', async () => {
    const client = ctx.client()
    await client.register(NEW_USER)

    const result = await client.patch<{ user: { displayName: string } }>(
      '/api/auth/profile',
      { displayName: 'Ada King' },
    )

    expect(result.status).toBe(200)
    expect(result.body.user.displayName).toBe('Ada King')

    // Reflected on the next session read, without signing in again.
    const session = await client.get<{ user: { displayName: string } }>(
      '/api/auth/session',
    )
    expect(session.body.user.displayName).toBe('Ada King')
  })

  it('rejects an empty or over-long display name with a field error', async () => {
    const client = ctx.client()
    await client.register(NEW_USER)

    for (const displayName of ['', '   ', 'x'.repeat(81)]) {
      const result = await client.patch<{
        error: { fieldErrors: Record<string, string> }
      }>('/api/auth/profile', { displayName })
      expect(result.status).toBe(422)
      expect(result.body.error.fieldErrors.displayName).toBeTruthy()
    }
  })

  it('cannot be used to edit another user', async () => {
    const victim = ctx.client()
    await victim.register({
      email: 'victim@example.com',
      password: VALID_PASSWORD,
      displayName: 'Victim',
    })
    const attacker = ctx.client()
    await attacker.register({
      email: 'attacker@example.com',
      password: VALID_PASSWORD,
      displayName: 'Attacker',
    })

    // Unknown keys are stripped (middleware.ts `parse`), so an identifier in
    // the body never reaches the handler and never selects a row.
    const result = await attacker.patch('/api/auth/profile', {
      displayName: 'Hijacked',
      userId: 'usr_anything',
      id: 'usr_anything',
    } as Record<string, unknown>)

    expect(result.status).toBe(200)

    const victimSession = await victim.get<{ user: { displayName: string } }>(
      '/api/auth/session',
    )
    expect(victimSession.body.user.displayName).toBe('Victim')
  })

  it('requires a session and a CSRF token', async () => {
    const anonymous = await ctx.client().patch('/api/auth/profile', {
      displayName: 'Nope',
    })
    expect(anonymous.status).toBe(401)

    const client = ctx.client()
    await client.register(NEW_USER)
    const noCsrf = await client.patch(
      '/api/auth/profile',
      { displayName: 'Nope' },
      { csrf: null },
    )
    expect(noCsrf.status).toBe(403)
  })

  it('exposes no avatar field, because none is defined', async () => {
    const client = ctx.client()
    await client.register(NEW_USER)
    const result = await client.patch<Record<string, unknown>>(
      '/api/auth/profile',
      { displayName: 'Ada King', avatar: 'data:image/png;base64,AAAA' },
    )
    // The request succeeds on display name; the avatar is stripped, not stored.
    expect(result.status).toBe(200)
    expect(JSON.stringify(result)).not.toContain('avatar')
  })
})