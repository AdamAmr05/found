import './auth.css'

import { useOauth } from '@convex-dev/auth/providers/oauth/react'
import { domAnimation, LazyMotion, m, useReducedMotion } from 'motion/react'
import { useState } from 'react'

import { GOOGLE_FLOW_ERROR_COPY } from './authCopy'
import { AuthDitherShader } from './AuthDitherShader'
import { GoogleSignInButton } from './GoogleSignInButton'
import { PasswordForm, type PasswordMode } from './PasswordForm'

const AUTH_SHADER_TONE = { r: 1, g: 1, b: 1 } as const

export function SignInPage() {
  // A Google flow completes on whichever page it returns to, so its failure is
  // read here rather than inside the button that started it.
  const { flowError } = useOauth()
  const [mode, setMode] = useState<PasswordMode>('sign-in')
  const prefersReducedMotion = useReducedMotion()
  const entrance = prefersReducedMotion ? false : { opacity: 0, y: 20 }

  return (
    <LazyMotion features={domAnimation}>
      <div className="auth-shell">
        <div className="auth-visual-wrap" aria-hidden="true">
          <m.aside
            className="auth-visual"
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <div className="auth-visual-shader">
              <AuthDitherShader tone={AUTH_SHADER_TONE} />
            </div>
            <div className="auth-visual-scrim" />
            <div className="auth-visual-content">
              <m.div
                className="auth-brand"
                initial={prefersReducedMotion ? false : { opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                FOUND
              </m.div>
              <m.h2
                initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                Find a place
                <br />
                worth moving for.
              </m.h2>
            </div>
          </m.aside>
        </div>

        <main className="auth-form-panel">
          <m.div
            className="auth-card"
            initial={entrance}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="auth-mobile-brand">FOUND</div>
            <header className="auth-header">
              <h1>{mode === 'sign-in' ? 'Sign in' : 'Create your account'}</h1>
            </header>
            <GoogleSignInButton />
            <div className="auth-divider">
              <span>or</span>
            </div>
            {flowError ? (
              <p className="auth-error" role="alert">
                {flowError.message ?? GOOGLE_FLOW_ERROR_COPY[flowError.code]}
              </p>
            ) : null}
            <PasswordForm mode={mode} onModeChange={setMode} />
          </m.div>
        </main>
      </div>
    </LazyMotion>
  )
}
