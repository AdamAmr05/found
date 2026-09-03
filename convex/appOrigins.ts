import { env } from './_generated/server'

// Vite serves the app on these origins during development and Playwright runs.
const LOCAL_APP_ORIGINS = ['http://127.0.0.1:3000', 'http://localhost:3000']

/**
 * Browser origins an OAuth flow may redirect back to. Anything else is an
 * open redirect, so the list is explicit rather than derived from a request.
 */
export function allowedAppOrigins(): string[] {
  const productionOrigin = env.APP_ORIGIN
  return productionOrigin
    ? [...LOCAL_APP_ORIGINS, productionOrigin]
    : LOCAL_APP_ORIGINS
}
