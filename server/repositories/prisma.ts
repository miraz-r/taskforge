/**
 * Prisma-backed store — the production data access layer.
 *
 * Two properties that matter for NFR-SEC-010:
 *
 *  1. Isolation is applied IN THE DATABASE QUERY, not by filtering afterwards.
 *     Every workspace-scoped read takes a workspaceId and constrains it in the
 *     `where` clause, so a non-member's row is never returned in the first
 *     place. This is why `findById` methods are deliberately narrow and why the
 *     services resolve a resource chain before reading.
 *
 *  2. `findById` variants remain AUTHORISATION-UNAWARE by design — the caller
 *     has already verified membership for the parent workspace via the chain in
 *     domain/scope.ts.
 *
 * Requires PostgreSQL. Construction does not open a connection (the pool is
 * lazy), so this module can be imported without a running database; the first
 * query is what fails.
 */

import { PrismaClient } from '../generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import type {
  CreateProjectInput,
  CreateTaskInput,
  CreateUserInput,
  CreateWorkspaceInput,
  ProjectPatch,
  Store,
  TaskPatch,
} from './store'
import type {
  CommentRecord,
  MembershipRecord,
  NotificationRecord,
  ProjectRecord,
  ProjectState,
  SessionRecord,
  TaskRecord,
  UserRecord,
  WorkspaceRecord,
} from '../domain/records'

export interface PrismaStoreOptions {
  databaseUrl: string
}

export function createPrismaClient(databaseUrl: string): PrismaClient {
  const adapter = new PrismaPg({ connectionString: databaseUrl })
  return new PrismaClient({ adapter })
}

export class PrismaStore implements Store {
  constructor(private readonly prisma: PrismaClient) {}

  static fromUrl(databaseUrl: string): PrismaStore {
    return new PrismaStore(createPrismaClient(databaseUrl))
  }

  // --- users --------------------------------------------------------------

  readonly users = {
    findByEmail: (email: string) =>
      this.prisma.user
        .findUnique({ where: { email } })
        .then((row) => (row ? toUserRecord(row) : null)),

    findById: (id: string) =>
      this.prisma.user
        .findUnique({ where: { id } })
        .then((row) => (row ? toUserRecord(row) : null)),

    insert: async (input: CreateUserInput): Promise<UserRecord> => {
      const row = await this.prisma.user.create({
        data: {
          email: input.email,
          displayName: input.displayName,
          passwordHash: input.passwordHash,
        },
      })
      return toUserRecord(row)
    },

    setPasswordHash: (id: string, hash: string) =>
      this.prisma.user
        .update({ where: { id }, data: { passwordHash: hash } })
        .then(() => undefined),

    // FR-AUTH-008, display name only. The acting user id comes from the
    // validated session, so this can only ever edit the caller's own record.
    updateOwnProfile: (userId: string, patch: { displayName: string }) =>
      this.prisma.user
        .update({ where: { id: userId }, data: { displayName: patch.displayName } })
        .then(toUserRecord),
  }

  // --- sessions -----------------------------------------------------------

