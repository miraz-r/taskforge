/**
 * Button — design-system 6.1.
 *
 * One `primary` per view. Loading retains its width so the layout does not
 * shift. Disabled controls are never silently inert: they must state why.
 * Keyboard: Enter and Space activate, Tab reaches it, disabled buttons are
 * skipped by the browser.
 *
 * Contrast (8.10): the primary label is graphite, not white — white on
 * brand.600 fails contrast, while graphite passes in both themes, matching
 * the dark theme's existing dark-on-bright pairing. Hover and pressed share
 * the deepened brand.650 step; the press is marked by an instant scale
 * (transform-only, so it is safe under reduced motion) rather than a further
 * fill change.
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { forwardRef } from 'react'
import { cn } from '../lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link'
export type ButtonSize = 'compact' | 'default' | 'large'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Replaces the label with a spinner while preserving width (6.1). */
  loading?: boolean
  children: ReactNode
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  compact: 'h-8 px-3 text-label gap-1.5',
  default: 'h-9 px-4 text-label gap-2',
  large: 'h-11 px-5 text-body gap-2',
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-text-on-brand hover:bg-brand-650 active:bg-brand-650 active:scale-[0.98]',
  secondary:
    'bg-transparent text-text-primary border border-border-default hover:border-border-strong',
  ghost: 'bg-transparent text-text-secondary hover:bg-bg-subtle',
  danger: 'bg-status-danger-text text-text-inverse hover:opacity-90',
  link: 'bg-transparent text-text-brand px-0 h-auto hover:underline',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'secondary',
      size = 'default',
      loading = false,
      disabled = false,
      className,
      children,
      type = 'button',
      ...rest
    },
    ref,
  ) {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={cn(
          'relative inline-flex items-center justify-center rounded-md',
          'transition-colors duration-100 ease-standard',
          'disabled:cursor-not-allowed',
          variant === 'link' ? 'underline-offset-4' : SIZE_CLASSES[size],
          // A cyan ring on a brand fill would be invisible (8.10): brand fills
          // take the graphite-inner ring, danger fills the surface-inner ring.
          variant === 'primary'
            ? 'tf-on-brand'
            : variant === 'danger'
              ? 'tf-on-danger'
              : '',
          VARIANT_CLASSES[variant],
          isDisabled && 'disabled:bg-bg-muted disabled:text-text-muted',
          isDisabled &&
            variant === 'primary' &&
            'disabled:opacity-100',
          isDisabled && variant !== 'link' && 'disabled:border-transparent',
          className,
        )}
        {...rest}
      >
        {loading ? (
          <>
            {/* The label stays in the layout at zero opacity, so the button keeps
                its measured width and nothing shifts (6.1). */}
            <span aria-hidden="true" className="invisible flex items-center gap-2">
              {children}
            </span>
            <span
              role="status"
              aria-live="polite"
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="sr-only">Working…</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                focusable="false"
                className="animate-spin motion-reduce:animate-none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeOpacity="0.25"
                />
                <path
                  d="M21 12a9 9 0 0 0-9-9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </>
        ) : (
          children
        )}
      </button>
    )
  },
)
