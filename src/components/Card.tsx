/**
 * Card — design-system 6.6.
 *
 * The single grouping surface: `bg.surface`, 1px `border.default`,
 * `radius.lg`, rest shadow. Padding is the only variant. Title `type.h3`,
 * body `type.body`, metadata `type.meta` are the caller's responsibility,
 * as is choosing the element that fits the surrounding semantics.
 */

import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn'

export type CardElement = 'div' | 'li' | 'section'
export type CardPadding = 'md' | 'lg'

const PADDING_CLASSES: Record<CardPadding, string> = {
  md: 'p-4',
  lg: 'p-5',
}

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Semantic wrapper: `div` by default, `li` in lists, `section` for regions. */
  as?: CardElement
  /** `md` matches project rows; `lg` matches panels and metric surfaces. */
  padding?: CardPadding
  children: ReactNode
}

export function Card({
  as: Tag = 'div',
  padding = 'md',
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Tag
      className={cn(
        'rounded-lg border border-border-default bg-bg-surface',
        PADDING_CLASSES[padding],
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}
