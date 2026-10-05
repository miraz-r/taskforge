/**
 * Service tests — FR-AUTH-002..005, FR-WS-001, FR-WS-004.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { TaskForgeService } from './service'
import { LocalBackend } from '../data/localBackend'

const CREDENTIALS = {
  email: 'Ada@Example.com',
  password: 'a-good-password',
  displayName: 'Ada Lovelace',
}

function build() {
  const backend = new LocalBackend({ latencyMs: 0 })
  return { repository: backend.store, service: new TaskForgeService(backend) }
}

describe('register', () => {
  let ctx: ReturnType<typeof build>
  beforeEach(() => {
    ctx = build()
  })

  it('creates an account, normalises the email, and starts a session', async () => {
    const result = await ctx.service.register(CREDENTIALS)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value.email).toBe('ada@example.com')
    expect(result.value.displayName).toBe('Ada Lovelace')
    // The plaintext password is nowhere in the stored record.
    expect(JSON.stringify(result.value)).not.toContain(CREDENTIALS.password)
    expect(ctx.repository.getSession()?.userId).toBe(result.value.id)
  })

  it('reports each empty required field by name (AC-AUTH-03)', async () => {
    const result = await ctx.service.register({
      email: '',
      password: '',
      displayName: '',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.fieldErrors.email).toBe('Email address is required.')
    expect(result.error.fieldErrors.password).toBe('Password is required.')
    expect(result.error.fieldErrors.displayName).toBe('Display name is required.')
  })

  it('rejects a malformed email address', async () => {
    for (const email of ['nope', 'a@b', 'a b@example.com', 'a@@b.com']) {
      const result = await ctx.service.register({ ...CREDENTIALS, email })
      expect(result.ok).toBe(false)
      if (result.ok) continue
      expect(result.error.fieldErrors.email).toMatch(/format name@example\.com/)
    }
  })

  it('rejects a short password', async () => {
    const result = await ctx.service.register({
      ...CREDENTIALS,
      password: 'short',
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.fieldErrors.password).toBe(
      'Password must be at least 8 characters.',
    )
  })

  it('refuses a duplicate email and creates no second account (AC-AUTH-02)', async () => {
    await ctx.service.register(CREDENTIALS)
    const before = ctx.repository.listUsers().length

    const result = await ctx.service.register({
      ...CREDENTIALS,
      displayName: 'Someone Else',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.fieldErrors.email).toBe(
      'An account already exists for this email address.',
    )
    expect(ctx.repository.listUsers()).toHaveLength(before)
  })

  it('treats email uniqueness case-insensitively', async () => {
    await ctx.service.register(CREDENTIALS)
    const result = await ctx.service.register({
      ...CREDENTIALS,
      email: 'ADA@EXAMPLE.COM',
    })
    expect(result.ok).toBe(false)
  })
})

describe('signIn', () => {
  let ctx: ReturnType<typeof build>
  beforeEach(() => {
    ctx = build()
  })

  it('signs in with correct credentials and starts a session', async () => {
    await ctx.service.register(CREDENTIALS)
    await ctx.service.signOut()

    const result = await ctx.service.signIn({
      email: 'ada@example.com',
      password: CREDENTIALS.password,
    })

    expect(result.ok).toBe(true)
    expect(ctx.repository.getSession()).not.toBeNull()
  })

  it('fails generically for a wrong password without disclosing existence', async () => {
    await ctx.service.register(CREDENTIALS)
    // End the registration session, so the only thing that could leave a
    // session behind is a successful sign-in.
    await ctx.service.signOut()

    const result = await ctx.service.signIn({
      email: 'ada@example.com',
      password: 'wrong-password',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.formError).toBe(
      'Sign-in failed. Check your email and password.',
    )
    expect(ctx.repository.getSession()).toBeNull()
  })

  it('returns the identical message for an unknown account', async () => {
    const unknown = await ctx.service.signIn({
      email: 'nobody@example.com',
      password: 'whatever-123',
    })
    await ctx.service.register(CREDENTIALS)
    const wrongPassword = await ctx.service.signIn({
      email: 'ada@example.com',
      password: 'whatever-123',
    })

    expect(unknown.ok).toBe(false)
    expect(wrongPassword.ok).toBe(false)
    if (unknown.ok || wrongPassword.ok) return
    // Identical wording: sign-in must not reveal whether the account exists.
    expect(unknown.error.formError).toBe(wrongPassword.error.formError)
  })

  it('reports empty fields individually', async () => {
    const result = await ctx.service.signIn({ email: '', password: '' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.fieldErrors.email).toBe('Email address is required.')
    expect(result.error.fieldErrors.password).toBe('Password is required.')
  })
})

describe('signOut', () => {
  it('ends the session so no protected read succeeds', async () => {
    const { service, repository } = build()
    await service.register(CREDENTIALS)

    await expect(service.currentUser()).resolves.not.toBeNull()

    const result = await service.signOut()
    expect(result.ok).toBe(true)
    expect(repository.getSession()).toBeNull()
    await expect(service.currentUser()).resolves.toBeNull()
  })
})

describe('createWorkspace', () => {
  let ctx: ReturnType<typeof build>
  beforeEach(() => {
    ctx = build()
  })

  it('makes the creator the owner and lists it (AC-WS-01, AC-WS-02)', async () => {
    await ctx.service.register(CREDENTIALS)

    const created = await ctx.service.createWorkspace('Acme Product Team')
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(created.value.ownerId).toBeTruthy()
    expect(created.value.id).toMatch(/^wsp_/)

    const listed = await ctx.service.listWorkspaces()
    expect(listed.ok).toBe(true)
    if (!listed.ok) return
    expect(listed.value.map((w) => w.name)).toEqual([
      'Acme Product Team',
    ])
  })

  it('trims the name', async () => {
    await ctx.service.register(CREDENTIALS)
    const created = await ctx.service.createWorkspace('  Acme  ')
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(created.value.name).toBe('Acme')
  })

  it('rejects an empty or over-long name', async () => {
    await ctx.service.register(CREDENTIALS)

    const empty = await ctx.service.createWorkspace('   ')
    expect(empty.ok).toBe(false)
    if (!empty.ok) {
      expect(empty.error.fieldErrors.name).toBe('Workspace name is required.')
    }

    const long = await ctx.service.createWorkspace('x'.repeat(61))
    expect(long.ok).toBe(false)
    if (!long.ok) {
      expect(long.error.fieldErrors.name).toBe(
        'Workspace name must be 60 characters or fewer.',
      )
    }

    // Nothing was persisted by either rejected attempt.
    const listed = await ctx.service.listWorkspaces()
    expect(listed.ok && listed.value).toHaveLength(0)
  })

  it('supports a second workspace so switching is exercisable (AC-WS-08)', async () => {
    await ctx.service.register(CREDENTIALS)
    await ctx.service.createWorkspace('First')
    await ctx.service.createWorkspace('Second')

    const listed = await ctx.service.listWorkspaces()
    expect(listed.ok).toBe(true)
    if (!listed.ok) return
    expect(listed.value).toHaveLength(2)
    // No invitation was involved anywhere in that flow.
    expect(new Set(listed.value.map((w) => w.ownerId)).size).toBe(1)
  })

  it('does not list another user’s workspace (AC-WS-04)', async () => {
    await ctx.service.register(CREDENTIALS)
    await ctx.service.createWorkspace('Ada Team')

    await ctx.service.signOut()
    await ctx.service.register({
      email: 'bob@example.com',
      password: 'a-good-password',
      displayName: 'Bob',
    })
    await ctx.service.createWorkspace('Bob Team')

    const listed = await ctx.service.listWorkspaces()
    expect(listed.ok).toBe(true)
    if (!listed.ok) return
    expect(listed.value.map((w) => w.name)).toEqual(['Bob Team'])
  })
})
