/**
 * Project detail — FR-KAN, FR-TASK, FR-LIST, FR-SEARCH, FR-DASH, FR-CMT.
 *
 * The board uses the four fixed stages and is read-only with respect to column
 * structure: no column can be added, renamed, reordered, or removed, and no
 * control implies otherwise (resolved D-09). Tasks within a column are newest
 * first; there is no manual reordering.
 *
 * A task moves stage through a keyboard-operable Select rather than
 * drag-and-drop. Design-system 8.8 requires a keyboard route for any drag
 * gesture (NFR-ACCESS-007); making the select the ONLY route is stronger than
 * that requirement and needs no second mechanism to keep in step.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Dialog } from '../components/Dialog'
import { EmptyState } from '../components/EmptyState'
import { ErrorState, FormError } from '../components/ErrorState'
import { Select } from '../components/Select'
import { Skeleton } from '../components/Skeleton'
import { TextField } from '../components/TextField'
import { ThemeControl, type ThemeOption } from '../components/ThemeControl'
import { SearchIcon } from '../components/icons'
import { AppShell } from '../components/AppShell'
import { StageDistribution } from '../components/StageDistribution'
import { TaskEditor } from '../components/TaskEditor'
import { useApp } from '../app/AppContext'
import { getService } from '../access/service'
import { useNavTarget } from '../app/useNavTarget'
import { paths } from '../routing/useHashRoute'
import {
  readStoredDensity,
  writeStoredDensity,
  type Density,
} from '../density/storage'
import { cn } from '../lib/cn'
import type {
  BackendTask,
  BackendUser,
  DashboardData,
  SearchHit,
} from '../data/backend'

const STAGES = [
  { value: 'BACKLOG', label: 'Backlog' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'DONE', label: 'Done' },
] as const

const PRIORITIES = [
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
  { value: 'NONE', label: 'No priority' },
] as const

type ProjectWorkspaceView = 'board' | 'list'

const VIEW_OPTIONS: ReadonlyArray<ThemeOption<ProjectWorkspaceView>> = [
  { value: 'board', label: 'Board' },
  { value: 'list', label: 'List' },
]

const DENSITY_OPTIONS: ReadonlyArray<ThemeOption<Density>> = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
]

/** Assignee display. Only the signed-in user is identifiable; anything else
 *  assigned to someone is stated as such without inventing a name. */
function assigneeLabel(
  task: BackendTask,
  user: BackendUser | null,
): string {
  if (!task.assigneeId) return 'Unassigned'
  if (user && task.assigneeId === user.id)
    return `${user.displayName} (you)`
  return 'Assigned'
}

/** Overdue on the calendar date, matching the drawer's end-of-day reading. */
function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  return dueDate.slice(0, 10) < new Date().toISOString().slice(0, 10)
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready'
      tasks: BackendTask[]
      /**
       * The dashboard response, held whole. Reassembling it from `byStage` here
       * would silently drop `dueSoon` and `overdue`, which are computed
       * server-side from real rows (FR-DASH-003).
       */
      summary: DashboardData
    }

