/**
 * Create-workspace form — FR-WS-001, AC-WS-01, AC-WS-06.
 *
 * Shared by the zero-workspace state and by "New workspace" in the shell, so
 * both paths behave identically (AC-WS-07 requires the zero-workspace path to be
 * the same from registration and from sign-in).
 *
 * AC-WS-06: a creation failure is reported inline and the workspace is never
 * presented as created.
 */

import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from './Button'
import { FormError } from './ErrorState'
import { TextField } from './TextField'
import { useApp } from '../app/AppContext'
import { getService } from '../access/service'

export function CreateWorkspaceForm({
  onCreated,
  onCancel,
  heading = 'Create a workspace',
  headingId = 'create-workspace-heading',
}: {
  onCreated: () => void
  onCancel?: (() => void) | undefined
  heading?: string
  headingId?: string
}) {
  const { refreshWorkspaces, setActiveWorkspaceId } = useApp()
  const [name, setName] = useState('')
  const [fieldError, setFieldError] = useState<string | undefined>(undefined)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setFieldError(undefined)
    setFormError(null)

    const result = await getService().createWorkspace(name)
    setSubmitting(false)

    if (!result.ok) {
      setFieldError(result.error.fieldErrors.name)
      setFormError(result.error.formError)
      return
    }

    setName('')
    await refreshWorkspaces()
    // The workspace just created becomes the active one: creating it and then
    // being left somewhere else would be surprising.
    setActiveWorkspaceId(result.value.id)
    onCreated()
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-labelledby={headingId}
      className="rounded-lg border border-border-default bg-bg-surface p-5"
    >
      <h2 id={headingId} className="text-h3 text-text-primary">
        {heading}
      </h2>

      <div className="mt-4 flex flex-col gap-5">
        {formError ? <FormError message={formError} /> : null}

        <TextField
          id="workspace-name"
          label="Workspace name"
          value={name}
          error={fieldError}
          hint="For example: Acme Product Team"
          onChange={(event) => setName(event.target.value)}
        />

        <div className="flex gap-3">
          <Button type="submit" variant="primary" loading={submitting}>
            Create workspace
          </Button>
          {onCancel ? (
            <Button
              variant="secondary"
              onClick={() => {
                onCancel()
                setFieldError(undefined)
                setFormError(null)
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  )
}
