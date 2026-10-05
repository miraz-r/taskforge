/**
 * Hash routing — Phase 0.
 *
 * A hand-rolled router rather than a routing library: hash routing needs no
 * server rewrite rules, no dependency, and keeps the route guard testable in
 * isolation (AGENTS.md 13.2 — prefer what the platform already provides).
 */

import { useCallback, useEffect, useState } from 'react'

export const ROUTES = {
  /** Public. */
  signIn: '/sign-in',
  register: '/register',
  /** Protected — requires an authenticated user inside a workspace. */
  workspace: '/workspace',
  /** Protected. Lets an existing member create a second workspace, which is
   *  what makes FR-WS-006 / AC-WS-08 exercisable without an invitation. */
  newWorkspace: '/workspace/new',
  /** Protected. Project list for a workspace. */
  projects: '/workspace/:workspaceId/projects',
  /** Protected. Archived projects for a workspace (FR-PRJ-010). */
  archivedProjects: '/workspace/:workspaceId/projects-archived',
  /** Protected. The signed-in user's own profile (FR-AUTH-008). */
  profile: '/profile',
  /** Protected. Board, tasks, search and dashboard for one project. */
  project: '/workspace/:workspaceId/projects/:projectId',
} as const

export type ProtectedRoute =
  | (typeof ROUTES)['workspace']
  | (typeof ROUTES)['newWorkspace']

const PROTECTED_ROUTES: readonly string[] = [
  ROUTES.workspace,
  ROUTES.newWorkspace,
  // Not workspace-scoped, but still requires a session (FR-AUTH-008).
  ROUTES.profile,
]

/**
 * Patterns for routes whose shape is decided at runtime. Kept as regex rather
 * than literal strings so `isKnownRoute` can recognise them; anything that
 * matches is protected, because every one of these paths is workspace-scoped.
 */
const PROTECTED_PATTERNS: RegExp[] = [
  /^\/workspace\/[^/]+\/projects$/,
  /^\/workspace\/[^/]+\/projects-archived$/,
  /^\/workspace\/[^/]+\/projects\/[^/]+$/,
]

const KNOWN_ROUTES: readonly string[] = Object.values(ROUTES)

export function normalizePath(hash: string): string {
  const withoutHash = hash.startsWith('#') ? hash.slice(1) : hash
  if (withoutHash === '' || withoutHash === '/') return ROUTES.signIn
  // A trailing slash must not create a second identity for the same route.
  const trimmed = withoutHash.replace(/\/+$/, '')
  return trimmed === '' ? ROUTES.signIn : trimmed
}

export function isKnownRoute(path: string): boolean {
  return KNOWN_ROUTES.includes(path) || isWorkspaceScoped(path)
}

/**
 * True for the project-list and project-detail shapes. Used by both the known
 * route check and the protection check, so a project path can never be treated
 * as public.
 */
export function isWorkspaceScoped(path: string): boolean {
  return PROTECTED_PATTERNS.some((pattern) => pattern.test(path))
}

export function isProtectedRoute(path: string): boolean {
  return PROTECTED_ROUTES.includes(path) || isWorkspaceScoped(path)
}

/** Route builders. Centralised so no view constructs a path by hand. */
export const paths = {
  workspace: () => ROUTES.workspace,
  profile: () => ROUTES.profile,
  newWorkspace: () => ROUTES.newWorkspace,
  projects: (workspaceId: string) =>
    `/workspace/${encodeURIComponent(workspaceId)}/projects`,
  archivedProjects: (workspaceId: string) =>
    `/workspace/${encodeURIComponent(workspaceId)}/projects-archived`,
  project: (workspaceId: string, projectId: string) =>
    `/workspace/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}`,
}

export function useHashRoute(): {
  path: string
  navigate: (to: string, options?: { replace?: boolean }) => void
} {
  const [path, setPath] = useState(() =>
    normalizePath(window.location.hash),
  )

  useEffect(() => {
    function onHashChange() {
      setPath(normalizePath(window.location.hash))
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = useCallback(
    (to: string, options?: { replace?: boolean }) => {
      const target = `#${to}`
      if (window.location.hash === target) return
      if (options?.replace) {
        window.history.replaceState(null, '', target)
        setPath(normalizePath(target))
      } else {
        window.location.hash = target
      }
    },
    [],
  )

  return { path, navigate }
}
