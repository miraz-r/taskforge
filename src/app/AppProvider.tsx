/**
 * App provider — session, workspaces, and theme.
 *
 * Owns exactly the state Phase 0 needs and nothing speculative. Every read goes
 * through the service to the remote API. Authorisation is enforced server-side;
 * nothing here is a security boundary.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AppContext, type AppState } from './AppContext'
import { getService } from '../access/service'
import { UNAUTHORIZED_EVENT } from '../data/api'
import { applyTheme, resolveInitialTheme } from '../theme/storage'
import type { SessionStatus, WorkspacesStatus } from './AppContext'
import type { BackendUser, BackendWorkspace } from '../data/backend'
import type { Theme } from '../domain/types'

export function AppProvider({ children }: { children: ReactNode }) {
  const service = getService()

  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('loading')
  const [user, setUser] = useState<BackendUser | null>(null)
  const [workspacesStatus, setWorkspacesStatus] =
    useState<WorkspacesStatus>('idle')
  const [workspaces, setWorkspaces] = useState<BackendWorkspace[]>([])
  const [workspacesError, setWorkspacesError] = useState<string | null>(null)
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    null,
  )
  const [theme, setThemeState] = useState<Theme>(() => resolveInitialTheme())
  const [themePersistFailed, setThemePersistFailed] = useState(false)

  // Nothing may set state after unmount: the initial session read is async and
  // a sign-out can unmount the tree while it is in flight.
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  // Applied at the document root, so there is no flash of the wrong theme and
  // no component holds theme state (design-system 7.2).
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next)
      const persisted = service.persistTheme(next)
      // A failed write must not appear to have succeeded (NFR-DATA-005,
      // NFR-ERR-002). FR-THEME-004 requires persistence, so the user is told.
      if (mounted.current) setThemePersistFailed(!persisted)
    },
    [service],
  )

  const refreshWorkspaces = useCallback(async () => {
    setWorkspacesStatus('loading')
    setWorkspacesError(null)
    const result = await service.listWorkspaces()
    if (!mounted.current) return

    if (!result.ok) {
      setWorkspaces([])
      setActiveWorkspaceId(null)
      setWorkspacesError(
        result.error.formError ?? 'We could not load your workspaces.',
      )
      setWorkspacesStatus('error')
      return
    }

    setWorkspaces(result.value)
    setWorkspacesStatus('ready')
    setActiveWorkspaceId((current) => {
      if (current && result.value.some((w) => w.id === current)) {
        return current
      }
      return result.value[0]?.id ?? null
    })
  }, [service])

  /**
   * Re-resolves the session. Registration and sign-in establish a session in
   * the service, so the provider must be told — otherwise the guard still sees
   * an anonymous visitor and refuses the protected route.
   */
  const refreshSession = useCallback(async () => {
    const currentUser = await service.currentUser()
    if (!mounted.current) return

    if (currentUser) {
      setUser(currentUser)
      setSessionStatus('authenticated')
      await refreshWorkspaces()
    } else {
      setUser(null)
      setSessionStatus('anonymous')
    }
  }, [service, refreshWorkspaces])

  // Initial session resolution (FR-AUTH-005, AC-AUTH-05).
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const currentUser = await service.currentUser()
      if (cancelled) return
      if (currentUser) {
        setUser(currentUser)
        setSessionStatus('authenticated')
        void refreshWorkspaces()
      } else {
        setSessionStatus('anonymous')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [service, refreshWorkspaces])

  /**
   * Clears all session state. Shared by explicit sign-out and by an
   * unauthorised response, so the two paths cannot drift apart.
   */
  const clearSession = useCallback(() => {
    setUser(null)
    setWorkspaces([])
    setWorkspacesStatus('idle')
    setWorkspacesError(null)
    setActiveWorkspaceId(null)
    setSessionStatus('anonymous')
  }, [])

  const signOut = useCallback(async () => {
    await service.signOut()
    if (!mounted.current) return
    clearSession()
  }, [service, clearSession])

  /**
   * A session can expire, be revoked from another device, or be rejected by the
   * server for any other reason while the app is open. The API client raises
   * `unauthorized` on any 401; the guard in App.tsx then redirects to sign-in,
   * so the shell is never left showing a broken authenticated state.
   */
  useEffect(() => {
    function onUnauthorized() {
      if (!mounted.current) return
      clearSession()
    }
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [clearSession])

  const value = useMemo<AppState>(
    () => ({
      sessionStatus,
      user,
      workspacesStatus,
      workspaces,
      workspacesError,
      activeWorkspaceId,
      setActiveWorkspaceId,
      theme,
      setTheme,
      themePersistFailed,
      refreshWorkspaces,
      refreshSession,
      signOut,
    }),
    [
      sessionStatus,
      user,
      workspacesStatus,
      workspaces,
      workspacesError,
      activeWorkspaceId,
      theme,
      setTheme,
      themePersistFailed,
      refreshWorkspaces,
      refreshSession,
      signOut,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
