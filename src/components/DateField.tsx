/**
 * Date field — design-system 6.2.
 *
 * Same conventions as `TextField`, with `type="date"` fixed: a persistent
 * visible label, validation messages below the field programmatically
 * associated with the control, and the value held by the caller so input is
 * preserved across a failed submission (NFR-ERR-003).
 *
 * Error association follows design-system 8.5: `aria-invalid` plus
 * `aria-describedby`. Colour is never the sole carrier — the message is text.
 */

import type { InputHTMLAttributes } from 'react'
import { forwardRef } from 'react'
import { cn } from '../lib/cn'

export interface DateFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type' | 'size'> {
  id: string
  label: string
  error?: string | undefined
  hint?: string | undefined
}

export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(
  function DateField(
    { id, label, error, hint, className, ...rest },
    ref,
  ) {
    const messageId = `${id}-message`
    const hasError = error !== undefined && error !== ''

    return (
      <div className="flex flex-col">
        <label
          htmlFor={id}
          className="mb-1.5 text-label text-text-secondary"
        >
          {label}
        </label>

        <input
          ref={ref}
          id={id}
          type="date"
          aria-invalid={hasError || undefined}
          aria-describedby={hasError || hint ? messageId : undefined}
          className={cn(
            'h-9 w-full rounded-md border bg-bg-surface px-3',
            'text-body text-text-primary',
            'transition-colors duration-100 ease-standard',
            'hover:border-border-strong',
            'focus:border-border-focus',
            'disabled:cursor-not-allowed disabled:border-border-subtle disabled:bg-bg-muted disabled:text-text-muted',
            'read-only:text-text-secondary',
            hasError ? 'border-border-danger' : 'border-border-default',
            className,
          )}
          {...rest}
        />

        {hasError ? (
          <p
            id={messageId}
            className="mt-1.5 text-meta text-status-danger-text"
          >
            {error}
          </p>
        ) : hint ? (
          <p id={messageId} className="mt-1.5 text-meta text-text-muted">
            {hint}
          </p>
        ) : null}
      </div>
    )
  },
)
