import { ConvexError } from 'convex/values'
import { Effect, Schema } from 'effect'

import {
  HTTP_URL_MAX_LENGTH,
  PAGE_CONTENT_MAX_LENGTH,
  PAGE_IMAGE_MAX_COUNT,
  PAGE_WARNING_MAX_LENGTH,
  PROVIDER_DESCRIPTION_MAX_LENGTH,
  PROVIDER_TITLE_MAX_LENGTH,
  type ReadPageOutput,
  type SearchWebOutput,
} from '../../shared/foundTools'
import { isHttpUrl } from '../../shared/httpUrl'
import { truncateText } from '../../shared/text'

export const DEFAULT_SEARCH_LIMIT = 5

type FirecrawlOperation = 'read' | 'search'

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

export function runFirecrawlOperation<A, E>(
  operation: FirecrawlOperation,
  effect: Effect.Effect<A, E>,
): Promise<A> {
  return Effect.runPromise(
    Effect.mapError(
      effect,
      () =>
        new ConvexError({
          code: 'FIRECRAWL_OPERATION_FAILED',
          operation,
        }),
    ),
  )
}

function nonEmpty(value: string | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

function isContractUrl(value: string): boolean {
  return value.length <= HTTP_URL_MAX_LENGTH && isHttpUrl(value)
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
    if (!url || !isContractUrl(url) || seen.has(url)) continue

    seen.add(url)
    const title = nonEmpty(result.title ?? metadata?.title)
    const description = nonEmpty(result.description ?? metadata?.description)
    const normalized: SearchWebOutput['results'][number] = { url }
    if (title) {
      normalized.title = truncateText(title, PROVIDER_TITLE_MAX_LENGTH)
    }
    if (description) {
      normalized.description = truncateText(
        description,
        PROVIDER_DESCRIPTION_MAX_LENGTH,
      )
    }
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
  const truncated = rawContent.length > PAGE_CONTENT_MAX_LENGTH
  const sourceUrl = nonEmpty(
    document.metadata?.sourceURL ?? document.metadata?.url,
  )
  const url = sourceUrl && isContractUrl(sourceUrl) ? sourceUrl : requestedUrl
  const images = Array.from(
    new Set(
      (document.images ?? []).filter(
        (image) => !image.startsWith('data:') && isContractUrl(image),
      ),
    ),
  ).slice(0, PAGE_IMAGE_MAX_COUNT)
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
    content: truncateText(rawContent, PAGE_CONTENT_MAX_LENGTH),
    images,
    truncated,
  }
  if (title) output.title = truncateText(title, PROVIDER_TITLE_MAX_LENGTH)
  if (description) {
    output.description = truncateText(
      description,
      PROVIDER_DESCRIPTION_MAX_LENGTH,
    )
  }
  if (warning) {
    output.warning = truncateText(warning, PAGE_WARNING_MAX_LENGTH)
  }
  return output
}
