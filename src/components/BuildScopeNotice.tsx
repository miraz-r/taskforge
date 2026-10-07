/**
 * Workspace orientation — what this workspace offers right now.
 *
 * NOT a Coming Soon product surface. It names only capabilities that exist and
 * are verified, so nothing appears to exist that does not. Deferred
 * capabilities are named only where the interface itself names them (the
 * Coming Soon surfaces), never here.
 */

import { Badge } from './Badge'

export function BuildScopeNotice() {
  return (
    <div className="rounded-lg border border-border-default bg-bg-subtle p-4">
      <div className="flex items-center gap-2">
        <Badge tone="info">Workspace</Badge>
      </div>
      <p className="mt-2 tf-measure-reading text-body text-text-secondary">
        Your projects live under Projects in the sidebar. Each project has a
        task board and a task list, task details with comments, project search,
        and a progress summary.
      </p>
    </div>
  )
}
