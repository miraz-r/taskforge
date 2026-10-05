/**
 * Repository — Phase 0 persistence.
 *
 * IMPORTANT: this layer is deliberately AUTHORISATION-UNAWARE. `getWorkspace`
 * will return any workspace by id regardless of who asks. That is the whole
 * point of the seam: authorisation is enforced in exactly one place
 * (access/authorize.ts) rather than being scattered through call sites where
 * it can be forgotten.
 *
 * Do not import this module from a view or component. Go through
 * access/service.ts.
 *
 * THIS MODULE IS NOW TEST-SUPPORT ONLY. The authoritative repository is the
 * Express API (see src/data/remoteBackend.ts) and authorization is enforced
 * server-side (see server/domain/authorize.ts). Nothing in the running
 * application imports this file except LocalBackend, which exists so the
 * service layer can be tested without a server.
 */

import type {
  Membership,
  Session,
  User,
  UserId,
  Workspace,
  WorkspaceId,
} from '../domain/types'

const STORAGE_PREFIX = 'taskforge.v1'

export const StorageKeys = {
  users: `${STORAGE_PREFIX}.users`,
  workspaces: `${STORAGE_PREFIX}.workspaces`,
  memberships: `${STORAGE_PREFIX}.memberships`,
  session: `${STORAGE_PREFIX}.session`,
} as const

/** The minimum persistence surface Phase 0 needs. */
export interface StorageDriver {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export class BrowserStorage implements StorageDriver {
  getItem(key: string): string | null {
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  }

  setItem(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value)
    } catch {
      /* Storage unavailable or quota exceeded. Callers are told the write
         failed rather than being allowed to believe it succeeded
         (NFR-DATA-005, NFR-ERR-002). */
    }
  }

  removeItem(key: string): void {
    try {
      window.localStorage.removeItem(key)
    } catch {
      /* See setItem. */
    }
  }
}

export class MemoryStorage implements StorageDriver {
  private readonly map = new Map<string, string>()

  getItem(key: string): string | null {
    return this.map.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value)
  }

  removeItem(key: string): void {
    this.map.delete(key)
  }
}

export class StorageUnavailableError extends Error {
  constructor() {
    super('Storage is unavailable.')
    this.name = 'StorageUnavailableError'
  }
}

export interface RepositoryOptions {
  storage: StorageDriver
  /**
   * Simulated round-trip latency, in milliseconds.
   *
   * A real transport is asynchronous, and NFR-STATE-003 requires a loading state
   * rather than an empty interface. Without any latency the loading state could
   * never be observed or verified. This stands in for network latency and is
   * removed when a real transport exists.
   */
  latencyMs?: number
  /** Injection point for tests. */
  now?: () => Date
}

export class Repository {
  private readonly storage: StorageDriver
  private readonly latencyMs: number
  private readonly now: () => Date

  constructor(options: RepositoryOptions) {
    this.storage = options.storage
    this.latencyMs = options.latencyMs ?? 140
    this.now = options.now ?? (() => new Date())
  }

  private async settle(): Promise<void> {
    if (this.latencyMs <= 0) return
    await new Promise<void>((resolve) => setTimeout(resolve, this.latencyMs))
  }

  private read<T>(key: string, fallback: T): T {
    const raw = this.storage.getItem(key)
    if (raw === null) return fallback
    try {
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  }

  private write(key: string, value: unknown): void {
    const serialised = JSON.stringify(value)
    // Verify the write landed. A silent failure would let the interface report
    // a save that did not happen (NFR-DATA-005, NFR-ERR-002).
    this.storage.setItem(key, serialised)
    if (this.storage.getItem(key) !== serialised) {
      throw new StorageUnavailableError()
    }
  }

  // --- users -------------------------------------------------------------

  listUsers(): User[] {
    return this.read<User[]>(StorageKeys.users, [])
  }

  async findUserByEmail(email: string): Promise<User | null> {
    await this.settle()
    const normalised = email.trim().toLowerCase()
    return this.listUsers().find((u) => u.email === normalised) ?? null
  }

  async findUserById(id: UserId): Promise<User | null> {
    await this.settle()
    return this.listUsers().find((u) => u.id === id) ?? null
  }

  /**
   * Uniqueness of the email address is enforced here (FR-AUTH-003). Returns
   * null when the address is already registered so the caller can report a
   * field-specific error (AC-AUTH-02) instead of creating a second account.
   */
  async insertUser(user: User): Promise<User | null> {
    await this.settle()
    const users = this.listUsers()
    if (users.some((u) => u.email === user.email)) return null
    this.write(StorageKeys.users, [...users, user])
    return user
  }

  async updateUser(id: UserId, patch: Partial<Omit<User, 'id'>>): Promise<User> {
    await this.settle()
    const users = this.listUsers()
    const index = users.findIndex((u) => u.id === id)
    if (index === -1) throw new Error(`No user with id ${id}.`)
    const updated: User = { ...(users[index] as User), ...patch, id }
    users[index] = updated
    this.write(StorageKeys.users, users)
    return updated
  }

  // --- workspaces --------------------------------------------------------

  listWorkspaces(): Workspace[] {
    return this.read<Workspace[]>(StorageKeys.workspaces, [])
  }

  /**
   * AUTHORISATION-UNAWARE. Returns any workspace by id. Callers must go through
   * access/authorize.ts, which checks membership first.
   */
  async findWorkspaceById(id: WorkspaceId): Promise<Workspace | null> {
    await this.settle()
    return this.listWorkspaces().find((w) => w.id === id) ?? null
  }

  listMemberships(): Membership[] {
    return this.read<Membership[]>(StorageKeys.memberships, [])
  }

  async findMembership(
    userId: UserId,
    workspaceId: WorkspaceId,
  ): Promise<Membership | null> {
    await this.settle()
    return (
      this.listMemberships().find(
        (m) => m.userId === userId && m.workspaceId === workspaceId,
      ) ?? null
    )
  }

  async insertWorkspace(input: {
    workspace: Workspace
    membership: Membership
  }): Promise<{ workspace: Workspace; membership: Membership }> {
    await this.settle()
    this.write(StorageKeys.workspaces, [
      ...this.listWorkspaces(),
      input.workspace,
    ])
    await this.insertMembership(input.membership)
    return input
  }

  /** Adds a membership to an existing workspace without duplicating it. */
  async insertMembership(membership: Membership): Promise<Membership> {
    await this.settle()
    this.write(StorageKeys.memberships, [
      ...this.listMemberships(),
      membership,
    ])
    return membership
  }

  // --- session -----------------------------------------------------------

  getSession(): Session | null {
    return this.read<Session | null>(StorageKeys.session, null)
  }

  async startSession(session: Session): Promise<Session> {
    await this.settle()
    this.write(StorageKeys.session, session)
    return session
  }

  async endSession(): Promise<void> {
    await this.settle()
    this.storage.removeItem(StorageKeys.session)
  }

  // --- helpers -----------------------------------------------------------

  timestamp(): string {
    return this.now().toISOString()
  }
}

export function createRepository(options?: {
  storage?: StorageDriver
  latencyMs?: number
}): Repository {
  return new Repository({
    storage: options?.storage ?? new BrowserStorage(),
    ...(options?.latencyMs === undefined ? {} : { latencyMs: options.latencyMs }),
  })
}
