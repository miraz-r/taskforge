/**
 * Environment-based configuration.
 *
 * Every value the server needs is read here and validated once at startup, so a
 * misconfigured deployment fails immediately and loudly rather than at the first
 * request. Nothing is read from `process.env` anywhere else.
 *
 * Secrets are never logged, never returned in an error, and never committed —
 * `.env` is gitignored and `.env.example` carries placeholders only
 * (AGENTS.md 11).
 */

import { z } from 'zod'

/** Coerced so an unset variable in a .env file behaves like an absent one. */
const emptyToUndefined = (value: unknown) =>
  value === '' || value === undefined ? undefined : value

const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((value) =>
    typeof value === 'boolean' ? value : value.trim().toLowerCase() === 'true',
  )

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  /** PostgreSQL connection string. Required: there is no in-memory fallback. */
  DATABASE_URL: z.preprocess(
    emptyToUndefined,
    z.string().min(1, 'DATABASE_URL is required'),
  ),

  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  HOST: z.string().min(1).default('127.0.0.1'),

  /**
   * Origin the browser app is served from.
   *
   * Currently informational only: no Origin/Referer check is performed.
   * Cross-site protection comes from the synchronizer-token CSRF check (see
   * `middleware.ts` `requireCsrf`): every state-changing request must echo the
   * session-bound token from `GET /api/auth/session` in `X-CSRF-Token`, and
   * the session cookie is `HttpOnly; SameSite=Lax` (`Secure` when
   * COOKIE_SECURE is true).
   */
  APP_ORIGIN: z.preprocess(
    emptyToUndefined,
    z.string().url().default('http://localhost:5173'),
  ),

  SESSION_COOKIE_NAME: z.string().min(1).default('taskforge_session'),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(24 * 30).default(24 * 7),

  /**
   * Cookies are marked Secure unless explicitly disabled. Disable ONLY for
   * local http development; a production deployment that sets this to false has
   * its session cookie exposed on the wire.
   */
  COOKIE_SECURE: booleanish.default(true),

  /** Trust proxy headers. Enable only behind a proxy you control. */
  TRUST_PROXY: booleanish.default(false),

  /** Fixed-window limit for /api/auth/*. */
  AUTH_RATE_LIMIT: z.coerce.number().int().min(1).default(20),
  AUTH_RATE_WINDOW_MS: z.coerce.number().int().min(1000).default(15 * 60 * 1000),

  /**
   * Maximum workspaces a single user may own (2). Enforced server-side; the
   * count is scoped to workspaces the user owns.
   */
  MAX_WORKSPACES_PER_USER: z.coerce.number().int().min(1).default(2),
})

export type AppConfig = z.infer<typeof schema>

export class ConfigError extends Error {
  constructor(readonly issues: string[]) {
    super(`Invalid configuration:\n  - ${issues.join('\n  - ')}`)
    this.name = 'ConfigError'
  }
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = schema.safeParse(source)
  if (!parsed.success) {
    // Report field names and reasons only. Values are never echoed, because a
    // malformed value could be a credential (AGENTS.md 11.2, 11.5).
    throw new ConfigError(
      parsed.error.issues.map((issue) => {
        const key = issue.path.join('.') || '(root)'
        return `${key}: ${issue.message}`
      }),
    )
  }

  // Fail fast on an insecure production deployment: a session cookie without
  // the Secure flag is exposed on the wire. Development and test are
  // unaffected so plain-http local work keeps working.
  if (parsed.data.NODE_ENV === 'production' && parsed.data.COOKIE_SECURE === false) {
    throw new ConfigError([
      'COOKIE_SECURE: must be true in production (refusing to serve insecure session cookies)',
    ])
  }

  return parsed.data
}

export const isProduction = (config: AppConfig): boolean =>
  config.NODE_ENV === 'production'
