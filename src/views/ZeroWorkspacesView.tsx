/**
 * Zero-workspace state — FR-WS-005, FR-WS-008.
 *
 * Reached from registration AND from a later sign-in, identically, with no
 * control that skips it (AC-WS-07, resolved D-11). A workspace is a hard
 * prerequisite for any project or task.
 *
 * Join is rendered as an honest Coming Soon surface, never a disabled button:
 * invitations and joining are deferred for the initial milestone (resolved
 * D-10, AC-WS-03). A dead or operable-looking join control is a defect
 * (design-system 6.20 rules 2 and 5).
 */

import { useState } from 'react'
import { ComingSoon } from '../components/ComingSoon'
import { CreateWorkspaceForm } from '../components/CreateWorkspaceForm'
import { EmptyState } from '../components/EmptyState'
import { Button } from '../components/Button'
import { UsersIcon } from '../components/icons'

export function ZeroWorkspacesView() {
  const [creating, setCreating] = useState(false)

  return (
    <div className="px-(--tf-gutter) py-10">
      <EmptyState
        headingLevel={1}
        icon={<UsersIcon size="lg" />}
        headline="You are not in a workspace yet"
        description="A workspace is where your projects and tasks live. Create one to get started — it takes a moment and you will own it."
        action={
          creating ? null : (
            <Button
              variant="primary"
              size="large"
              onClick={() => setCreating(true)}
            >
              Create a workspace
            </Button>
          )
        }
      />

      {creating ? (
        <div className="mx-auto mt-8 w-full max-w-(--tf-content-form)">
          <CreateWorkspaceForm
            onCreated={() => setCreating(false)}
            onCancel={() => setCreating(false)}
          />
        </div>
      ) : null}

      <div className="mx-auto mt-10 w-full max-w-(--tf-content-reading)">
        <ComingSoon
          headingLevel={2}
          featureName="Join a workspace"
          description="Invitations are not available yet. When a teammate invites you, you will be able to accept it here. Until then, create your own workspace."
        />
      </div>
    </div>
  )
}
