import { vThreadDoc } from '@convex-dev/agent/validators'
import {
  paginationOptsValidator,
  paginationResultValidator,
} from 'convex/server'

import { components } from './_generated/api'
import { query } from './_generated/server'
import { requireViewerId } from './viewer'

export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(vThreadDoc),
  handler: async (ctx, args) => {
    const userId = await requireViewerId(ctx)
    return await ctx.runQuery(components.agent.threads.listThreadsByUserId, {
      userId,
      order: 'desc',
      paginationOpts: {
        ...args.paginationOpts,
        numItems: Math.min(args.paginationOpts.numItems, 50),
      },
    })
  },
})
