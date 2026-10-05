/**
 * Route guard tests — AC-AUTH-05, NFR-SEC-001.
 */

import { describe, expect, it } from 'vitest'
import { resolveGuard } from './guard'
import { ROUTES } from './useHashRoute'

describe('resolveGuard', () => {
  it('shows the boot skeleton while the session is unknown', () => {
    for (const path of [
      ROUTES.signIn,
      ROUTES.register,
      ROUTES.workspace,
      ROUTES.newWorkspace,
    ]) {
      expect(resolveGuard(path, 'loading')).toBe('boot')
    }
  })

  it('never renders a protected view for an anonymous visitor', () => {
    expect(resolveGuard(ROUTES.workspace, 'anonymous')).toBe('sign-in')
    expect(resolveGuard(ROUTES.newWorkspace, 'anonymous')).toBe('sign-in')
  })

  it('renders the protected view for an authenticated user', () => {
    expect(resolveGuard(ROUTES.workspace, 'authenticated')).toBe('workspace')
    expect(resolveGuard(ROUTES.newWorkspace, 'authenticated')).toBe(
      'new-workspace',
    )
  })

  it('sends an authenticated user away from the auth views', () => {
    expect(resolveGuard(ROUTES.signIn, 'authenticated')).toBe('workspace')
    expect(resolveGuard(ROUTES.register, 'authenticated')).toBe('workspace')
  })

  it('renders the auth views for an anonymous visitor', () => {
    expect(resolveGuard(ROUTES.signIn, 'anonymous')).toBe('sign-in')
    expect(resolveGuard(ROUTES.register, 'anonymous')).toBe('register')
  })

  it('treats an unknown route as public, never as protected', () => {
    expect(resolveGuard('/admin', 'anonymous')).toBe('sign-in')
    expect(resolveGuard('/admin', 'authenticated')).toBe('sign-in')
  })

  it('treats an empty or root path as sign-in', () => {
    expect(resolveGuard('/', 'anonymous')).toBe('sign-in')
  })
})
