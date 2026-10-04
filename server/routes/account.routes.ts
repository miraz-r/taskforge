/**
 * Account routes: authentication, session, workspaces, legacy migration.
 *
 * Every route here derives identity from the session cookie. No route accepts a
 * user id from the request.
 */

import { Router, type RequestHandler, type Response } from 'express'
import {
  buildExpiredSessionCookie,
  buildSessionCookie,
  type SessionCookieOptions,
} from '../auth/session'
import { actorOf, parse, requireAuth, requireCsrf } from '../middleware'
import { asyncHandler } from '../http/errors'
import { toUserDto, toWorkspaceDto } from '../http/dto'
import {
  createWorkspaceBodySchema,
  legacyImportBodySchema,
  registerBodySchema,
  signInBodySchema,
  updateProfileBodySchema,
} from '../validation/schemas'
import type { AppConfig } from '../config'
import type { AuthService } from '../services/auth.service'
import type { WorkspaceService } from '../services/workspace.service'
import type { MigrateService } from '../services/migrate.service'

export interface AccountRouterDeps {
  config: AppConfig
  auth: AuthService
  workspaces: WorkspaceService
  migrate: MigrateService
  /**
   * Applied to the credential endpoints (register, sign-in, legacy import).
   * Passed in rather than mounted globally so that ordinary reads are not
   * rate-limited and a locked-out user can still sign out.
   */
  authLimiter: RequestHandler
}

function cookieOptions(config: AppConfig): SessionCookieOptions {
  return {
    maxAgeSeconds: config.SESSION_TTL_HOURS * 60 * 60,
    secure: config.COOKIE_SECURE,
    path: '/',
  }
}

export function createAccountRouter(deps: AccountRouterDeps): Router {
  const { config, auth, workspaces, migrate, authLimiter } = deps
  const router = Router()

  const setSession = (res: Response, token: string) => {
    res.append(
      'Set-Cookie',
      buildSessionCookie(config.SESSION_COOKIE_NAME, token, cookieOptions(config)),
    )
  }

  const clearSession = (res: Response) => {
    res.append(
      'Set-Cookie',
      buildExpiredSessionCookie(config.SESSION_COOKIE_NAME, {
        secure: config.COOKIE_SECURE,
        path: '/',
      }),
    )
  }

  router.post(
    '/auth/register',
    authLimiter,
    asyncHandler(async (req, res) => {
      const body = parse(registerBodySchema, req.body)
      const result = await auth.register(body)
      setSession(res, result.sessionToken)
      res.status(201).json({
        user: toUserDto(result.user),
        csrfToken: result.session.csrfToken,
      })
    }),
  )

  router.post(
    '/auth/sign-in',
    authLimiter,
    asyncHandler(async (req, res) => {
      const body = parse(signInBodySchema, req.body)
      const result = await auth.signIn(body)
      setSession(res, result.sessionToken)
      res.status(200).json({
        user: toUserDto(result.user),
        csrfToken: result.session.csrfToken,
      })
    }),
  )

  /**
   * Returns the current actor. The client calls this on boot to restore
   * authentication state; a missing session is a 200 with `user: null` so the
   * client can distinguish "signed out" from "server unreachable".
   */
  router.get(
    '/auth/session',
    asyncHandler(async (req, res) => {
      if (!req.actor) {
        res.status(200).json({ user: null, csrfToken: null, expiresAt: null })
        return
      }
      const user = await auth.userById(req.actor.userId)
      if (!user) {
        res.status(200).json({ user: null, csrfToken: null, expiresAt: null })
        return
      }
      const csrfToken = await auth.csrfTokenFor(req.actor.sessionId)
      res.status(200).json({
        user: toUserDto(user),
        csrfToken,
        expiresAt: new Date(
          Date.now() + config.SESSION_TTL_HOURS * 60 * 60 * 1000,
        ).toISOString(),
      })
    }),
  )

  router.post(
    '/auth/sign-out',
    requireAuth,
    requireCsrf(auth),
    asyncHandler(async (req, res) => {
      await auth.signOut(actorOf(req).sessionId)
      clearSession(res)
      res.status(204).end()
    }),
  )

  /**
   * FR-AUTH-008: update the caller's OWN profile.
   *
   * Display name only. There is no avatar endpoint because there is no avatar
   * storage and design-system 10.4 marks the avatar specification Proposed.
   *
   * The user is derived from the session; the body carries no identifier, so one
   * caller cannot edit another's profile.
   */
  router.patch(
    '/auth/profile',
    requireAuth,
    requireCsrf(auth),
    asyncHandler(async (req, res) => {
      const body = parse(updateProfileBodySchema, req.body)
      const updated = await auth.updateDisplayName(actorOf(req), body.displayName)
      res.status(200).json({ user: toUserDto(updated) })
    }),
  )

  // --- workspaces ---------------------------------------------------------

  router.get(
    '/workspaces',
    requireAuth,
    asyncHandler(async (req, res) => {
      const list = await workspaces.list(actorOf(req))
      const counts = await workspaces.counts(actorOf(req))
      res.status(200).json({
        workspaces: list.map(toWorkspaceDto),
        owned: counts.owned,
        limit: counts.limit,
      })
    }),
  )

  router.post(
    '/workspaces',
    requireAuth,
    requireCsrf(auth),
    asyncHandler(async (req, res) => {
      const body = parse(createWorkspaceBodySchema, req.body)
      const workspace = await workspaces.create(actorOf(req), body)
      res.status(201).json({ workspace: toWorkspaceDto(workspace) })
    }),
  )

  // --- legacy migration ---------------------------------------------------

  /**
   * Unauthenticated by necessity: it is how a legacy browser account becomes a
   * server account. It is not a session bypass — ownership is proven by
   * verifying the supplied password against the supplied hash
   * (see services/migrate.service.ts).
   */
  router.post(
    '/migrate/legacy',
    authLimiter,
    asyncHandler(async (req, res) => {
      const body = parse(legacyImportBodySchema, req.body)
      const report = await migrate.importLegacy(body)
      res.status(200).json({ report })
    }),
  )

  return router
}
