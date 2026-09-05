import { ConvexError } from 'convex/values'
import { Effect, Predicate, Schema } from 'effect'

import {
  HTTP_URL_MAX_LENGTH,
  PAGE_CONTENT_MAX_LENGTH,
  PAGE_IMAGE_MAX_COUNT,
  PAGE_LINK_MAX_COUNT,
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

export class FirecrawlRequestError extends Schema.TaggedError<FirecrawlRequestError>()(
  'FirecrawlRequestError',
  {
    cause: Schema.Defect(),
    providerCode: Schema.String,
    providerPath: Schema.String,
    providerStatus: Schema.String,
  },
) {}

// oxlint-disable-next-line anti-slop/no-unknown-parameters -- A rejected provider Promise is untrusted here and is immediately reduced to safe diagnostics.
export function firecrawlRequestErrorFromCause(cause: unknown) {
  const data =
    cause instanceof ConvexError && Predicate.isObject(cause.data)
      ? cause.data
      : undefined
  const code = data?.code
  const path = data?.path
  const status = data?.status

  return new FirecrawlRequestError({
    cause,
    providerCode: Predicate.isString(code) ? code : 'unknown',
    providerPath: Predicate.isString(path) ? path : 'unknown',
    providerStatus: Predicate.isNumber(status) ? String(status) : 'unknown',
  })
}

const providerMetadataSchema = Schema.Struct({
  statusCode: Schema.optionalKey(
    Schema.Int.check(Schema.isBetween({ minimum: 100, maximum: 599 })),
  ),
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
  links: Schema.optionalKey(Schema.Array(Schema.String)),
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

type FirecrawlFailure = FirecrawlRequestError | Schema.SchemaError

function logFirecrawlFailure(
  operation: FirecrawlOperation,
  error: FirecrawlFailure,
) {
  const annotations =
    error instanceof FirecrawlRequestError
      ? {
          failureKind: 'request',
          providerCode: error.providerCode,
          providerPath: error.providerPath,
          providerStatus: error.providerStatus,
        }
      : {
          failureKind: 'response_decode',
          providerError: error.name,
        }

  return Effect.logError('Firecrawl operation failed').pipe(
    Effect.annotateLogs({ operation, ...annotations }),
  )
}

export function runFirecrawlOperation<A>(
  operation: FirecrawlOperation,
  effect: Effect.Effect<A, FirecrawlFailure>,
): Promise<A> {
  return Effect.runPromise(
    effect.pipe(
      Effect.tapError((error) => logFirecrawlFailure(operation, error)),
      Effect.mapError(
        () =>
          new ConvexError({
            code: 'FIRECRAWL_OPERATION_FAILED',
            operation,
          }),
      ),
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

function pageNavigation(links: readonly string[] | undefined) {
  if (!links) return {}
  const validLinks = Array.from(
    new Set(links.map((link) => link.trim()).filter(isContractUrl)),
  )
  return {
    links: validLinks.slice(0, PAGE_LINK_MAX_COUNT),
    linksTruncated: validLinks.length > PAGE_LINK_MAX_COUNT,
  }
}

function pageStatus(
  metadata: ProviderPage['metadata'],
): Pick<ReadPageOutput, 'statusCode' | 'warning'> {
  const statusCode = metadata?.statusCode
  if (statusCode === undefined) return {}
  const failed = (statusCode < 200 || statusCode >= 300) && statusCode !== 304
  if (failed) {
    return {
      statusCode,
      warning: `The source page returned HTTP ${statusCode}; do not treat it as listing evidence.`,
    }
  }
  return { statusCode }
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
  const status = pageStatus(document.metadata)
  const warning = status.warning ?? providerWarning ?? emptyWarning

  const output: ReadPageOutput = {
    ...pageNavigation(document.links),
    ...status,
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
