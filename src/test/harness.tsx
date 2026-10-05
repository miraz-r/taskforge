/**
 * Test harness.
 *
 * Every test gets an isolated in-memory repository with zero simulated latency,
 * so assertions are deterministic and no test can observe another test's data.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'
import { App } from '../App'
import { AppProvider } from '../app/AppProvider'
import { TaskForgeService, setService } from '../access/service'
import { LocalBackend } from '../data/localBackend'

export interface Harness {
  service: TaskForgeService
  backend: LocalBackend
  /** What the service actually persisted, for assertions. */
  repository: LocalBackend['store']
  user: UserEvent
}

export function createService(latencyMs = 0): Harness {
  const backend = new LocalBackend({ latencyMs })
  const service = new TaskForgeService(backend)
  setService(service)
  return { service, backend, repository: backend.store, user: userEvent.setup() }
}

/** Mounts the whole application against a fresh, isolated repository. */
export function renderApp(options?: { latencyMs?: number }): Harness {
  const harness = createService(options?.latencyMs ?? 0)

  window.localStorage.clear()
  window.location.hash = ''

  render(
    <AppProvider>
      <App />
    </AppProvider>,
  )

  return harness
}

/** Signs up through the interface and lands on the zero-workspace state. */
export async function registerThroughUi(
  harness: Harness,
  values: { displayName: string; email: string; password: string },
): Promise<void> {
  await harness.user.click(screen.getByRole('link', { name: 'Create one' }))
  await harness.user.type(
    screen.getByLabelText('Display name'),
    values.displayName,
  )
  await harness.user.type(screen.getByLabelText('Email address'), values.email)
  await harness.user.type(screen.getByLabelText('Password'), values.password)
  await harness.user.click(
    screen.getByRole('button', { name: 'Create account' }),
  )
}

/** Creates a workspace from the zero-workspace state. */
export async function createWorkspaceThroughUi(
  harness: Harness,
  name: string,
): Promise<void> {
  // Wait for the zero-workspace state: registration is async, so the action may
  // not be on screen the instant the form submit resolves.
  await harness.user.click(
    await screen.findByRole('button', { name: 'Create a workspace' }),
  )
  await harness.user.type(
    await screen.findByLabelText('Workspace name'),
    name,
  )
  await harness.user.click(
    screen.getByRole('button', { name: 'Create workspace' }),
  )
}
