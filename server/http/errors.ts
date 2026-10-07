/**
 * Error taxonomy and the single response envelope.
 *
 * Rules enforced here:
 *  - No route ever returns a raw database, driver, or framework error.
 *  - Messages state what failed and the next action, never internal detail
 *    (NFR-ERR-001, NFR-ERR-007).
 *  - "Not a member" and "does not exist" are indistinguishable, so a caller
 *    cannot probe for the existence of another user's resources.
 *  - Unexpected faults are logged server-side and reported generically.
 */

import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

export type ApiErrorCode =
  | 'validation_failed'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'limit_reached'
  | 'invalid_csrf'
  | 'internal_error'

export interface FieldErrors {
  [field: string]: string
}

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode
    message: string
    fieldErrors?: FieldErrors
  }
}

export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly fieldErrors: FieldErrors | undefined

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    fieldErrors?: FieldErrors,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }

  toBody(): ApiErrorBody {
    const error: ApiErrorBody['error'] = {
      code: this.code,
      message: this.message,
    }
    if (this.fieldErrors && Object.keys(this.fieldErrors).length > 0) {
      error.fieldErrors = this.fieldErrors
    }
    return { error }
  }
}

export const unauthenticated = (message = 'Sign in to continue.') =>
  new ApiError(401, 'unauthenticated', message)

/**
 * Deliberately identical wording for "absent" and "not yours".
 *
 * Using one message for both prevents an attacker from learning whether a
 * workspace id exists (NFR-SEC-010, NFR-ERR-007).
 */
export const forbiddenOrHidden = () =>
  new ApiError(
    403,
    'forbidden',
    'You do not have access to that resource.',
  )

export const notFound = (message = 'That resource does not exist.') =>
  new ApiError(404, 'not_found', message)

export const conflict = (message: string, fieldErrors?: FieldErrors) =>
  new ApiError(409, 'conflict', message, fieldErrors)

export const limitReached = (message: string) =>
  new ApiError(422, 'limit_reached', message)

export const invalidCsrf = () =>
  new ApiError(403, 'invalid_csrf', 'Your session could not be verified. Please try again.')

/**
 * Wraps a Zod failure as per-field errors.
 *
 * FR-AUTH-004 / AC-AUTH-03: the message must name the specific field and the
 * reason. The first issue per field wins so the user sees one clear message
 * rather than a stack.
 */
export function fromZodError(error: ZodError): ApiError {
  const fieldErrors: FieldErrors = {}
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : 'form'
    if (!(key in fieldErrors)) fieldErrors[key] = issue.message
  }
  const first = Object.values(fieldErrors)[0]
  return new ApiError(
    422,
    'validation_failed',
    first ?? 'Some fields need attention.',
    fieldErrors,
  )
}

/** Terminal error handler. Must be registered last. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(err)
    return
  }

  if (err instanceof ApiError) {
    res.status(err.status).json(err.toBody())
    return
  }

  if (err instanceof ZodError) {
    const apiError = fromZodError(err)
    res.status(apiError.status).json(apiError.toBody())
    return
  }

  // express.json() raises this for malformed request bodies. It is a client
  // error, not a server fault, and must not surface as a 500.
  if (
    err instanceof SyntaxError &&
    'body' in err &&
    (err as { status?: number }).status === 400
  ) {
    res
      .status(400)
      .json({ error: { code: 'validation_failed', message: 'Malformed request body.' } })
    return
  }

  // express.json({ limit }) raises this for bodies over the limit. It is a
  // client error, not a server fault, and must not surface as a 500.
  if (
    err instanceof Error &&
    (err as { type?: unknown }).type === 'entity.too.large'
  ) {
    res
      .status(413)
      .json({ error: { code: 'validation_failed', message: 'Request body is too large.' } })
    return
  }

  // Anything else is an internal fault. The detail goes to the server log; the
  // client gets an actionable, non-specific message (NFR-ERR-007).
  console.error('[taskforge] unhandled error:', err)
  res.status(500).json({
    error: {
      code: 'internal_error',
      message: 'Something went wrong on our side. Please try again.',
    },
  })
}

/** 404 for unmatched /api paths, so they return the standard envelope. */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: { code: 'not_found', message: 'That endpoint does not exist.' },
  })
}

/** Wraps an async handler so a rejected promise reaches `errorHandler`. */
export function asyncHandler<T extends Request>(
  handler: (req: T, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req as T, res, next).catch(next)
  }
}
