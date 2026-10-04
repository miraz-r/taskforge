/**
 * Search and dashboard. FR-SEARCH, FR-DASH.
 *
 * Search scope is fixed by resolved D-13: the CURRENT project only, matching
 * task title and description, case-insensitive, partial. There is no
 * cross-project search and no advanced search — advanced search is a Coming Soon
 * surface (design-system 6.3).
 *
 * Dashboard figures are derived from actual rows, never estimated
 * (NFR-DATA-003), and an empty project is reported as empty rather than as a
 * zero-value metric (NFR-STATE-006).
 */

import { resolveProjectScope } from '../domain/scope'
import type { Actor } from '../domain/authorize'
import type { TaskRecord, TaskStage } from '../domain/records'
import { humanStage } from './project.service'
import type { Store } from '../repositories/store'

export const SEARCH_QUERY_MAX = 200

export interface SearchHit {
  task: TaskRecord
  /** Which field matched, so the UI can indicate match location (AC-SEARCH-08). */
  matchedIn: 'title' | 'description' | 'both'
}

export class SearchService {
  constructor(private readonly store: Store) {}

  async search(
    actor: Actor,
    projectId: string,
    rawQuery: string,
  ): Promise<SearchHit[]> {
    // Membership is verified before the project's tasks are read at all.
    await resolveProjectScope(this.store, actor, projectId)

    const query = rawQuery.trim().slice(0, SEARCH_QUERY_MAX).toLowerCase()
    if (query === '') return []

    const tasks = await this.store.tasks.listByProject(projectId)
    const hits: SearchHit[] = []

    for (const task of tasks) {
      const inTitle = task.title.toLowerCase().includes(query)
      const inDescription = task.description.toLowerCase().includes(query)
      if (!inTitle && !inDescription) continue
      hits.push({
        task,
        matchedIn: inTitle && inDescription ? 'both' : inTitle ? 'title' : 'description',
      })
    }
    return hits
  }
}

export interface StageBreakdown {
  stage: TaskStage
  label: string
  count: number
}

export interface DashboardSummary {
  projectId: string
  projectName: string
  totalTasks: number
  byStage: StageBreakdown[]
  dueSoon: number
  overdue: number
  /** True when the project genuinely has no tasks — not a zero-metric rendering. */
  isEmpty: boolean
}

const STAGE_ORDER: TaskStage[] = [
  'BACKLOG',
  'IN_PROGRESS',
  'IN_REVIEW',
  'DONE',
]

export class DashboardService {
  constructor(private readonly store: Store) {}

  async forProject(
    actor: Actor,
    projectId: string,
    now: Date = new Date(),
  ): Promise<DashboardSummary> {
    const { project } = await resolveProjectScope(this.store, actor, projectId)
    const tasks = await this.store.tasks.listByProject(projectId)

    const counts = new Map<TaskStage, number>()
    for (const stage of STAGE_ORDER) counts.set(stage, 0)

    let dueSoon = 0
    let overdue = 0
    const soonThreshold = now.getTime() + 7 * 24 * 60 * 60 * 1000

    for (const task of tasks) {
      counts.set(task.stage, (counts.get(task.stage) ?? 0) + 1)
      if (task.dueDate) {
        const due = task.dueDate.getTime()
        // Done tasks are excluded: a completed task's due date is history, not a
        // pending commitment.
        if (task.stage !== 'DONE') {
          if (due < now.getTime()) overdue += 1
          else if (due <= soonThreshold) dueSoon += 1
        }
      }
    }

    return {
      projectId,
      projectName: project.name,
      totalTasks: tasks.length,
      byStage: STAGE_ORDER.map((stage) => ({
        stage,
        label: humanStage(stage),
        count: counts.get(stage) ?? 0,
      })),
      dueSoon,
      overdue,
      isEmpty: tasks.length === 0,
    }
  }
}
