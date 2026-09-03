import type { OauthFlowErrorCode } from '@convex-dev/auth/providers/oauth/react'
import type {
  SignInWithPasswordResult,
  SignUpWithPasswordResult,
} from '@convex-dev/auth/providers/password/react'

export type PasswordUserError = Extract<
  SignInWithPasswordResult | SignUpWithPasswordResult,
  { success: false }
>['userError']

// Sign-in and sign-up failures share one voice. Credential misses are
// reported identically so the form never confirms whether a username exists.
export function passwordErrorCopy(error: PasswordUserError): string {
  switch (error.error) {
    case 'INVALID_CREDENTIALS':
    case 'USER_NOT_FOUND':
      return 'That username and password don’t match.'
    case 'RATE_LIMITED':
      return `Too many attempts. Try again in ${Math.max(1, Math.ceil(error.retryAfterMs / 1000))} seconds.`
    case 'PASSWORD_TOO_SHORT':
      return `Use at least ${error.minimumLength} characters.`
    case 'PASSWORD_TOO_LONG':
      return `Use at most ${error.maximumLength} characters.`
    case 'PASSWORD_HAS_SURROUNDING_WHITESPACE':
      return 'A password can’t start or end with a space.'
    case 'PASSWORD_TOO_COMMON':
      return 'That password is too common. Choose something less guessable.'
    case 'USERNAME_TAKEN':
      return 'That username is taken.'
    case 'USERNAME_TOO_SHORT':
      return 'Enter a username.'
    case 'USERNAME_HAS_SURROUNDING_WHITESPACE':
      return 'A username can’t start or end with a space.'
    case 'USERNAME_HAS_INVALID_CHARACTERS':
      return 'That username contains characters we can’t accept.'
    case 'OTHER_ERROR':
      return 'Something went wrong. Try again.'
  }
}

export const GOOGLE_FLOW_ERROR_COPY = {
  access_denied: 'Google sign-in was cancelled.',
  expired: 'That sign-in took too long. Try again.',
  rejected: 'Google sign-in was declined.',
  oauth_error: 'Google sign-in did not complete. Try again.',
  invalid_flow: 'That sign-in can’t be finished here. Start again.',
} satisfies Record<OauthFlowErrorCode, string>
