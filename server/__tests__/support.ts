/**
 * Real-HTTP test harness.
 *
 * Boots the actual Express application on an ephemeral port and drives it with
 * `fetch`, so these are genuine over-the-wire tests: real middleware order, real
 * cookie handling, real status codes, real JSON.
 *
 * The data layer is the in-memory store, which satisfies the same `Store`
 * interface as the Prisma implementation. That means the authorization logic
 * under test is the production logic — only persistence is substituted.
 *
 * WHAT THIS DOES NOT PROVE: PostgreSQL behaviour. Unique-constraint races,
 * transaction isolation, cascade deletes, and query plans are NOT exercised.
 * Those live in server/__tests__/db and are skipped unless DATABASE_URL is set.
 */

import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { createApp, createServices } from '../app'
import { loadConfig, type AppConfig } from '../config'
import { MemoryStore } from '../repositories/memory'

export interface TestContext {
  store: MemoryStore
  config: AppConfig
  baseUrl: string
  close: () => Promise<void>
  client: () => TestClient
}

export function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const base = loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:1/unused',
    // Cookies must not be Secure over plain http in tests.
    COOKIE_SECURE: 'false',
    TRUST_PROXY: 'false',
    AUTH_RATE_LIMIT: '5',
    AUTH_RATE_WINDOW_MS: '60000',
    MAX_WORKSPACES_PER_USER: '2',
    ...overrides,
  } as unknown as NodeJS.ProcessEnv)
  return base
}

/** Minimal cookie-jar client. Node's fetch has no jar, so this tracks one. */
export class TestClient {
  private readonly jar = new Map<string, string>()
  csrfToken: string | null = null

  constructor(private readonly baseUrl: string) {}

  private cookieHeader(): string | undefined {
    if (this.jar.size === 0) return undefined
    return [...this.jar].map(([k, v]) => `${k}=${v}`).join('; ')
  }

  private absorb(response: Response): void {
    const cookies =
      typeof response.headers.getSetCookie === 'function'
        ? response.headers.getSetCookie()
        : []
    for (const raw of cookies) {
      const [pair = ''] = raw.split(';')
      const eq = pair.indexOf('=')
      if (eq <= 0) continue
      const name = pair.slice(0, eq).trim()
      const value = pair.slice(eq + 1).trim()
      if (value === '') this.jar.delete(name)
      else this.jar.set(name, value)
    }
  }

  async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
    options?: { csrf?: string | null },
  ): Promise<{ status: number; body: T; response: Response }> {
    const headers: Record<string, string> = {}
    if (body !== undefined) headers['content-type'] = 'application/json'
    const cookie = this.cookieHeader()
    if (cookie) headers.cookie = cookie
    const csrf =
      options?.csrf === undefined ? this.csrfToken : options.csrf
    if (csrf) headers['x-csrf-token'] = csrf

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      redirect: 'manual',
    })
    this.absorb(response)

    const text = await response.text()
    let parsed: unknown = null
    if (text.length > 0) {
      try {
        parsed = JSON.parse(text)
      } catch {
        parsed = text
      }
    }
    return { status: response.status, body: parsed as T, response }
  }

  get<T = unknown>(path: string) {
    return this.request<T>('GET', path)
  }
  post<T = unknown>(path: string, body?: unknown, options?: { csrf?: string | null }) {
    return this.request<T>('POST', path, body, options)
  }
  patch<T = unknown>(path: string, body?: unknown, options?: { csrf?: string | null }) {
    return this.request<T>('PATCH', path, body, options)
  }

  /** Registers and retains the session + CSRF token for later requests. */
  async register(input: {
    email: string
    password: string
    displayName: string
  }): Promise<void> {
    const result = await this.post<{ csrfToken: string }>('/api/auth/register', input)
    if (result.status !== 201) {
      throw new Error(`register failed: ${result.status} ${JSON.stringify(result.body)}`)
    }
    this.csrfToken = result.body.csrfToken
  }

  async signIn(email: string, password: string): Promise<number> {
    const result = await this.post<{ csrfToken: string }>('/api/auth/sign-in', {
      email,
      password,
    })
    if (result.status === 200) this.csrfToken = result.body.csrfToken
    return result.status
  }
}

export async function startTestServer(
  options: { config?: Partial<AppConfig>; store?: MemoryStore } = {},
): Promise<TestContext> {
  const config = testConfig(options.config ?? {})
  const store = options.store ?? new MemoryStore()
  const services = createServices(store, config)
  const app = createApp({ config, store, services })

  const server: Server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener))
  })
  const address = server.address() as AddressInfo

  return {
    store,
    config,
    baseUrl: `http://127.0.0.1:${address.port}`,
    client: () => new TestClient(`http://127.0.0.1:${address.port}`),
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
      }),
  }
}

export const VALID_PASSWORD = 'a-good-password'
