/**
 * Express application factory.
 *
 * Exported separately from `server/index.ts` so tests can build the app against
 * the in-memory store and drive it over real HTTP with no database and no
 * listening production process.
 *
 * Security posture applied here:
 *   - helmet, with the default CSP relaxed only enough to permit the Vite dev
 *     client; production builds are same-origin.
 *   - rate limiting on the sensitive auth endpoints.
 *   - a strict JSON body limit.
 *   - a single terminal error handler that never leaks internals.
 */

import express, { type Express } from 'express'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import type { AppConfig } from './config'
import { attachActor } from './middleware'
import { errorHandler, notFoundHandler } from './http/errors'
import { createAccountRouter } from './routes/account.routes'
import { createWorkRouter } from './routes/work.routes'
import type { Store } from './repositories/store'
import { AuthService } from './services/auth.service'
import { WorkspaceService } from './services/workspace.service'
import { ProjectService, TaskService } from './services/project.service'
import { NotificationService } from './services/notification.service'
import { DashboardService, SearchService } from './services/insight.service'
import { MigrateService } from './services/migrate.service'

export interface AppServices {
  auth: AuthService
  workspaces: WorkspaceService
  projects: ProjectService
  tasks: TaskService
  notifications: NotificationService
  search: SearchService
  dashboard: DashboardService
  migrate: MigrateService
}
export interface CreateAppOptions {
  config: AppConfig
  store: Store
  services: AppServices
}

export function createApp({ config, services }: CreateAppOptions): Express {
  const app = express()

  // Required for correct client IPs (and therefore rate limiting) behind a proxy.
  app.set('trust proxy', config.TRUST_PROXY)
  app.disable('x-powered-by')

  app.use(
    helmet({
      // The API serves JSON only; a restrictive default CSP is appropriate and
      // does not need relaxing for the client app, which is a separate origin in
      // development and fully static in production.
      contentSecurityPolicy: {
        directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  )

  app.use(express.json({ limit: '256kb' }))
  app.use(cookieParser())

  /**
   * Rate limiting on credential endpoints. A fixed window keyed by client IP;
   * `standardHeaders` makes the limit legible to well-behaved clients.
   *
   * `trust proxy` above controls whether the IP is taken from X-Forwarded-For,
   * so this is only as trustworthy as the proxy configuration.
   */
  const authLimiter = rateLimit({
    windowMs: config.AUTH_RATE_WINDOW_MS,
    limit: config.AUTH_RATE_LIMIT,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Successful registrations and sign-ins are not abuse; only failures count
    // toward the limit, so a legitimate user is never locked out by typing
    // correctly.
    skipSuccessfulRequests: true,
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          code: 'rate_limited',
          message: 'Too many attempts. Please wait a few minutes and try again.',
        },
      })
    },
  })

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok' })
  })

  app.use('/api', attachActor(services.auth, config.SESSION_COOKIE_NAME))

  app.use(
    '/api',
    createAccountRouter({
      config,
      auth: services.auth,
      workspaces: services.workspaces,
      migrate: services.migrate,
      // Applied to the credential endpoints only — see below.
      authLimiter,
    }),
  )

  app.use(
    '/api',
    createWorkRouter({
      auth: services.auth,
      projects: services.projects,
      tasks: services.tasks,
      search: services.search,
      dashboard: services.dashboard,
      notifications: services.notifications,
    }),
  )

  // Anything under /api that reached this point is not a route.
  app.use('/api', notFoundHandler)

  app.use(errorHandler)

  return app
}

export function createServices(store: Store, config: AppConfig): AppServices {
  const auth = new AuthService(store, config.SESSION_TTL_HOURS)
  const notifications = new NotificationService(store)

  return {
    auth,
    notifications,
    workspaces: new WorkspaceService(store, config.MAX_WORKSPACES_PER_USER),
    projects: new ProjectService(store, notifications),
    tasks: new TaskService(store, notifications),
    search: new SearchService(store),
    dashboard: new DashboardService(store),
    migrate: new MigrateService(store),
  }
}
