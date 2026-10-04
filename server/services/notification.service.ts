/**
 * Notification service — in-app only.
 *
 * Delivery beyond the app (email, push) is an open product decision (D-04) and is
 * therefore not implemented. This service writes rows that
 * `GET /api/notifications` reads.
 *
 * Notifications are always scoped to a single user and are never queryable
 * across users: every read filters by the session actor's id.
 */

import type { NotificationKind, NotificationRecord } from '../domain/records'
import type { Store } from '../repositories/store'
import type { NotificationWriter } from './project.service'

export const NOTIFICATION_PAGE_MAX = 100

export class NotificationService implements NotificationWriter {
  constructor(private readonly store: Store) {}

  async notify(
    store: Store,
    userId: string,
    kind: NotificationKind,
    message: string,
    projectId: string | null,
  ): Promise<void> {
    await store.notifications.insert({ userId, projectId, kind, message })
  }

  /**
   * Fans out to every member of a workspace.
   *
   * The recipient list comes from the membership table, so a notification can
   * never reach a non-member. `excludeUserId` suppresses self-notification.
   */
  async notifyWorkspaceMembers(
    store: Store,
    workspaceId: string,
    kind: NotificationKind,
    message: string,
    projectId: string | null,
    excludeUserId?: string,
  ): Promise<void> {
    const roster = await store.workspaces.memberships.listByWorkspace(workspaceId)
    for (const membership of roster) {
      if (membership.userId === excludeUserId) continue
      await store.notifications.insert({
        userId: membership.userId,
        projectId,
        kind,
        message,
      })
    }
  }

  async list(userId: string, limit: number): Promise<NotificationRecord[]> {
    const capped = Math.max(1, Math.min(limit, NOTIFICATION_PAGE_MAX))
    return this.store.notifications.listForUser(userId, capped)
  }

  async unreadCount(userId: string): Promise<number> {
    return this.store.notifications.countUnread(userId)
  }

  async markRead(userId: string, id: string): Promise<boolean> {
    // Scoped by userId inside the store query, so a foreign id is simply absent.
    return this.store.notifications.markRead(userId, id)
  }

  async markAllRead(userId: string): Promise<void> {
    await this.store.notifications.markAllRead(userId)
  }
}
