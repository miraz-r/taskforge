/**
 * Error state — design-system 6.14, NFR-ERR-001.
 *
 * States what failed and the next action. A retry is offered only where
 * retrying is meaningful (NFR-ERR-006). Messages avoid internal implementation
 * detail (NFR-ERR-007). Announced assertively (8.5) and rendered inline — a
 * failure is never reported by a toast alone (6.11).
 */

import type { ReactNode } from 'react'
import { AlertIcon } from './icons'
import { cn } from '../lib/cn'

export interface ErrorStateProps {
  title?: string
  message: string
  action?: ReactNode
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-lg border border-status-danger-border',
        'bg-status-danger-bg p-4',
        className,
      )}
    >
      <span className="mt-0.5 text-status-danger-text">
        <AlertIcon size="md" />
      </span>
      <div className="flex-1">
        <p className="text-label text-status-danger-text">{title}</p>
        <p className="mt-1 text-body text-text-primary">{message}</p>
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  )
}

/**
 * Whole-form failure. Distinct from a field error: it reports the submission,
 * not one control (design-system 8.5).
 */
export function FormError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'flex items-start gap-3 rounded-md border border-status-danger-border',
        'bg-status-danger-bg px-3 py-2.5',
      )}
    >
      <span className="mt-0.5 text-status-danger-text">
        <AlertIcon size="sm" />
      </span>
      <p className="text-body text-text-primary">{message}</p>
    </div>
  )
}
