/**
 * Icon set — design-system 10.
 *
 * No icon library is approved (10.1), so these are hand-authored to the
 * specified geometry: outline style, 1.5px stroke on a 24x24 viewBox with 2px
 * padding, round cap and join, no fill.
 *
 * Rules enforced here (10.3):
 *  - decorative by default (`aria-hidden`), never the sole carrier of meaning;
 *  - one stroke weight across the set;
 *  - flat fills only, no 3D, no gradients.
 *
 * Sizing comes from the icon tokens: xs 12, sm 16, md 20, lg 24, xl 32.
 */

import type { SVGProps } from 'react'
import { cn } from '../lib/cn'

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const SIZE_PX: Record<IconSize, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
}

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  size?: IconSize
  /**
   * When true the icon is exposed to assistive technology under `title`.
   * Otherwise it is decorative and hidden (10.3).
   */
  title?: string
}

function Base({
  size = 'sm',
  title,
  className,
  children,
  ...rest
}: IconProps & { children: React.ReactNode }) {
  const px = SIZE_PX[size]
  const decorative = title === undefined
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      focusable="false"
      className={cn('shrink-0', className)}
      {...rest}
    >
      {decorative ? null : <title>{title}</title>}
      {children}
    </svg>
  )
}

export function SunIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Base>
  )
}

export function MoonIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z" />
    </Base>
  )
}

export function MenuIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </Base>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Base>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="m4 12.5 5 5 11-11" />
    </Base>
  )
}

export function AlertIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3.5 1.8 20.2h20.4L12 3.5Z" />
      <path d="M12 10v4.2M12 17.4h.01" />
    </Base>
  )
}

export function InfoIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.8h.01" />
    </Base>
  )
}

export function FolderIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.5h9A1.5 1.5 0 0 1 21 10v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V7.5Z" />
    </Base>
  )
}

export function UsersIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.8 19.5a6.2 6.2 0 0 1 12.4 0" />
      <path d="M16.2 5.2a3.2 3.2 0 0 1 0 5.9M17.6 14.2a6.2 6.2 0 0 1 3.6 5.3" />
    </Base>
  )
}

export function SignOutIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M14 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H14" />
      <path d="M17 8.5 20.5 12 17 15.5M20 12H10" />
    </Base>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 5v14M5 12h14" />
    </Base>
  )
}

export function ArchiveIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v10.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V8" />
      <path d="M10 12h4" />
    </Base>
  )
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="m6 9.5 6 6 6-6" />
    </Base>
  )
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </Base>
  )
}

export function LockIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="1.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </Base>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </Base>
  )
}

export function ClockIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.2l3.4 2" />
    </Base>
  )
}
