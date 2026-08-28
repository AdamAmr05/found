import { Schema } from 'effect'

import type { ReadPageOutput, SearchWebOutput } from '../../shared/foundTools'
import { isHttpUrl } from '../../shared/httpUrl'

export const DEFAULT_SEARCH_LIMIT = 5
export const MAX_PAGE_CONTENT_LENGTH = 16_000

const providerMetadataSchema = Schema.Struct({
  description: Schema.optionalKey(Schema.String),
  sourceURL: Schema.optionalKey(Schema.String),
  title: Schema.optionalKey(Schema.String),
  url: Schema.optionalKey(Schema.String),
})

const providerSearchResponseSchema = Schema.Struct({
  web: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        description: Schema.optionalKey(Schema.String),
        metadata: Schema.optionalKey(providerMetadataSchema),
        title: Schema.optionalKey(Schema.String),
        url: Schema.optionalKey(Schema.String),
      }),
    ),
  ),
})

const providerPageSchema = Schema.Struct({
  answer: Schema.optionalKey(Schema.String),
  images: Schema.optionalKey(Schema.Array(Schema.String)),
  markdown: Schema.optionalKey(Schema.String),
  metadata: Schema.optionalKey(providerMetadataSchema),
  summary: Schema.optionalKey(Schema.String),
  warning: Schema.optionalKey(Schema.String),
})

type ProviderPage = Schema.Schema.Type<typeof providerPageSchema>
type ProviderSearchResponse = Schema.Schema.Type<
  typeof providerSearchResponseSchema
>

export const decodePageResponse = Schema.decodeUnknownEffect(providerPageSchema)
export const decodeSearchResponse = Schema.decodeUnknownEffect(
  providerSearchResponseSchema,
)

function nonEmpty(value: string | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

export function normalizeSearchResponse(
  response: ProviderSearchResponse,
  limit: number,
): SearchWebOutput {
  const results: SearchWebOutput['results'] = []
  const seen = new Set<string>()

  for (const result of response.web ?? []) {
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
  document: ProviderPage,
  requestedUrl: string,
  mode: ReadPageOutput['mode'],
): ReadPageOutput {
  const focusedAnswer = nonEmpty(document.answer)
  const rawContent =
    focusedAnswer ??
    nonEmpty(document.markdown) ??
    nonEmpty(document.summary) ??
    ''
  const truncated = rawContent.length > MAX_PAGE_CONTENT_LENGTH
  const sourceUrl = nonEmpty(
    document.metadata?.sourceURL ?? document.metadata?.url,
  )
  const url = sourceUrl && isHttpUrl(sourceUrl) ? sourceUrl : requestedUrl
  const images = Array.from(
    new Set(
      (document.images ?? []).filter(
        (image) => !image.startsWith('data:') && isHttpUrl(image),
      ),
    ),
  ).slice(0, 12)
  const title = nonEmpty(document.metadata?.title)
  const description = nonEmpty(document.metadata?.description)
  const providerWarning = nonEmpty(document.warning)
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
