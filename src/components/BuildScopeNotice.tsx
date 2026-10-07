/**
 * Build scope notice — Phase 0 only.
 *
 * NOT a Coming Soon product surface. It states which capabilities are actually
 * implemented in this build so nothing appears to exist that does not, and so a
 * reviewer is never misled by an empty surface. Removed when Phase 1 lands.
 */

import { Badge } from './Badge'

export function BuildScopeNotice() {
  return (
    <div className="rounded-lg border border-border-default bg-bg-subtle p-4">
      <div className="flex items-center gap-2">
        <Badge tone="info">Phase 0 build</Badge>
        <span className="text-meta text-text-muted">
          Foundation milestone
        </span>
      </div>
      <p className="mt-2 tf-measure-reading text-body text-text-secondary">
        This build implements authentication, workspace membership, workspace
        switching, and theming. Projects, tasks, the board, the list view,
        comments, search, and the dashboard are not built yet. Nothing below this
        notice should be read as an empty project — the feature is absent, not
        empty.
      </p>
    </div>
  )
}
