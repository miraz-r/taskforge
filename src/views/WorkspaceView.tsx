/**
 * Protected routes — NFR-SEC-001, NFR-STATE-001.
 *
 * All four states are defined and visually distinct (NFR-STATE-001): loading
 * (skeleton), empty (zero-workspace state), failure (retryable error state), and
 * success (workspace overview or the create form). An empty state is never
 * rendered as a skeleton (NFR-STATE-004).
 */

import { AppShell } from '../components/AppShell'
import { Button } from '../components/Button'
import { ErrorState } from '../components/ErrorState'
import { PanelSkeleton } from '../components/Skeleton'
import { useApp } from '../app/AppContext'
import { useNavTarget } from '../app/useNavTarget'
import { ROUTES } from '../routing/useHashRoute'
import { NewWorkspaceView } from './NewWorkspaceView'
import { ZeroWorkspacesView } from './ZeroWorkspacesView'
import { WorkspaceHomeView } from './WorkspaceHomeView'

export function WorkspaceView({
  path,
  onNavigate,
}: {
  path: string
  onNavigate: (path: string) => void
}) {
  const { workspacesStatus, workspaces, workspacesError, refreshWorkspaces } =
    useApp()
  const navTarget = useNavTarget(onNavigate)

  let content
  if (workspacesStatus === 'idle' || workspacesStatus === 'loading') {
    content = (
      <div
        role="status"
        aria-live="polite"
        aria-label="Loading your workspaces"
        className="flex flex-col gap-4 px-(--tf-gutter) py-8"
      >
        <div className="mx-auto w-full max-w-(--tf-content-reading)">
          <PanelSkeleton />
          <div className="mt-4">
            <PanelSkeleton />
          </div>
        </div>
      </div>
    )
  } else if (workspacesStatus === 'error') {
    content = (
      <div className="px-(--tf-gutter) py-10">
        <div className="mx-auto w-full max-w-(--tf-content-reading)">
          <ErrorState
            title="We could not load your workspaces"
            message={
              workspacesError ??
              'Something went wrong while loading your workspaces.'
            }
            // Retry is offered because retrying is meaningful here
            // (NFR-ERR-006).
            action={
              <Button variant="secondary" onClick={() => void refreshWorkspaces()}>
                Try again
              </Button>
            }
          />
        </div>
      </div>
    )
  } else if (workspaces.length === 0) {
    content = <ZeroWorkspacesView />
  } else if (path === ROUTES.newWorkspace) {
    content = (
      <NewWorkspaceView onDone={() => onNavigate(ROUTES.workspace)} />
    )
  } else {
    content = <WorkspaceHomeView />
  }

  return (
    <AppShell
      activeRoute={path === ROUTES.newWorkspace ? 'new-workspace' : 'workspace'}
      onNavigate={navTarget}
    >
      {content}
    </AppShell>
  )
}
