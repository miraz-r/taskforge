/**
 * Badge — design-system 6.9. Height 20px, radius full, type.meta at weight 500.
 * Status is always carried by text; a badge never communicates by colour alone
 * (6.9, NFR-ACCESS-008).
 */

import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

export type BadgeTone =
  | 'neutral'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-status-neutral-bg text-status-neutral-text',
  brand: 'bg-brand-100 text-text-brand',
  success: 'bg-status-success-bg text-status-success-text',
  warning: 'bg-status-warning-bg text-status-warning-text',
  danger: 'bg-status-danger-bg text-status-danger-text',
  info: 'bg-status-info-bg text-status-info-text',
}

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-2',
        'text-meta font-medium',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
