/**
 * Select — design-system 6.4.
 *
 * Used for the workspace switcher (6.7). The selected option carries a check
 * icon and a subtle fill, so selection is never conveyed by colour alone.
 *
 * Keyboard contract (6.4): Enter / Space / ArrowDown opens; Arrow keys navigate;
 * Home / End jump; Enter commits; Esc closes and restores focus to the trigger.
 * Focus is trapped inside the open list — legitimate, because a menu is a modal
 * surface (design-system 8.2).
 */

import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '../lib/cn'
import { CheckIcon, ChevronDownIcon } from './icons'

export interface SelectOption<T extends string> {
  value: T
  label: string
  /** Optional supporting line, e.g. a workspace role or date. */
  description?: string | undefined
}

export interface SelectProps<T extends string> {
  /** Visible label rendered above the trigger. */
  label: string
  value: T | null
  options: ReadonlyArray<SelectOption<T>>
  onChange: (value: T) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select…',
  disabled = false,
  className,
}: SelectProps<T>) {
  const reactId = useId()
  const triggerId = `${reactId}-trigger`
  const listId = `${reactId}-list`

  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const optionRefs = useRef<Array<HTMLLIElement | null>>([])

  const selectedIndex = options.findIndex((option) => option.value === value)
  const activeOption = options[activeIndex]

  function close(restoreFocus: boolean) {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }

  function open_list(index: number) {
    setActiveIndex(index)
    setOpen(true)
  }

  function commit(index: number) {
    const option = options[index]
    if (!option) return
    onChange(option.value)
    close(true)
  }

  // Move DOM focus into the list once it is open.
  useEffect(() => {
    if (!open) return
    optionRefs.current[activeIndex]?.focus()
  }, [open, activeIndex])

  // A pointer click outside closes the menu without moving focus.
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node | null
      if (!target) return
      if (listRef.current?.contains(target)) return
      if (triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  function onTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      open_list(selectedIndex >= 0 ? selectedIndex : 0)
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      open_list(selectedIndex >= 0 ? selectedIndex : 0)
    }
  }

  function onListKeyDown(event: React.KeyboardEvent<HTMLUListElement>) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((index) => (index + 1) % options.length)
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((index) => (index - 1 + options.length) % options.length)
        break
      case 'Home':
        event.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        event.preventDefault()
        setActiveIndex(options.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        commit(activeIndex)
        break
      case 'Tab':
        // Tabbing out closes the menu and keeps focus moving forward, so the
        // user is never trapped.
        close(false)
        break
      case 'Escape':
        event.preventDefault()
        close(true)
        break
      default:
        break
    }
  }

  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined

  return (
    <div className={cn('flex flex-col', className)}>
      <span
        id={`${triggerId}-label`}
        className="mb-1.5 text-label text-text-secondary"
      >
        {label}
      </span>

      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={`${triggerId}-label ${triggerId}`}
        onClick={() => {
          if (open) close(false)
          else open_list(selectedIndex >= 0 ? selectedIndex : 0)
        }}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md',
          'border border-border-default bg-bg-surface px-3',
          'text-body text-text-primary',
          'transition-colors duration-100 ease-standard',
          'hover:border-border-strong',
          'disabled:cursor-not-allowed disabled:bg-bg-muted disabled:text-text-muted',
        )}
      >
        <span className={cn('truncate', !selectedOption && 'text-text-muted')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDownIcon size="sm" className="text-text-muted" />
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={`${triggerId}-label`}
          aria-activedescendant={
            activeOption ? `${listId}-${activeIndex}` : undefined
          }
          onKeyDown={onListKeyDown}
          className={cn(
            'absolute z-50 mt-1 max-h-72 w-full min-w-(--tf-content-form)',
            'overflow-auto rounded-lg border border-border-default',
            'bg-bg-surface p-2 shadow-md',
          )}
        >
          {options.map((option, index) => {
            const selected = option.value === value
            return (
              <li
                key={option.value}
                ref={(node) => {
                  optionRefs.current[index] = node
                }}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={selected}
                tabIndex={-1}
                onClick={() => commit(index)}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md px-2 py-2',
                  'text-body outline-none',
                  index === activeIndex ? 'bg-bg-subtle' : 'bg-transparent',
                )}
              >
                <span className="w-4 shrink-0 text-text-brand">
                  {selected ? <CheckIcon size="sm" /> : null}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-text-primary">
                    {option.label}
                  </span>
                  {option.description ? (
                    <span className="truncate text-meta text-text-muted">
                      {option.description}
                    </span>
                  ) : null}
                </span>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
