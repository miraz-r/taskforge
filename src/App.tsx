/**
 * Application root — routing and the route guard.
 *
 * The guard is consulted during render, not only in an effect, so a protected
 * view is never painted for a frame after sign-out (AC-AUTH-05).
 */

import { useEffect } from 'react'
import type { ReactNode } from 'react'
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

  if (guarded === 'boot') {
    return (
      <div key="boot" className="tf-enter-fade">
        <BootScreen />
      </div>
    )
  }

  // Restrained route transition (WS05 Checkpoint D): the incoming view fades
  // in via the reusable fade primitive (150ms, opacity only). The key
  // changes only when the view kind changes, so same-view navigation (one
  // project to another) keeps its existing state and behavior exactly.
  // Entrance-only by design — there is no exit bookkeeping, no navigation
  // delay, and nothing here touches focus, scroll, or the guard. Under
  // reduced motion the fade collapses via the global rule.
  let viewKey: string = guarded
  let view: ReactNode
  if (guarded === 'workspace' || guarded === 'new-workspace') {
    view = <WorkspaceView path={path} onNavigate={navigate} />
  } else if (guarded === 'pass-through') {
    const scope = parseScope(path)
    if (scope?.projectId) {
      viewKey = 'project'
      view = (
        <ProjectView
          workspaceId={scope.workspaceId}
          projectId={scope.projectId}
          onNavigate={navigate}
        />
      )
    } else if (scope?.archived) {
      viewKey = 'archived'
      view = (
        <ArchivedProjectsView
          workspaceId={scope.workspaceId}
          onNavigate={navigate}
        />
      )
    } else if (scope) {
      viewKey = 'projects'
      view = (
        <ProjectsView workspaceId={scope.workspaceId} onNavigate={navigate} />
      )
    } else if (path === ROUTES.profile) {
      viewKey = 'profile'
      view = <ProfileView onNavigate={navigate} />
    } else {
      // Unreachable in practice: the guard only returns pass-through for a
      // workspace-scoped path. Falling back to the workspace view is the safe
      // choice rather than rendering nothing.
      view = <WorkspaceView path={path} onNavigate={navigate} />
    }
  } else if (guarded === 'register') {
    view = <RegisterView />
  } else {
    view = <SignInView />
  }

  return (
    <div key={viewKey} className="tf-enter-fade">
      {view}
    </div>
  )
}
