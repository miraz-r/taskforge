/**
 * Sign-in — FR-AUTH-001, FR-AUTH-006.
 *
 * AC-AUTH-04: a failed attempt preserves the entered field content and shows a
 * generic message that does not disclose whether the account exists. AC-AUTH-01:
 * success reaches an authenticated state without a manual reload.
 *
 * On success the session is refreshed in the provider and routing is left to the
 * guard, so there is exactly one place that decides where an authenticated user
 * belongs.
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

export function SignInView() {
  const { refreshSession } = useApp()
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

    const result = await getService().signIn({ email, password })
    if (!result.ok) {
      setSubmitting(false)
      // Values are deliberately left in state: input is preserved across a
      // failed submission (NFR-ERR-003, FR-AUTH-005).
      setFieldErrors(result.error.fieldErrors)
      setFormError(result.error.formError)
      return
    }

    await refreshSession()
    setSubmitting(false)
  }

  return (
    <AuthLayout
      title="Sign in"
      footer={
        <p className="text-body text-text-secondary">
          No account yet?{' '}
          <a
            href={`#${ROUTES.register}`}
            className="text-text-brand underline underline-offset-4"
          >
            Create one
          </a>
        </p>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {formError ? <FormError message={formError} /> : null}

        <TextField
          id="signin-email"
          label="Email address"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          error={fieldErrors.email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <TextField
          id="signin-password"
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          error={fieldErrors.password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <Button type="submit" variant="primary" size="large" loading={submitting}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  )
}