  readonly sessions = {
    findByTokenHash: (tokenHash: string) =>
      this.prisma.session
        .findUnique({ where: { tokenHash } })
        .then((row) => (row ? toSessionRecord(row) : null)),

    findById: (id: string) =>
      this.prisma.session
        .findUnique({ where: { id } })
        .then((row) => (row ? toSessionRecord(row) : null)),

    insert: async (session: Omit<SessionRecord, 'id'>): Promise<SessionRecord> => {
      const row = await this.prisma.session.create({
        data: {
          tokenHash: session.tokenHash,
          csrfToken: session.csrfToken,
          userId: session.userId,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
        },
      })
      return toSessionRecord(row)
    },

    revoke: (sessionId: string) =>
      this.prisma.session
        .update({
          where: { id: sessionId },
          data: { revokedAt: new Date() },
        })
        .then(() => undefined),

    revokeAllForUser: (userId: string) =>
      this.prisma.session
        .updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        })
        .then(() => undefined),
  }

  // --- workspaces ---------------------------------------------------------

  readonly workspaces = {
    findById: (id: string) =>
      this.prisma.workspace
        .findUnique({ where: { id } })
        .then((row) => (row ? toWorkspaceRecord(row) : null)),

    // Constrained in SQL by the membership join, not filtered in memory.
    listByMember: (userId: string) =>
      this.prisma.workspace
        .findMany({
          where: { memberships: { some: { userId } } },
          orderBy: { createdAt: 'asc' },
        })
        .then((rows) => rows.map(toWorkspaceRecord)),

    countOwnedBy: (userId: string) =>
      this.prisma.workspace.count({ where: { ownerId: userId } }),

    insert: async (input: CreateWorkspaceInput): Promise<WorkspaceRecord> => {
      const row = await this.prisma.workspace.create({
        data: {
          id: input.workspace.id,
          name: input.workspace.name,
          ownerId: input.workspace.ownerId,
          memberships: {
            create: {
              userId: input.membership.userId,
              role: input.membership.role,
            },
          },
        },
      })
      return toWorkspaceRecord(row)
    },

    memberships: {
      find: (userId: string, workspaceId: string) =>
        this.prisma.membership
          .findUnique({
            where: { userId_workspaceId: { userId, workspaceId } },
          })
          .then((row) => (row ? toMembershipRecord(row) : null)),

      listByWorkspace: (workspaceId: string) =>
        this.prisma.membership
          .findMany({ where: { workspaceId } })
          .then((rows) => rows.map(toMembershipRecord)),

      insert: async (
        input: Omit<MembershipRecord, 'createdAt'>,
      ): Promise<MembershipRecord> => {
        const row = await this.prisma.membership.upsert({
          where: {
            userId_workspaceId: {
              userId: input.userId,
              workspaceId: input.workspaceId,
            },
          },
          create: {
            userId: input.userId,
            workspaceId: input.workspaceId,
            role: input.role,
          },
          update: {},
        })
        return toMembershipRecord(row)
      },
    },
  }

  // --- projects -----------------------------------------------------------

  readonly projects = {
    listByWorkspace: (workspaceId: string, state: ProjectState) =>
      this.prisma.project
        .findMany({
          where: { workspaceId, state },
          orderBy: { createdAt: 'desc' },
        })
        .then((rows) => rows.map(toProjectRecord)),

    findById: (id: string) =>
      this.prisma.project
        .findUnique({ where: { id } })
        .then((row) => (row ? toProjectRecord(row) : null)),

    insert: async (input: CreateProjectInput): Promise<ProjectRecord> => {
      const row = await this.prisma.project.create({
        data: {
          ...(input.id ? { id: input.id } : {}),
          workspaceId: input.workspaceId,
          name: input.name,
          description: input.description,
          colourToken: input.colourToken,
        },
      })
      return toProjectRecord(row)
    },

    update: (id: string, patch: ProjectPatch) =>
      this.prisma.project
        .update({
          where: { id },
          data: {
            ...(patch.name !== undefined ? { name: patch.name } : {}),
            ...(patch.description !== undefined
              ? { description: patch.description }
              : {}),
            ...(patch.colourToken !== undefined
              ? { colourToken: patch.colourToken }
              : {}),
          },
        })
        .then(toProjectRecord),

    setState: (id: string, state: ProjectState) =>
      this.prisma.project
        .update({
          where: { id },
          data: {
            state,
            archivedAt: state === 'ARCHIVED' ? new Date() : null,
          },
        })
        .then(toProjectRecord),
  }

  // --- tasks --------------------------------------------------------------

  readonly tasks = {
    // Newest first within the project (resolved D-09: no manual reordering).
    listByProject: (projectId: string) =>
      this.prisma.task
        .findMany({ where: { projectId }, orderBy: { createdAt: 'desc' } })
        .then((rows) => rows.map(toTaskRecord)),

    findById: (id: string) =>
      this.prisma.task
        .findUnique({ where: { id } })
        .then((row) => (row ? toTaskRecord(row) : null)),

    insert: async (input: CreateTaskInput): Promise<TaskRecord> => {
      const row = await this.prisma.task.create({
        data: {
          ...(input.id ? { id: input.id } : {}),
          projectId: input.projectId,
          title: input.title,
          description: input.description,
          priority: input.priority,
          assigneeId: input.assigneeId,
          dueDate: input.dueDate,
        },
      })
      return toTaskRecord(row)
    },

    update: (id: string, patch: TaskPatch) =>
      this.prisma.task
        .update({
          where: { id },
          data: {
            ...(patch.title !== undefined ? { title: patch.title } : {}),
            ...(patch.description !== undefined
              ? { description: patch.description }
              : {}),
            ...(patch.stage !== undefined ? { stage: patch.stage } : {}),
            ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
            ...(patch.assigneeId !== undefined
              ? { assigneeId: patch.assigneeId }
              : {}),
            ...(patch.dueDate !== undefined ? { dueDate: patch.dueDate } : {}),
          },
        })
        .then(toTaskRecord),
  }

  // --- comments -----------------------------------------------------------

  readonly comments = {
    listByTask: (taskId: string) =>
      this.prisma.comment
        .findMany({ where: { taskId }, orderBy: { createdAt: 'asc' } })
        .then((rows) => rows.map(toCommentRecord)),

    findById: (id: string) =>
      this.prisma.comment
        .findUnique({ where: { id } })
        .then((row) => (row ? toCommentRecord(row) : null)),

    insert: async (input: {
      taskId: string
      authorId: string
      body: string
    }): Promise<CommentRecord> => {
      const row = await this.prisma.comment.create({
        data: { taskId: input.taskId, authorId: input.authorId, body: input.body },
      })
      return toCommentRecord(row)
    },
  }

  // --- notifications ------------------------------------------------------

  readonly notifications = {
    listForUser: (userId: string, limit: number) =>
      this.prisma.notification
        .findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: limit,
        })
        .then((rows) => rows.map(toNotificationRecord)),

    countUnread: (userId: string) =>
      this.prisma.notification.count({ where: { userId, readAt: null } }),

    // Constrained by userId so a foreign id matches nothing.
    markRead: async (userId: string, id: string): Promise<boolean> => {
      const result = await this.prisma.notification.updateMany({
        where: { id, userId, readAt: null },
        data: { readAt: new Date() },
      })
      if (result.count > 0) return true
      // Already read counts as success; absent or foreign does not.
      const existing = await this.prisma.notification.count({ where: { id, userId } })
      return existing > 0
    },

    markAllRead: (userId: string) =>
      this.prisma.notification
        .updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } })
        .then(() => undefined),

    insert: async (input: {
      userId: string
      projectId: string | null
      kind: NotificationRecord['kind']
      message: string
    }): Promise<NotificationRecord> => {
      const row = await this.prisma.notification.create({
        data: {
          userId: input.userId,
          projectId: input.projectId,
          kind: input.kind,
          message: input.message,
        },
      })
      return toNotificationRecord(row)
    },
  }

  // --- transactions -------------------------------------------------------

  /**
   * Runs `work` in a database transaction, passing a store bound to the
   * interactive-transaction client. A throw rolls everything back, which is what
   * makes the legacy import all-or-nothing.
   */
  async transaction<T>(work: (store: Store) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const scoped = new PrismaStore(tx as unknown as PrismaClient)
      return work(scoped)
    })
  }
}

