import agent from '@convex-dev/agent/convex.config'
import auth from '@convex-dev/auth/core/convex.config'
import oauth from '@convex-dev/auth/providers/oauth/convex.config'
import passwordProvider from '@convex-dev/auth/providers/password/convex.config'
import username from '@convex-dev/auth/username/convex.config'
import rateLimiter from '@convex-dev/rate-limiter/convex.config'
import firecrawl from '@firecrawl/firecrawl-convex/convex.config'
import agentmail from '@agentmail/convex/convex.config'
import { defineApp } from 'convex/server'
import { v } from 'convex/values'

const app = defineApp({
  env: {
    AGENTMAIL_API_KEY: v.optional(v.string()),
    AGENTMAIL_INBOX_ID: v.optional(v.string()),
    AGENTMAIL_WEBHOOK_SECRET: v.optional(v.string()),
    // Production browser origin allowed to finish Google sign-in. Local dev
    // origins are always allowed; see appOrigins.ts.
    APP_ORIGIN: v.optional(v.string()),
    AUTH_GOOGLE_ID: v.string(),
    AUTH_GOOGLE_SECRET: v.string(),
    AUTH_JWKS: v.string(),
    AUTH_PRIVATE_KEY: v.string(),
    FIRECRAWL_API_KEY: v.string(),
    FIRECRAWL_WEBHOOK_SECRET: v.optional(v.string()),
    GOOGLE_MAPS_API_KEY: v.string(),
    OPENAI_API_KEY: v.string(),
  },
})

app.use(agent)
app.use(agentmail, {
  env: {
    AGENTMAIL_API_KEY: app.env.AGENTMAIL_API_KEY,
    AGENTMAIL_WEBHOOK_SECRET: app.env.AGENTMAIL_WEBHOOK_SECRET,
  },
})
// Convex Auth v2: the core mints sessions and serves its JWKS at
// /auth/.well-known/jwks.json, which auth.config.ts trusts.
app.use(auth, {
  httpPrefix: '/auth',
  env: {
    AUTH_PRIVATE_KEY: app.env.AUTH_PRIVATE_KEY,
    AUTH_JWKS: app.env.AUTH_JWKS,
  },
})
// Google's registered redirect URI is `${CONVEX_SITE_URL}/oauth/google/callback`.
app.use(oauth, {
  name: 'oauthGoogle',
  httpPrefix: '/oauth/google',
  env: {
    CLIENT_ID: app.env.AUTH_GOOGLE_ID,
    CLIENT_SECRET: app.env.AUTH_GOOGLE_SECRET,
  },
})
app.use(passwordProvider)
app.use(username)
app.use(rateLimiter)
app.use(firecrawl, {
  httpPrefix: '/firecrawl/',
  env: {
    FIRECRAWL_API_KEY: app.env.FIRECRAWL_API_KEY,
    FIRECRAWL_WEBHOOK_SECRET: app.env.FIRECRAWL_WEBHOOK_SECRET,
  },
})

export default app
