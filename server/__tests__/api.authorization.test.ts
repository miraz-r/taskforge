/**
 * Two-user workspace isolation and forged-identifier tests. NFR-SEC-010.
 *
 * These drive the real HTTP API with two real sessions against separate users'
 * data. Every case changes an identifier in the request to something the caller
 * does not own and asserts refusal.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { startTestServer, VALID_PASSWORD, type TestClient, type TestContext } from './support'

let ctx: TestContext

beforeEach(async () => {
  ctx = await startTestServer()
})
afterEach(async () => {
  await ctx.close()
})

async function makeUser(email: string): Promise<{ client: TestClient; userId: string }> {
  const client = ctx.client()
  await client.register({ email, password: VALID_PASSWORD, displayName: email.split('@')[0] })
  const session = await client.get<{ user: { id: string } }>('/api/auth/session')
  return { client, userId: session.body.user.id }
}

async function makeWorkspace(client: TestClient, name: string): Promise<string> {
  const result = await client.post<{ workspace: { id: string } }>('/api/workspaces', { name })
  expect(result.status).toBe(201)
  return result.body.workspace.id
}

describe('workspace listing isolation (AC-WS-04)', () => {
  it('lists only the caller’s workspaces', async () => {
    const ada = await makeUser('ada@example.com')
    const bob = await makeUser('bob@example.com')

    await makeWorkspace(ada.client, 'Ada Team')
    await makeWorkspace(ada.client, 'Ada Second')
    await makeWorkspace(bob.client, 'Bob Team')

    const bobList = await bob.client.get<{ workspaces: Array<{ name: string }> }>(
      '/api/workspaces',
    )
    expect(bobList.status).toBe(200)
    expect(bobList.body.workspaces.map((w) => w.name)).toEqual(['Bob Team'])

    const adaList = await ada.client.get<{ workspaces: Array<{ name: string }> }>(
      '/api/workspaces',
    )
    expect(adaList.body.workspaces.map((w) => w.name).sort()).toEqual([
      'Ada Second',
      'Ada Team',
    ])
  })

  it('reports the owner’s workspace count and the ceiling', async () => {
    const ada = await makeUser('ada@example.com')
    const result = await ada.client.get<{ owned: number; limit: number }>('/api/workspaces')
    expect(result.body.owned).toBe(0)
    expect(result.body.limit).toBe(2)
  })
})

describe('workspace ceiling', () => {
  it('refuses a third workspace with a 422', async () => {
    const ada = await makeUser('ada@example.com')
    await makeWorkspace(ada.client, 'One')
    await makeWorkspace(ada.client, 'Two')

    const third = await ada.client.post<{ error: { code: string; message: string } }>(
      '/api/workspaces',
      { name: 'Three' },
    )
    expect(third.status).toBe(422)
    expect(third.body.error.code).toBe('limit_reached')
    expect(third.body.error.message).toContain('2 workspaces')
  })
})

describe('forged workspace identifiers', () => {
  it('refuses project listing for another user’s workspace', async () => {
    const ada = await makeUser('ada@example.com')
    const bob = await makeUser('bob@example.com')
    const adaWorkspace = await makeWorkspace(ada.client, 'Ada Team')

    const attempt = await bob.client.get<{ error: { code: string; message: string } }>(
      `/api/workspaces/${adaWorkspace}/projects`,
    )
    expect(attempt.status).toBe(403)
    expect(attempt.body.error.code).toBe('forbidden')
  })

  it('refuses project creation in another user’s workspace', async () => {
    const ada = await makeUser('ada@example.com')
    const bob = await makeUser('bob@example.com')
    const adaWorkspace = await makeWorkspace(ada.client, 'Ada Team')

    const attempt = await bob.client.post<{ error: { code: string } }>(
      `/api/workspaces/${adaWorkspace}/projects`,
      { name: 'Intruder Project' },
    )
    expect(attempt.status).toBe(403)
  })

  it('refuses a direct read of another user’s project by id', async () => {
    const ada = await makeUser('ada@example.com')
    const bob = await makeUser('bob@example.com')
    const adaWorkspace = await makeWorkspace(ada.client, 'Ada Team')

    const created = await ada.client.post<{ project: { id: string } }>(
      `/api/workspaces/${adaWorkspace}/projects`,
      { name: 'Secret Project' },
    )
    const projectId = created.body.project.id

    const attempt = await bob.client.get<{ error: { code: string } }>(
      `/api/projects/${projectId}`,
    )
    expect(attempt.status).toBe(403)
  })

  it('returns identical wording for a missing id and a foreign id', async () => {
    const ada = await makeUser('ada@example.com')
    const bob = await makeUser('bob@example.com')
    const adaWorkspace = await makeWorkspace(ada.client, 'Ada Team')
    const created = await ada.client.post<{ project: { id: string } }>(
      `/api/workspaces/${adaWorkspace}/projects`,
      { name: 'Secret Project' },
    )

    const foreign = await bob.client.get<{ error: { message: string; code: string } }>(
      `/api/projects/${created.body.project.id}`,
    )
    const absent = await bob.client.get<{ error: { message: string; code: string } }>(
      '/api/projects/prj_does_not_exist',
    )

    expect(foreign.status).toBe(403)
    expect(absent.status).toBe(403)
    // Byte-identical: the API cannot be used to test whether an id exists.
    expect(JSON.stringify(absent.body)).toBe(JSON.stringify(foreign.body))
  })

  it('refuses archiving another user’s project', async () => {
    const ada = await makeUser('ada@example.com')
    const bob = await makeUser('bob@example.com')
    const adaWorkspace = await makeWorkspace(ada.client, 'Ada Team')
    const created = await ada.client.post<{ project: { id: string } }>(
      `/api/workspaces/${adaWorkspace}/projects`,
      { name: 'Secret Project' },
    )

    const attempt = await bob.client.post<{ error: { code: string } }>(
      `/api/projects/${created.body.project.id}/archive`,
    )
    expect(attempt.status).toBe(403)

    // And the project is untouched.
    const check = await ada.client.get<{ project: { state: string } }>(
      `/api/projects/${created.body.project.id}`,
    )
    expect(check.body.project.state).toBe('ACTIVE')
  })
})

describe('task and comment authorization', () => {
  it('refuses task listing for another user’s project', async () => {
    const ada = await makeUser('ada@example.com')
    const bob = await makeUser('bob@example.com')
    const ws = await makeWorkspace(ada.client, 'Ada Team')
    const project = await ada.client.post<{ project: { id: string } }>(
      `/api/workspaces/${ws}/projects`,
      { name: 'Secret' },
    )
    const attempt = await bob.client.get<{ error: { code: string } }>(
      `/api/projects/${project.body.project.id}/tasks`,
    )
    expect(attempt.status).toBe(403)
  })

  it('refuses a comment on another user’s task', async () => {
    const ada = await makeUser('ada@example.com')
    const bob = await makeUser('bob@example.com')
    const ws = await makeWorkspace(ada.client, 'Ada Team')
    const project = await ada.client.post<{ project: { id: string } }>(
      `/api/workspaces/${ws}/projects`,
      { name: 'Secret' },
    )
    const task = await ada.client.post<{ task: { id: string } }>(
      `/api/projects/${project.body.project.id}/tasks`,
      { title: 'Private task' },
    )

    const attempt = await bob.client.post<{ error: { code: string } }>(
      `/api/tasks/${task.body.task.id}/comments`,
      { body: 'intruding' },
    )
    expect(attempt.status).toBe(403)

    const comments = await ada.client.get<{ comments: unknown[] }>(
      `/api/tasks/${task.body.task.id}/comments`,
    )
    expect(comments.body.comments).toHaveLength(0)
  })

  it('refuses search and dashboard in another user’s project', async () => {
    const ada = await makeUser('ada@example.com')
    const bob = await makeUser('bob@example.com')
    const ws = await makeWorkspace(ada.client, 'Ada Team')
    const project = await ada.client.post<{ project: { id: string } }>(
      `/api/workspaces/${ws}/projects`,
      { name: 'Secret' },
    )
    const id = project.body.project.id

    expect((await bob.client.get(`/api/projects/${id}/search?q=secret`)).status).toBe(403)
    expect((await bob.client.get(`/api/projects/${id}/dashboard`)).status).toBe(403)
  })
})

describe('no invitation or membership surface', () => {
  it('exposes no route that adds a member to a workspace', async () => {
    const ada = await makeUser('ada@example.com')
    const ws = await makeWorkspace(ada.client, 'Ada Team')

    for (const path of [
      `/api/workspaces/${ws}/members`,
      `/api/workspaces/${ws}/invite`,
      `/api/workspaces/${ws}/invitations`,
      `/api/memberships`,
    ]) {
      const result = await ada.client.post(`/api${path.replace('/api', '')}`, {
        email: 'bob@example.com',
      })
      // 404 (or 405): the route does not exist. Never a success.
      expect([404, 405]).toContain(result.status)
    }
  })

  it('exposes no permanent project deletion', async () => {
    const ada = await makeUser('ada@example.com')
    const ws = await makeWorkspace(ada.client, 'Ada Team')
    const project = await ada.client.post<{ project: { id: string } }>(
      `/api/workspaces/${ws}/projects`,
      { name: 'Keep me' },
    )
    const id = project.body.project.id

    const result = await ada.client.request('DELETE', `/api/projects/${id}`)
    expect([404, 405]).toContain(result.status)

    const check = await ada.client.get<{ project: { id: string } }>(`/api/projects/${id}`)
    expect(check.status).toBe(200)
  })
})

describe('identity cannot be asserted by the client', () => {
  it('ignores a userId supplied in a registration body', async () => {
    const client = ctx.client()
    const attackerId = 'usr_forged_0000'
    await client.request('POST', '/api/auth/register', {
      email: 'eve@example.com',
      password: VALID_PASSWORD,
      displayName: 'Eve',
      userId: attackerId,
    })

    const session = await client.get<{ user: { id: string; email: string } }>(
      '/api/auth/session',
    )
    // The server generated the id; the client's claim was ignored (Zod strips
    // unknown keys, so it never reaches a handler).
    expect(session.body.user.id).not.toBe(attackerId)
    expect(session.body.user.email).toBe('eve@example.com')
  })

  it('ignores an ownerId supplied in a workspace creation body', async () => {
    const ada = await makeUser('ada@example.com')
    const result = await ada.client.post<{ workspace: { ownerId: string } }>(
      '/api/workspaces',
      { name: 'Forged Owner', ownerId: 'usr_someone_else' } as Record<string, unknown>,
    )
    expect(result.status).toBe(201)
    expect(result.body.workspace.ownerId).toBe(ada.userId)
  })
})
