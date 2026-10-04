/**
 * Middleware and request validation.
 *
 * Two invariants:
 *   - The authenticated actor is attached to `req.actor` ONLY from a validated
 *     session record. No route reads a user id from a body, query, or header.
 *   - Every state-changing request must present the CSRF token bound to its own
 *     session, so a cross-site form post cannot act on a user's behalf.
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express'
import type { ZodType } from 'zod'
import { constantTimeEquals } from './auth/session'
import { invalidCsrf, unauthenticated } from './http/errors'
import type { Actor } from './domain/authorize'
import type { AuthService } from './services/auth.service'

declare module 'express-serve-static-core' {
  interface Request {
    actor?: Actor | undefined
  }
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Resolves the session cookie to an actor and attaches it. Never rejects: a
 * request with no valid session simply has no actor, and `requireAuth` decides
 * whether that is acceptable for the route.
 */
export function attachActor(auth: AuthService, cookieName: string): RequestHandler {
  return (req, _res, next) => {
    void (async () => {
      try {
        const token = req.cookies?.[cookieName] as string | undefined
        req.actor = (await auth.resolveActor(token)) ?? undefined
        next()
      } catch (error) {
        next(error)
      }
    })()
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.actor) {
    next(unauthenticated())
    return
  }
  next()
}

/** Reads the actor or throws. For use inside handlers. */
export function actorOf(req: Request): Actor {
  if (!req.actor) throw unauthenticated()
  return req.actor
}

/**
 * Synchronizer-token CSRF check (see auth/session.ts).
 *
 * Applied to every non-safe method, including sign-out — a cross-site request
 * must not be able to end someone's session either.
 */
export function requireCsrf(auth: AuthService): RequestHandler {
  return (req, _res, next) => {
    void (async () => {
      try {
        if (SAFE_METHODS.has(req.method)) {
          next()
          return
        }
        if (!req.actor) {
          next(unauthenticated())
          return
        }

        const presented = req.get('x-csrf-token') ?? ''
        const expected = presented === '' ? null : await auth.csrfTokenFor(req.actor.sessionId)

        if (!expected || !constantTimeEquals(presented, expected)) {
          next(invalidCsrf())
          return
        }
        next()
      } catch (error) {
        next(error)
      }
    })()
  }
}

/**
 * Parses and coerces input, or throws a ZodError for the error handler to turn
 * into a per-field 422.
 *
 * Zod strips unknown keys by default, so a client cannot smuggle an extra field
 * into a handler that spreads the parsed object.
 */
export function parse<T>(schema: ZodType<T>, value: unknown): T {
  return schema.parse(value)
}
