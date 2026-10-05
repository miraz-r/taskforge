/**
 * Profile — FR-AUTH-008, AC-AUTH-06.
 *
 * Display name only, and it applies to the shell immediately: the provider's
 * user is replaced on success, so the name in the sidebar updates without a
 * reload.
 *
 * AVATAR IS DEFERRED, deliberately. `FR-AUTH-008` mentions an avatar, but:
 *   - no avatar column exists in the schema;
 *   - no upload endpoint or transport is defined;
 *   - design-system 10.4 marks the avatar specification Proposed.
 * Inventing all three in one step would be an unapproved design, schema and API
 * decision at once. The avatar is therefore rendered from initials — which is
 * what design-system 10.4 specifies as the fallback presentation — and cannot be
 * changed.
 */

import { useState } from 'react'
import { AppShell } from '../components/AppShell'
import { Button } from '../components/Button'
import { ComingSoon } from '../components/ComingSoon'
import { FormError } from '../components/ErrorState'
import { TextField } from '../components/TextField'
import { useApp } from '../app/AppContext'
import { useNavTarget } from '../app/useNavTarget'
import { getService } from '../access/service'

/** Initials avatar — the presentation design-system 10.4 specifies. */
function initialsOf(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return (parts[0] as string).slice(0, 2).toUpperCase()
  return `${(parts[0] as string)[0]}${(parts[parts.length - 1] as string)[0]}`.toUpperCase()
}

export function ProfileView({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { user, refreshSession } = useApp()
  const navTarget = useNavTarget(onNavigate)
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | undefined>(undefined)
  const [saved, setSaved] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    setSaving(true)
    setError(null)
    setFieldError(undefined)
    setSaved(false)

    const result = await getService().updateDisplayName(displayName)
    setSaving(false)

    if (!result.ok) {
      setFieldError(result.error.fieldErrors.displayName)
      setError(result.error.formError)
      return
    }

    // Re-resolve the session so the shell shows the new name straight away.
    // AC-AUTH-06 requires the edit to be reflected without a manual reload.
    await refreshSession()
    setSaved(true)
  }

  return (
    <AppShell activeRoute="profile" onNavigate={navTarget}>
      <div className="px-(--tf-gutter) py-8">
        <div className="mx-auto w-full max-w-(--tf-content-form)">
          <h1 className="text-h1 text-text-primary">Your profile</h1>

          <div className="mt-6 flex items-center gap-4">
            <span
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-meta font-semibold text-text-brand"
            >
              {initialsOf(user?.displayName ?? '?')}
            </span>
            <div className="min-w-0">
              <p className="text-label text-text-primary">
                {user?.displayName}
              </p>
              <p className="truncate text-meta text-text-muted">
                {user?.email}
              </p>
            </div>
          </div>

          <form
            noValidate
            aria-labelledby="profile-form-heading"
            className="mt-6 rounded-lg border border-border-default bg-bg-surface p-5"
            onSubmit={(event) => void onSubmit(event)}
          >
            <h2
              id="profile-form-heading"
              className="text-h3 text-text-primary"
            >
              Edit your details
            </h2>

            <div className="mt-4 flex flex-col gap-5">
              {error ? <FormError message={error} /> : null}

              <TextField
                id="profile-display-name"
                label="Display name"
                value={displayName}
                error={fieldError}
                hint="Shown in the application shell."
                onChange={(event) => {
                  setDisplayName(event.target.value)
                  setSaved(false)
                }}
              />

              <TextField
                id="profile-email"
                label="Email address"
                value={user?.email ?? ''}
                readOnly
                disabled
                hint="Your sign-in address cannot be changed here."
              />

              <div className="flex items-center gap-3">
                <Button type="submit" variant="primary" loading={saving}>
                  Save changes
                </Button>
                {/* Success is announced, not just shown (NFR-STATE-005). */}
                <span role="status" className="text-meta text-text-success">
                  {saved ? 'Profile updated' : ''}
                </span>
              </div>
            </div>
          </form>

          <div className="mt-6">
            <ComingSoon
              headingLevel={2}
              featureName="Profile photo"
              description="There is nowhere to store a photo yet, and its presentation is not decided. For now your initials identify you everywhere in the app."
            />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
