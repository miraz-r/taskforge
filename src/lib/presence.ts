/**
 * Overlay presence — WS05 Checkpoint B.
 *
 * Keeps an overlay mounted while its exit animation plays, then unmounts it.
 * The exit length is read from the `--tf-motion-*` token itself (the same
 * token the Checkpoint A exit class animates with), so JS timing and CSS
 * timing cannot drift apart and no literal duration lives outside the token
 * set. When there is no motion to wait for — reduced motion, or a token the
 * environment cannot resolve (e.g. jsdom, which runs no CSS) — the overlay
 * unmounts synchronously, exactly as before.
 */

import { useEffect, useRef, useState } from 'react'

/** Exit-token names the presence hook may read. */
export type ExitToken = '--tf-motion-base' | '--tf-motion-slow'

/**
 * Milliseconds the named motion token resolves to on the document root.
 * Returns 0 when motion must not be waited for: no window (SSR/tests
 * without a DOM), a `prefers-reduced-motion: reduce` setting, or an
 * unresolvable token value.
 */
export function resolveMotionMs(token: ExitToken): number {
  if (typeof window === 'undefined') return 0
  if (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return 0
  }
  const raw = window
    .getComputedStyle(window.document.documentElement)
    .getPropertyValue(token)
    .trim()
  const value = Number.parseFloat(raw)
  if (!Number.isFinite(value) || value <= 0) return 0
  // Tokens are authored in ms, but the computed value may come back in
  // seconds (Tailwind normalises `--tf-motion-base: 150ms` to `0.15s`).
  if (raw.endsWith('ms')) return value
  if (raw.endsWith('s')) return value * 1000
  return 0
}

export interface OverlayPresence {
  /** True while the overlay must stay mounted, including during exit. */
  render: boolean
  /** True while the exit animation is playing (apply the exit class). */
  leaving: boolean
}

/**
 * Delays unmount until the exit animation finishes. `open` is the existing
 * source of truth (dialog flag, selected task, overlay flag); this hook only
 * stretches the trailing edge. Reopening during an exit cancels it and the
 * overlay never unmounts.
 */
export function useOverlayPresence(
  open: boolean,
  exitToken: ExitToken,
): OverlayPresence {
  const [render, setRender] = useState(open)
  const [leaving, setLeaving] = useState(false)
  const renderRef = useRef(render)
  renderRef.current = render

  useEffect(() => {
    if (open) {
      setRender(true)
      setLeaving(false)
      return undefined
    }
    if (!renderRef.current || resolveMotionMs(exitToken) <= 0) {
      setRender(false)
      setLeaving(false)
      return undefined
    }
    setLeaving(true)
    const timer = window.setTimeout(() => {
      setRender(false)
      setLeaving(false)
    }, resolveMotionMs(exitToken))
    return () => window.clearTimeout(timer)
  }, [open, exitToken])

  return { render, leaving }
}
