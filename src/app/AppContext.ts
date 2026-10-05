/**
 * Application context — types, context object, and consumer hook.
 *
 * Kept apart from the provider component so this module exports no JSX and
 * satisfies the react-refresh lint rule.
 */

import { createContext, useContext } from 'react'
import type { BackendUser, BackendWorkspace } from '../data/backend'
import type { Theme } from '../domain/types'

export type SessionStatus = 'loading' | 'anonymous' | 'authenticated'

export type WorkspacesStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface AppState {
  sessionStatus: SessionStatus
  user: BackendUser | null

  workspacesStatus: WorkspacesStatus
  workspaces: BackendWorkspace[]
  workspacesError: string | null
  activeWorkspaceId: string | null
  setActiveWorkspaceId: (id: string) => void

  theme: Theme
  setTheme: (theme: Theme) => void
  /** True when the theme could not be persisted, so FR-THEME-004 is unmet. */
  themePersistFailed: boolean

  /** Re-reads the workspace list from the service. */
  refreshWorkspaces: () => Promise<void>

  /**
   * Re-resolves the signed-in user. Called after register and sign-in, which
   * establish a session in the service; without this the guard would still see
   * an anonymous visitor and refuse the protected route.
   */
  refreshSession: () => Promise<void>

  signOut: () => Promise<void>
}

export const AppContext = createContext<AppState | null>(null)

export function useApp(): AppState {
  const value = useContext(AppContext)
  if (!value) {
    throw new Error('useApp must be used inside <AppProvider>.')
  }
  return value
}
