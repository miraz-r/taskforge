/**
 * Skeleton — design-system 6.13, NFR-STATE-003.
 *
 * Skeletons, not spinners, for content regions: they preserve layout and
 * prevent shift. The sweep is a single low-opacity pass using transform only,
 * so it never triggers layout (9.2). Under `prefers-reduced-motion: reduce` it
 * becomes a static bg.muted block (9.6).
 *
 * A skeleton is NEVER used to represent an empty collection — "nothing yet" and
 * "still loading" are different messages (6.13, NFR-STATE-004).
 */

import { cn } from '../lib/cn'

export interface SkeletonProps {
  /** Matches the shape of the real content it stands in for. */
  width?: string
  height?: string
  className?: string
  'aria-label'?: string
}

export function Skeleton({
  width = '100%',
  height = '16px',
  className,
  'aria-label': ariaLabel = 'Loading',
}: SkeletonProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      className={cn('tf-skeleton block rounded-sm', className)}
      style={{ width, height }}
    />
  )
}

/**
 * A block of skeletons shaped like the sidebar + content it replaces. Marked
 * aria-hidden because the enclosing region already announces loading; a list of
 * identical labels would be noise for a screen reader.
 */
export function PanelSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-bg-surface p-4"
    >
      <Skeleton height="20px" width="40%" />
      <Skeleton height="14px" />
      <Skeleton height="14px" width="88%" />
      <Skeleton height="14px" width="64%" />
    </div>
  )
}