export function ProjectView({
  workspaceId,
  projectId,
  onNavigate,
}: {
  workspaceId: string
  projectId: string
  onNavigate: (path: string) => void
}) {
  const { user } = useApp()
  const navTarget = useNavTarget(onNavigate)
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [stageFilter, setStageFilter] = useState<BackendTask['stage'] | null>(null)
  // Board is the default: it is the existing behaviour and stays put.
  const [view, setView] = useState<ProjectWorkspaceView>('board')
  const [density, setDensityState] = useState<Density>(readStoredDensity)

  function setDensity(next: Density) {
    setDensityState(next)
    writeStoredDensity(next)
  }

  // The control that opened the drawer, so focus can return to it on close
  // (FR-DRAWER-007). Captured at open time: by close time the active element
  // is inside the drawer being unmounted.
  const openerRef = useRef<HTMLElement | null>(null)

  function captureOpener() {
    openerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
  }

  function openTaskDrawer(taskId: string) {
    captureOpener()
    setOpenTaskId(taskId)
  }

  function openCreate() {
    captureOpener()
    setCreating(true)
  }

  // Focus returns to the opener AFTER the drawer leaves the DOM. While it is
  // still open the page content is inert and focusing an inert element is
  // silently a no-op — the same ordering the AppShell overlay uses.
  useEffect(() => {
    if (openTaskId !== null || creating || !openerRef.current) return
    const opener = openerRef.current
    openerRef.current = null
    opener.focus()
  }, [openTaskId, creating])

  /**
   * `silent` refreshes the data without tearing the view down to the loading
   * skeleton. A mutation made from inside the task drawer needs this: dropping
   * to `loading` would unmount the drawer, destroy its local state, and make the
   * "Saved" confirmation unobservable (the same defect `AC-DATA-07` covers).
   */
  const load = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (options.silent !== true) setState({ status: 'loading' })
      const [tasks, summary] = await Promise.all([
        getService().listTasks(projectId),
        getService().dashboard(projectId),
      ])
      if (!tasks.ok) {
        setState({
          status: 'error',
          message: tasks.error.formError ?? 'We could not load this project.',
        })
        return
      }
      if (!summary.ok) {
        setState({
          status: 'error',
          message: summary.error.formError ?? 'We could not load this project.',
        })
        return
      }
      setState({
        status: 'ready',
        tasks: tasks.value,
        summary: summary.value,
      })
    },
    [projectId],
  )

  useEffect(() => {
    void load()
  }, [load])

  // Search is scoped to this project only, per resolved D-13. An empty query is
  // never run: no query means the full list, not a no-results state
  // (NFR-STATE-004).
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed === '') {
      setHits(null)
      setSearching(false)
      return
    }
    let cancelled = false
    setSearching(true)
    void (async () => {
      const result = await getService().search(projectId, trimmed)
      if (cancelled) return
      setSearching(false)
      if (result.ok) setHits(result.value)
      else setError(result.error.formError)
    })()
    return () => {
      cancelled = true
    }
  }, [query, projectId])

  async function onCreateTask(title: string) {
    setBusy(true)
    setError(null)
    const result = await getService().createTask({ projectId, title })
    setBusy(false)
    if (!result.ok) {
      setError(result.error.formError)
      return false
    }
    setCreating(false)
    await load()
    return true
  }

  async function onMoveStage(taskId: string, stage: BackendTask['stage']) {
    setError(null)
    const result = await getService().updateTask(taskId, { stage })
    if (!result.ok) {
      setError(result.error.formError)
      return
    }
    // A failed save must never appear successful, so reload from the server
    // rather than patching local state (NFR-ERR-002).
    await load()
  }

  async function onSetPriority(taskId: string, priority: BackendTask['priority']) {
    setError(null)
    const result = await getService().updateTask(taskId, { priority })
    if (!result.ok) {
      setError(result.error.formError)
      return
    }
    await load()
  }

  const openTask = useMemo(
    () =>
      state.status === 'ready'
        ? (state.tasks.find((task) => task.id === openTaskId) ?? null)
        : null,
    [state, openTaskId],
  )

  return (
    <AppShell
      activeRoute="projects"
      onNavigate={navTarget}
    >
      <div
        inert={openTaskId !== null || creating ? true : undefined}
        className="px-(--tf-gutter) py-8"
      >
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <a
              href={`#${paths.projects(workspaceId)}`}
              className="text-meta text-text-brand underline underline-offset-4"
            >
              All projects
            </a>
            <h1 className="mt-1 text-h1 text-text-primary">
              {state.status === 'ready' ? state.summary.projectName : 'Project'}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {state.status === 'ready' && !state.summary.isEmpty ? (
              <>
                <ThemeControl
                  id="tf-workspace-view"
                  label="Project view"
                  value={view}
                  options={VIEW_OPTIONS}
                  onChange={setView}
                />
                <ThemeControl
                  id="tf-workspace-density"
                  label="Task density"
                  value={density}
                  options={DENSITY_OPTIONS}
                  onChange={setDensity}
                />
              </>
            ) : null}
            {state.status === 'ready' && !creating && !state.summary.isEmpty ? (
              <Button variant="primary" onClick={openCreate}>
                Create task
              </Button>
            ) : null}
          </div>
        </header>

        {error ? (
          <div className="mt-6">
            <FormError message={error} />
          </div>
        ) : null}

        {/* Current-project search (resolved D-13) */}
        <div className="mt-6">
          <div className="relative max-w-(--tf-content-form)">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted">
              <SearchIcon size="sm" />
            </span>
            <label htmlFor="project-search" className="sr-only">
              Search tasks in this project
            </label>
            <input
              id="project-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tasks…"
              className="h-9 w-full rounded-md border border-border-default bg-bg-subtle pr-3 pl-9 text-body text-text-primary transition-colors duration-100 ease-standard placeholder:text-text-muted hover:border-border-strong focus:border-border-focus"
            />
          </div>
          <p className="sr-only" role="status" aria-live="polite">
            {searching
              ? 'Searching'
              : hits
                ? `${hits.length} ${hits.length === 1 ? 'task matches' : 'tasks match'}`
                : ''}
          </p>
        </div>

        {/* Progress indicators (FR-DASH). Rendered above the board on every
            project with tasks; an empty project shows the explicit empty state
            instead of a zero-progress figure (AC-DASH-03). */}
        {state.status === 'ready' ? (
          <div className="mt-6">
            <StageDistribution
              data={state.summary}
              // AC-DASH-05: an indicator routes into the tasks behind it.
              onSelectStage={(stage) => setStageFilter(stage)}
            />
            {stageFilter ? (
              <p className="mt-3 flex items-center gap-2 text-body text-text-secondary">
                <span>
                  Showing {STAGES.find((s) => s.value === stageFilter)?.label}
                  {' '}tasks.
                </span>
                <Button
                  variant="link"
                  size="compact"
                  onClick={() => setStageFilter(null)}
                >
                  Show the whole board
                </Button>
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6">
          {state.status === 'loading' ? (
            <div
              role="status"
              aria-live="polite"
              aria-label="Loading project tasks"
              className="flex gap-4 overflow-hidden"
            >
              {[0, 1, 2, 3].map((column) => (
                <div key={column} className="w-72 shrink-0">
                  <Skeleton height="20px" />
                  <div className="mt-3 flex flex-col gap-3">
                    <Skeleton height="88px" />
                    <Skeleton height="88px" />
                  </div>
                </div>
              ))}
            </div>
          ) : state.status === 'error' ? (
            <ErrorState
              title="We could not load this project"
              message={state.message}
              action={
                <Button variant="secondary" onClick={() => void load()}>
                  Try again
                </Button>
              }
            />
          ) : state.summary.isEmpty ? (
            <EmptyState
              headingLevel={2}
              headline="No tasks in this project"
              description="Create your first task to start tracking work. Every task starts in the Backlog."
              action={
                creating ? null : (
                  <Button variant="primary" onClick={openCreate}>
                    Create a task
                  </Button>
                )
              }
            />
          ) : hits !== null ? (
            // A search result set replaces the board; an empty result is a
            // distinct message, never a blank board (AC-SEARCH-02).
            hits.length === 0 ? (
              <EmptyState
                headingLevel={2}
                headline="No matching tasks"
                description={`Nothing in this project matches “${query.trim()}”.`}
                action={
                  <Button variant="secondary" onClick={() => setQuery('')}>
                    Clear search
                  </Button>
                }
              />
            ) : (
              view === 'board' ? (
                <ul
                  className={cn(
                    'flex flex-col',
                    density === 'compact' ? 'gap-2' : 'gap-3',
                  )}
                >
                  {hits.map((hit) => (
                    <li key={hit.task.id}>
                      <TaskRow
                        task={hit.task}
                        matchedIn={hit.matchedIn}
                        density={density}
                        onOpen={() => openTaskDrawer(hit.task.id)}
                        onMoveStage={(stage) =>
                          void onMoveStage(hit.task.id, stage)
                        }
                        onSetPriority={(priority) =>
                          void onSetPriority(hit.task.id, priority)
                        }
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <TaskList
                  items={hits.map((hit) => ({
                    task: hit.task,
                    matchedIn: hit.matchedIn,
                  }))}
                  user={user}
                  density={density}
                  onOpen={openTaskDrawer}
                  onMoveStage={onMoveStage}
                />
              )
            )
          ) : view === 'board' ? (
            <Board
              byStage={state.summary.byStage}
              tasks={state.tasks}
              density={density}
              // A stage chosen from a progress indicator filters the board to
              // that column (AC-DASH-05) rather than scrolling to it, so the
              // route stays the single source of truth.
              highlightStage={stageFilter}
              onOpen={openTaskDrawer}
              onMoveStage={onMoveStage}
              onSetPriority={onSetPriority}
            />
          ) : (
            <TaskList
              items={(stageFilter
                ? state.tasks.filter((task) => task.stage === stageFilter)
                : state.tasks
              ).map((task) => ({ task }))}
              user={user}
              density={density}
              onOpen={openTaskDrawer}
              onMoveStage={onMoveStage}
            />
          )}
        </div>
      </div>

      {openTask ? (
        <TaskDrawer
          task={openTask}
          user={user}
          onClose={() => setOpenTaskId(null)}
          onChanged={() => void load({ silent: true })}
        />
      ) : null}

      {creating ? (
        <Dialog
          title="Create a task"
          onClose={() => {
            if (!busy) setCreating(false)
          }}
        >
          <CreateTaskForm
            busy={busy}
            onSubmit={onCreateTask}
            onCancel={() => setCreating(false)}
          />
        </Dialog>
      ) : null}
    </AppShell>
  )
}

function Board({
  byStage,
  tasks,
  density,
  highlightStage,
  onOpen,
  onMoveStage,
  onSetPriority,
}: {
  byStage: Array<{ stage: BackendTask['stage']; label: string; count: number }>
  tasks: BackendTask[]
  density: Density
  highlightStage: BackendTask['stage'] | null
  onOpen: (taskId: string) => void
  onMoveStage: (taskId: string, stage: BackendTask['stage']) => void
  onSetPriority: (taskId: string, priority: BackendTask['priority']) => void
}) {
  // Column under the pointer during a drag. Cleared on drop and whenever any
  // drag ends, so a cancelled drag never leaves a stale highlight.
  const [dropStage, setDropStage] = useState<BackendTask['stage'] | null>(null)

  useEffect(() => {
    function clear() {
      setDropStage(null)
    }
    document.addEventListener('dragend', clear)
    return () => document.removeEventListener('dragend', clear)
  }, [])
  // When a stage is chosen from the progress indicator, the other columns are
  // marked dimmed rather than removed — hiding a column would misrepresent the
  // board (FR-KAN-005).
  const visibleStages =
    highlightStage === null
      ? byStage
      : byStage.filter((column) => column.stage === highlightStage)

  return (
    <>
      <div
        className={cn(
          'flex overflow-x-auto pb-4',
          density === 'compact' ? 'gap-2' : 'gap-4',
        )}
      >
        {visibleStages.map((column) => {
          const columnTasks = tasks.filter((task) => task.stage === column.stage)
          const isDropTarget = dropStage === column.stage
          return (
            <section
              key={column.stage}
              aria-labelledby={`column-${column.stage}`}
              onDragOver={(event) => {
                // Required: without it the drop event never fires.
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
                setDropStage(column.stage)
              }}
              onDragLeave={(event) => {
                // dragleave also fires moving between children; only a true
                // exit clears the highlight.
                if (
                  event.currentTarget.contains(
                    event.relatedTarget as Node | null,
                  )
                )
                  return
                setDropStage((current) =>
                  current === column.stage ? null : current,
                )
              }}
              onDrop={(event) => {
                event.preventDefault()
                setDropStage(null)
                const taskId = event.dataTransfer.getData('text/plain')
                const moved = tasks.find((task) => task.id === taskId)
                // A drop in the task's own column changes nothing and must not
                // write: the move is a real API update, never visual-only.
                if (moved && moved.stage !== column.stage)
                  onMoveStage(taskId, column.stage)
              }}
              className={cn(
                'flex w-72 shrink-0 flex-col rounded-md outline-2',
                isDropTarget ? 'outline outline-brand-600' : 'outline-transparent',
              )}
            >
              <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                <h2
                  id={`column-${column.stage}`}
                  className="text-label text-text-primary"
                >
                  {column.label}
                </h2>
                <span className="tf-numeric text-meta text-text-muted">
                  {columnTasks.length}
                </span>
              </div>
              <div
                className={cn(
                  'mt-3 flex flex-col',
                  density === 'compact' ? 'gap-2' : 'gap-3',
                )}
              >
                {columnTasks.length === 0 ? (
                  // An empty column states so explicitly; never a blank gap
                  // (FR-KAN-005).
                  <p className="rounded-md border border-border-subtle bg-bg-subtle px-3 py-4 text-center text-meta text-text-muted">
                    Nothing here yet
                  </p>
                ) : (
                  columnTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      density={density}
                      draggable
                      onOpen={() => onOpen(task.id)}
                      onMoveStage={(stage) => onMoveStage(task.id, stage)}
                      onSetPriority={(priority) => onSetPriority(task.id, priority)}
                    />
                  ))
                )}
              </div>
            </section>
          )
        })}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {byStage.map((column) => `${column.label}: ${column.count}`).join('. ')}
      </p>
    </>
  )
}

/**
 * Task list — the List view of the project workspace (FR-LIST).
 *
 * Same tasks, same state, same API as the board: title opens the drawer,
 * stage changes through the keyboard-operable select, priority is always an
 * explicit badge. Rows are data-complete at every width — narrow screens
 * stack each row with visible field labels rather than dropping columns.
 */
function TaskList({
  items,
  user,
  density,
  onOpen,
  onMoveStage,
}: {
  items: Array<{
    task: BackendTask
    matchedIn?: 'title' | 'description' | 'both'
  }>
  user: BackendUser | null
  density: Density
  onOpen: (taskId: string) => void
  onMoveStage: (taskId: string, stage: BackendTask['stage']) => void
}) {
  const rowPadding = density === 'compact' ? 'px-3 py-2' : 'p-3'

  return (
    <div>
      <div className="mb-2 hidden grid-cols-12 gap-3 rounded-md bg-bg-subtle px-3 py-2 md:grid">
        <span className="col-span-4 text-overline text-text-muted">Title</span>
        <span className="col-span-2 text-overline text-text-muted">Stage</span>
        <span className="col-span-2 text-overline text-text-muted">
          Priority
        </span>
        <span className="col-span-2 text-overline text-text-muted">
          Assignee
        </span>
        <span className="col-span-2 text-overline text-text-muted">
          Due date
        </span>
      </div>
      <ul
        className={cn(
          'flex flex-col',
          density === 'compact' ? 'gap-1' : 'gap-2',
        )}
      >
        {items.map(({ task, matchedIn }) => {
          const overdue = isOverdue(task.dueDate)
          return (
            <li
              key={task.id}
              className={cn(
                'rounded-md border border-border-subtle bg-bg-surface',
                'transition-colors duration-100 ease-standard',
                'hover:bg-bg-subtle',
                rowPadding,
              )}
            >
              <div className="flex flex-col gap-1 md:grid md:grid-cols-12 md:items-center md:gap-3">
                <div className="md:col-span-4 md:min-w-0">
                  <button
                    type="button"
                    onClick={() => onOpen(task.id)}
                    className="block w-full truncate text-left text-body text-text-brand underline-offset-4 hover:underline"
                  >
                    {task.title}
                  </button>
                  {matchedIn === 'description' && task.description ? (
                    <p className="mt-0.5 text-meta text-text-muted">
                      Matched in description
                    </p>
                  ) : null}
                </div>
                <div className="md:col-span-2 md:min-w-0">
                  <span className="text-meta text-text-muted md:hidden">
                    Stage:{' '}
                  </span>
                  <Select
                    label={`Stage for ${task.title}`}
                    value={task.stage}
                    onChange={(stage) =>
                      onMoveStage(task.id, stage as BackendTask['stage'])
                    }
                    options={STAGES.map((stage) => ({
                      value: stage.value,
                      label: stage.label,
                    }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <span className="text-meta text-text-muted md:hidden">
                    Priority:{' '}
                  </span>
                  <Badge
                    tone={
                      task.priority === 'HIGH'
                        ? 'danger'
                        : task.priority === 'MEDIUM'
                          ? 'warning'
                          : 'neutral'
                    }
                  >
                    {task.priority === 'HIGH'
                      ? 'High'
                      : task.priority === 'MEDIUM'
                        ? 'Medium'
                        : task.priority === 'LOW'
                          ? 'Low'
                          : 'No priority'}
                  </Badge>
                </div>
                <p className="text-body text-text-secondary md:col-span-2 md:truncate">
                  <span className="text-meta text-text-muted md:hidden">
                    Assignee:{' '}
                  </span>
                  {assigneeLabel(task, user)}
                </p>
                <p
                  className={cn(
                    'text-body md:col-span-2',
                    overdue ? 'text-status-danger-text' : 'text-text-secondary',
                  )}
                >
                  <span className="text-meta text-text-muted md:hidden">
                    Due:{' '}
                  </span>
                  {task.dueDate ? task.dueDate.slice(0, 10) : 'No due date'}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function TaskRow({
  task,
  matchedIn,
  density,
  draggable = false,
  onOpen,
  onMoveStage,
  onSetPriority,
}: {
  task: BackendTask
  matchedIn?: 'title' | 'description' | 'both'
  density: Density
  /** Board cards only: dragged into another column to move stage. */
  draggable?: boolean
  onOpen: () => void
  onMoveStage: (stage: BackendTask['stage']) => void
  onSetPriority: (priority: BackendTask['priority']) => void
}) {
  // Source highlight while dragging. An instant class toggle, never a
  // transition, so it is safe under prefers-reduced-motion by construction.
  const [dragging, setDragging] = useState(false)

  return (
    <article
      draggable={draggable}
      onDragStart={(event) => {
        if (!draggable) return
        event.dataTransfer.setData('text/plain', task.id)
        event.dataTransfer.effectAllowed = 'move'
        setDragging(true)
      }}
      onDragEnd={() => setDragging(false)}
      className={cn(
        'rounded-md border border-border-default bg-bg-surface',
        density === 'compact' ? 'p-2' : 'p-3',
        dragging && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-body text-text-primary">
          {/* Match location is indicated on the matched field (AC-SEARCH-08). */}
          {task.title}
        </h3>
        {/* No priority is an explicit badge, never a blank cell (6.9). */}
        <Badge
          tone={
            task.priority === 'HIGH'
              ? 'danger'
              : task.priority === 'MEDIUM'
                ? 'warning'
                : 'neutral'
          }
        >
          {task.priority === 'HIGH'
            ? 'High'
            : task.priority === 'MEDIUM'
              ? 'Medium'
              : task.priority === 'LOW'
                ? 'Low'
                : 'No priority'}
        </Badge>
      </div>

      {matchedIn === 'description' && task.description ? (
        <p className="mt-1 text-meta text-text-muted">
          Matched in description
        </p>
      ) : null}

      <div className="mt-3 flex flex-col gap-2">
        <Select
          label="Stage"
          value={task.stage}
          onChange={(stage) => onMoveStage(stage as BackendTask['stage'])}
          options={STAGES.map((stage) => ({ value: stage.value, label: stage.label }))}
        />
        <Select
          label="Priority"
          value={task.priority}
          onChange={(priority) =>
            onSetPriority(priority as BackendTask['priority'])
          }
          options={PRIORITIES.map((priority) => ({
            value: priority.value,
            label: priority.label,
          }))}
        />
        <Button variant="secondary" size="compact" onClick={onOpen}>
          Open details
        </Button>
      </div>
    </article>
  )
}

function CreateTaskForm({
  busy,
  onSubmit,
  onCancel,
}: {
  busy: boolean
  onSubmit: (title: string) => Promise<boolean>
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [fieldError, setFieldError] = useState<string | undefined>(undefined)

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        setFieldError(undefined)
        void onSubmit(title).then((created) => {
          if (!created) setFieldError('Task title is required.')
        })
      }}
    >
      <TextField
        id="task-title"
        label="Task title"
        value={title}
        error={fieldError}
        hint="New tasks start in the Backlog."
        onChange={(event) => setTitle(event.target.value)}
      />
      <div className="mt-5 flex gap-3">
        <Button type="submit" variant="primary" loading={busy}>
          Create task
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function TaskDrawer({
  task,
  user,
  onClose,
  onChanged,
}: {
  task: BackendTask
  user: BackendUser | null
  onClose: () => void
  onChanged: () => void
}) {
  const [comments, setComments] = useState<
    Array<{ id: string; body: string; createdAt: string }> | null
  >(null)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const drawerRef = useRef<HTMLElement | null>(null)
  // Stable across renders: the key handler is registered once, while the
  // parent's inline onClose is a new closure every render.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Move focus into the drawer on open, so a keyboard user is not left behind
  // the inert page content. Same ordering as the AppShell overlay.
  useEffect(() => {
    drawerRef.current
      ?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      ?.focus()
  }, [])

  // Esc closes; Tab cycles inside the drawer and never reaches the inert page
  // (FR-DRAWER-007, NFR-ACCESS-004).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !drawerRef.current) return
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute('disabled'))
      if (focusable.length === 0) return
      const first = focusable[0] as HTMLElement
      const last = focusable[focusable.length - 1] as HTMLElement
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const result = await getService().listComments(task.id)
      if (cancelled) return
      setComments(result.ok ? result.value : [])
    })()
    return () => {
      cancelled = true
    }
  }, [task.id])

  async function onAddComment() {
    setBusy(true)
    setError(null)
    const result = await getService().addComment(task.id, draft)
    setBusy(false)
    if (!result.ok) {
      setError(result.error.formError)
      return
    }
    setDraft('')
    const refreshed = await getService().listComments(task.id)
    if (refreshed.ok) setComments(refreshed.value)
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-bg-overlay"
      />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-drawer-heading"
        className="relative flex h-full w-full flex-col border-l border-border-subtle bg-bg-surface p-6 lg:w-(--tf-content-form)"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="task-drawer-heading" className="text-h2 text-text-primary">
            {task.title}
          </h2>
          <Button variant="ghost" size="compact" onClick={onClose}>
            Close
          </Button>
        </div>

        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-meta">
          <div className="flex gap-1.5">
            <dt className="text-text-muted">Stage</dt>
            <dd className="text-text-secondary">
              {STAGES.find((stage) => stage.value === task.stage)?.label}
            </dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-text-muted">Priority</dt>
            <dd className="text-text-secondary">
              {PRIORITIES.find((priority) => priority.value === task.priority)
                ?.label}
            </dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-text-muted">Due</dt>
            <dd className="text-text-secondary">
              {task.dueDate ? task.dueDate.slice(0, 10) : 'No due date'}
            </dd>
          </div>
        </dl>

        {task.description ? (
          <p className="mt-4 text-body text-text-secondary">{task.description}</p>
        ) : null}

        {/* FR-TASK-007/008/009: assignee and due date are editable here. */}
        <TaskEditor task={task} user={user} onSaved={onChanged} />

        <h3 className="mt-6 text-h3 text-text-primary">Comments</h3>

        {error ? (
          <div className="mt-3">
            <FormError message={error} />
          </div>
        ) : null}

        <div className="mt-3 flex-1 overflow-y-auto">
          {comments === null ? (
            <Skeleton height="60px" />
          ) : comments.length === 0 ? (
            <p className="text-body text-text-muted">
              No comments yet. Start the discussion.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {comments.map((comment) => (
                <li
                  key={comment.id}
                  className="rounded-md border border-border-subtle bg-bg-subtle p-3"
                >
                  <p className="text-body text-text-primary">{comment.body}</p>
                  <p className="mt-1 text-meta text-text-muted">
                    {comment.createdAt.slice(0, 10)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form
          noValidate
          className="mt-4 flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            void onAddComment()
          }}
        >
          <TextField
            id="comment-body"
            label="Add a comment"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button
            type="submit"
            variant="primary"
            loading={busy}
            disabled={draft.trim() === ''}
          >
            Comment
          </Button>
        </form>
      </aside>
    </div>
  )
}
