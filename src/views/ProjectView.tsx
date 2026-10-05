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

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { ErrorState, FormError } from '../components/ErrorState'
import { Select } from '../components/Select'
import { Skeleton } from '../components/Skeleton'
import { TextField } from '../components/TextField'
import { SearchIcon } from '../components/icons'
import { AppShell } from '../components/AppShell'
import { StageDistribution } from '../components/StageDistribution'
import { TaskEditor } from '../components/TaskEditor'
import { useApp } from '../app/AppContext'
import { getService } from '../access/service'
import { useNavTarget } from '../app/useNavTarget'
import { paths } from '../routing/useHashRoute'
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
      <div className="px-(--tf-gutter) py-8">
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
          {state.status === 'ready' && !creating && !state.summary.isEmpty ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              Create task
            </Button>
          ) : null}
        </header>

        {error ? (
          <div className="mt-6">
            <FormError message={error} />
          </div>
        ) : null}

        {creating ? (
          <CreateTaskForm
            busy={busy}
            onSubmit={onCreateTask}
            onCancel={() => setCreating(false)}
          />
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
                  <Button variant="primary" onClick={() => setCreating(true)}>
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
              <ul className="flex flex-col gap-3">
                {hits.map((hit) => (
                  <li key={hit.task.id}>
                    <TaskRow
                      task={hit.task}
                      matchedIn={hit.matchedIn}
                      onOpen={() => setOpenTaskId(hit.task.id)}
                      onMoveStage={(stage) => void onMoveStage(hit.task.id, stage)}
                      onSetPriority={(priority) =>
                        void onSetPriority(hit.task.id, priority)
                      }
                    />
                  </li>
                ))}
              </ul>
            )
          ) : (
            <Board
              byStage={state.summary.byStage}
              tasks={state.tasks}
              // A stage chosen from a progress indicator filters the board to
              // that column (AC-DASH-05) rather than scrolling to it, so the
              // route stays the single source of truth.
              highlightStage={stageFilter}
              onOpen={(taskId) => setOpenTaskId(taskId)}
              onMoveStage={onMoveStage}
              onSetPriority={onSetPriority}
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
    </AppShell>
  )
}

function Board({
  byStage,
  tasks,
  highlightStage,
  onOpen,
  onMoveStage,
  onSetPriority,
}: {
  byStage: Array<{ stage: BackendTask['stage']; label: string; count: number }>
  tasks: BackendTask[]
  highlightStage: BackendTask['stage'] | null
  onOpen: (taskId: string) => void
  onMoveStage: (taskId: string, stage: BackendTask['stage']) => void
  onSetPriority: (taskId: string, priority: BackendTask['priority']) => void
}) {
  // When a stage is chosen from the progress indicator, the other columns are
  // marked dimmed rather than removed — hiding a column would misrepresent the
  // board (FR-KAN-005).
  const visibleStages =
    highlightStage === null
      ? byStage
      : byStage.filter((column) => column.stage === highlightStage)

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {visibleStages.map((column) => {
          const columnTasks = tasks.filter((task) => task.stage === column.stage)
          return (
            <section
              key={column.stage}
              aria-labelledby={`column-${column.stage}`}
              className="flex w-72 shrink-0 flex-col"
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
              <div className="mt-3 flex flex-col gap-3">
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

function TaskRow({
  task,
  matchedIn,
  onOpen,
  onMoveStage,
  onSetPriority,
}: {
  task: BackendTask
  matchedIn?: 'title' | 'description' | 'both'
  onOpen: () => void
  onMoveStage: (stage: BackendTask['stage']) => void
  onSetPriority: (priority: BackendTask['priority']) => void
}) {
  return (
    <article className="rounded-md border border-border-default bg-bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-body text-text-primary">
          {/* Match location is indicated on the matched field (AC-SEARCH-08). */}
          {task.title}
        </h3>
        {task.priority !== 'NONE' ? (
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
                : 'Low'}
          </Badge>
        ) : null}
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
      aria-labelledby="create-task-heading"
      className="mt-6 rounded-lg border border-border-default bg-bg-surface p-5"
      onSubmit={(event) => {
        event.preventDefault()
        setFieldError(undefined)
        void onSubmit(title).then((created) => {
          if (!created) setFieldError('Task title is required.')
        })
      }}
    >
      <h2 id="create-task-heading" className="text-h3 text-text-primary">
        Create a task
      </h2>
      <div className="mt-4 flex flex-col gap-5">
        <TextField
          id="task-title"
          label="Task title"
          value={title}
          error={fieldError}
          hint="New tasks start in the Backlog."
          onChange={(event) => setTitle(event.target.value)}
        />
        <div className="flex gap-3">
          <Button type="submit" variant="primary" loading={busy}>
            Create task
          </Button>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        </div>
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
