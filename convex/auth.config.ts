import type { AuthConfig } from 'convex/server'

// Evaluated at deploy time, before the generated typed `env` exists.
const siteUrl = process.env.CONVEX_SITE_URL
if (!siteUrl) {
  throw new Error('CONVEX_SITE_URL is required to configure Convex Auth')
}

// Convex Auth v2 signs its own access tokens. The deployment trusts them
// through the JWKS the auth core component serves under /auth.
export default {
  providers: [
    {
      type: 'customJwt',
      applicationID: 'convex',
      issuer: siteUrl,
      jwks: `${siteUrl}/auth/.well-known/jwks.json`,
      algorithm: 'RS256',
    },
  ],
} satisfies AuthConfig
