/**
 * Create a workspace from inside the shell — FR-WS-001.
 *
 * Exists so a second workspace can be created without an invitation, which is
 * what makes FR-WS-006 / AC-WS-08 exercisable at the initial milestone (resolved
 * D-10, D-11).
 */

import { CreateWorkspaceForm } from '../components/CreateWorkspaceForm'

export function NewWorkspaceView({ onDone }: { onDone: () => void }) {
  return (
    <div className="px-(--tf-gutter) py-10">
      <div className="mx-auto w-full max-w-(--tf-content-form)">
        <h1 className="text-h1 text-text-primary">New workspace</h1>
        <p className="mt-2 text-body-lg text-text-secondary">
          A workspace holds your projects and tasks. You will own the one you
          create.
        </p>

        <div className="mt-8">
          <CreateWorkspaceForm
            heading="Create a workspace"
            headingId="new-workspace-heading"
            onCreated={onDone}
            onCancel={onDone}
          />
        </div>
      </div>
    </div>
  )
}
