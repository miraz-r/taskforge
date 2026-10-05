/**
 * Request validation schemas. Zod.
 *
 * Every request body and every set of query/path parameters is parsed through one
 * of these before a handler sees it. Messages are written for the person using
 * the product and name the offending field (FR-AUTH-004, AC-AUTH-03).
 */

import { z } from 'zod'

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email address is required.')
  .max(254, 'Email address is too long.')
  .refine(
    (value) => {
      const at = value.indexOf('@')
      if (at <= 0 || at === value.length - 1) return false
      if (value.indexOf('@', at + 1) !== -1) return false
      return value.slice(at + 1).includes('.')
    },
    { message: 'Enter an email address in the format name@example.com.' },
  )

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(200, 'Password must be 200 characters or fewer.')

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Display name is required.')
  .max(80, 'Display name must be 80 characters or fewer.')

export const registerBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
})

export const signInBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.').max(200),
})

export const workspaceNameSchema = z
  .string()
  .trim()
  .min(1, 'Workspace name is required.')
  .max(60, 'Workspace name must be 60 characters or fewer.')

export const createWorkspaceBodySchema = z.object({
  name: workspaceNameSchema,
})

/**
 * Colour is a design-token NAME, never a hex literal, so the palette stays owned
 * by the design system and a client cannot inject an arbitrary colour.
 */
export const colourTokenSchema = z
  .enum([
    'brand-600',
    'brand-700',
    'brand-800',
    'accent-500',
    'accent-600',
    'status-info-text',
    'status-success-text',
    'status-warning-text',
  ])
  .nullable()
  .optional()

export const createProjectBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Project name is required.')
    .max(120, 'Project name must be 120 characters or fewer.'),
  description: z.string().max(5000).optional(),
  colourToken: colourTokenSchema,
})

export const updateProjectBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Project name is required.')
      .max(120, 'Project name must be 120 characters or fewer.')
      .optional(),
    description: z.string().max(5000).optional(),
    colourToken: colourTokenSchema,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Nothing to update.',
  })

/** Fixed set, not user-extensible (resolved D-09). */
export const taskStageSchema = z.enum([
  'BACKLOG',
  'IN_PROGRESS',
  'IN_REVIEW',
  'DONE',
])

export const taskPrioritySchema = z.enum(['HIGH', 'MEDIUM', 'LOW', 'NONE'])

export const createTaskBodySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Task title is required.')
    .max(200, 'Task title must be 200 characters or fewer.'),
  description: z.string().max(20000).optional(),
  priority: taskPrioritySchema.optional(),
  /**
   * Canonical UUID only. `Membership.userId` is a `uuid` column, so a prefixed
   * identifier cannot be stored: it previously passed validation here, reached
   * PostgreSQL, and surfaced as `invalid input syntax for type uuid` — a 500 on a
   * malformed request instead of a 422.
   *
   * Rejecting it at the edge also means no membership lookup happens at all for a
   * malformed value, so it cannot be used to probe for real user ids — the
   * non-enumeration property the 403 path relies on is preserved a fortiori.
   */
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z.iso.datetime().nullable().optional(),
})

export const updateTaskBodySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Task title is required.')
      .max(200, 'Task title must be 200 characters or fewer.')
      .optional(),
    description: z.string().max(20000).optional(),
    stage: taskStageSchema.optional(),
    priority: taskPrioritySchema.optional(),
    /** See `createTaskBodySchema`. */
    assigneeId: z.string().uuid().nullable().optional(),
    dueDate: z.iso.datetime().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Nothing to update.',
  })

export const createCommentBodySchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Comment cannot be empty.')
    .max(5000, 'Comment must be 5000 characters or fewer.'),
})

export const projectStateQuerySchema = z.object({
  state: z.enum(['ACTIVE', 'ARCHIVED']).default('ACTIVE'),
})

export const searchQuerySchema = z.object({
  q: z.string().max(200),
})

export const notificationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const idParamSchema = z.object({
  id: z.string().min(1).max(64),
})

export const uuidishParamSchema = z.object({
  id: z.string().min(1).max(64),
})

// --- legacy migration -----------------------------------------------------

const legacyId = z.string().min(1).max(64)
const legacyDate = z.string().max(40)

/**
 * Legacy migration payload.
 *
 * Note what is ABSENT: there is no `memberships` array and no `userId`. The
 * server creates exactly one OWNER membership per imported workspace for the
 * verified importer and generates all user identifiers itself. A payload cannot
 * therefore assert an identity or grant access to anything
 * (see services/migrate.service.ts).
 */
export const legacyImportBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
  passwordHash: z.string().min(1).max(500),
  workspaces: z
    .array(
      z.object({
        id: legacyId,
        name: z.string().min(1).max(60),
        ownerEmail: z.string().min(1).max(254),
        createdAt: legacyDate,
      }),
    )
    .max(50)
    .default([]),
  projects: z
    .array(
      z.object({
        id: legacyId,
        workspaceId: legacyId,
        name: z.string().min(1).max(120),
        description: z.string().max(5000).default(''),
        colourToken: colourTokenSchema.default(null),
        createdAt: legacyDate,
      }),
    )
    .max(500)
    .default([]),
  tasks: z
    .array(
      z.object({
        id: legacyId,
        projectId: legacyId,
        title: z.string().min(1).max(200),
        description: z.string().max(20000).default(''),
        stage: taskStageSchema,
        priority: taskPrioritySchema,
        assigneeEmail: z.string().max(254).nullable().default(null),
        dueDate: legacyDate.nullable().default(null),
        createdAt: legacyDate,
      }),
    )
    .max(5000)
    .default([]),
  comments: z
    .array(
      z.object({
        id: legacyId,
        taskId: legacyId,
        authorEmail: z.string().min(1).max(254),
        body: z.string().min(1).max(5000),
        createdAt: legacyDate,
      }),
    )
    .max(10000)
    .default([]),
})

/**
 * FR-AUTH-008, display name only.
 *
 * No avatar field: there is no avatar storage column and design-system 10.4
 * marks the avatar specification Proposed. Adding one would be inventing
 * storage, transport and presentation in a single unapproved step.
 *
 * Like every other body schema here, unknown keys are STRIPPED rather than
 * rejected (see `parse` in middleware.ts). That is what makes a request naming
 * `userId` or `avatar` harmless: the extra field never reaches the handler, and
 * the caller gets a truthful success on the one field it did send.
 */
export const updateProfileBodySchema = z.object({
  displayName: displayNameSchema,
})