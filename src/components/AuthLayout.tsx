/**
 * Authentication layout â€” shared chrome for sign-in and registration.
 *
 * Forms are constrained to 400px (design-system 4.2) and the page is vertically
 * centred with space.12 rhythm. The theme control is available here too, so a
 * user is never forced to authenticate in the wrong theme.
 */

import type { ReactNode } from 'react'
import { ThemeControl } from './ThemeControl'
import { THEME_OPTIONS } from '../theme/options'
import { useApp } from '../app/AppContext'

export function AuthLayout({
  title,
  children,
  footer,
}: {
  title: string
  children: ReactNode
  footer: ReactNode
}) {
  const { theme, setTheme } = useApp()

  return (
    <div className="flex min-h-dvh flex-col bg-bg-canvas px-6 py-20">
      <div className="mx-auto flex w-full flex-1 flex-col justify-center">
        <div className="tf-measure-form mx-auto w-full">
          <div className="mb-8 flex items-center justify-between">
            <span className="text-h3 text-text-primary">TaskForge</span>
            <ThemeControl
              id="tf-theme-auth"
              value={theme}
              options={THEME_OPTIONS}
              onChange={setTheme}
            />
          </div>

          {/* One h1 per view (3.4, 8.4). */}
          <h1 className="text-h1 text-text-primary">{title}</h1>

          <div className="mt-8">{children}</div>

          <div className="mt-8">{footer}</div>
        </div>
      </div>
    </div>
  )
}
