import {
  useSignInWithPassword,
  useSignUpWithPassword,
} from '@convex-dev/auth/providers/password/react'
import { useState } from 'react'
import type { FormEvent } from 'react'

import { api } from '../../../convex/_generated/api'
import { passwordErrorCopy } from './authCopy'

export type PasswordMode = 'sign-in' | 'sign-up'

interface PasswordFormProps {
  readonly mode: PasswordMode
  readonly onModeChange: (mode: PasswordMode) => void
}

export function PasswordForm({ mode, onModeChange }: PasswordFormProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const { signIn, pending: signingIn } = useSignInWithPassword(
    api.auth.signInWithPassword,
  )
  const { signUp, pending: signingUp } = useSignUpWithPassword(
    api.auth.signUpWithPassword,
  )
  const pending = signingIn || signingUp
  const creating = mode === 'sign-up'

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (pending) return
    setError(undefined)
    const credentials = { username: username.trim(), password }
    const result = creating
      ? await signUp(credentials)
      : await signIn(credentials)
    if (!result.success) setError(passwordErrorCopy(result.userError))
  }

  function switchMode(): void {
    onModeChange(creating ? 'sign-in' : 'sign-up')
    setError(undefined)
  }

  return (
    <form className="auth-form" onSubmit={(event) => void submit(event)}>
      <div className="auth-field">
        <label htmlFor="username">Username</label>
        <input
          autoCapitalize="none"
          autoComplete="username"
          disabled={pending}
          id="username"
          name="username"
          placeholder="Username"
          required
          spellCheck={false}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
      </div>
      <div className="auth-field">
        <label htmlFor="password">Password</label>
        <input
          autoComplete={creating ? 'new-password' : 'current-password'}
          disabled={pending}
          id="password"
          name="password"
          placeholder="Password"
          required
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      {creating ? (
        <p className="auth-password-hint">
          At least 10 characters. Anything printable is fine.
        </p>
      ) : null}
      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="auth-submit" disabled={pending} type="submit">
        {pending
          ? creating
            ? 'Creating account…'
            : 'Signing in…'
          : creating
            ? 'Create account'
            : 'Sign in'}
      </button>
      <div className="auth-footer">
        <span>{creating ? 'Already have an account?' : 'No account?'}</span>
        <button disabled={pending} type="button" onClick={switchMode}>
          {creating ? 'Sign in' : 'Sign up'}
        </button>
      </div>
    </form>
  )
}
