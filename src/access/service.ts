/**
 * Application service — the only API views are allowed to call.
 *
 * Owns validation, error shaping, and the `Result` envelope. It does NOT own
 * transport or persistence: those belong to `Backend`, which has a remote
 * implementation in production and an in-process one for tests.
 *
 * Passwords are passed to the backend as plaintext and hashed server-side. The
 * browser-side hashing of Phase 0 is gone: a client-computed hash is not a
 * secret, its work factor was never server-enforced, and it prevented a real
 * server from owning authentication.
 */

import type {
  Backend,
  BackendComment,
  BackendNotification,
  BackendProject,
  BackendTask,
  BackendUser,
  BackendWorkspace,
  DashboardData,
  SearchHit,
} from '../data/backend'
import { BackendError } from '../data/backend'
import { ApiClient } from '../data/api'
import { RemoteBackend } from '../data/remoteBackend'
import type { Theme } from '../domain/types'

export interface FieldErrors {
  [field: string]: string
}

export class ServiceError extends Error {
  readonly fieldErrors: FieldErrors
  readonly formError: string | null

  constructor(formError: string | null, fieldErrors: FieldErrors = {}) {
    super(formError ?? Object.values(fieldErrors)[0] ?? 'Something went wrong.')
    this.name = 'ServiceError'
    this.formError = formError
    this.fieldErrors = fieldErrors
  }
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: ServiceError }

const ok = <T,>(value: T): Result<T> => ({ ok: true, value })
const fail = <T,>(error: ServiceError): Result<T> => ({ ok: false, error })

const DUPLICATE_EMAIL = 'An account already exists for this email address.'
const GENERIC_SIGN_IN = 'Sign-in failed. Check your email and password.'

// --- validation -----------------------------------------------------------

function validateEmail(email: string): string | null {
  const value = email.trim()
  if (value === '') return 'Email address is required.'
  const format = 'Enter an email address in the format name@example.com.'
  if (/\s/.test(value)) return format
  const at = value.indexOf('@')
  if (at <= 0 || at === value.length - 1) return format
  if (value.indexOf('@', at + 1) !== -1) return format
  if (!value.slice(at + 1).includes('.')) return format
  return null
}

function validatePassword(password: string): string | null {
  if (password === '') return 'Password is required.'
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (password.length > 200) return 'Password must be 200 characters or fewer.'
  return null
}

function validateDisplayName(displayName: string): string | null {
  const value = displayName.trim()
  if (value === '') return 'Display name is required.'
  if (value.length > 80) return 'Display name must be 80 characters or fewer.'
  return null
}

function validateProjectName(name: string): string | null {
  const value = name.trim()
  if (value === '') return 'Project name is required.'
  if (value.length > 120) return 'Project name must be 120 characters or fewer.'
  return null
}

function validateTaskTitle(title: string): string | null {
  const value = title.trim()
  if (value === '') return 'Task title is required.'
  if (value.length > 200) return 'Task title must be 200 characters or fewer.'
  return null
}

function validateWorkspaceName(name: string): string | null {
  const value = name.trim()
  if (value === '') return 'Workspace name is required.'
  if (value.length > 60) return 'Workspace name must be 60 characters or fewer.'
  return null
}

// --- service --------------------------------------------------------------

export class TaskForgeService {
  constructor(private readonly backend: Backend) {}

  // -- authentication (FR-AUTH) ------------------------------------------

  async register(input: {
    email: string
    password: string
    displayName: string
  }): Promise<Result<BackendUser>> {
    const fieldErrors: FieldErrors = {}
    const email = validateEmail(input.email)
    if (email) fieldErrors.email = email
    const password = validatePassword(input.password)
    if (password) fieldErrors.password = password
    const displayName = validateDisplayName(input.displayName)
    if (displayName) fieldErrors.displayName = displayName
    if (Object.keys(fieldErrors).length > 0) {
      return fail(new ServiceError(null, fieldErrors))
    }

    try {
      const outcome = await this.backend.register(input)
      return ok(outcome.user)
    } catch (error) {
      return fail(toServiceError(error))
    }
  }

  async signIn(input: {
    email: string
    password: string
  }): Promise<Result<BackendUser>> {
    const fieldErrors: FieldErrors = {}
    if (input.email.trim() === '') fieldErrors.email = 'Email address is required.'
    if (input.password === '') fieldErrors.password = 'Password is required.'
    if (Object.keys(fieldErrors).length > 0) {
      return fail(new ServiceError(null, fieldErrors))
    }

    try {
      const outcome = await this.backend.signIn(input)
      return ok(outcome.user)
    } catch (error) {
      // A 401 from THIS call is a rejected credential, never an expired
      // session — the caller knows which endpoint it called, so it is decided
      // here rather than by a generic status-code guess.
      //
      // `toServiceError` would otherwise report "Your session has ended" because
      // it only recognised the test double's `INVALID_CREDENTIALS` code, while
      // the real API answers with `unauthenticated` (api.ts also stops treating
      // this 401 as a session event).
      if (isUnauthenticated(error) || isInvalidCredentials(error)) {
        return fail(new ServiceError(GENERIC_SIGN_IN))
      }
      return fail(toServiceError(error))
    }
  }

