/**
 * Remote backend — the production implementation. Talks to the Express API.
 *
 * The authoritative application repository is now the server. Nothing but the
 * theme preference is kept in the browser.
 */

import { ApiClient, ApiError, NetworkError } from './api'
import type {
  AuthOutcome,
  Backend,
  BackendComment,
  BackendNotification,
  BackendProject,
  BackendTask,
  BackendUser,
  BackendWorkspace,
  DashboardData,
  SearchHit,
  SessionOutcome,
  WorkspaceListOutcome,
} from './backend'
import {
  THEME_STORAGE_KEY,
  isTheme,
  readStoredTheme,
  writeStoredTheme,
} from '../theme/storage'
import type { Theme } from '../domain/types'

interface RegisterResponse {
  user: BackendUser
  csrfToken: string
}

interface SessionResponse {
  user: BackendUser | null
  csrfToken: string | null
  expiresAt: string | null
}

interface WorkspacesResponse {
  workspaces: BackendWorkspace[]
  owned: number
  limit: number
}

export class RemoteBackend implements Backend {
  constructor(private readonly api: ApiClient) {}

  async register(input: {
    email: string
    password: string
    displayName: string
  }): Promise<AuthOutcome> {
    const result = await this.api.post<RegisterResponse>(
      '/auth/register',
      input,
    )
    return { user: result.user, csrfToken: result.csrfToken }
  }

  async signIn(input: {
    email: string
    password: string
  }): Promise<AuthOutcome> {
    const result = await this.api.post<RegisterResponse>('/auth/sign-in', input)
    return { user: result.user, csrfToken: result.csrfToken }
  }

  async signOut(): Promise<void> {
    await this.api.post('/auth/sign-out')
    this.api.setCsrfToken(null)
  }

  /** Used on boot to restore authentication state. Never throws for "signed out". */
  async currentSession(): Promise<SessionOutcome> {
    try {
      const result = await this.api.get<SessionResponse>('/auth/session')
      if (result.csrfToken) this.api.setCsrfToken(result.csrfToken)
      return { user: result.user, csrfToken: result.csrfToken }
    } catch (error) {
      if (error instanceof ApiError && error.isAuthFailure) {
        return { user: null, csrfToken: null }
      }
      throw error
    }
  }

  async listWorkspaces(): Promise<WorkspaceListOutcome> {
    const result = await this.api.get<WorkspacesResponse>('/workspaces')
    return result
  }

  async createWorkspace(name: string): Promise<BackendWorkspace> {
    const result = await this.api.post<{ workspace: BackendWorkspace }>(
      '/workspaces',
      { name },
    )
    return result.workspace
  }

  // -- projects ------------------------------------------------------------

  async listProjects(
    workspaceId: string,
    state: 'ACTIVE' | 'ARCHIVED',
  ): Promise<BackendProject[]> {
    const result = await this.api.get<{ projects: BackendProject[] }>(
      `/workspaces/${workspaceId}/projects?state=${state}`,
    )
    return result.projects
  }

  async createProject(input: {
    workspaceId: string
    name: string
    description?: string
    colourToken?: string | null
  }): Promise<BackendProject> {
    const result = await this.api.post<{ project: BackendProject }>(
      `/workspaces/${input.workspaceId}/projects`,
      {
        name: input.name,
        ...(input.description === undefined
          ? {}
          : { description: input.description }),
        ...(input.colourToken === undefined
          ? {}
          : { colourToken: input.colourToken }),
      },
    )
    return result.project
  }

  async updateProject(
    projectId: string,
    patch: { name?: string; description?: string },
  ): Promise<BackendProject> {
    const result = await this.api.patch<{ project: BackendProject }>(
      `/projects/${projectId}`,
      patch,
    )
    return result.project
  }

  async setProjectArchived(
    projectId: string,
    archived: boolean,
  ): Promise<BackendProject> {
    const result = await this.api.post<{ project: BackendProject }>(
      `/projects/${projectId}/${archived ? 'archive' : 'restore'}`,
    )
    return result.project
  }

  // -- tasks ---------------------------------------------------------------

  async listTasks(projectId: string): Promise<BackendTask[]> {
    const result = await this.api.get<{ tasks: BackendTask[] }>(
      `/projects/${projectId}/tasks`,
    )
    return result.tasks
  }

  async createTask(input: {
    projectId: string
    title: string
    description?: string
    priority?: BackendTask['priority']
    dueDate?: string | null
  }): Promise<BackendTask> {
    const result = await this.api.post<{ task: BackendTask }>(
      `/projects/${input.projectId}/tasks`,
      {
        title: input.title,
        ...(input.description === undefined
          ? {}
          : { description: input.description }),
        ...(input.priority === undefined ? {} : { priority: input.priority }),
        ...(input.dueDate === undefined ? {} : { dueDate: input.dueDate }),
      },
    )
    return result.task
  }

  async updateTask(
    taskId: string,
    patch: {
      title?: string
      description?: string
      stage?: BackendTask['stage']
      priority?: BackendTask['priority']
      dueDate?: string | null
    },
  ): Promise<BackendTask> {
    const result = await this.api.patch<{ task: BackendTask }>(
      `/tasks/${taskId}`,
      patch,
    )
    return result.task
  }

  // -- comments ------------------------------------------------------------

  async listComments(taskId: string): Promise<BackendComment[]> {
    const result = await this.api.get<{ comments: BackendComment[] }>(
      `/tasks/${taskId}/comments`,
    )
    return result.comments
  }

  async addComment(taskId: string, body: string): Promise<BackendComment> {
    const result = await this.api.post<{ comment: BackendComment }>(
      `/tasks/${taskId}/comments`,
      { body },
    )
    return result.comment
  }

  // -- search and dashboard ------------------------------------------------

  async search(projectId: string, query: string): Promise<SearchHit[]> {
    const result = await this.api.get<{ results: SearchHit[] }>(
      `/projects/${projectId}/search?q=${encodeURIComponent(query)}`,
    )
    return result.results
  }

  async dashboard(projectId: string): Promise<DashboardData> {
    const result = await this.api.get<{ dashboard: DashboardData }>(
      `/projects/${projectId}/dashboard`,
    )
    return result.dashboard
  }

  // -- notifications -------------------------------------------------------

  async listNotifications(): Promise<{
    items: BackendNotification[]
    unread: number
  }> {
    const result = await this.api.get<{
      notifications: BackendNotification[]
      unread: number
    }>('/notifications')
    return { items: result.notifications, unread: result.unread }
  }

  async markNotificationRead(id: string): Promise<void> {
    await this.api.post(`/notifications/${id}/read`)
  }

  // -- profile (FR-AUTH-008) ----------------------------------------------

  async updateDisplayName(displayName: string): Promise<BackendUser> {
    const result = await this.api.patch<{ user: BackendUser }>(
      '/auth/profile',
      { displayName },
    )
    return result.user
  }

  readTheme() {
    return readStoredTheme()
  }

  writeTheme(theme: Theme) {
    return writeStoredTheme(theme)
  }
}

export { ApiError, NetworkError, THEME_STORAGE_KEY, isTheme }
export type { Theme }
