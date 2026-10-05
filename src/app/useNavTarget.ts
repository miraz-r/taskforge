/**
 * Maps a sidebar nav entry to a concrete route.
 *
 * Views receive a nav id, not a path, so the shell stays decoupled from routing.
 * Centralised here so every view resolves nav identically — a per-view mapping is
 * how nav ends up working on one screen and not another.
 */

import { useCallback } from 'react'
import { useApp } from './AppContext'
import { paths } from '../routing/useHashRoute'

export function useNavTarget(
  navigate: (path: string) => void,
): (navId: string) => void {
  const { activeWorkspaceId } = useApp()

  return useCallback(
    (navId: string) => {
      if (navId === 'projects' && activeWorkspaceId) {
        navigate(paths.projects(activeWorkspaceId))
        return
      }
      if (navId === 'archived' && activeWorkspaceId) {
        navigate(paths.archivedProjects(activeWorkspaceId))
        return
      }
      if (navId === 'profile') {
        navigate(paths.profile())
        return
      }
      navigate(paths.workspace())
    },
    [navigate, activeWorkspaceId],
  )
}
