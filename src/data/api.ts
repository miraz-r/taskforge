/**
 * API client.
 *
 * Owns everything about talking to the server so no view or service has to know
 * about cookies, CSRF, or status codes:
 *
 *  - `credentials: 'include'` so the HttpOnly session cookie travels.
 *  - The CSRF token is held in memory and echoed in `X-CSRF-Token` on every
 *    state-changing request. It is never persisted to localStorage: a value
 *    readable from storage would defeat the synchronizer-token pattern.
 *  - A 401 means the session expired. The stored token is cleared and an
 *    `unauthorized` event is raised so the app can return to sign-in rather than
 *    showing a broken shell.
 *  - Server errors arrive in a known envelope and are re-thrown as `ApiError`
 *    carrying per-field messages, so forms can render them without parsing.
 */

export interface ApiFieldErrors {
  [field: string]: string
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors: ApiFieldErrors = {},
  ) {
    super(message)
    this.name = 'ApiError'
  }

  /** True when the failure is about credentials or session, not the user's input. */
  get isAuthFailure(): boolean {
    return this.status === 401
  }
}

/** Raised when the server could not be reached at all. */
export class NetworkError extends Error {
  constructor(message = 'We could not reach TaskForge. Check your connection.') {
    super(message)
    this.name = 'NetworkError'
  }
}

export const UNAUTHORIZED_EVENT = 'taskforge:unauthorized'

/**
 * Endpoints where a 401 means "those credentials were rejected", NOT "your
 * session ended".
 *
 * `POST /auth/sign-in` answers 401 with the deliberately generic
 * `unauthenticated` code for a wrong password or an unknown account — the same
 * shape it uses for a dead session. Without this distinction the client treated
 * an ordinary failed sign-in as an expired session, cleared the session and
 * showed "Your session has ended. Sign in to continue." instead of the server's
 * accurate "Sign-in failed. Check your email and password."
 */
const CREDENTIAL_ATTEMPT_PATHS = new Set(['/auth/sign-in', '/auth/register'])

export interface ApiClientOptions {
  baseUrl?: string
  fetchImpl?: typeof fetch
}

export class ApiClient {
  private csrfToken: string | null = null
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? '/api'
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis)
  }

  setCsrfToken(token: string | null): void {
    this.csrfToken = token
  }

  private isMutation(method: string): boolean {
    return !['GET', 'HEAD', 'OPTIONS'].includes(method)
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const headers: Record<string, string> = { accept: 'application/json' }
    if (body !== undefined) headers['content-type'] = 'application/json'
    if (this.isMutation(method) && this.csrfToken) {
      headers['x-csrf-token'] = this.csrfToken
    }

    let response: Response
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers,
        credentials: 'include',
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
    } catch {
      throw new NetworkError()
    }

    if (response.status === 204) return undefined as T

    const text = await response.text()
    let payload: unknown = null
    if (text.length > 0) {
      try {
        payload = JSON.parse(text)
      } catch {
        throw new NetworkError('TaskForge sent an unexpected response.')
      }
    }

    if (!response.ok) {
      const envelope = payload as
        | { error?: { code?: string; message?: string; fieldErrors?: ApiFieldErrors } }
        | null
      const error = envelope?.error
      const apiError = new ApiError(
        response.status,
        error?.code ?? 'internal_error',
        error?.message ?? 'Something went wrong. Please try again.',
        error?.fieldErrors ?? {},
      )

      if (
        response.status === 401 &&
        !CREDENTIAL_ATTEMPT_PATHS.has(path)
      ) {
        // The session is gone server-side. Drop the token and let the app react
        // rather than continuing to issue doomed requests.
        //
        // A 401 from a credential attempt is deliberately excluded: that is the
        // user mistyping a password, not a session ending, and clearing the
        // session for it would both mislead and destroy a valid session.
        this.csrfToken = null
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
        }
      }
      throw apiError
    }

    // Adopt the CSRF token handed back by register / sign-in / session.
    const maybeToken = (payload as { csrfToken?: string } | null)?.csrfToken
    if (typeof maybeToken === 'string') this.csrfToken = maybeToken

    return payload as T
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path)
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body)
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body)
  }
}
