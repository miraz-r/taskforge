/**
 * Workspace overview — FR-WS-004, FR-WS-006, FR-AUTH-007.
 *
 * Shows the selected workspace. Projects and tasks are Phase 1, so this view
 * reports the workspace identity and states plainly what is not built. It does
 * NOT render a "no projects" empty state: that would imply the feature exists
 * and is merely empty, which would be fabricated (design-system 6.12, NFR-STATE-006).
 */

import { useMemo } from 'react'
import { Badge } from '../components/Badge'
import { BuildScopeNotice } from '../components/BuildScopeNotice'
import { useApp } from '../app/AppContext'

function formatDate(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Unknown'
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function WorkspaceHomeView() {
  const { workspaces, activeWorkspaceId, user } = useApp()

  const active = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId),
    [workspaces, activeWorkspaceId],
  )

  if (!active) return null

  const workspace = active

  return (
    <div className="px-(--tf-gutter) py-8">
      <div className="mx-auto flex w-full max-w-(--tf-content-reading) flex-col gap-6">
        <header>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-h1 text-text-primary">{workspace.name}</h1>
            <Badge tone="brand">
              {workspace.ownerId === user?.id ? 'Owner' : 'Member'}
            </Badge>
          </div>
          <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-1 text-meta text-text-muted">
            <div className="flex gap-1.5">
              <dt>Created</dt>
              <dd className="text-text-secondary">
                {formatDate(workspace.createdAt)}
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Workspaces you belong to</dt>
              <dd className="tf-numeric text-text-secondary">
                {workspaces.length}
              </dd>
            </div>
          </dl>
        </header>

        <BuildScopeNotice />
      </div>
    </div>
  )
}
