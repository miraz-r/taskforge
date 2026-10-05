/**
 * Theme option set — Light and Dark only (FR-THEME-001, design-system 6.18).
 *
 * Kept out of ThemeControl.tsx so that module exports only a component.
 */

import { MoonIcon, SunIcon } from '../components/icons'
import type { ThemeOption } from '../components/ThemeControl'
import type { Theme } from '../domain/types'

export const THEME_OPTIONS: ReadonlyArray<ThemeOption<Theme>> = [
  { value: 'light', label: 'Light', icon: <SunIcon size="xs" /> },
  { value: 'dark', label: 'Dark', icon: <MoonIcon size="xs" /> },
]