  async signOut(): Promise<Result<null>> {
    try {
      await this.backend.signOut()
      return ok(null)
    } catch (error) {
      return fail(toServiceError(error))
    }
  }

  /** Resolves the signed-in user, or null. Never throws for "not signed in". */
  async currentUser(): Promise<BackendUser | null> {
    try {
      const outcome = await this.backend.currentSession()
      return outcome.user
    } catch {
      return null
    }
  }

  // -- workspaces (FR-WS) -------------------------------------------------

  async createWorkspace(name: string): Promise<Result<BackendWorkspace>> {
    const nameError = validateWorkspaceName(name)
    if (nameError) return fail(new ServiceError(null, { name: nameError }))

    try {
      return ok(await this.backend.createWorkspace(name))
    } catch (error) {
      return fail(toServiceError(error))
    }
  }

  async listWorkspaces(): Promise<Result<BackendWorkspace[]>> {
    try {
      const outcome = await this.backend.listWorkspaces()
      return ok(outcome.workspaces)
    } catch (error) {
      return fail(toServiceError(error))
    }
  }

  // -- projects (FR-PRJ) ---------------------------------------------------

  // -- profile (FR-AUTH-008) -----------------------------------------------

  async updateDisplayName(
    displayName: string,
  ): Promise<Result<BackendUser>> {
    const error = validateDisplayName(displayName)
    if (error) return fail(new ServiceError(null, { displayName: error }))
    try {
      return ok(await this.backend.updateDisplayName(displayName))
    } catch (caught) {
      return fail(toServiceError(caught))
    }
  }

  async listProjects(
    workspaceId: string,
    state: 'ACTIVE' | 'ARCHIVED',
  ): Promise<Result<BackendProject[]>> {
    try {
      return ok(await this.backend.listProjects(workspaceId, state))
    } catch (error) {
      return fail(toServiceError(error))
    }
  }

  async createProject(input: {
    workspaceId: string
    name: string
    description?: string
  }): Promise<Result<BackendProject>> {
    const fieldErrors: FieldErrors = {}
    const name = validateProjectName(input.name)
    if (name) fieldErrors.name = name
    if (Object.keys(fieldErrors).length > 0) {
      return fail(new ServiceError(null, fieldErrors))
    }
    try {
      return ok(
        await this.backend.createProject({
          workspaceId: input.workspaceId,
          name: input.name,
          ...(input.description === undefined
            ? {}
            : { description: input.description }),
        }),
      )
    } catch (error) {
      return fail(toServiceError(error))
    }
  }

  /**
   * Archive and restore are reversible (resolved D-19). There is deliberately no
   * `deleteProject`: permanent deletion is excluded (FR-PRJ-012), so no control
   * exists to invoke.
   */
  async setProjectArchived(
    projectId: string,
    archived: boolean,
  ): Promise<Result<BackendProject>> {
    try {
      return ok(await this.backend.setProjectArchived(projectId, archived))
    } catch (error) {
      return fail(toServiceError(error))
    }
  }

  // -- tasks (FR-TASK) ----------------------------------------------------

  async listTasks(projectId: string): Promise<Result<BackendTask[]>> {
    try {
      return ok(await this.backend.listTasks(projectId))
    } catch (error) {
      return fail(toServiceError(error))
    }
  }

  async createTask(input: {
    projectId: string
    title: string
    description?: string
    priority?: BackendTask['priority']
    dueDate?: string | null
  }): Promise<Result<BackendTask>> {
    const fieldErrors: FieldErrors = {}
    const title = validateTaskTitle(input.title)
    if (title) fieldErrors.title = title
    if (Object.keys(fieldErrors).length > 0) {
      return fail(new ServiceError(null, fieldErrors))
    }
    try {
      return ok(await this.backend.createTask(input))
    } catch (error) {
      return fail(toServiceError(error))
    }
  }

