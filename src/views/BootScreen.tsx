/**
 * Boot screen — shown while the session is still being resolved.
 *
 * A skeleton, not an empty interface and not a spinner (NFR-STATE-003,
 * design-system 6.13). No protected content is painted before the session is
 * known (NFR-SEC-001).
 */

import { Skeleton } from '../components/Skeleton'

export function BootScreen() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading TaskForge"
      className="flex min-h-dvh flex-col bg-bg-canvas"
    >
      <div className="flex h-14 shrink-0 items-center border-b border-border-subtle bg-bg-surface px-4">
        <Skeleton width="96px" height="16px" aria-label="" />
      </div>
      <div className="flex flex-1 gap-6 p-6">
        <div className="hidden w-60 shrink-0 flex-col gap-3 lg:flex">
          <Skeleton width="70%" height="36px" aria-label="" />
          <Skeleton width="90%" height="36px" aria-label="" />
          <Skeleton width="80%" height="36px" aria-label="" />
        </div>
        <div className="flex flex-1 flex-col gap-4">
          <Skeleton width="40%" height="28px" aria-label="" />
          <Skeleton width="100%" height="80px" aria-label="" />
          <Skeleton width="60%" height="14px" aria-label="" />
        </div>
      </div>
    </div>
  )
}
