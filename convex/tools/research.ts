import { createTool } from '@convex-dev/agent'
import { FirecrawlClient } from '@firecrawl/firecrawl-convex'
import type { ScrapeOptions, SearchOptions } from '@firecrawl/firecrawl-convex'
import { Effect } from 'effect'

import {
  readPageInputSchema,
  readPageOutputSchema,
  searchWebInputSchema,
  searchWebOutputSchema,
} from '../../shared/foundTools'
import { components } from '../_generated/api'
import {
  DEFAULT_SEARCH_LIMIT,
  decodePageResponse,
  decodeSearchResponse,
  normalizePageResponse,
  normalizeSearchResponse,
  runFirecrawlOperation,
} from './firecrawlAdapter'

const firecrawl = new FirecrawlClient(components.firecrawl)

export const searchWeb = createTool({
  description: [
    'Search the web for relevant URLs, titles, and snippets.',
    'Use this first when you do not know the exact page.',
    'Compare several results before choosing which pages to read.',
    'Search operators such as site:, inurl:, quotes, and exclusions are supported.',
  ].join(' '),
  inputSchema: searchWebInputSchema,
  outputSchema: searchWebOutputSchema,
  execute: async (ctx, input) => {
    const limit = input.limit ?? DEFAULT_SEARCH_LIMIT
    const options: SearchOptions = {
      limit,
      sources: ['web'],
    }
    if (input.location) options.location = input.location
    const decoded = await runFirecrawlOperation(
      'search',
      Effect.tryPromise({
        try: () => firecrawl.search(ctx, input.query, options),
        catch: () => 'request_failed' as const,
      }).pipe(Effect.flatMap(decodeSearchResponse)),
    )
    return normalizeSearchResponse(decoded, limit)
  },
})

export const readPage = createTool({
  description: [
    'Read a single known web page through Firecrawl.',
    'Pass focus for a compact answer to a specific question.',
    'Omit focus only when the complete page content is genuinely needed.',
    'Use searchWeb before this when you do not know the exact URL.',
  ].join(' '),
  inputSchema: readPageInputSchema,
  outputSchema: readPageOutputSchema,
  execute: async (ctx, input) => {
    const mode = input.focus ? 'focused' : 'full'
    const options: ScrapeOptions = {
      onlyMainContent: true,
      removeBase64Images: true,
      blockAds: true,
      maxAge: 86_400_000,
    }
    if (input.focus) {
      options.extra = {
        formats: [{ type: 'question', question: input.focus }, 'images'],
      }
    } else {
      options.formats = ['markdown', 'images']
    }
    const decoded = await runFirecrawlOperation(
      'read',
      Effect.tryPromise({
        try: () => firecrawl.scrape(ctx, input.url, options),
        catch: () => 'request_failed' as const,
      }).pipe(Effect.flatMap(decodePageResponse)),
    )
    return normalizePageResponse(decoded, input.url, mode)
  },
})
