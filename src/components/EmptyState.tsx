/**
 * Empty state — design-system 6.12, NFR-STATE-002.
 *
 * States what is absent AND what to do. Never visually indistinguishable from
 * loading (NFR-STATE-004) and never rendered as a zero-value metric
 * (NFR-STATE-006).
 */

import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

export interface EmptyStateProps {
  /**
   * Heading level for the headline. One h1 per view, levels never skipping
   * (design-system 3.4, NFR-ACCESS-001). Pass 1 when the empty state IS the
   * view's headline.
   */
  headingLevel?: 1 | 2
  /** Optional single-colour line mark at icon.lg (10.5). */
  icon?: ReactNode
  headline: string
  description: string
  /** Exactly one primary action (6.12). */
  action?: ReactNode
  /** Secondary, non-primary action — used for the unavailable Join control. */
  secondary?: ReactNode
  className?: string
}

export function EmptyState({
  headingLevel = 2,
  icon,
  headline,
  description,
  action,
  secondary,
  className,
}: EmptyStateProps) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2'

  return (
    <section
      aria-labelledby="empty-state-headline"
      className={cn(
        'mx-auto flex max-w-(--tf-content-reading) flex-col items-center',
        'px-6 py-16 text-center',
        className,
      )}
    >
      {icon ? <div className="mb-6 text-text-muted">{icon}</div> : null}
      <Heading
        id="empty-state-headline"
        className="text-display text-text-primary"
      >
        {headline}
      </Heading>
      <p className="mt-2 max-w-[48ch] text-body-lg text-text-secondary">
        {description}
      </p>
      {action ? <div className="mt-8">{action}</div> : null}
      {secondary ? <div className="mt-3">{secondary}</div> : null}
    </section>
  )
}
