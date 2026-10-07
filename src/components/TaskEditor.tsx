/**
 * Task editor — FR-TASK-007, FR-TASK-008, FR-TASK-009.
 *
 * SCOPE, stated plainly: invitations and joining are **Coming Soon** (resolved
 * D-10), so a workspace has exactly one member — its owner. The assignee list is
 * therefore the current user plus an explicit **Unassigned** option, which is
 * what `FR-TASK-007` prescribes for that situation: "A workspace with no other
 * members shows only the current user, with an unassigned state remaining
 * available."
 *
 * Multi-member assignment coverage is deferred with invitations. Building a
 * member list from anything other than real membership data would be fabricating
 * users (design-system 6.20 rule 3).
 *
 * `FR-TASK-009`: a due date is optional; when unset it is displayed as explicitly
 * unset rather than blank. Clearing an assignee returns the task to the unassigned
 * state and is not an error.
 */

import { useState } from 'react'
import { Button } from './Button'
import { DateField } from './DateField'
import { FormError } from './ErrorState'
import { Select } from './Select'
import { Textarea } from './Textarea'
import { TextField } from './TextField'
import { getService } from '../access/service'
import type { BackendTask, BackendUser } from '../data/backend'

const STAGE_OPTIONS = [
  { value: 'BACKLOG', label: 'Backlog' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'DONE', label: 'Done' },
] as const

const PRIORITY_OPTIONS = [
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
  { value: 'NONE', label: 'No priority' },
] as const

/** `YYYY-MM-DD` for a date input, or '' when unset. */
function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : ''
}

export function TaskEditor({
  task,
  user,
  onSaved,
}: {
  task: BackendTask
  /** The signed-in user — the only assignable member at this milestone. */
  user: BackendUser | null
  onSaved: () => void
}) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)
  const [stage, setStage] = useState<BackendTask['stage']>(task.stage)
  const [priority, setPriority] = useState<BackendTask['priority']>(
    task.priority,
  )
  const [dueDate, setDueDate] = useState(toDateInput(task.dueDate))
  const [assigneeId, setAssigneeId] = useState<string>(task.assigneeId ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const assigneeOptions = [
    // FR-TASK-008: unassigned is an explicit state, always available.
    { value: '', label: 'Unassigned' },
    ...(user ? [{ value: user.id, label: `${user.displayName} (you)` }] : []),
  ]

  async function onSave() {
    setSaving(true)
    setError(null)
    setSaved(false)

    // Date-only input → end-of-day UTC, so "due today" is not read as already
    // overdue the moment the user picks it.
    const dueIso = dueDate === '' ? null : `${dueDate}T23:59:59.000Z`

    const result = await getService().updateTask(task.id, {
      title,
      stage,
      priority,
      dueDate: dueIso,
      ...(assigneeId === '' ? { assigneeId: null } : { assigneeId }),
    })

    setSaving(false)
    if (!result.ok) {
      // A failed save must not appear successful (NFR-ERR-002, NFR-DATA-005).
      setError(result.error.formError)
      return
    }
    setSaved(true)
    onSaved()
  }

  return (
    <form
      noValidate
      aria-labelledby="task-editor-heading"
      className="mt-6 flex flex-col gap-5 rounded-lg border border-border-default bg-bg-subtle p-4"
      onSubmit={(event) => {
        event.preventDefault()
        void onSave()
      }}
    >
      <h3 id="task-editor-heading" className="text-h3 text-text-primary">
        Edit task
      </h3>

      {error ? <FormError message={error} /> : null}

      <TextField
        id="edit-task-title"
        label="Title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />

      <Textarea
        id="edit-task-description"
        label="Description"
        value={description}
        rows={3}
        onChange={(event) => setDescription(event.target.value)}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Stage"
          value={stage}
          onChange={(next) => setStage(next as BackendTask['stage'])}
          options={STAGE_OPTIONS.map((option) => ({ ...option }))}
        />
        <Select
          label="Priority"
          value={priority}
          onChange={(next) => setPriority(next as BackendTask['priority'])}
          options={PRIORITY_OPTIONS.map((option) => ({ ...option }))}
        />
      </div>

      <div className="flex flex-col">
        <Select
          label="Assignee"
          value={assigneeId}
          onChange={setAssigneeId}
          options={assigneeOptions}
        />
        <p className="mt-1.5 text-meta text-text-muted">
          {assigneeId === ''
            ? 'Unassigned.'
            : 'Assigned to you.'}
        </p>
        <p className="mt-0.5 text-meta text-text-muted">
          {user
            ? 'You are the only member of this workspace.'
            : 'Only workspace members can be assigned.'}
        </p>
      </div>

      <DateField
        id="edit-task-due"
        label="Due date"
        value={dueDate}
        onChange={(event) => setDueDate(event.target.value)}
        hint={
          dueDate === ''
            ? 'No due date set. A due date is optional.'
            : `Due ${dueDate}`
        }
      />

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" loading={saving}>
          Save changes
        </Button>
        {saved ? (
          <span role="status" className="text-meta text-text-success">
            Saved
          </span>
        ) : null}
      </div>
    </form>
  )
}
