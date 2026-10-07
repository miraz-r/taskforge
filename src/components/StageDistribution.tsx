/**
 * Stage distribution — FR-DASH.
 *
 * SCOPE LIMIT, stated plainly: `FR-DASH-006` leaves the metric set and depth as
 * OPEN DECISION D-05. This component therefore renders ONLY the stage counts the
 * approved API already returns. It invents no burn-down, no velocity, no
 * percentage-complete, and no forecast.
 *
 * Honesty rules enforced here:
 *  - `FR-DASH-003`: every figure is derived from actual task rows and is
 *    labelled as such. Nothing is estimated.
 *  - `AC-DASH-03`: a project with no tasks renders an explicit empty state, not a
 *    zero-progress chart that would read as "0% complete".
 *  - `NFR-STATE-006`: absence is never rendered as a misleading zero metric.
 *  - Counts are always accompanied by their text label, never by colour alone
 *    (NFR-ACCESS-008).
 *
 * Visual treatment follows design-system 4.6: borders separate regions, shadows
 * are reserved for floating surfaces, and the palette comes from tokens.
 */

import type { BackendTask, DashboardData } from '../data/backend'
import { Card } from './Card'

export function StageDistribution({
  data,
  onSelectStage,
}: {
  data: DashboardData
  /** AC-DASH-05: an indicator links to the tasks it summarizes. */
  onSelectStage?: (stage: BackendTask['stage']) => void
}) {
  if (data.isEmpty) {
    // AC-DASH-03 / FR-DASH-004: an explicit empty state, not a zero figure.
    return (
      <Card padding="lg">
        <h3 className="text-h3 text-text-primary">No progress to show yet</h3>
        <p className="mt-1 tf-measure-reading text-body text-text-secondary">
          This project has no tasks, so there is nothing to summarize. Progress
          appears here once tasks exist.
        </p>
      </Card>
    )
  }

  const max = Math.max(...data.byStage.map((stage) => stage.count), 1)

  return (
    <Card
      as="section"
      padding="lg"
      aria-labelledby="stage-distribution-heading"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3
          id="stage-distribution-heading"
          className="text-h3 text-text-primary"
        >
          Tasks by stage
        </h3>
        <p className="text-meta text-text-muted">
          Counted from {data.totalTasks}{' '}
          {data.totalTasks === 1 ? 'task' : 'tasks'} in this project
        </p>
      </header>

      {/* Bars. The value is always present as text, so the chart is not read by
          colour alone and survives a monochrome rendering. */}
      <ul className="mt-5 flex flex-col gap-4">
        {data.byStage.map((stage) => {
          const percent = Math.round((stage.count / max) * 100)
          const interactive = onSelectStage !== undefined && stage.count > 0
          const Row = interactive ? 'button' : 'div'
          return (
            <li key={stage.stage}>
              <Row
                {...(interactive
                  ? {
                      type: 'button' as const,
                      onClick: () => onSelectStage?.(stage.stage),
                      'aria-label': `Show ${stage.label} tasks`,
                    }
                  : {})}
                className="block w-full text-left"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-label text-text-primary">
                    {stage.label}
                  </span>
                  <span className="tf-numeric text-meta text-text-secondary">
                    {stage.count}
                  </span>
                </div>
                <div
                  className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-bg-muted"
                  role="img"
                  aria-label={`${stage.label}: ${stage.count} of ${data.totalTasks} tasks`}
                >
                  <div
                    className="h-full rounded-full bg-brand-600"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </Row>
            </li>
          )
        })}
      </ul>

      {(data.overdue > 0 || data.dueSoon > 0) ? (
        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 border-t border-border-subtle pt-4 text-meta">
          {data.overdue > 0 ? (
            <div className="flex items-center gap-2">
              <dt className="text-text-secondary">Overdue</dt>
              <dd className="tf-numeric text-status-danger-text">
                {data.overdue}
              </dd>
            </div>
          ) : null}
          {data.dueSoon > 0 ? (
            <div className="flex items-center gap-2">
              <dt className="text-text-secondary">Due within 7 days</dt>
              <dd className="tf-numeric text-text-primary">{data.dueSoon}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </Card>
  )
}
