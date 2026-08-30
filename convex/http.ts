import { AgentMail } from '@agentmail/convex'
import { httpRouter } from 'convex/server'

import { components, internal } from './_generated/api'
import { env, httpAction } from './_generated/server'

const http = httpRouter()
const agentmail = new AgentMail(components.agentmail, {
  webhookSecret: env.AGENTMAIL_WEBHOOK_SECRET ?? '',
  onEvent: internal.outreachDelivery.onEvent,
  onMessageReceived: internal.outreachDelivery.onMessageReceived,
})

http.route({
  path: '/agentmail/webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    if (!env.AGENTMAIL_WEBHOOK_SECRET) {
      return new Response('webhook is not configured', { status: 503 })
    }
    return await agentmail.handleWebhook(ctx, request)
  }),
})

export default http
