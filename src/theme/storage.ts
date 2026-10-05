/**
 * Theme storage and application — FR-THEME, design-system 7.
 *
 * D-15 (default theme resolution) is an OPEN DECISION. This module therefore
 * implements only what is approved: light by default, an explicit user
 * override, and persistence of that override (FR-THEME-004).
 *
 * It deliberately does NOT read the operating system preference. Doing so would
 * resolve D-15, which has not been approved. design-system 7.3 notes the theme
 * control is specified so it works whichever rule is eventually approved.
 */

import type { Theme } from '../domain/types'

/** Must match the pre-paint read in index.html. */
export const THEME_STORAGE_KEY = 'taskforge.theme'

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

export function readStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(stored) ? stored : null
  } catch {
    return null
  }
}

export function writeStoredTheme(theme: Theme): boolean {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    return window.localStorage.getItem(THEME_STORAGE_KEY) === theme
  } catch {
    return false
  }
}

/**
 * Applies the theme at the document root so no component holds theme state and
 * there is no flash of the wrong theme (design-system 7.2).
 */
export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
}

/** Resolves the theme to use on load. Light unless an override is stored. */
export function resolveInitialTheme(): Theme {
  return readStoredTheme() ?? 'light'
}
