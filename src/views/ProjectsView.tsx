/**
 * Project list — FR-PRJ.
 *
 * All four states are defined and distinct (NFR-STATE-001): loading (skeleton),
 * empty (no projects yet), failure (retryable), and success.
 *
 * Archive is reversible and lives behind a confirmation (resolved D-19). There is
 * NO delete control anywhere in this file — permanent deletion is excluded from
 * the initial milestone (FR-PRJ-012), so nothing exists to invoke.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Dialog } from '../components/Dialog'
import { EmptyState } from '../components/EmptyState'
import { ErrorState, FormError } from '../components/ErrorState'
import { Skeleton } from '../components/Skeleton'
import { TextField } from '../components/TextField'
import { FolderIcon } from '../components/icons'
import { AppShell } from '../components/AppShell'
import { getService } from '../access/service'
import { useOverlayPresence } from '../lib/presence'
import { useNavTarget } from '../app/useNavTarget'
import { paths } from '../routing/useHashRoute'
import type { BackendProject } from '../data/backend'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; projects: BackendProject[] }

export function ProjectsView({
  workspaceId,
  onNavigate,
}: {
  workspaceId: string
  onNavigate: (path: string) => void
}) {
  const navTarget = useNavTarget(onNavigate)
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [creating, setCreating] = useState(false)
  const [confirmingArchive, setConfirmingArchive] = useState<string | null>(null)
  // Both dialogs stay mounted through their exit animation and unmount only
  // once it has played (or synchronously when motion is reduced).
  const createPresence = useOverlayPresence(creating, '--tf-motion-base')
  const archivePresence = useOverlayPresence(
    confirmingArchive !== null,
    '--tf-motion-base',
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The control that opened a dialog, so focus returns to it on close
  // (NFR-ACCESS-004). Same ordering as the AppShell overlay and task drawer:
  // focus moves only after the dialog has left the DOM and the page is no
  // longer inert.
  const openerRef = useRef<HTMLElement | null>(null)

  function captureOpener() {
    openerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
  }

  useEffect(() => {
    if (
      createPresence.render ||
      archivePresence.render ||
      !openerRef.current
    )
      return
    const opener = openerRef.current
    openerRef.current = null
    opener.focus()
  }, [createPresence.render, archivePresence.render])

  const load = useCallback(async () => {
    setState({ status: 'loading' })
    const result = await getService().listProjects(workspaceId, 'ACTIVE')
    if (!result.ok) {
      setState({
        status: 'error',
        message: result.error.formError ?? 'We could not load your projects.',
      })
      return
    }
    setState({ status: 'ready', projects: result.value })
  }, [workspaceId])

  useEffect(() => {
    void load()
  }, [load])

  async function onCreate(name: string) {
    setBusy(true)
    setError(null)
    const result = await getService().createProject({ workspaceId, name })
    setBusy(false)
    if (!result.ok) {
      setError(result.error.formError)
      return false
    }
    setCreating(false)
    await load()
    return true
  }

  async function onArchive(projectId: string) {
    setBusy(true)
    setError(null)
    const result = await getService().setProjectArchived(projectId, true)
    setBusy(false)
    setConfirmingArchive(null)
    if (!result.ok) {
      // AC-PRJ-08: declining or failing must not present the project as archived.
      setError(result.error.formError)
      return
    }
    await load()
  }

  // The project awaiting archive confirmation, if any. Rendered in a dialog
  // rather than inline so the decision is modal (resolved D-19).
  const confirmingProject =
    state.status === 'ready'
      ? (state.projects.find((project) => project.id === confirmingArchive) ??
        null)
      : null

  // The project shown while the confirmation dialog is mounted, including
  // its exit: after dismissal the id is already null but the exiting dialog
  // must keep naming the project it is deciding about.
  const lastArchiveRef = useRef<BackendProject | null>(null)
  if (confirmingProject) lastArchiveRef.current = confirmingProject
  const visibleArchiveProject =
    confirmingProject ??
    (archivePresence.render ? lastArchiveRef.current : null)

  return (
    <AppShell
      activeRoute="projects"
      onNavigate={navTarget}
    >
      <div
        inert={
          createPresence.render || archivePresence.render ? true : undefined
        }
        className="px-(--tf-gutter) py-8"
      >
        <div className="mx-auto w-full max-w-(--tf-content-reading)">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-h1 text-text-primary">Projects</h1>
            {state.status === 'ready' && !creating ? (
              <Button
                variant="primary"
                onClick={() => {
                  captureOpener()
                  setCreating(true)
                }}
              >
                Create project
              </Button>
            ) : null}
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
                aria-label="Loading your projects"
                className="flex flex-col gap-3"
              >
                <Skeleton height="72px" />
                <Skeleton height="72px" />
                <Skeleton height="72px" />
              </div>
            ) : state.status === 'error' ? (
              <ErrorState
                title="We could not load your projects"
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
                icon={<FolderIcon size="lg" />}
                headline="No projects yet"
                description="Projects group the tasks you are working on. Create one to get started."
                action={
                  creating ? null : (
                    <Button
                      variant="primary"
                      onClick={() => {
                        captureOpener()
                        setCreating(true)
                      }}
                    >
                      Create your first project
                    </Button>
                  )
                }
              />
            ) : (
              <ul className="flex flex-col gap-3 tf-stagger">
                {state.projects.map((project) => (
                  <li key={project.id}>
                    <ProjectRow
                      project={project}
                      busy={busy}
                      onOpen={() =>
                        onNavigate(paths.project(workspaceId, project.id))
                      }
                      onRequestArchive={() => {
                        captureOpener()
                        setConfirmingArchive(project.id)
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {createPresence.render ? (
        <Dialog
          title="Create a project"
          leaving={createPresence.leaving}
          onClose={() => {
            if (!busy) setCreating(false)
          }}
        >
          <CreateProjectForm
            busy={busy}
            onSubmit={onCreate}
            onCancel={() => setCreating(false)}
          />
        </Dialog>
      ) : null}

      {visibleArchiveProject ? (
        <ArchiveProjectDialog
          projectName={visibleArchiveProject.name}
          busy={busy}
          leaving={archivePresence.leaving}
          onConfirm={() => void onArchive(visibleArchiveProject.id)}
          onCancel={() => setConfirmingArchive(null)}
        />
      ) : null}
    </AppShell>
  )
}

function CreateProjectForm({
  busy,
  onSubmit,
  onCancel,
}: {
  busy: boolean
  onSubmit: (name: string) => Promise<boolean>
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [fieldError, setFieldError] = useState<string | undefined>(undefined)

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        setFieldError(undefined)
        void onSubmit(name).then((created) => {
          if (!created) setFieldError('Project name is required.')
        })
      }}
    >
      <TextField
        id="project-name"
        label="Project name"
        value={name}
        error={fieldError}
        hint="For example: Platform Redesign"
        onChange={(event) => setName(event.target.value)}
      />
      <div className="mt-5 flex gap-3">
        <Button type="submit" variant="primary" loading={busy}>
          Create project
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function ArchiveProjectDialog({
  projectName,
  busy,
  leaving = false,
  onConfirm,
  onCancel,
}: {
  projectName: string
  busy: boolean
  /** True while the exit animation is playing; the dialog stays mounted. */
  leaving?: boolean | undefined
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Dialog
      width="confirmation"
      leaving={leaving}
      title="Archive project"
      description={`Archive “${projectName}”? It keeps all of its tasks and comments, and you can restore it at any time.`}
      onClose={() => {
        if (!busy) onCancel()
      }}
      footer={
        <>
          <Button
            variant="secondary"
            size="compact"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="compact"
            loading={busy}
            onClick={onConfirm}
          >
            Archive project
          </Button>
        </>
      }
    />
  )
}

function ProjectRow({
  project,
  busy,
  onOpen,
  onRequestArchive,
}: {
  project: BackendProject
  busy: boolean
  onOpen: () => void
  onRequestArchive: () => void
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-h3 text-text-primary">{project.name}</h2>
          {project.description ? (
            <p className="mt-1 tf-measure-reading text-body text-text-secondary">
              {project.description}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" size="compact" onClick={onOpen}>
            Open
          </Button>
          <Button
            variant="ghost"
            size="compact"
            onClick={onRequestArchive}
            disabled={busy}
          >
            Archive
          </Button>
        </div>
      </div>
    </Card>
  )
}

export { Badge }
