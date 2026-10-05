/**
 * Sidebar — design-system 6.7.
 *
 * Structure: workspace switcher, primary nav, user menu. Active nav state uses
 * fill + left indicator + weight — never colour alone (NFR-ACCESS-008). The
 * current item carries aria-current="page" (8.4). The switcher lists only
 * workspaces the user belongs to (FR-WS-004).
 *
 * Below bp.lg the sidebar is an overlay opened from the shell header (5.2). When
 * closed it is removed from the document entirely, so it is never focusable
 * while off-screen (8.4).
 *
 * PHASE 0 NOTE: primary navigation contains one item. Project, board, list and
 * dashboard routes do not exist yet, and Planned features have no interface
 * presence at all (6.20 rule 7), so no placeholder nav entries are rendered.
 */

import { useRef } from 'react'
import { cn } from '../lib/cn'
import { ArchiveIcon, CloseIcon, FolderIcon, PlusIcon, SignOutIcon, UsersIcon } from './icons'
import { Button } from './Button'
import { Select } from './Select'
import { useApp } from '../app/AppContext'
import { ROUTES } from '../routing/useHashRoute'

interface NavEntry {
  id: string
  label: string
  icon: React.ReactNode
}

/**
 * Primary navigation.
 *
 * `Projects` only appears once the user has a workspace, because a project
 * cannot exist without one (FR-WS-008). Nothing is rendered for features that are
 * not built, and nothing implies a control that does not exist (design-system
 * 6.20 rule 7).
 */
function navFor(hasWorkspace: boolean): NavEntry[] {
  const entries: NavEntry[] = [
    { id: 'workspace', label: 'Workspace', icon: <FolderIcon size="sm" /> },
    // Profile is reachable in every workspace state, including zero-workspace.
    { id: 'profile', label: 'Profile', icon: <UsersIcon size="sm" /> },
  ]
  if (hasWorkspace) {
    entries.push({
      id: 'projects',
      label: 'Projects',
      icon: <FolderIcon size="sm" />,
    })
    entries.push({
      id: 'archived',
      label: 'Archived',
      icon: <ArchiveIcon size="sm" />,
    })
  }
  return entries
}

export function Sidebar({
  activeRoute,
  onNavigate,
  onSignOut,
  signOutPending,
  overlay,
  onClose,
  id,
}: {
  activeRoute: string
  onNavigate: (id: string) => void
  onSignOut: () => void
  signOutPending: boolean
  /** True when rendered as a below-bp.lg overlay. */
  overlay: boolean
  /** Present only for the overlay: closes it and returns focus to the opener. */
  onClose?: (() => void) | undefined
  id: string
}) {
  const { user, workspaces, activeWorkspaceId, setActiveWorkspaceId } = useApp()
  const navRef = useRef<HTMLUListElement>(null)

  function onNavKeyDown(event: React.KeyboardEvent<HTMLUListElement>) {
    const items = Array.from(
      navRef.current?.querySelectorAll<HTMLButtonElement>('[data-nav-item]') ?? [],
    )
    if (items.length === 0) return
    const currentIndex = items.indexOf(
      document.activeElement as HTMLButtonElement,
    )

    let nextIndex: number | null = null
    if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % items.length
    else if (event.key === 'ArrowUp')
      nextIndex = (currentIndex - 1 + items.length) % items.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = items.length - 1

    if (nextIndex !== null) {
      event.preventDefault()
      items[nextIndex]?.focus()
    }
  }

  const activeWorkspace = workspaces.find(
    (workspace) => workspace.id === activeWorkspaceId,
  )

  return (
    <aside
      id={id}
      aria-label="Workspace"
      className={cn(
        'flex h-full w-(--tf-sidebar-width) shrink-0 flex-col',
        'border-r border-border-subtle bg-bg-surface',
      )}
    >
      {overlay && onClose ? (
        <div className="flex justify-end border-b border-border-subtle p-2">
          <Button
            variant="ghost"
            size="compact"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <CloseIcon size="sm" />
            Close
          </Button>
        </div>
      ) : null}

      {/* Workspace switcher (6.7) — FR-WS-006, AC-WS-08. Exercisable by
          creating a second workspace; no invitation required. */}
      <div className="border-b border-border-subtle p-4">
        {workspaces.length > 0 ? (
          <>
            <Select
              label="Workspace"
              value={activeWorkspaceId}
              onChange={setActiveWorkspaceId}
              placeholder="Select a workspace"
              options={workspaces.map((workspace) => ({
                value: workspace.id,
                label: workspace.name,
                description:
                  workspace.ownerId === user?.id ? 'Owner' : 'Member',
              }))}
            />
            {/* FR-WS-001 from inside the shell. Without this there is no route to
                a second workspace, so AC-WS-08 could never be exercised. */}
            <a
              href={`#${ROUTES.newWorkspace}`}
              onClick={() => onNavigate(ROUTES.newWorkspace)}
              className={cn(
                'mt-3 inline-flex items-center gap-1.5 rounded-md px-1 py-1',
                'text-label text-text-secondary',
                'transition-colors duration-100 ease-standard',
                'hover:bg-bg-subtle hover:text-text-primary',
              )}
            >
              <PlusIcon size="xs" />
              New workspace
            </a>
          </>
        ) : (
          <p className="text-meta text-text-muted">No workspace yet</p>
        )}
      </div>

      <nav aria-label="Primary" className="flex-1 overflow-y-auto p-2">
        <ul ref={navRef} onKeyDown={onNavKeyDown} className="flex flex-col gap-0.5">
          {navFor(workspaces.length > 0).map((entry) => {
            const active = entry.id === activeRoute
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  data-nav-item
                  aria-current={active ? 'page' : undefined}
                  tabIndex={active ? 0 : -1}
                  onClick={() => onNavigate(entry.id)}
                  className={cn(
                    'relative flex h-9 w-full items-center gap-2 rounded-md',
                    'pl-3 pr-2 text-left text-label',
                    'transition-colors duration-100 ease-standard',
                    active
                      ? 'bg-brand-100 font-semibold text-text-brand'
                      : 'text-text-secondary hover:bg-bg-subtle',
                  )}
                >
                  {/* Indicator: shape as well as fill, so the active state never
                      depends on colour alone. */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute top-1/2 left-0 h-4 w-[3px] -translate-y-1/2 rounded-r-full',
                      active ? 'bg-brand-600' : 'bg-transparent',
                    )}
                  />
                  {entry.icon}
                  <span>{entry.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User menu (6.7) — FR-AUTH-007 identity, FR-AUTH-006 sign-out.
          Rendered inline rather than as a dropdown: Phase 0 has exactly one
          action here, and a menu would add a focus-trapping surface for a
          single item. */}
      <div className="border-t border-border-subtle p-4">
        <p className="text-label text-text-primary">
          {user?.displayName ?? 'Signed in'}
        </p>
        <p className="mt-0.5 truncate text-meta text-text-muted">
          {user?.email ?? ''}
        </p>
        <Button
          variant="ghost"
          size="compact"
          className="mt-3 w-full justify-start"
          onClick={onSignOut}
          disabled={signOutPending}
        >
          <SignOutIcon size="sm" />
          Sign out
        </Button>
      </div>

      {/* Announced to assistive technology on switch, because the change is
          otherwise purely visual. */}
      <p className="sr-only" role="status" aria-live="polite">
        {activeWorkspace ? `Workspace: ${activeWorkspace.name}` : ''}
      </p>
    </aside>
  )
}
