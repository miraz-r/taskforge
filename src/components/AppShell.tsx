/**
 * Application shell â€” design-system 6.7, 5.2.
 *
 * Landmarks: header, nav (inside the sidebar), main (8.4).
 *
 * Below bp.lg the sidebar is hidden and opens as an overlay with a scrim
 * (5.2). The overlay is modal, so the rest of the document is marked `inert`
 * while it is open: that removes the content from the tab order and from the
 * accessibility tree without the `aria-hidden`-over-focusable-content problem
 * described in 8.4.
 *
 * Nothing is ever hidden by breakpoint alone â€” the menu button is the same
 * control, always reachable (5.1: hiding functionality is a scope reduction and
 * is not permitted).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import { MenuIcon } from './icons'
import { Button } from './Button'
import { Sidebar } from './Sidebar'
import { ThemeControl } from './ThemeControl'
import { useApp } from '../app/AppContext'
import { THEME_OPTIONS } from '../theme/options'

const SIDEBAR_ID = 'tf-sidebar'
const MAIN_ID = 'tf-main'
const BP_LG_QUERY = '(min-width: 1024px)'

export function AppShell({
  activeRoute,
  onNavigate,
  children,
}: {
  activeRoute: string
  onNavigate: (routeId: string) => void
  children: ReactNode
}) {
  const { theme, setTheme, themePersistFailed, signOut } = useApp()
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [signOutPending, setSignOutPending] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const overlaySidebarRef = useRef<HTMLDivElement>(null)
  // Focus must return to the opener AFTER the overlay leaves the DOM. While it
  // is still open, the rest of the document is inert and focusing an inert
  // element is silently a no-op.
  const returnFocusRef = useRef(false)

  const closeOverlay = useCallback(() => {
    returnFocusRef.current = true
    setOverlayOpen(false)
  }, [])

  useEffect(() => {
    if (overlayOpen || !returnFocusRef.current) return
    returnFocusRef.current = false
    menuButtonRef.current?.focus()
  }, [overlayOpen])

  // Growing past bp.lg makes the sidebar persistent again, so the overlay must
  // not linger.
  useEffect(() => {
    const query = window.matchMedia(BP_LG_QUERY)
    function onChange(event: MediaQueryList | MediaQueryListEvent) {
      if (event.matches) setOverlayOpen(false)
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  // Esc closes the overlay (8.2).
  useEffect(() => {
    if (!overlayOpen) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeOverlay()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [overlayOpen, closeOverlay])

  // Move focus into the overlay when it opens, so a keyboard user is not left
  // behind an inert document.
  useEffect(() => {
    if (!overlayOpen) return
    const first = overlaySidebarRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    first?.focus()
  }, [overlayOpen])

  async function handleSignOut() {
    setSignOutPending(true)
    try {
      await signOut()
    } finally {
      setSignOutPending(false)
    }
  }

  return (
    <div className="min-h-dvh bg-bg-canvas">
      <a
        href={`#${MAIN_ID}`}
        className={cn(
          'sr-only focus-visible:not-sr-only',
          'focus-visible:absolute focus-visible:top-3 focus-visible:left-3 focus-visible:z-60',
          'focus-visible:rounded-md focus-visible:bg-bg-surface focus-visible:px-3 focus-visible:py-2',
          'focus-visible:text-label focus-visible:shadow-md',
        )}
      >
        Skip to main content
      </a>

      <div
        inert={overlayOpen ? true : undefined}
        className="flex min-h-dvh"
      >
        <div className="hidden lg:block">
          <Sidebar
            id={`${SIDEBAR_ID}-persistent`}
            overlay={false}
            activeRoute={activeRoute}
            onNavigate={onNavigate}
            onSignOut={handleSignOut}
            signOutPending={signOutPending}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border-subtle bg-bg-surface px-4">
            <div className="flex items-center gap-2">
              <Button
                ref={menuButtonRef}
                variant="ghost"
                size="compact"
                className="lg:hidden"
                aria-expanded={overlayOpen}
                aria-controls={`${SIDEBAR_ID}-overlay`}
                onClick={() => setOverlayOpen(true)}
              >
                <MenuIcon size="sm" />
                Menu
              </Button>
              <span className="text-label text-text-secondary">
                TaskForge
              </span>
            </div>

            <div className="flex items-center gap-3">
              <ThemeControl
                id="tf-theme"
                value={theme}
                options={THEME_OPTIONS}
                onChange={setTheme}
              />
            </div>
          </header>

          {themePersistFailed ? (
            <p
              role="alert"
              className="border-b border-status-warning-border bg-status-warning-bg px-4 py-2 text-body text-text-primary"
            >
              Your theme choice could not be saved, so it will not persist after
              a reload.
            </p>
          ) : null}

          <main id={MAIN_ID} className="min-w-0 flex-1">
            {children}
          </main>
        </div>
      </div>

      {overlayOpen ? (
        <>
          <div
            aria-hidden="true"
            onClick={closeOverlay}
            className="fixed inset-0 z-40 bg-bg-overlay lg:hidden"
          />
          <div
            ref={overlaySidebarRef}
            className="fixed inset-y-0 left-0 z-50 lg:hidden"
          >
            <Sidebar
              id={`${SIDEBAR_ID}-overlay`}
              overlay
              onClose={closeOverlay}
              activeRoute={activeRoute}
              onNavigate={(routeId) => {
                onNavigate(routeId)
                setOverlayOpen(false)
              }}
              onSignOut={handleSignOut}
              signOutPending={signOutPending}
            />
          </div>
        </>
      ) : null}
    </div>
  )
}
