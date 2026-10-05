/**
 * Journey tests — the Phase 0 acceptance criteria that can be exercised in a
 * jsdom environment.
 *
 * Scope note: these verify application behaviour. They do NOT verify
 * NFR-SEC-010, AC-VIS-*, or AC-ACCESS-02 — see the report for why.
 */

import { describe, expect, it } from 'vitest'
import {
  screen,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from '@testing-library/react'
import {
  createWorkspaceThroughUi,
  registerThroughUi,
  renderApp,
} from '../test/harness'

const NEW_USER = {
  displayName: 'Ada Lovelace',
  email: 'ada@example.com',
  password: 'a-good-password',
}

describe('J-01 registration and sign-in', () => {
  it('opens on sign-in', async () => {
    renderApp()
    expect(
      await screen.findByRole('heading', { name: 'Sign in', level: 1 }),
    ).toBeInTheDocument()
  })

  it('reports every empty required field on submit (AC-AUTH-03)', async () => {
    const harness = renderApp()
    await screen.findByRole('heading', { name: 'Sign in', level: 1 })
    await harness.user.click(screen.getByRole('link', { name: 'Create one' }))

    await harness.user.click(
      screen.getByRole('button', { name: 'Create account' }),
    )

    expect(await screen.findByText('Email address is required.')).toBeVisible()
    expect(screen.getByText('Password is required.')).toBeVisible()
    expect(screen.getByText('Display name is required.')).toBeVisible()

    // Each message is associated with its own control (NFR-ACCESS-006).
    expect(screen.getByLabelText('Email address')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(screen.getByLabelText('Password')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })

  it('registers and reaches the zero-workspace state without a reload (AC-AUTH-01)', async () => {
    const harness = renderApp()
    await screen.findByRole('heading', { name: 'Sign in', level: 1 })

    await registerThroughUi(harness, NEW_USER)

    expect(
      await screen.findByRole('heading', {
        name: 'You are not in a workspace yet',
      }),
    ).toBeInTheDocument()
    expect(harness.repository.getSession()).not.toBeNull()
  })

  it('rejects a duplicate email with a field-specific error and no second account (AC-AUTH-02)', async () => {
    const harness = renderApp()
    await screen.findByRole('heading', { name: 'Sign in', level: 1 })
    await registerThroughUi(harness, NEW_USER)
    await screen.findByRole('heading', {
      name: 'You are not in a workspace yet',
    })

    await harness.user.click(screen.getByRole('button', { name: 'Sign out' }))
    await screen.findByRole('heading', { name: 'Sign in', level: 1 })

    await harness.user.click(screen.getByRole('link', { name: 'Create one' }))
    await harness.user.type(screen.getByLabelText('Display name'), 'Impostor')
    await harness.user.type(screen.getByLabelText('Email address'), 'ADA@example.com')
    await harness.user.type(screen.getByLabelText('Password'), 'another-password')
    await harness.user.click(
      screen.getByRole('button', { name: 'Create account' }),
    )

    expect(
      await screen.findByText('An account already exists for this email address.'),
    ).toBeVisible()
    expect(harness.repository.listUsers()).toHaveLength(1)
  })

  it('preserves entered credentials after a failed sign-in and stays generic (AC-AUTH-04)', async () => {
    const harness = renderApp()
    await screen.findByRole('heading', { name: 'Sign in', level: 1 })
    await registerThroughUi(harness, NEW_USER)
    await screen.findByRole('heading', {
      name: 'You are not in a workspace yet',
    })
    await harness.user.click(screen.getByRole('button', { name: 'Sign out' }))
    await screen.findByRole('heading', { name: 'Sign in', level: 1 })

    await harness.user.type(screen.getByLabelText('Email address'), 'ada@example.com')
    await harness.user.type(screen.getByLabelText('Password'), 'wrong-password')
    await harness.user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(
      await screen.findByText('Sign-in failed. Check your email and password.'),
    ).toBeVisible()
    // Input preserved (NFR-ERR-003).
    expect(screen.getByLabelText('Email address')).toHaveValue('ada@example.com')
    expect(screen.getByLabelText('Password')).toHaveValue('wrong-password')
  })

  it('makes a protected view unreachable after sign-out (AC-AUTH-05)', async () => {
    const harness = renderApp()
    await screen.findByRole('heading', { name: 'Sign in', level: 1 })
    await registerThroughUi(harness, NEW_USER)
    await createWorkspaceThroughUi(harness, 'Acme')
    await screen.findByRole('heading', { name: 'Acme', level: 1 })

    await harness.user.click(screen.getByRole('button', { name: 'Sign out' }))

    await screen.findByRole('heading', { name: 'Sign in', level: 1 })
    expect(
      screen.queryByRole('heading', { name: 'Acme', level: 1 }),
    ).not.toBeInTheDocument()
    expect(harness.repository.getSession()).toBeNull()

    // Even if the address is forced back to the protected route, the guard
    // refuses it.
    window.location.hash = '#/workspace'
    await waitFor(() => {
      expect(window.location.hash).toBe('#/sign-in')
    })
    expect(
      screen.queryByRole('heading', { name: 'Acme', level: 1 }),
    ).not.toBeInTheDocument()
  })
})

describe('J-02 zero-workspace state', () => {
  it('uses exactly one h1 and does not skip heading levels', async () => {
    const harness = renderApp()
    await screen.findByRole('heading', { name: 'Sign in', level: 1 })
    await registerThroughUi(harness, NEW_USER)

    // The empty state IS this view's headline (design-system 3.4, NFR-ACCESS-001).
    const levels = await screen
      .findByRole('heading', { name: 'You are not in a workspace yet' })
      .then(() =>
        Array.from(
          document.querySelectorAll('h1, h2, h3, h4, h5, h6'),
        ).map((h) => Number(h.tagName.slice(1))),
      )

    expect(levels.filter((level) => level === 1)).toHaveLength(1)
    expect(levels[0]).toBe(1)
    // No level is skipped on the way down.
    for (let i = 1; i < levels.length; i += 1) {
      expect((levels[i] as number) - (levels[i - 1] as number)).toBeLessThanOrEqual(1)
    }
  })

  it('names both actions and distinguishes the unavailable one (AC-WS-03)', async () => {
    const harness = renderApp()
    await screen.findByRole('heading', { name: 'Sign in', level: 1 })
    await registerThroughUi(harness, NEW_USER)

    // The available action.
    expect(
      await screen.findByRole('button', { name: 'Create a workspace' }),
    ).toBeEnabled()

    // The unavailable action is labelled, not disabled (design-system 6.20
    // rule 5: a dead button is a defect, not a Coming Soon state).
    expect(
      screen.queryByRole('button', { name: /join a workspace/i }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /join a workspace/i })).toBeNull()

    // Status is in text, never colour alone (NFR-ACCESS-008).
    expect(screen.getByText('Coming Soon')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Join a workspace' })).toBeVisible()
    expect(
      screen.getByText(/Invitations are not available yet/i),
    ).toBeVisible()
  })

  it('offers no control that skips the workspace state (FR-WS-005, AC-WS-07)', async () => {
    const harness = renderApp()
    await screen.findByRole('heading', { name: 'Sign in', level: 1 })
    await registerThroughUi(harness, NEW_USER)
    await screen.findByRole('heading', {
      name: 'You are not in a workspace yet',
    })

    // Scoped to the main region so the shell's "Skip to main content" link is
    // not mistaken for a skip control.
    const main = screen.getByRole('main')
    expect(
      within(main).queryByRole('button', { name: /skip|later|continue/i }),
    ).toBeNull()
    expect(
      within(main).queryByRole('link', { name: /skip|later|continue/i }),
    ).toBeNull()
  })

  it('is reachable and identical from a later sign-in (AC-WS-07)', async () => {
    const harness = renderApp()
    await screen.findByRole('heading', { name: 'Sign in', level: 1 })
    await registerThroughUi(harness, NEW_USER)
    await screen.findByRole('heading', {
      name: 'You are not in a workspace yet',
    })

    await harness.user.click(screen.getByRole('button', { name: 'Sign out' }))
    await screen.findByRole('heading', { name: 'Sign in', level: 1 })

    await harness.user.type(screen.getByLabelText('Email address'), NEW_USER.email)
    await harness.user.type(screen.getByLabelText('Password'), NEW_USER.password)
    await harness.user.click(screen.getByRole('button', { name: 'Sign in' }))

    // Exactly the same state, reached by the other route in.
    expect(
      await screen.findByRole('heading', {
        name: 'You are not in a workspace yet',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Create a workspace' }),
    ).toBeEnabled()
    expect(screen.getByText('Coming Soon')).toBeVisible()
  })

  it('distinguishes loading from empty (AC-DATA-07, NFR-STATE-004)', async () => {
    const harness = renderApp({ latencyMs: 80 })
    await screen.findByRole('heading', { name: 'Sign in', level: 1 })
    await registerThroughUi(harness, NEW_USER)

    // A skeleton region is shown while the workspace list is in flight.
    const loading = await screen.findByRole('status', {
      name: 'Loading your workspaces',
    })
    expect(loading).toBeInTheDocument()
    expect(loading.querySelector('.tf-skeleton')).not.toBeNull()

    // It resolves into the empty state, which is never the same thing.
    await waitForElementToBeRemoved(() =>
      screen.queryByRole('status', { name: 'Loading your workspaces' }),
    )
    expect(
      screen.getByRole('heading', { name: 'You are not in a workspace yet' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('status', { name: 'Loading your workspaces' }),
    ).not.toBeInTheDocument()
  })
})

describe('workspace creation and switching', () => {
  it('creates a workspace, becomes owner, and lists it (AC-WS-01, AC-WS-02)', async () => {
    const harness = renderApp()
    await screen.findByRole('heading', { name: 'Sign in', level: 1 })
    await registerThroughUi(harness, NEW_USER)
    await createWorkspaceThroughUi(harness, 'Acme Product Team')

    expect(
      await screen.findByRole('heading', { name: 'Acme Product Team', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByText('Owner')).toBeVisible()
    expect(harness.repository.listMemberships()).toHaveLength(1)
    expect(harness.repository.listMemberships()[0]?.role).toBe('owner')
  })

  it('validates the workspace name on the field', async () => {
    const harness = renderApp()
    await screen.findByRole('heading', { name: 'Sign in', level: 1 })
    await registerThroughUi(harness, NEW_USER)

    await harness.user.click(
      await screen.findByRole('button', { name: 'Create a workspace' }),
    )
    await harness.user.click(
      screen.getByRole('button', { name: 'Create workspace' }),
    )

    expect(await screen.findByText('Workspace name is required.')).toBeVisible()
    // Nothing was presented as created (AC-WS-06).
    expect(
      screen.queryByRole('heading', { name: 'Acme', level: 1 }),
    ).not.toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: 'Create a workspace' }),
    ).toBeInTheDocument()
  })

  it('switches between two workspaces with no invitation involved (AC-WS-08)', async () => {
    const harness = renderApp()
    await screen.findByRole('heading', { name: 'Sign in', level: 1 })
    await registerThroughUi(harness, NEW_USER)
    await createWorkspaceThroughUi(harness, 'First Team')
    await screen.findByRole('heading', { name: 'First Team', level: 1 })

    // A second workspace is created from inside the shell — no invitation.
    await harness.user.click(screen.getByRole('link', { name: 'New workspace' }))
    await harness.user.type(
      await screen.findByLabelText('Workspace name'),
      'Second Team',
    )
    await harness.user.click(
      screen.getByRole('button', { name: 'Create workspace' }),
    )
    await screen.findByRole('heading', { name: 'Second Team', level: 1 })

    // Open the workspace switcher and choose the other workspace.
    await harness.user.click(
      await screen.findByRole('button', { name: /Second Team/ }),
    )
    await screen.findByRole('listbox')
    await waitFor(() => {
      expect(
        screen.getByRole('option', { name: /First Team/ }),
      ).toBeInTheDocument()
    })

    await harness.user.click(screen.getByRole('option', { name: /First Team/ }))

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'First Team', level: 1 }),
      ).toBeInTheDocument()
    })
    expect(
      screen.queryByRole('heading', { name: 'Second Team', level: 1 }),
    ).not.toBeInTheDocument()
  })
})

describe('theming', () => {
  it('switches theme instantly and persists it (AC-THEME-01, AC-THEME-02)', async () => {
    const harness = renderApp()
    await screen.findByRole('heading', { name: 'Sign in', level: 1 })

    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    await harness.user.click(screen.getByRole('button', { name: 'Dark' }))

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(window.localStorage.getItem('taskforge.theme')).toBe('dark')

    await harness.user.click(screen.getByRole('button', { name: 'Light' }))
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('changes presentation only — the same actions remain available (AC-THEME-03)', async () => {
    const harness = renderApp()
    await screen.findByRole('heading', { name: 'Sign in', level: 1 })
    await registerThroughUi(harness, NEW_USER)
    await createWorkspaceThroughUi(harness, 'Acme')
    await screen.findByRole('heading', { name: 'Acme', level: 1 })

    const before = screen.getAllByRole('button').map((b) => b.textContent)

    await harness.user.click(screen.getByRole('button', { name: 'Dark' }))

    const after = screen.getAllByRole('button').map((b) => b.textContent)
    expect(after).toEqual(before)
    expect(
      screen.getByRole('heading', { name: 'Acme', level: 1 }),
    ).toBeInTheDocument()
  })
})

describe('identity', () => {
  it('shows the signed-in identity in the shell (FR-AUTH-007)', async () => {
    const harness = renderApp()
    await screen.findByRole('heading', { name: 'Sign in', level: 1 })
    await registerThroughUi(harness, NEW_USER)
    await createWorkspaceThroughUi(harness, 'Acme')
    await screen.findByRole('heading', { name: 'Acme', level: 1 })

    expect(await screen.findByText(NEW_USER.displayName)).toBeVisible()
    expect(screen.getByText(NEW_USER.email)).toBeVisible()
  })
})
