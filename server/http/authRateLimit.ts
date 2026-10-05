/**
 * Rate limiting for the credential endpoints.
 *
 * WHAT THIS ACTUALLY GUARANTEES — read before changing it
 * ------------------------------------------------------
 * Only FAILED attempts consume the allowance. A successful sign-in or
 * registration is not counted, so getting it right never moves a caller closer
 * to being locked out.
 *
 * Two things it does NOT do, stated plainly because the intuitive reading is
 * wrong and a comment that implies otherwise is a defect:
 *
 *   1. A success does NOT clear earlier failures. The count is a running total of
 *      failures within the window; a later success neither adds to it nor resets
 *      it. Observed: `fail, fail, success, fail, fail, fail` reaches the limit on
 *      the sixth request, because the three failures remain and the success was
 *      simply never added. "Recovering resets the allowance" is false.
 *
 *   2. Once the allowance for a key is exhausted, that key is refused for the rest
 *      of the window — INCLUDING when the credentials presented are correct. This
 *      cannot be otherwise: the server cannot know a password is right without
 *      verifying it, and verifying unlimited guesses is exactly the attack this
 *      limit exists to prevent.
 *
 * So the accurate statement is "a correct sign-in never consumes the allowance",
 * not "a correct sign-in is never refused". Anyone tempted to soften the second
 * point should understand that making it true means removing the limit.
 *
 * The `RateLimit` response header reflects the count at the moment the request
 * arrived, including that in-flight request, so it reads one lower than the count
 * the store settles on once a success has been discounted.
 *
 * WHY THE KEY INCLUDES THE EMAIL
 * Keyed on IP alone, one attacker guessing against one account exhausts the
 * bucket for every legitimate user behind the same address — which includes every
 * user of a shared or proxied connection, and in local development everyone,
 * since the Vite proxy makes all browser traffic arrive from 127.0.0.1. Keying on
 * IP *and* normalised email keeps per-account protection while stopping one
 * account's attack from locking out an unrelated account.
 *
 * The IP component is deliberately retained. Keying on email alone would let an
 * attacker rotate through addresses and spray many accounts from one host, which
 * is the pattern this limit also needs to constrain.
 */

import rateLimit, { ipKeyGenerator, type Options } from 'express-rate-limit'
import type { Request, RequestHandler, Response } from 'express'

export interface AuthRateLimitOptions {
  windowMs: number
  /** Failed attempts permitted per key per window. */
  limit: number
  standardHeaders: boolean
  /**
   * Extracts the account identifier from the request, for the per-account half of
   * the key. Returning null (malformed body, unknown route) falls back to the IP
   * alone, which is the safe direction: fewer distinct keys, never more.
   */
  accountKey?: (req: Request) => string | null
}

/** Normalises an email for keying, so case or whitespace cannot multiply buckets. */
function normaliseAccount(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().toLowerCase()
  return trimmed === '' ? null : trimmed
}

/**
 * Reads the email from the body when it is already parsed. Deliberately does not
 * consume or mutate the request stream: the body is still needed downstream.
 */
function accountFromBody(req: Request): string | null {
  const body: unknown = req.body
  if (typeof body !== 'object' || body === null) return null
  return normaliseAccount((body as { email?: unknown }).email)
}

/**
 * The limiter used for `/auth/sign-in` and `/auth/register`.
 *
 * `skipSuccessfulRequests` is what makes only failures count. It discounts a
 * success from the running total; it does not clear the failures already counted,
 * and the module comment above says so explicitly.
 */
export function createAuthLimiter(options: AuthRateLimitOptions): RequestHandler {
  const { windowMs, limit, standardHeaders, accountKey = accountFromBody } = options

  const settings: Partial<Options> = {
    windowMs,
    limit,
    standardHeaders: standardHeaders ? 'draft-7' : false,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    keyGenerator: (req: Request): string => {
      const account = accountKey(req)
      // `ipKeyGenerator` applies the IPv6 subnet mask. Using `req.ip` directly
      // would let one host present unlimited IPv6 addresses to sidestep the
      // limit, which the library refuses to construct unless the helper is used.
      const ip = ipKeyGenerator(req.ip ?? '')
      // Fall back to the IP alone rather than dropping the key: an unparseable
      // request must not be able to create an unlimited supply of fresh buckets.
      return account === null ? ip : `${ip}|${account}`
    },
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        error: {
          code: 'rate_limited',
          message: 'Too many attempts. Please wait a few minutes and try again.',
        },
      })
    },
  }

  return rateLimit(settings as Options)
}