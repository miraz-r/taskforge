/**
 * Theme control — design-system 6.18, FR-THEME.
 *
 * Light and Dark only. Icon + text label in both themes. Switching changes
 * presentation only — never layout, data, or available actions (FR-THEME-006,
 * AC-THEME-03) — and the selection persists across a reload (FR-THEME-004).
 *
 * The control is generic over its options, so the same segmented control also
 * serves the workspace view and density switches (NFR-VIS-003: extend before
 * creating). Those pass their own group label; the theme label is the default.
 *
 * The active option is conveyed by `aria-pressed`, a fill change AND a left
 * indicator, so it is never carried by colour alone (NFR-ACCESS-008).
 *
 * D-15 (default theme resolution) is open. This control works under any rule
 * the decision eventually takes, so it does not pre-empt it.
 */

import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

export interface ThemeOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode | undefined
}
export function ThemeControl<T extends string>({
  value,
  options,
  onChange,
  id,
  label = 'Colour theme',
}: {
  value: T
  options: ReadonlyArray<ThemeOption<T>>
  onChange: (next: T) => void
  id: string
  /** Screen-reader group label. Defaults to the theme control's own label. */
  label?: string
}) {
  return (
    <div
      role="group"
      aria-labelledby={`${id}-label`}
      className="inline-flex items-center gap-2 rounded-md bg-bg-muted p-0.5"
    >
      <span id={`${id}-label`} className="sr-only">
        {label}
      </span>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-sm px-2',
              'text-label transition-colors duration-100 ease-standard',
              'relative pl-2.5',
              active
                ? 'bg-bg-surface text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {/* Active indicator: shape as well as colour (NFR-ACCESS-008). */}
            <span
              aria-hidden="true"
              className={cn(
                'absolute top-1/2 left-0 h-3 w-0.5 -translate-y-1/2 rounded-full',
                active ? 'bg-brand-600' : 'bg-transparent',
              )}
            />
            {option.icon ?? null}
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
