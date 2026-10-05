/**
 * Route guard — AC-AUTH-05, NFR-SEC-001.
 *
 * A pure function so the rule can be tested without rendering. The render path
 * consults it directly rather than relying on a redirect effect, so a protected
 * view is never painted for even one frame after sign-out.
 *
 * Every workspace-scoped path is protected. That is decided by pattern, not by
 * enumerating routes, so adding a workspace-scoped route cannot accidentally
 * make it public.
 */

import { ROUTES, isProtectedRoute, isKnownRoute, isWorkspaceScoped } from './useHashRoute'
import type { SessionStatus } from '../app/AppContext'

export type GuardedRoute =
  /** Session is still being resolved — show the boot skeleton, not content. */
  | 'boot'
  | 'sign-in'
  | 'register'
  | 'workspace'
  | 'new-workspace'
  /** The route should be rendered as-is; it is already protected and known. */
  | 'pass-through'

export function resolveGuard(
  path: string,
  sessionStatus: SessionStatus,
): GuardedRoute {
  // Nothing is rendered until the session is known. Rendering a protected view
  // optimistically would flash it to an unauthenticated user.
  if (sessionStatus === 'loading') return 'boot'

  // An unknown route is never treated as a protected view.
  if (!isKnownRoute(path)) return 'sign-in'

  if (isProtectedRoute(path)) {
    // NFR-SEC-001: protected views require an authenticated user.
    if (sessionStatus !== 'authenticated') return 'sign-in'
    if (path === ROUTES.newWorkspace) return 'new-workspace'
    // Profile and the project routes render their own views.
    if (isWorkspaceScoped(path) || path === ROUTES.profile) return 'pass-through'
    return 'workspace'
  }

  if (path === ROUTES.register) {
    return sessionStatus === 'authenticated' ? 'workspace' : 'register'
  }

  // On the sign-in view with a live session there is nothing to sign in to.
  return sessionStatus === 'authenticated' ? 'workspace' : 'sign-in'
}

export function pathForGuard(
  guarded: GuardedRoute,
  currentPath: string = ROUTES.workspace,
): string {
  switch (guarded) {
    case 'register':
      return ROUTES.register
    case 'new-workspace':
      return ROUTES.newWorkspace
    case 'workspace':
      return ROUTES.workspace
    case 'pass-through':
      return currentPath
    default:
      return ROUTES.signIn
  }
}

/** Extracts `[workspaceId, projectId]` from a workspace-scoped path. */
export interface RouteScope {
  workspaceId: string
  projectId: string | null
  /** The archived-projects view (FR-PRJ-010). */
  archived: boolean
}

export function parseScope(path: string): RouteScope | null {
  const archived =
    /^\/workspace\/([^/]+)\/projects-archived$/.exec(path)
  if (archived) {
    return {
      workspaceId: decodeURIComponent(archived[1] as string),
      projectId: null,
      archived: true,
    }
  }

  const match = /^\/workspace\/([^/]+)\/projects(?:\/([^/]+))?$/.exec(path)
  if (!match) return null
  return {
    workspaceId: decodeURIComponent(match[1] as string),
    projectId: match[2] ? decodeURIComponent(match[2]) : null,
    archived: false,
  }
}
