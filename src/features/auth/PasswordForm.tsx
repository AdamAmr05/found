import {
  useSignInWithPassword,
  useSignUpWithPassword,
} from '@convex-dev/auth/providers/password/react'
import { useState } from 'react'
import type { FormEvent } from 'react'

import { api } from '../../../convex/_generated/api'
import { passwordErrorCopy } from './authCopy'

type Mode = 'sign-in' | 'sign-up'

const fieldClass =
  'h-44 w-full rounded-10 border border-border-muted bg-background-lighter px-14 text-body-input text-accent-black outline-none transition-colors placeholder:text-foreground-muted focus-visible:border-border-loud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100 disabled:opacity-50'

export function PasswordForm() {
  const [mode, setMode] = useState<Mode>('sign-in')
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
    setMode(creating ? 'sign-in' : 'sign-up')
    setError(undefined)
  }

  return (
    <form
      className="flex flex-col gap-12"
      onSubmit={(event) => void submit(event)}
    >
      <label className="flex flex-col gap-6">
        <span className="text-label-small text-accent-black">Username</span>
        <input
          autoCapitalize="none"
          autoComplete="username"
          className={fieldClass}
          disabled={pending}
          name="username"
          required
          spellCheck={false}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-6">
        <span className="text-label-small text-accent-black">Password</span>
        <input
          autoComplete={creating ? 'new-password' : 'current-password'}
          className={fieldClass}
          disabled={pending}
          name="password"
          required
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {creating ? (
          <span className="text-body-small text-foreground-muted">
            At least 10 characters. Anything printable is fine.
          </span>
        ) : null}
      </label>
      {error ? (
        <p className="text-body-small text-accent-crimson" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="mt-4 h-44 w-full rounded-10 bg-heat-100 text-label-medium text-white shadow-action-heat transition-[transform,opacity] duration-150 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-heat-100 active:scale-[0.995] disabled:opacity-50"
        disabled={pending}
        type="submit"
      >
        {pending
          ? creating
            ? 'Creating account…'
            : 'Signing in…'
          : creating
            ? 'Create account'
            : 'Sign in'}
      </button>
      <button
        className="self-center rounded-8 px-10 py-6 text-label-small text-foreground-muted transition-colors hover:text-accent-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100"
        disabled={pending}
        type="button"
        onClick={switchMode}
      >
        {creating
          ? 'Already have an account? Sign in'
          : 'New here? Create an account'}
      </button>
    </form>
  )
}
