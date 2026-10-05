/**
 * Application root — routing and the route guard.
 *
 * The guard is consulted during render, not only in an effect, so a protected
 * view is never painted for a frame after sign-out (AC-AUTH-05).
 */

import { useEffect } from 'react'
import { useApp } from './app/AppContext'
import { ROUTES, useHashRoute } from './routing/useHashRoute'
import { parseScope, pathForGuard, resolveGuard } from './routing/guard'
import { BootScreen } from './views/BootScreen'
import { RegisterView } from './views/RegisterView'
import { SignInView } from './views/SignInView'
import { WorkspaceView } from './views/WorkspaceView'
import { ProjectsView } from './views/ProjectsView'
import { ArchivedProjectsView } from './views/ArchivedProjectsView'
import { ProfileView } from './views/ProfileView'
import { ProjectView } from './views/ProjectView'

export function App() {
  const { path, navigate } = useHashRoute()
  const { sessionStatus } = useApp()

  const guarded = resolveGuard(path, sessionStatus)

  // Keep the address bar in step with the guard, without adding a history
  // entry for a redirect the user did not ask for.
  useEffect(() => {
    if (guarded === 'boot') return
    const target = pathForGuard(guarded, path)
    if (target !== path) navigate(target, { replace: true })
  }, [guarded, path, navigate])

  if (guarded === 'boot') return <BootScreen />

  if (guarded === 'workspace' || guarded === 'new-workspace') {
    return <WorkspaceView path={path} onNavigate={navigate} />
  }

  if (guarded === 'pass-through') {
    const scope = parseScope(path)
    if (scope?.projectId) {
      return (
        <ProjectView
          workspaceId={scope.workspaceId}
          projectId={scope.projectId}
          onNavigate={navigate}
        />
      )
    }
    if (scope?.archived) {
      return (
        <ArchivedProjectsView
          workspaceId={scope.workspaceId}
          onNavigate={navigate}
        />
      )
    }
    if (scope) {
      return (
        <ProjectsView workspaceId={scope.workspaceId} onNavigate={navigate} />
      )
    }
    if (path === ROUTES.profile) {
      return <ProfileView onNavigate={navigate} />
    }
    // Unreachable in practice: the guard only returns pass-through for a
    // workspace-scoped path. Falling back to the workspace view is the safe
    // choice rather than rendering nothing.
    return <WorkspaceView path={path} onNavigate={navigate} />
  }

  if (guarded === 'register') return <RegisterView />

  return <SignInView />
}