// --- row mappers ----------------------------------------------------------
// Explicit rather than structural, so a schema change cannot silently alter the
// shape the services depend on.

type Row<T> = {
  [K in keyof T]: T[K]
}

function toUserRecord(row: Row<UserRecord>): UserRecord {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toSessionRecord(row: Row<SessionRecord>): SessionRecord {
  return {
    id: row.id,
    tokenHash: row.tokenHash,
    csrfToken: row.csrfToken,
    userId: row.userId,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
  }
}

function toWorkspaceRecord(row: Row<WorkspaceRecord>): WorkspaceRecord {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.ownerId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toMembershipRecord(row: Row<MembershipRecord>): MembershipRecord {
  return {
    userId: row.userId,
    workspaceId: row.workspaceId,
    role: row.role,
    createdAt: row.createdAt,
  }
}

function toProjectRecord(row: Row<ProjectRecord>): ProjectRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    description: row.description,
    colourToken: row.colourToken,
    state: row.state,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toTaskRecord(row: Row<TaskRecord>): TaskRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    description: row.description,
    stage: row.stage,
    priority: row.priority,
    assigneeId: row.assigneeId,
    dueDate: row.dueDate,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toCommentRecord(row: Row<CommentRecord>): CommentRecord {
  return {
    id: row.id,
    taskId: row.taskId,
    authorId: row.authorId,
    body: row.body,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toNotificationRecord(row: Row<NotificationRecord>): NotificationRecord {
  return {
    id: row.id,
    userId: row.userId,
    projectId: row.projectId,
    kind: row.kind,
    message: row.message,
    readAt: row.readAt,
    createdAt: row.createdAt,
  }
}