  async updateTask(
    taskId: string,
    patch: {
      title?: string
      stage?: BackendTask['stage']
      priority?: BackendTask['priority']
      dueDate?: string | null
    },
  ): Promise<Result<BackendTask>> {
    const fieldErrors: FieldErrors = {}
    if (patch.title !== undefined) {
      const title = validateTaskTitle(patch.title)
      if (title) fieldErrors.title = title
    }
    if (Object.keys(fieldErrors).length > 0) {
      return fail(new ServiceError(null, fieldErrors))
    }
    try {
      return ok(await this.backend.updateTask(taskId, patch))
    } catch (error) {
      return fail(toServiceError(error))
    }
  }

  // -- comments (FR-CMT) ---------------------------------------------------

  async listComments(taskId: string): Promise<Result<BackendComment[]>> {
    try {
      return ok(await this.backend.listComments(taskId))
    } catch (error) {
      return fail(toServiceError(error))
    }
  }

  async addComment(
    taskId: string,
    body: string,
  ): Promise<Result<BackendComment>> {
    const trimmed = body.trim()
    if (trimmed === '') {
      return fail(new ServiceError(null, { body: 'Comment cannot be empty.' }))
    }
    try {
      return ok(await this.backend.addComment(taskId, trimmed))
    } catch (error) {
      return fail(toServiceError(error))
    }
  }

  // -- search and dashboard (FR-SEARCH, FR-DASH) --------------------------

  async search(projectId: string, query: string): Promise<Result<SearchHit[]>> {
    try {
      return ok(await this.backend.search(projectId, query))
    } catch (error) {
      return fail(toServiceError(error))
    }
  }

  async dashboard(projectId: string): Promise<Result<DashboardData>> {
    try {
      return ok(await this.backend.dashboard(projectId))
    } catch (error) {
      return fail(toServiceError(error))
    }
  }

  // -- notifications -------------------------------------------------------

  async listNotifications(): Promise<
    Result<{ items: BackendNotification[]; unread: number }>
  > {
    try {
      return ok(await this.backend.listNotifications())
    } catch (error) {
      return fail(toServiceError(error))
    }
  }

  async markNotificationRead(id: string): Promise<Result<null>> {
    try {
      await this.backend.markNotificationRead(id)
      return ok(null)
    } catch (error) {
      return fail(toServiceError(error))
    }
  }

  // -- theme (presentation only) ------------------------------------------

  readStoredTheme(): Theme | null {
    return this.backend.readTheme()
  }

  persistTheme(theme: Theme): boolean {
    return this.backend.writeTheme(theme)
  }
}

function isDuplicate(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code
  if (code === 'DUPLICATE_EMAIL') return true
  const status = (error as { status?: unknown })?.status
  return status === 409
}

function isInvalidCredentials(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code
  return code === 'INVALID_CREDENTIALS'
}

function isUnauthenticated(error: unknown): boolean {
  const status = (error as { status?: unknown })?.status
  return status === 401
}

function isLimitReached(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code
  return code === 'limit_reached' || (error as { status?: unknown })?.status === 422
}

/**
 * Converts a backend failure into a reportable one.
 *
 * Server-supplied per-field errors are preferred, because the server is the
 * authority on validation. Internal failures never surface their detail
 * (NFR-ERR-007).
 *
 * Exactly ONE surface is used per failure. A message is attached to the specific
 * field when there is one, and otherwise to the form. Repeating the same text in
 * both would render it twice — once as a form-level alert and once beneath the
 * input — which reads as two separate problems (AC-AUTH-02, AC-AUTH-03).
 */
function toServiceError(error: unknown): ServiceError {
  if (error instanceof BackendError) {
    const hasFieldErrors = Object.keys(error.fieldErrors).length > 0
    return hasFieldErrors
      ? new ServiceError(null, error.fieldErrors)
      : new ServiceError(error.formError ?? error.message)
  }
  if (isDuplicate(error)) {
    // Field-specific only: the requirement is an error on the email control,
    // not a second banner above the form.
    return new ServiceError(null, { email: DUPLICATE_EMAIL })
  }
  if (isInvalidCredentials(error)) {
    return new ServiceError(GENERIC_SIGN_IN)
  }
  if (isUnauthenticated(error)) {
    return new ServiceError('Your session has ended. Sign in to continue.')
  }
  if (isLimitReached(error)) {
    const raw = (error as { message?: unknown })?.message
    const message =
      typeof raw === 'string' && raw !== ''
        ? raw
        : 'You have reached the maximum number of workspaces.'
    return new ServiceError(message)
  }
  return new ServiceError('Something went wrong on our side. Please try again.')
}

// --- singleton ------------------------------------------------------------

let shared: TaskForgeService | null = null

export function getService(): TaskForgeService {
  if (!shared) shared = new TaskForgeService(new RemoteBackend(new ApiClient()))
  return shared
}

export function setService(service: TaskForgeService | null): void {
  shared = service
}
