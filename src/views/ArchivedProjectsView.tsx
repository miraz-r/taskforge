/**
 * Archived projects — FR-PRJ-010, resolved D-19.
 *
 * Archiving is reversible. An archived project keeps every task, comment, and
 * timestamp; restoring returns it to the active list intact.
 *
 * Archived projects are EXCLUDED from dashboard summaries (FR-DASH-002) and from
 * the active list, which is why they live on their own route rather than being
 * filtered inline on the projects view.
 *
 * There is no permanent-deletion control anywhere in this file (FR-PRJ-012).
 */

import { useCallback, useEffect, useState } from 'react'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { ErrorState, FormError } from '../components/ErrorState'
import { Skeleton } from '../components/Skeleton'
import { ArchiveIcon } from '../components/icons'
import { AppShell } from '../components/AppShell'
import { useNavTarget } from '../app/useNavTarget'
import { getService } from '../access/service'
import { paths } from '../routing/useHashRoute'
import type { BackendProject } from '../data/backend'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; projects: BackendProject[] }

export function ArchivedProjectsView({
  workspaceId,
  onNavigate,
}: {
  workspaceId: string
  onNavigate: (path: string) => void
}) {
  const navTarget = useNavTarget(onNavigate)
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setState({ status: 'loading' })
    const result = await getService().listProjects(workspaceId, 'ARCHIVED')
    if (!result.ok) {
      setState({
        status: 'error',
        message: result.error.formError ?? 'We could not load archived projects.',
      })
      return
    }
    setState({ status: 'ready', projects: result.value })
  }, [workspaceId])

  useEffect(() => {
    void load()
  }, [load])

  async function onRestore(projectId: string) {
    setBusyId(projectId)
    setError(null)
    const result = await getService().setProjectArchived(projectId, false)
    setBusyId(null)
    if (!result.ok) {
      // A failed restore must not present the project as restored.
      setError(result.error.formError)
      return
    }
    await load()
  }

  return (
    <AppShell activeRoute="archived" onNavigate={navTarget}>
      <div className="px-(--tf-gutter) py-8">
        <div className="mx-auto w-full max-w-(--tf-content-reading)">
          <header>
            <a
              href={`#${paths.projects(workspaceId)}`}
              className="text-meta text-text-brand underline underline-offset-4"
            >
              Back to projects
            </a>
            <h1 className="mt-1 text-h1 text-text-primary">Archived projects</h1>
            <p className="mt-2 tf-measure-reading text-body text-text-secondary">
              Archived projects keep all of their tasks and comments and are left
              out of project summaries. Restoring one returns it to the active
              list with everything intact.
            </p>
          </header>

          {error ? (
            <div className="mt-6">
              <FormError message={error} />
            </div>
          ) : null}

          <div className="mt-6">
            {state.status === 'loading' ? (
              <div
                role="status"
                aria-live="polite"
                aria-label="Loading archived projects"
                className="flex flex-col gap-3"
              >
                <Skeleton height="72px" />
                <Skeleton height="72px" />
              </div>
            ) : state.status === 'error' ? (
              <ErrorState
                title="We could not load archived projects"
                message={state.message}
                action={
                  <Button variant="secondary" onClick={() => void load()}>
                    Try again
                  </Button>
                }
              />
            ) : state.projects.length === 0 ? (
              <EmptyState
                headingLevel={2}
                icon={<ArchiveIcon size="lg" />}
                headline="Nothing archived"
                description="Projects you archive will appear here, ready to restore. Nothing is ever deleted."
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {state.projects.map((project) => (
                  <Card as="li" key={project.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="text-h3 text-text-primary">
                            {project.name}
                          </h2>
                          <Badge tone="neutral">Archived</Badge>
                        </div>
                        {project.archivedAt ? (
                          <p className="mt-1 text-meta text-text-muted">
                            Archived {project.archivedAt.slice(0, 10)}
                          </p>
                        ) : null}
                      </div>
                      <Button
                        variant="secondary"
                        size="compact"
                        loading={busyId === project.id}
                        disabled={busyId !== null && busyId !== project.id}
                        onClick={() => void onRestore(project.id)}
                      >
                        Restore
                      </Button>
                    </div>
                  </Card>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
