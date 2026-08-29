import agent from '@convex-dev/agent/convex.config'
import rateLimiter from '@convex-dev/rate-limiter/convex.config'
import firecrawl from '@firecrawl/firecrawl-convex/convex.config'
import { defineApp } from 'convex/server'
import { v } from 'convex/values'

const app = defineApp({
  env: {
    FIRECRAWL_API_KEY: v.string(),
    FIRECRAWL_WEBHOOK_SECRET: v.optional(v.string()),
    GOOGLE_MAPS_API_KEY: v.string(),
    OPENAI_API_KEY: v.string(),
  },
})

app.use(agent)
app.use(rateLimiter)
app.use(firecrawl, {
  httpPrefix: '/firecrawl/',
  env: {
    FIRECRAWL_API_KEY: app.env.FIRECRAWL_API_KEY,
    FIRECRAWL_WEBHOOK_SECRET: app.env.FIRECRAWL_WEBHOOK_SECRET,
  },
})

export default app
