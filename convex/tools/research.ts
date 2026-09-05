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
  firecrawlRequestErrorFromCause,
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
        catch: firecrawlRequestErrorFromCause,
      }).pipe(Effect.flatMap(decodeSearchResponse)),
    )
    return normalizeSearchResponse(decoded, limit)
  },
})

export const readPage = createTool({
  description: [
    'Read a single known web page through Firecrawl.',
    'Returns page content, images, extracted links, and source HTTP status when available. Links are navigation leads, not evidence that their target pages were read.',
    'Pass focus for a compact answer to a specific question. Omit focus to inspect source wording and linked listing identities directly, especially on directory pages.',
    'Follow relevant returned links to the individual property or operator page. If linksTruncated is true and the desired listing is absent, use a targeted search for its exact title instead of guessing its URL.',
    'Use fresh only when checking current details or refreshing stale evidence. A fresh scrape cannot confirm dates hidden behind a booking calendar.',
  ].join(' '),
  inputSchema: readPageInputSchema,
  outputSchema: readPageOutputSchema,
  execute: async (ctx, input) => {
    const mode = input.focus ? 'focused' : 'full'
    const options: ScrapeOptions = {
      onlyMainContent: true,
      removeBase64Images: true,
      blockAds: true,
      maxAge: input.fresh ? 0 : 86_400_000,
    }
    if (input.focus) {
      options.extra = {
        formats: [
          {
            type: 'question',
            question: `${input.focus}\nKeep each property's facts separate. Include exact listing URLs and short supporting source quotations when present. State what the page does not establish; do not infer missing dates, prices, or contact details.`,
          },
          'images',
          'links',
        ],
      }
    } else {
      options.formats = ['markdown', 'images', 'links']
    }
    const decoded = await runFirecrawlOperation(
      'read',
      Effect.tryPromise({
        try: () => firecrawl.scrape(ctx, input.url, options),
        catch: firecrawlRequestErrorFromCause,
      }).pipe(Effect.flatMap(decodePageResponse)),
    )
    return normalizePageResponse(decoded, input.url, mode)
  },
})
