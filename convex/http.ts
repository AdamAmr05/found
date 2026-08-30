import {
  verifyAgentMailWebhook,
  WebhookVerificationError,
} from '@agentmail/convex'
import { createFunctionHandle, httpRouter } from 'convex/server'

import { components, internal } from './_generated/api'
import { env, httpAction } from './_generated/server'

const http = httpRouter()

http.route({
  path: '/agentmail/webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const secret = env.AGENTMAIL_WEBHOOK_SECRET
    if (!secret)
      return new Response('webhook is not configured', { status: 503 })
    const rawBody = await request.text()
    let event
    try {
      event = verifyAgentMailWebhook(secret, rawBody, {
        'svix-id': request.headers.get('svix-id'),
        'svix-timestamp': request.headers.get('svix-timestamp'),
        'svix-signature': request.headers.get('svix-signature'),
      })
    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        return new Response('invalid signature', { status: 401 })
      }
      throw error
    }
    const fnHandle = await createFunctionHandle(
      internal.outreachDelivery.onMessageReceived,
    )
    const eventHandle = await createFunctionHandle(
      internal.outreachDelivery.onEvent,
    )
    await ctx.runMutation(components.agentmail.lib.handleEvent, {
      config: {
        retryAttempts: 5,
        initialBackoffMs: 30_000,
        onMessageReceived: { fnHandle },
        onEvent: { fnHandle: eventHandle },
      },
      event,
    })
    return new Response(null, { status: 204 })
  }),
})

export default http
