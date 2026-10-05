/**
 * Coming Soon surface — design-system 6.20.
 *
 * The honesty contract. Every rule below is enforced structurally:
 *  1. a visible text label reading "Coming Soon";
 *  2. no operable control — there is no button, link, or focusable element;
 *  3. no fabricated data anywhere;
 *  4. status conveyed in text, never by colour alone;
 *  5. a dead button is a defect, not a Coming Soon state — so none is rendered.
 *
 * Coming Soon is a deliberate deferral. A feature labelled Coming Soon because
 * it is broken is an incorrect state assignment (AC-CS-05).
 */

import type { ReactNode } from 'react'
import { Badge } from './Badge'
import { cn } from '../lib/cn'

export interface ComingSoonProps {
  /**
   * Heading level for the feature name. Levels must descend without skipping
   * (design-system 3.4, NFR-ACCESS-001), so pass 2 when this surface sits
   * directly under a view's h1.
   */
  headingLevel?: 2 | 3
  /** The deferred feature's name, as it will read in the product. */
  featureName: string
  /** One line describing the intended capability. Never a promise of a date. */
  description: string
  /** Optional line mark. Decorative only. */
  icon?: ReactNode
  className?: string
}

export function ComingSoon({
  headingLevel = 3,
  featureName,
  description,
  icon,
  className,
}: ComingSoonProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'

  return (
    <section
      aria-labelledby="coming-soon-name"
      className={cn(
        'flex flex-col items-center rounded-lg border border-border-default',
        'bg-bg-surface p-8 text-center',
        className,
      )}
    >
      <Badge tone="neutral">Coming Soon</Badge>
      <Heading
        id="coming-soon-name"
        className="mt-3 text-h3 text-text-primary"
      >
        {featureName}
      </Heading>
      <p className="mt-1 max-w-[44ch] text-body text-text-secondary">
        {description}
      </p>
      {icon ? <div className="mt-4 text-text-muted">{icon}</div> : null}
    </section>
  )
}
