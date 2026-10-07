/**
 * Board density preference — comfortable or compact.
 *
 * Workspace-local, like the theme preference: explicit user choice persisted
 * locally, defaulting to comfortable. Unlike the theme it never leaves this
 * workspace surface, so it lives here rather than in application context.
 * When storage is unavailable the choice simply lasts the session.
 */

export type Density = 'comfortable' | 'compact'

/** Must be stable: the stored value is read on every project view load. */
export const DENSITY_STORAGE_KEY = 'taskforge.board-density'

export const DEFAULT_DENSITY: Density = 'comfortable'

export function isDensity(value: unknown): value is Density {
  return value === 'comfortable' || value === 'compact'
}

export function readStoredDensity(): Density {
  try {
    const stored = window.localStorage.getItem(DENSITY_STORAGE_KEY)
    return isDensity(stored) ? stored : DEFAULT_DENSITY
  } catch {
    return DEFAULT_DENSITY
  }
}

export function writeStoredDensity(density: Density): void {
  try {
    window.localStorage.setItem(DENSITY_STORAGE_KEY, density)
  } catch {
    // Storage unavailable: the choice lasts the session. Unlike the theme,
    // density never gates content, so no banner is warranted.
  }
}
