/**
 * Registration — FR-AUTH-002, FR-AUTH-003.
 *
 * AC-AUTH-02: an already-registered email produces a visible, field-specific
 * error and no second account. AC-AUTH-03: an empty required field produces a
 * visible error naming that field. AC-AUTH-01: registration reaches an
 * authenticated state without a manual reload.
 *
 * On success the session is refreshed in the provider and routing is left to the
 * guard.
 */

import { useState } from 'react'
import type { FormEvent } from 'react'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/Button'
import { FormError } from '../components/ErrorState'
import { TextField } from '../components/TextField'
import { useApp } from '../app/AppContext'
import { getService, type FieldErrors } from '../access/service'
import { ROUTES } from '../routing/useHashRoute'
import { MIN_PASSWORD_LENGTH } from '../lib/password'

export function RegisterView() {
  const { refreshSession } = useApp()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setFieldErrors({})
    setFormError(null)

    const result = await getService().register({ displayName, email, password })
    if (!result.ok) {
      setSubmitting(false)
      // NFR-ERR-003: entered values are preserved across a failed submission.
      setFieldErrors(result.error.fieldErrors)
      setFormError(result.error.formError)
      return
    }

    await refreshSession()
    setSubmitting(false)
  }

  return (
    <AuthLayout
      title="Create your account"
      footer={
        <p className="text-body text-text-secondary">
          Already registered?{' '}
          <a
            href={`#${ROUTES.signIn}`}
            className="text-text-brand underline underline-offset-4"
          >
            Sign in
          </a>
        </p>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {formError ? <FormError message={formError} /> : null}

        <TextField
          id="register-display-name"
          label="Display name"
          name="displayName"
          autoComplete="name"
          value={displayName}
          error={fieldErrors.displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />

        <TextField
          id="register-email"
          label="Email address"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          error={fieldErrors.email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <TextField
          id="register-password"
          label="Password"
          type="password"
          name="password"
          autoComplete="new-password"
          value={password}
          error={fieldErrors.password}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
          onChange={(event) => setPassword(event.target.value)}
        />

        <Button
          type="submit"
          variant="primary"
          size="large"
          loading={submitting}
        >
          Create account
        </Button>
      </form>
    </AuthLayout>
  )
}
