import { useOauth } from '@convex-dev/auth/providers/oauth/react'

import { GOOGLE_FLOW_ERROR_COPY } from './authCopy'
import { GoogleSignInButton } from './GoogleSignInButton'
import { PasswordForm } from './PasswordForm'

export function SignInPage() {
  // A Google flow completes on whichever page it returns to, so its failure is
  // read here rather than inside the button that started it.
  const { flowError } = useOauth()

  return (
    <main className="min-h-dvh bg-background-base">
      <section className="mx-auto flex min-h-dvh w-full max-w-440 flex-col justify-center px-20 py-40">
        <p className="font-mono text-mono-small text-heat-100">FOUND</p>
        <h1 className="mt-12 text-title-h4 text-accent-black">
          Sign in to keep your research
        </h1>
        <p className="mt-10 text-body-medium text-foreground-muted">
          Threads, saved places, and outreach stay attached to your account.
        </p>
        <div className="mt-28 rounded-16 bg-background-lighter p-20 shadow-surface-compact">
          <GoogleSignInButton />
          {flowError ? (
            <p
              className="mt-10 text-body-small text-accent-crimson"
              role="alert"
            >
              {flowError.message ?? GOOGLE_FLOW_ERROR_COPY[flowError.code]}
            </p>
          ) : null}
          <div
            aria-hidden
            className="my-18 flex items-center gap-12 text-mono-x-small text-foreground-muted"
          >
            <span className="h-1 flex-1 bg-border-faint" />
            or
            <span className="h-1 flex-1 bg-border-faint" />
          </div>
          <PasswordForm />
        </div>
      </section>
    </main>
  )
}
