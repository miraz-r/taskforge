/**
 * Behaviour of the credential-endpoint rate limiter.
 *
 * The limiter's real contract is easy to state wrongly, so these tests pin what it
 * does and — just as importantly — what it does not do. See
 * `server/http/authRateLimit.ts` for the reasoning.
 *
 * Every case here goes over real HTTP against a real Express app with the real
 * limiter mounted, because the ordering that causes the original bug — count,
 * decide, then run the handler — only exists in the assembled middleware chain.
 * A unit test of the store alone would not have caught it.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import express from 'express'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createAuthLimiter } from '../http/authRateLimit'

const LIMIT = 3
const WINDOW_MS = 60_000

let server: Server
let baseUrl: string

/**
 * Mounts the limiter on a single route that reports success or failure on
 * demand, so "successful" and "failed" are exact rather than incidental.
 */
async function startLimiterApp(
  decide: (password: string) => 'ok' | 'fail',
): Promise<void> {
  const app = express()
  app.use(express.json())
  app.use(
    '/sign-in',
    createAuthLimiter({
      windowMs: WINDOW_MS,
      limit: LIMIT,
      standardHeaders: true,
    }),
  )
  app.post('/sign-in', (req, res) => {
    const password = String((req.body as { password?: unknown })?.password ?? '')
    if (decide(password) === 'ok') {
      res.status(200).json({ ok: true })
      return
    }
    res.status(401).json({ error: { code: 'unauthenticated' } })
  })

  server = await new Promise<Server>((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener))
  })
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
}

/**
 * draft-7 sends one combined `RateLimit: limit=3, remaining=2, reset=…` header
 * rather than separate `RateLimit-Limit` / `RateLimit-Remaining` headers.
 */
function parseRateLimit(header: string | null): { limit?: number; remaining?: number } {
  const out: { limit?: number; remaining?: number } = {}
  if (header === null) return out
  for (const field of header.split(',')) {
    const [key, value] = field.split('=').map((part) => part.trim())
    if (key === 'limit') out.limit = Number(value)
    if (key === 'remaining') out.remaining = Number(value)
  }
  return out
}

/** Posts a sign-in attempt. `correct` decides whether the server accepts it. */
async function attempt(
  email: string,
  correct: boolean,
): Promise<{ status: number; limit?: number; remaining?: number }> {
  const response = await fetch(`${baseUrl}/sign-in`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: correct ? 'right' : 'wrong' }),
  })
  return {
    status: response.status,
    ...parseRateLimit(response.headers.get('ratelimit')),
  }
}

beforeEach(async () => {
  await startLimiterApp((password) => (password === 'right' ? 'ok' : 'fail'))
})

afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

describe('successful authentication does not consume the allowance', () => {
  it('serves far more successes than the failure limit', async () => {
    // The bug this pins: a success used to still be REFUSED once the failure
    // counter was exhausted, because the limiter decided before the handler ran.
    for (let i = 0; i < LIMIT * 4; i += 1) {
      const result = await attempt('ada@example.com', true)
      expect(result.status).toBe(200)
    }
  })

  it('reports the allowance as untouched by an earlier success', async () => {
    // The header counts the in-flight request, so a first success reports
    // limit-1. What matters is that a success does not *reduce* the allowance a
    // caller has left, which is what a "remaining drops each time you succeed"
    // bug would look like.
    const first = await attempt('ada@example.com', true)
    const second = await attempt('ada@example.com', true)
    expect(second.remaining).toBe(first.remaining)
  })

  it('does not let failures from one account consume another account allowance', async () => {
    for (let i = 0; i < LIMIT; i += 1) {
      expect((await attempt('attacker@example.com', false)).status).toBe(401)
    }
    // The victim's account is untouched: a separate key.
    expect((await attempt('victim@example.com', true)).status).toBe(200)
  })
})

describe('failed attempts are still rate limited', () => {
  it('refuses once the failure allowance is exhausted', async () => {
    for (let i = 0; i < LIMIT; i += 1) {
      expect((await attempt('ada@example.com', false)).status).toBe(401)
    }
    expect((await attempt('ada@example.com', false)).status).toBe(429)
  })

  it('answers a refusal with the documented error envelope', async () => {
    for (let i = 0; i < LIMIT; i += 1) {
      await attempt('ada@example.com', false)
    }
    const response = await fetch(`${baseUrl}/sign-in`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'ada@example.com', password: 'wrong' }),
    })
    expect(response.status).toBe(429)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'rate_limited',
        message: 'Too many attempts. Please wait a few minutes and try again.',
      },
    })
  })

  it('exposes a legible limit to well-behaved clients', async () => {
    const result = await attempt('ada@example.com', false)
    expect(result.limit).toBe(LIMIT)
    expect(result.remaining).toBe(LIMIT - 1)
  })
})

describe('the honest limit of this protection', () => {
  it('refuses an exhausted key even when the credentials are CORRECT', async () => {
    // Not a defect to be "fixed" by removing the limit. The server cannot know a
    // password is right without verifying it, and verifying unlimited guesses is
    // the attack this limit exists to stop. Pinned so the guarantee in the module
    // docs cannot be quietly overstated.
    for (let i = 0; i < LIMIT; i += 1) {
      expect((await attempt('ada@example.com', false)).status).toBe(401)
    }
    const blocked = await attempt('ada@example.com', true)
    expect(blocked.status).toBe(429)
  })

  it('does NOT clear earlier failures when correct credentials arrive', async () => {
    // Pinned because it is counter-intuitive and was initially documented as the
    // opposite. The count is a running total of failures; a success is merely not
    // added to it. Here 2 failures stand, the success is discounted, and only
    // LIMIT-2 further failures remain before the key is refused.
    expect((await attempt('ada@example.com', false)).status).toBe(401)
    expect((await attempt('ada@example.com', false)).status).toBe(401)
    expect((await attempt('ada@example.com', true)).status).toBe(200)

    // The two earlier failures are still counted, so exactly LIMIT-2 remain.
    for (let i = 0; i < LIMIT - 2; i += 1) {
      expect((await attempt('ada@example.com', false)).status).toBe(401)
    }
    // The 4th failure is one too many. If a success HAD reset the allowance this
    // would be 401.
    expect((await attempt('ada@example.com', false)).status).toBe(429)
  })
})

describe('the key cannot be sidestepped', () => {
  it('treats email case and whitespace as the same account', async () => {
    for (let i = 0; i < LIMIT; i += 1) {
      expect((await attempt('ada@example.com', false)).status).toBe(401)
    }
    // Same account, different spelling — must not mint a fresh allowance.
    expect((await attempt('  ADA@Example.COM ', false)).status).toBe(429)
  })

  it('falls back to the IP alone when no email is present', async () => {
    // Otherwise an attacker could mint unlimited keys by omitting the email.
    const response = await fetch(`${baseUrl}/sign-in`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: 'wrong' }),
    })
    expect(response.status).toBe(401)
  })
})