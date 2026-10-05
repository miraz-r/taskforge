/**
 * Text field — design-system 6.2.
 *
 * Placeholder is never the label: every field carries a persistent visible
 * label. Validation messages sit below the field, are programmatically
 * associated with the control, and the input is preserved across a failed
 * submission (NFR-ERR-003, FR-AUTH-005).
 *
 * Error association follows design-system 8.5: `aria-invalid` plus
 * `aria-describedby`. Colour is never the sole carrier — the message is text.
 */

import type { InputHTMLAttributes } from 'react'
import { forwardRef } from 'react'
import { cn } from '../lib/cn'

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'size'> {
  id: string
  label: string
  error?: string | undefined
  hint?: string | undefined
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(
    { id, label, error, hint, className, type = 'text', ...rest },
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
          type={type}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError || hint ? messageId : undefined}
          className={cn(
            'h-9 w-full rounded-md border bg-bg-surface px-3',
            'text-body text-text-primary',
            'transition-colors duration-100 ease-standard',
            'placeholder:text-text-muted',
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
