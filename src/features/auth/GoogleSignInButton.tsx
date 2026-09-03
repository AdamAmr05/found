import { useSignInWithGoogle } from '@convex-dev/auth/providers/oauth/react'
import { useState } from 'react'

import { api } from '../../../convex/_generated/api'
import { GoogleMark } from '~/components/icons/GoogleMark'

// Starting the flow navigates away; failures surface through useOauth on the
// page the flow returns to, so this button only tracks its own departure.
export function GoogleSignInButton() {
  const { signInGoogle } = useSignInWithGoogle(api.auth)
  const [leaving, setLeaving] = useState(false)

  async function start(): Promise<void> {
    setLeaving(true)
    try {
      await signInGoogle()
    } catch {
      setLeaving(false)
    }
  }

  return (
    <button
      className="auth-google-button"
      disabled={leaving}
      type="button"
      onClick={() => void start()}
    >
      <GoogleMark className="size-18" />
      {leaving ? 'Opening Google…' : 'Sign in with Google'}
    </button>
  )
}
