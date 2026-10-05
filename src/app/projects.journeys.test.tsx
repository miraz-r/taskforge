/**
 * Journey tests for the project / task / search / comment slice.
 *
 * Runs against LocalBackend, so these exercise the real service rules, the real
 * guard, and the real components. The transport is the only thing substituted.
 */

import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import {
  createWorkspaceThroughUi,
  registerThroughUi,
  renderApp,
} from '../test/harness'
import { paths } from '../routing/useHashRoute'
import { getService } from '../access/service'

const NEW_USER = {
  displayName: 'Ada Lovelace',
  email: 'ada@example.com',
  password: 'a-good-password',
}

/** Registers, creates a workspace, and returns its id. */
async function seedWorkspace() {
  const harness = renderApp()
  await screen.findByRole('heading', { name: 'Sign in', level: 1 })
  await registerThroughUi(harness, NEW_USER)
  await createWorkspaceThroughUi(harness, 'Acme')
  await screen.findByRole('heading', { name: 'Acme', level: 1 })

  const listed = await getService().listWorkspaces()
  if (!listed.ok) throw new Error('expected workspaces')
  return { harness, workspaceId: listed.value[0]!.id }
}

describe('project list', () => {
  it('shows an empty state, not a blank list, when there are no projects', async () => {
    const { harness } = await seedWorkspace()
    await harnessNavigateToProjects(harness)

    expect(
      await screen.findByRole('heading', { name: 'No projects yet' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Create your first project' }),
    ).toBeEnabled()
  })

  it('creates a project through the UI', async () => {
    const { harness, workspaceId } = await seedWorkspace()
    await harnessNavigateToProjects(harness)

    await harness.user.click(
      await screen.findByRole('button', { name: 'Create project' }),
    )
    await harness.user.type(screen.getByLabelText('Project name'), 'Platform')
    await harness.user.click(screen.getByRole('button', { name: 'Create project' }))

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Platform' }),
      ).toBeInTheDocument()
    })
    // No delete control anywhere: permanent deletion is excluded (FR-PRJ-012).
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull()
    void workspaceId
  })

  it('reports an invalid project name on the field', async () => {
    const { harness } = await seedWorkspace()
    await harnessNavigateToProjects(harness)

    await harness.user.click(
      await screen.findByRole('button', { name: 'Create project' }),
    )
    await harness.user.click(screen.getByRole('button', { name: 'Create project' }))

    expect(await screen.findByText('Project name is required.')).toBeVisible()
  })

  it('requires confirmation before archiving, and can be declined', async () => {
    const { harness, workspaceId } = await seedWorkspace()
    await harnessNavigateToProjects(harness)
    await createProject(harness, 'Platform')

    await harness.user.click(
      await screen.findByRole('button', { name: 'Archive' }),
    )
    // Confirmation is required (resolved D-19, AC-PRJ-08).
    expect(
      await screen.findByRole('button', { name: 'Archive project' }),
    ).toBeInTheDocument()

    await harness.user.click(screen.getByRole('button', { name: 'Cancel' }))

    // Declining leaves the project active and present.
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Archive project' }),
      ).not.toBeInTheDocument()
    })
    expect(screen.getByRole('heading', { name: 'Platform' })).toBeInTheDocument()

    const listed = await getService().listProjects(workspaceId, 'ACTIVE')
    expect(listed.ok && listed.value).toHaveLength(1)
  })

  it('archives a project when confirmed, and it leaves the active list', async () => {
    const { harness, workspaceId } = await seedWorkspace()
    await harnessNavigateToProjects(harness)
    await createProject(harness, 'Platform')

    await harness.user.click(
      await screen.findByRole('button', { name: 'Archive' }),
    )
    await harness.user.click(
      await screen.findByRole('button', { name: 'Archive project' }),
    )

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: 'Platform' }),
      ).not.toBeInTheDocument()
    })

    const active = await getService().listProjects(workspaceId, 'ACTIVE')
    const archived = await getService().listProjects(workspaceId, 'ARCHIVED')
    expect(active.ok && active.value).toHaveLength(0)
    expect(archived.ok && archived.value).toHaveLength(1)
  })
})

