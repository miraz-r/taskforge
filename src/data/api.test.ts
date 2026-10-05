/**
 * The network API client's 401 handling, against the REAL server contract.
 *
 * Every other client test runs through `LocalBackend`, which raises
 * `INVALID_CREDENTIALS`. The real API answers a rejected sign-in with the
 * deliberately generic `unauthenticated` code — the same code it uses for a dead
 * session. Because the two shapes never met, a failed sign-in was reported to the
 * user as "Your session has ended. Sign in to continue.", and the client fired
 * `unauthorized`, clearing a perfectly valid session.
 *
 * These tests drive `ApiClient` with an injected fetch so the distinction is
 * exercised where the bug actually lived.
 */

import { describe, expect, it, vi } from 'vitest'
import { ApiClient, ApiError, NetworkError, UNAUTHORIZED_EVENT } from './api'
import { RemoteBackend } from './remoteBackend'
import { TaskForgeService } from '../access/service'

const GENERIC_SIGN_IN = 'Sign-in failed. Check your email and password.'

/** A fetch double returning one canned response, and recording the calls. */
function stubFetch(
  status: number,
  body: unknown,
): { fetchImpl: typeof fetch; calls: string[] } {
  const calls: string[] = []
  const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
    calls.push(String(input))
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  }) as unknown as typeof fetch
  return { fetchImpl, calls }
}

function serviceWith(fetchImpl: typeof fetch): TaskForgeService {
  return new TaskForgeService(new RemoteBackend(new ApiClient({ fetchImpl })))
}

describe('a rejected sign-in is not an expired session', () => {
  it('reports the sign-in failure rather than an ended session', async () => {
    // Exactly what the API returns for a wrong password or unknown account.
    const { fetchImpl } = stubFetch(401, {
      error: { code: 'unauthenticated', message: GENERIC_SIGN_IN },
    })
    const result = await serviceWith(fetchImpl).signIn({
      email: 'ada@example.com',
      password: 'wrong-password',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.formError).toBe(GENERIC_SIGN_IN)
    // The bug reported this instead.
    expect(result.error.formError).not.toMatch(/session has ended/i)
  })

  it('does not fire the unauthorized event, so a valid session survives', async () => {
    const { fetchImpl } = stubFetch(401, {
      error: { code: 'unauthenticated', message: GENERIC_SIGN_IN },
    })
    const onUnauthorized = vi.fn()
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    try {
      await serviceWith(fetchImpl).signIn({
        email: 'ada@example.com',
        password: 'wrong-password',
      })
      expect(onUnauthorized).not.toHaveBeenCalled()
    } finally {
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    }
  })

  it('still reports invalid credentials from the in-process backend', async () => {
    // Guards the existing `INVALID_CREDENTIALS` path used by LocalBackend.
    const { LocalBackend } = await import('./localBackend')
    const result = await new TaskForgeService(
      new LocalBackend({ latencyMs: 0 }),
    ).signIn({ email: 'ada@example.com', password: 'wrong-password' })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.formError).toBe(GENERIC_SIGN_IN)
  })
})

describe('a genuinely dead session is still detected', () => {
  it('fires the unauthorized event for a 401 from a normal endpoint', async () => {
    const { fetchImpl, calls } = stubFetch(401, {
      error: { code: 'unauthenticated', message: 'Sign in to continue.' },
    })
    const onUnauthorized = vi.fn()
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    try {
      const api = new ApiClient({ fetchImpl })
      const backend = new RemoteBackend(api)
      await expect(backend.listWorkspaces()).rejects.toBeInstanceOf(ApiError)
      expect(calls[0]).toContain('/workspaces')
      expect(onUnauthorized).toHaveBeenCalledTimes(1)
    } finally {
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    }
  })

  it('does not fire it for a 403, which is an authorization refusal', async () => {
    const { fetchImpl } = stubFetch(403, {
      error: { code: 'forbidden', message: 'Not allowed.' },
    })
    const onUnauthorized = vi.fn()
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    try {
      const backend = new RemoteBackend(new ApiClient({ fetchImpl }))
      await expect(backend.listWorkspaces()).rejects.toBeInstanceOf(ApiError)
      expect(onUnauthorized).not.toHaveBeenCalled()
    } finally {
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    }
  })
})

describe('transport failures stay distinguishable from auth failures', () => {
  it('reports an unreachable API as a NetworkError, not a 401', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('fetch failed')
    }) as unknown as typeof fetch
    const backend = new RemoteBackend(new ApiClient({ fetchImpl }))
    await expect(backend.listWorkspaces()).rejects.toBeInstanceOf(NetworkError)
  })
})
