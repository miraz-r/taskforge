/**
 * Guard and route-shape tests for the project routes.
 *
 * The important property is that a workspace-scoped path can never be public.
 * It is decided by pattern, so adding a route of that shape cannot accidentally
 * open it.
 */

import { describe, expect, it } from 'vitest'
import { parseScope, pathForGuard, resolveGuard } from './guard'
import { isKnownRoute, isProtectedRoute, isWorkspaceScoped, paths } from './useHashRoute'

const WS = 'wsp_1'
const PRJ = 'prj_1'

describe('route recognition', () => {
  it('recognises the workspace-scoped shapes', () => {
    expect(isWorkspaceScoped(paths.projects(WS))).toBe(true)
    expect(isWorkspaceScoped(paths.project(WS, PRJ))).toBe(true)
    expect(isWorkspaceScoped('/workspace')).toBe(false)
    expect(isWorkspaceScoped('/sign-in')).toBe(false)
  })

  it('treats project routes as known AND protected', () => {
    for (const path of [paths.projects(WS), paths.project(WS, PRJ)]) {
      expect(isKnownRoute(path)).toBe(true)
      expect(isProtectedRoute(path)).toBe(true)
    }
  })

  it('does not treat an arbitrary deep path as known', () => {
    expect(isKnownRoute(`/workspace/${WS}/projects/${PRJ}/anything`)).toBe(false)
    expect(isProtectedRoute(`/workspace/${WS}/projects/${PRJ}/anything`)).toBe(false)
  })

  it('does not treat the sign-in route as protected', () => {
    expect(isProtectedRoute('/sign-in')).toBe(false)
    expect(isProtectedRoute('/register')).toBe(false)
  })
})

describe('guard on project routes', () => {
  it('never renders a project route for an anonymous visitor', () => {
    expect(resolveGuard(paths.projects(WS), 'anonymous')).toBe('sign-in')
    expect(resolveGuard(paths.project(WS, PRJ), 'anonymous')).toBe('sign-in')
  })

  it('shows the boot skeleton before the session is known', () => {
    expect(resolveGuard(paths.projects(WS), 'loading')).toBe('boot')
    expect(resolveGuard(paths.project(WS, PRJ), 'loading')).toBe('boot')
  })

  it('passes project routes through once authenticated', () => {
    expect(resolveGuard(paths.projects(WS), 'authenticated')).toBe('pass-through')
    expect(resolveGuard(paths.project(WS, PRJ), 'authenticated')).toBe('pass-through')
  })

  it('keeps the current path when passing through', () => {
    const path = paths.project(WS, PRJ)
    expect(pathForGuard('pass-through', path)).toBe(path)
  })
})

describe('parseScope', () => {
  it('extracts a workspace id from the project list path', () => {
    expect(parseScope(paths.projects(WS))).toEqual({
      workspaceId: WS,
      projectId: null,
      archived: false,
    })
  })

  it('extracts both ids from a project path', () => {
    expect(parseScope(paths.project(WS, PRJ))).toEqual({
      workspaceId: WS,
      projectId: PRJ,
      archived: false,
    })
  })

  it('decodes encoded segments', () => {
    expect(parseScope(`/workspace/${encodeURIComponent('a b')}/projects`)).toEqual({
      workspaceId: 'a b',
      projectId: null,
      archived: false,
    })
  })

  it('returns null for a non-scoped path', () => {
    expect(parseScope('/workspace')).toBeNull()
    expect(parseScope('/sign-in')).toBeNull()
  })
})

describe('profile route', () => {
  it('is known and protected', () => {
    expect(isKnownRoute(paths.profile())).toBe(true)
    expect(isProtectedRoute(paths.profile())).toBe(true)
  })

  it('refuses an anonymous visitor', () => {
    expect(resolveGuard(paths.profile(), 'anonymous')).toBe('sign-in')
    expect(resolveGuard(paths.profile(), 'loading')).toBe('boot')
  })

  it('passes through for an authenticated user', () => {
    expect(resolveGuard(paths.profile(), 'authenticated')).toBe('pass-through')
  })

  it('is reachable from the zero-workspace state', () => {
    // Profile does not depend on having a workspace (FR-AUTH-008).
    expect(parseScope(paths.profile())).toBeNull()
    expect(isWorkspaceScoped(paths.profile())).toBe(false)
  })
})

describe('archived route', () => {
  it('is known and protected', () => {
    const path = paths.archivedProjects('wsp_1')
    expect(isKnownRoute(path)).toBe(true)
    expect(isProtectedRoute(path)).toBe(true)
  })

  it('refuses an anonymous visitor', () => {
    expect(resolveGuard(paths.archivedProjects('wsp_1'), 'anonymous')).toBe(
      'sign-in',
    )
  })

  it('parses to the workspace with no project and archived set', () => {
    expect(parseScope(paths.archivedProjects('wsp_1'))).toEqual({
      workspaceId: 'wsp_1',
      projectId: null,
      archived: true,
    })
  })
})