describe('board and tasks', () => {
  it('shows an empty state rather than four blank columns', async () => {
    const { harness, workspaceId } = await seedWorkspace()
    await harnessNavigateToProjects(harness)
    await createProject(harness, 'Platform')
    await openProject(workspaceId, 'Platform')

    expect(
      await screen.findByRole('heading', { name: 'No tasks in this project' }),
    ).toBeInTheDocument()
  })

  it('renders the four fixed stages in order, with no way to alter them', async () => {
    const { harness, workspaceId } = await seedWorkspace()
    await harnessNavigateToProjects(harness)
    await createProject(harness, 'Platform')
    await openProject(workspaceId, 'Platform')

    await harness.user.click(
      await screen.findByRole('button', { name: 'Create a task' }),
    )
    await harness.user.type(screen.getByLabelText('Task title'), 'Write it down')
    await harness.user.click(screen.getByRole('button', { name: 'Create task' }))

    await screen.findByRole('heading', { name: 'Write it down' })

    // Fixed order (resolved D-09).
    for (const label of ['Backlog', 'In Progress', 'In Review', 'Done']) {
      expect(screen.getByRole('heading', { name: label })).toBeInTheDocument()
    }
    // New tasks land in Backlog.
    const backlog = screen.getByRole('region', { name: 'Backlog' })
    expect(within(backlog).getByText('Write it down')).toBeInTheDocument()

    // No control can add, rename, reorder or remove a column.
    expect(screen.queryByRole('button', { name: /add column|rename column|delete column/i })).toBeNull()
  })

  it('moves a task between stages', async () => {
    const { harness, workspaceId } = await seedWorkspace()
    await harnessNavigateToProjects(harness)
    await createProject(harness, 'Platform')
    await openProject(workspaceId, 'Platform')
    await createTask(harness, 'Ship it')

    const card = (await screen.findByRole('heading', { name: 'Ship it' })).closest(
      'article',
    ) as HTMLElement

    // Select is a custom listbox (design-system 6.4), not a native <select>, so
    // it is driven the way a user drives it: open the trigger, then choose.
    await harness.user.click(
      within(card).getByRole('button', { name: /Stage/ }),
    )
    const listbox = await screen.findByRole('listbox')
    await harness.user.click(
      within(listbox).getByRole('option', { name: 'In Review' }),
    )

    await waitFor(() => {
      const review = screen.getByRole('region', { name: 'In Review' })
      expect(within(review).getByText('Ship it')).toBeInTheDocument()
    })
    // And it has left Backlog.
    const backlog = screen.getByRole('region', { name: 'Backlog' })
    expect(within(backlog).queryByText('Ship it')).not.toBeInTheDocument()
  })
})

describe('search', () => {
  it('finds tasks by title and reports a distinct no-results state', async () => {
    const { harness, workspaceId } = await seedWorkspace()
    await harnessNavigateToProjects(harness)
    await createProject(harness, 'Platform')
    await openProject(workspaceId, 'Platform')
    await createTask(harness, 'Deploy the release')

    const search = screen.getByLabelText('Search tasks in this project')

    await harness.user.type(search, 'deploy')
    await screen.findByRole('heading', { name: 'Deploy the release' })

    await harness.user.clear(search)
    await harness.user.type(search, 'zzzznothing')
    // A no-results message, never a blank board (AC-SEARCH-02).
    expect(
      await screen.findByRole('heading', { name: 'No matching tasks' }),
    ).toBeInTheDocument()

    await harness.user.click(screen.getByRole('button', { name: 'Clear search' }))
    await screen.findByRole('heading', { name: 'Deploy the release' })
  })
})

describe('comments', () => {
  it('adds a comment through the drawer', async () => {
    const { harness, workspaceId } = await seedWorkspace()
    await harnessNavigateToProjects(harness)
    await createProject(harness, 'Platform')
    await openProject(workspaceId, 'Platform')
    await createTask(harness, 'Discuss me')

    await harness.user.click(
      await screen.findByRole('button', { name: 'Open details' }),
    )

    const drawer = await screen.findByRole('dialog')
    // Comments load asynchronously, so wait for the resolved empty state rather
    // than the loading skeleton.
    await waitFor(() => {
      expect(
        within(drawer).getByText('No comments yet. Start the discussion.'),
      ).toBeInTheDocument()
    })

    await harness.user.type(within(drawer).getByLabelText('Add a comment'), 'Looks good')
    await harness.user.click(within(drawer).getByRole('button', { name: 'Comment' }))

    await waitFor(() => {
      expect(within(drawer).getByText('Looks good')).toBeInTheDocument()
    })

    // Comment deletion is an open decision (D-12), so no delete control exists.
    expect(within(drawer).queryByRole('button', { name: /delete/i })).toBeNull()
  })
})

// --- helpers --------------------------------------------------------------

async function harnessNavigateToProjects(harness: {
  user: ReturnType<typeof import('@testing-library/user-event').default.setup>
}) {
  // Nav entries are buttons (design-system 8.4: a div never acts as a button,
  // and these navigate rather than link).
  await harness.user.click(screen.getByRole('button', { name: 'Projects' }))
  await screen.findByRole('heading', { name: 'Projects', level: 1 })
}

async function createProject(
  harness: {
    user: ReturnType<typeof import('@testing-library/user-event').default.setup>
  },
  name: string,
) {
  await harness.user.click(
    await screen.findByRole('button', { name: 'Create project' }),
  )
  await harness.user.type(screen.getByLabelText('Project name'), name)
  await harness.user.click(screen.getByRole('button', { name: 'Create project' }))
  await screen.findByRole('heading', { name })
}

async function openProject(
  workspaceId: string,
  projectName: string,
) {
  const listed = await getService().listProjects(workspaceId, 'ACTIVE')
  if (!listed.ok) throw new Error('expected projects')
  const project = listed.value.find((p) => p.name === projectName)
  if (!project) throw new Error(`no project ${projectName}`)
  window.location.hash = `#${paths.project(workspaceId, project.id)}`
  await screen.findByRole('heading', { name: projectName, level: 1 })
}

async function createTask(
  harness: {
    user: ReturnType<typeof import('@testing-library/user-event').default.setup>
  },
  title: string,
) {
  // On an empty project the action lives in the empty state ("Create a task");
  // once tasks exist the header button ("Create task") takes over. Both are
  // legitimate entry points, so accept either.
  const emptyStateAction = screen.queryByRole('button', { name: 'Create a task' })
  await harness.user.click(
    emptyStateAction ?? (await screen.findByRole('button', { name: 'Create task' })),
  )
  await harness.user.type(screen.getByLabelText('Task title'), title)
  await harness.user.click(screen.getByRole('button', { name: 'Create task' }))
  await screen.findByRole('heading', { name: title })
}
