import type {
  FirecrawlDocument,
  SearchResponse,
} from '@firecrawl/firecrawl-convex'
import { z } from 'zod'

import type { ReadPageOutput, SearchWebOutput } from '../../shared/foundTools'

export const DEFAULT_SEARCH_LIMIT = 5
export const MAX_PAGE_CONTENT_LENGTH = 16_000

const providerMetadataSchema = z.object({
  description: z.string().optional(),
  sourceURL: z.string().optional(),
  title: z.string().optional(),
  url: z.string().optional(),
})

const providerSearchResponseSchema = z.object({
  web: z
    .array(
      z.object({
        description: z.string().optional(),
        metadata: providerMetadataSchema.optional(),
        title: z.string().optional(),
        url: z.string().optional(),
      }),
    )
    .optional(),
})

const providerPageSchema = z.object({
  answer: z.string().optional(),
  images: z.array(z.string()).optional(),
  markdown: z.string().optional(),
  metadata: providerMetadataSchema.optional(),
  summary: z.string().optional(),
  warning: z.string().optional(),
})

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function nonEmpty(value: string | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

export function normalizeSearchResponse(
  response: SearchResponse,
  limit: number,
): SearchWebOutput {
  const parsed = providerSearchResponseSchema.parse(response)
  const results: SearchWebOutput['results'] = []
  const seen = new Set<string>()

  for (const result of parsed.web ?? []) {
    const metadata = result.metadata
    const url = nonEmpty(result.url ?? metadata?.sourceURL)
    if (!url || !isHttpUrl(url) || seen.has(url)) continue

    seen.add(url)
    const title = nonEmpty(result.title ?? metadata?.title)
    const description = nonEmpty(result.description ?? metadata?.description)
    const normalized: SearchWebOutput['results'][number] = { url }
    if (title) normalized.title = title.slice(0, 300)
    if (description) normalized.description = description.slice(0, 600)
    results.push(normalized)
    if (results.length === limit) break
  }

  return { results }
}

export function normalizePageResponse(
  document: FirecrawlDocument,
  requestedUrl: string,
  mode: ReadPageOutput['mode'],
): ReadPageOutput {
  const parsed = providerPageSchema.parse(document)
  const focusedAnswer = nonEmpty(parsed.answer)
  const rawContent =
    focusedAnswer ?? nonEmpty(parsed.markdown) ?? nonEmpty(parsed.summary) ?? ''
  const truncated = rawContent.length > MAX_PAGE_CONTENT_LENGTH
  const sourceUrl = nonEmpty(parsed.metadata?.sourceURL ?? parsed.metadata?.url)
  const url = sourceUrl && isHttpUrl(sourceUrl) ? sourceUrl : requestedUrl
  const images = Array.from(
    new Set(
      (parsed.images ?? []).filter(
        (image) => !image.startsWith('data:') && isHttpUrl(image),
      ),
    ),
  ).slice(0, 12)
  const title = nonEmpty(parsed.metadata?.title)
  const description = nonEmpty(parsed.metadata?.description)
  const providerWarning = nonEmpty(parsed.warning)
  const emptyWarning = rawContent
    ? undefined
    : 'The page returned no readable content.'
  const warning = providerWarning ?? emptyWarning

  const output: ReadPageOutput = {
    url,
    mode,
    content: rawContent.slice(0, MAX_PAGE_CONTENT_LENGTH),
    images,
    truncated,
  }
  if (title) output.title = title.slice(0, 300)
  if (description) output.description = description.slice(0, 600)
  if (warning) output.warning = warning.slice(0, 500)
  return output
}
