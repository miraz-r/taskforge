/**
 * Dialog — design-system 6.5, 8.7.
 *
 * A modal surface for a decision: creates and confirmations. Semantics are
 * `dialog` + `aria-modal` with a labelled title and an optional described
 * consequence. The contract, mirroring the AppShell overlay and the task
 * drawer:
 *
 * - focus moves into the dialog on open (the safe action first, so place it
 *   first in the footer);
 * - focus is trapped while open and returns to the opener on close
 *   (NFR-ACCESS-004) — the opener capture itself lives with the caller, which
 *   owns the background content;
 * - `Esc` closes, unless a control inside already handled it (a menu's own
 *   `Esc` closes the menu, not the dialog);
 * - the scrim never dismisses: a dialog that contains input must not close
 *   under its user's pointer (6.5), and confirmations close explicitly.
 *
 * Surfaces appear instantly with no enter or exit animation — the same
 * treatment as the drawer and menus — so there is nothing for
 * `prefers-reduced-motion` to suppress and nothing to delay interaction.
 */

import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

export type DialogWidth = 'standard' | 'wide' | 'confirmation'

const WIDTH_CLASSES: Record<DialogWidth, string> = {
  standard: 'max-w-(--tf-dialog-standard)',
  wide: 'max-w-(--tf-content-reading)',
  confirmation: 'max-w-(--tf-dialog-confirm)',
}

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export interface DialogProps {
  /** Dialog heading (`type.h3`). Always present, always announced. */
  title: string
  /** Consequence or context, read after the title. */
  description?: string | undefined
  /** Standard 480px, wide 640px, confirmation 440px (6.5). */
  width?: DialogWidth
  onClose: () => void
  /** Right-aligned actions, safe action first so it takes initial focus. */
  footer?: ReactNode | undefined
  children?: ReactNode | undefined
  className?: string | undefined
}

export function Dialog({
  title,
  description,
  width = 'standard',
  onClose,
  footer,
  children,
  className,
}: DialogProps) {
  const reactId = useId()
  const titleId = `${reactId}-title`
  const descriptionId = `${reactId}-description`
  const panelRef = useRef<HTMLDivElement | null>(null)
  // Stable across renders: the key handler is registered once, while the
  // caller's inline onClose is a new closure every render.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Initial focus lands on the first focusable element — the safe action when
  // the footer leads with it.
  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        // A menu inside the dialog handles its own Esc and marks it handled;
        // only an unhandled Esc dismisses the dialog.
        if (event.defaultPrevented) return
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((element) => !element.hasAttribute('disabled'))
      if (focusable.length === 0) return
      const first = focusable[0] as HTMLElement
      const last = focusable[focusable.length - 1] as HTMLElement
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Scrim: never dismisses (see module comment). */}
        <div aria-hidden="true" className="fixed inset-0 bg-bg-overlay" />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          className={cn(
            'relative w-full rounded-lg border border-border-default',
            'bg-bg-surface p-6 shadow-lg',
            WIDTH_CLASSES[width],
            className,
          )}
        >
          <h2 id={titleId} className="text-h3 text-text-primary">
            {title}
          </h2>
          {description ? (
            <p
              id={descriptionId}
              className="mt-2 text-body text-text-primary"
            >
              {description}
            </p>
          ) : null}
          {children ? <div className="mt-4">{children}</div> : null}
          {footer ? (
            <div className="mt-6 flex justify-end gap-3">{footer}</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
