/**
 * Journey tests: dashboard, archived projects, task editing, profile.
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

type Ui = ReturnType<typeof import('@testing-library/user-event').default.setup>

async function seed() {
  const harness = renderApp()
  await screen.findByRole('heading', { name: 'Sign in', level: 1 })
  await registerThroughUi(harness, NEW_USER)
  await createWorkspaceThroughUi(harness, 'Acme')
  await screen.findByRole('heading', { name: 'Acme', level: 1 })
  const listed = await getService().listWorkspaces()
  if (!listed.ok) throw new Error('expected a workspace')
  return { harness, workspaceId: listed.value[0]!.id }
}

async function makeProject(ui: Ui, name: string) {
  await ui.click(screen.getByRole('button', { name: 'Projects' }))
  await screen.findByRole('heading', { name: 'Projects', level: 1 })
  await ui.click(await screen.findByRole('button', { name: 'Create project' }))
  await ui.type(screen.getByLabelText('Project name'), name)
  await ui.click(screen.getByRole('button', { name: 'Create project' }))
  await screen.findByRole('heading', { name })
}

async function openProject(workspaceId: string, name: string) {
  const listed = await getService().listProjects(workspaceId, 'ACTIVE')
  if (!listed.ok) throw new Error('expected projects')
  const project = listed.value.find((p) => p.name === name)
  if (!project) throw new Error(`no project ${name}`)
  window.location.hash = `#${paths.project(workspaceId, project.id)}`
  await screen.findByRole('heading', { name, level: 1 })
  return project.id
}

async function makeTask(ui: Ui, title: string) {
  await ui.click(await screen.findByRole('button', { name: 'Create a task' }))
  await ui.type(screen.getByLabelText('Task title'), title)
  await ui.click(screen.getByRole('button', { name: 'Create task' }))
  await screen.findByRole('heading', { name: title })
}

// --- dashboard -----------------------------------------------------------

describe('stage distribution (FR-DASH)', () => {
  it('shows an explicit empty state for a project with no tasks (AC-DASH-03)', async () => {
    const { harness, workspaceId } = await seed()
    await makeProject(harness.user, 'Platform')
    await openProject(workspaceId, 'Platform')

    expect(
      await screen.findByRole('heading', { name: 'No progress to show yet' }),
    ).toBeInTheDocument()
    // No misleading zero figure anywhere.
    expect(screen.queryByText(/0%/)).not.toBeInTheDocument()
  })

  it('counts real tasks by stage and labels them as derived', async () => {
    const { harness, workspaceId } = await seed()
    await makeProject(harness.user, 'Platform')
    await openProject(workspaceId, 'Platform')
    await makeTask(harness.user, 'First task')

    const panel = await screen.findByRole('region', { name: 'Tasks by stage' })
    expect(within(panel).getByText(/Counted from 1 task/)).toBeInTheDocument()

    // AC-DASH-01: moving a task changes the indicator.
    const card = screen.getByRole('heading', { name: 'First task' }).closest(
      'article',
    ) as HTMLElement
    await harness.user.click(
      within(card).getByRole('button', { name: /Stage/ }),
    )
    const listbox = await screen.findByRole('listbox')
    await harness.user.click(
      within(listbox).getByRole('option', { name: 'Done' }),
    )

    await waitFor(() => {
      expect(
        screen.getByText(/Counted from 1 task/),
      ).toBeInTheDocument()
    })
    const doneRow = screen.getByRole('img', { name: 'Done: 1 of 1 tasks' })
    expect(doneRow).toBeInTheDocument()
  })

  it('routes from an indicator into the tasks behind it (AC-DASH-05)', async () => {
    const { harness, workspaceId } = await seed()
    await makeProject(harness.user, 'Platform')
    await openProject(workspaceId, 'Platform')
    await makeTask(harness.user, 'Only task')

    const panel = await screen.findByRole('region', { name: 'Tasks by stage' })
    await harness.user.click(
      within(panel).getByRole('button', { name: 'Show Backlog tasks' }),
    )

    expect(await screen.findByText(/Showing Backlog tasks/)).toBeInTheDocument()
    await harness.user.click(screen.getByRole('button', { name: 'Show the whole board' }))
    await waitFor(() => {
      expect(screen.queryByText(/Showing Backlog tasks/)).not.toBeInTheDocument()
    })
  })
})

// --- archived projects ---------------------------------------------------

describe('archived projects (FR-PRJ-010)', () => {
  it('has an empty state when nothing is archived', async () => {
    const { harness } = await seed()
    await harness.user.click(screen.getByRole('button', { name: 'Archived' }))

    expect(
      await screen.findByRole('heading', { name: 'Nothing archived' }),
    ).toBeInTheDocument()
  })

  it('moves an archived project to the archived view and back', async () => {
    const { harness, workspaceId } = await seed()
    await makeProject(harness.user, 'Retired work')

    await harness.user.click(await screen.findByRole('button', { name: 'Archive' }))
    await harness.user.click(
      await screen.findByRole('button', { name: 'Archive project' }),
    )
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: 'Retired work' }),
      ).not.toBeInTheDocument()
    })

    // FR-DASH-002: excluded from the active list.
    const active = await getService().listProjects(workspaceId, 'ACTIVE')
    expect(active.ok && active.value).toHaveLength(0)

    await harness.user.click(screen.getByRole('button', { name: 'Archived' }))
    expect(
      await screen.findByRole('heading', { name: 'Retired work' }),
    ).toBeInTheDocument()
    // Scoped to main: "Archived" is also the sidebar nav label.
    const main = screen.getByRole('main')
    expect(within(main).getByText('Archived')).toBeInTheDocument()

    await harness.user.click(screen.getByRole('button', { name: 'Restore' }))
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: 'Retired work' }),
      ).not.toBeInTheDocument()
    })

    const restored = await getService().listProjects(workspaceId, 'ACTIVE')
    expect(restored.ok && restored.value).toHaveLength(1)
  })

  it('exposes no permanent deletion control', async () => {
    const { harness } = await seed()
    await makeProject(harness.user, 'Retired work')
    await harness.user.click(await screen.findByRole('button', { name: 'Archive' }))
    await harness.user.click(
      await screen.findByRole('button', { name: 'Archive project' }),
    )
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument()
    })
    await harness.user.click(screen.getByRole('button', { name: 'Archived' }))
    await screen.findByRole('heading', { name: 'Retired work' })

    expect(
      screen.queryByRole('button', { name: /delete|permanent/i }),
    ).not.toBeInTheDocument()
  })
})

// --- task editing --------------------------------------------------------

describe('task due date and assignee (FR-TASK-007/008/009)', () => {
  it('saves a due date and shows it as explicitly unset when cleared', async () => {
    const { harness, workspaceId } = await seed()
    await makeProject(harness.user, 'Platform')
    await openProject(workspaceId, 'Platform')
    await makeTask(harness.user, 'Deadline task')

    await harness.user.click(await screen.findByRole('button', { name: 'Open details' }))
    await screen.findByRole('dialog')

    await harness.user.type(screen.getByLabelText('Due date'), '2026-12-24')
    await harness.user.click(screen.getByRole('button', { name: 'Save changes' }))
    // Re-queried from the document, not from a captured node: a detached
    // element can still satisfy `within(...)`, which would let a confirmation
    // that was unmounted before anyone could see it pass.
    const saved = await screen.findByText('Saved')
    expect(saved).toBeVisible()
    // The drawer survived the refresh that follows the save.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Due date')).toHaveValue('2026-12-24')

    const projects = await getService().listProjects(workspaceId, 'ACTIVE')
    if (!projects.ok) throw new Error('expected projects')
    const tasks = await getService().listTasks(projects.value[0]!.id)
    expect(tasks.ok && tasks.value[0]?.dueDate).toContain('2026-12-24')

    // Clearing returns it to explicitly unset.
    await harness.user.clear(screen.getByLabelText('Due date'))
    await harness.user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => {
      expect(screen.getByText(/No due date set/)).toBeInTheDocument()
    })
    const cleared = await getService().listTasks(projects.value[0]!.id)
    expect(cleared.ok && cleared.value[0]?.dueDate).toBeNull()
  })

  it('offers only the current user and Unassigned, and can clear the assignee', async () => {
    const { harness, workspaceId } = await seed()
    await makeProject(harness.user, 'Platform')
    await openProject(workspaceId, 'Platform')
    await makeTask(harness.user, 'Assignable task')

    await harness.user.click(await screen.findByRole('button', { name: 'Open details' }))
    await screen.findByRole('dialog')

    await harness.user.click(screen.getByRole('button', { name: /Assignee/ }))
    const listbox = await screen.findByRole('listbox')
    // FR-TASK-007 with no other members: only the current user, plus
    // FR-TASK-008's explicit unassigned state.
    const options = within(listbox)
      .getAllByRole('option')
      .map((option) => option.textContent?.trim())
    expect(options).toEqual(['Unassigned', 'Ada Lovelace (you)'])

    await harness.user.click(
      within(listbox).getByRole('option', { name: 'Ada Lovelace (you)' }),
    )
    await waitFor(() => {
      expect(screen.getByText('Assigned to you.')).toBeInTheDocument()
    })

    await harness.user.click(screen.getByRole('button', { name: /Assignee/ }))
    const listbox2 = await screen.findByRole('listbox')
    await harness.user.click(
      within(listbox2).getByRole('option', { name: 'Unassigned' }),
    )
    await waitFor(() => {
      expect(screen.getByText('Unassigned.')).toBeInTheDocument()
    })

    // Persisted, not just reflected in local state.
    const projects = await getService().listProjects(workspaceId, 'ACTIVE')
    if (!projects.ok) throw new Error('expected projects')
    const tasks = await getService().listTasks(projects.value[0]!.id)
    expect(tasks.ok && tasks.value[0]?.assigneeId).toBeNull()
  })
})

// --- profile -------------------------------------------------------------

describe('profile (FR-AUTH-008, AC-AUTH-06)', () => {
  it('edits the display name and reflects it in the shell without a reload', async () => {
    const { harness } = await seed()
    await harness.user.click(screen.getByRole('button', { name: 'Profile' }))
    await screen.findByRole('heading', { name: 'Your profile', level: 1 })

    const field = screen.getByLabelText('Display name')
    await harness.user.clear(field)
    await harness.user.type(field, 'Ada King')
    await harness.user.click(screen.getByRole('button', { name: 'Save changes' }))

    await screen.findByText('Profile updated')
    // The shell, not just the form, shows the new name.
    const sidebar = screen.getByRole('complementary', { name: 'Workspace' })
    expect(within(sidebar).getByText('Ada King')).toBeInTheDocument()
    expect(within(sidebar).queryByText('Ada Lovelace')).not.toBeInTheDocument()
  })

  it('reports an invalid display name on the field', async () => {
    const { harness } = await seed()
    await harness.user.click(screen.getByRole('button', { name: 'Profile' }))
    await screen.findByRole('heading', { name: 'Your profile', level: 1 })

    await harness.user.clear(screen.getByLabelText('Display name'))
    await harness.user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Display name is required.')).toBeVisible()
  })

  it('makes the email read-only and defers the avatar honestly', async () => {
    const { harness } = await seed()
    await harness.user.click(screen.getByRole('button', { name: 'Profile' }))
    await screen.findByRole('heading', { name: 'Your profile', level: 1 })

    expect(screen.getByLabelText('Email address')).toBeDisabled()
    expect(screen.getByText('Coming Soon')).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'Profile photo' }),
    ).toBeInTheDocument()
    // No operable control inside the deferred surface.
    expect(
      screen.queryByRole('button', { name: /upload|choose|change photo/i }),
    ).not.toBeInTheDocument()
  })
})
