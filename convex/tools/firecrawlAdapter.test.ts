import { describe, expect, it } from 'vitest'
import { ConvexError } from 'convex/values'
import { Effect } from 'effect'

import {
  HTTP_URL_MAX_LENGTH,
  PAGE_CONTENT_MAX_LENGTH,
  PAGE_LINK_MAX_COUNT,
  PROVIDER_TITLE_MAX_LENGTH,
} from '../../shared/foundTools'
import {
  decodePageResponse,
  decodeSearchResponse,
  firecrawlRequestErrorFromCause,
  normalizePageResponse,
  normalizeSearchResponse,
  runFirecrawlOperation,
} from './firecrawlAdapter'

describe('Firecrawl result normalization', () => {
  it('preserves followable listing links from a focused directory read', async () => {
    const document = await Effect.runPromise(
      decodePageResponse({
        answer: 'Two furnished apartments have desks.',
        links: [
          'https://example.com/listings/one',
          'https://example.com/listings/one',
          'javascript:alert(1)',
          'mailto:host@example.com',
          'https://example.com/listings/two',
        ],
      }),
    )

    expect(
      normalizePageResponse(
        document,
        'https://example.com/listings',
        'focused',
      ),
    ).toMatchObject({
      content: 'Two furnished apartments have desks.',
      links: [
        'https://example.com/listings/one',
        'https://example.com/listings/two',
      ],
      linksTruncated: false,
    })
  })

  it('reports a blocked target page even when Firecrawl returns readable text', async () => {
    const document = await Effect.runPromise(
      decodePageResponse({
        markdown: 'Access denied',
        metadata: { statusCode: 403 },
      }),
    )

    expect(
      normalizePageResponse(document, 'https://example.com/listing', 'full'),
    ).toMatchObject({
      statusCode: 403,
      warning:
        'The source page returned HTTP 403; do not treat it as listing evidence.',
    })
  })

  it('bounds navigation links and reports when a directory has more to explore', async () => {
    const links = Array.from(
      { length: PAGE_LINK_MAX_COUNT + 1 },
      (_, index) => `https://example.com/listing/${index}`,
    )
    const document = await Effect.runPromise(decodePageResponse({ links }))
    const output = normalizePageResponse(
      document,
      'https://example.com',
      'full',
    )

    expect(output.links).toEqual(links.slice(0, PAGE_LINK_MAX_COUNT))
    expect(output.linksTruncated).toBe(true)
  })

  it('preserves provider warnings on successful and cache-validated pages', async () => {
    for (const statusCode of [200, 304]) {
      const document = await Effect.runPromise(
        decodePageResponse({
          markdown: 'Listing details',
          metadata: { statusCode },
          warning: 'Some content was unavailable',
        }),
      )

      expect(
        normalizePageResponse(document, 'https://example.com', 'full'),
      ).toMatchObject({ statusCode, warning: 'Some content was unavailable' })
    }
  })

  it('drops unusable and duplicate search results without inventing fields', async () => {
    const response = await Effect.runPromise(
      decodeSearchResponse({
        web: [
          { url: 'not a url', title: 'Bad' },
          { url: 'https://example.com/a', title: '  First  ' },
          { url: 'https://example.com/a', title: 'Duplicate' },
          {
            metadata: {
              sourceURL: 'https://example.com/b',
              description: '  Second result  ',
            },
          },
        ],
      }),
    )
    const output = normalizeSearchResponse(response, 5)

    expect(output).toEqual({
      results: [
        { url: 'https://example.com/a', title: 'First' },
        {
          url: 'https://example.com/b',
          description: 'Second result',
        },
      ],
    })
  })

  it('keeps a focused answer and removes unsafe image payloads', async () => {
    const document = await Effect.runPromise(
      decodePageResponse({
        answer: ' Registration is allowed. ',
        markdown: 'This should not win.',
        images: [
          'data:image/png;base64,abc',
          'https://example.com/room.jpg',
          'https://example.com/room.jpg',
        ],
        metadata: {
          sourceURL: 'https://example.com/listing',
          title: ' Listing ',
        },
      }),
    )
    const output = normalizePageResponse(
      document,
      'https://example.com/original',
      'focused',
    )

    expect(output).toMatchObject({
      content: 'Registration is allowed.',
      images: ['https://example.com/room.jpg'],
      mode: 'focused',
      title: 'Listing',
      truncated: false,
      url: 'https://example.com/listing',
    })
  })

  it('reports empty and truncated pages explicitly', async () => {
    const emptyDocument = await Effect.runPromise(decodePageResponse({}))
    const longDocument = await Effect.runPromise(
      decodePageResponse({
        markdown: 'x'.repeat(PAGE_CONTENT_MAX_LENGTH + 10),
      }),
    )
    const empty = normalizePageResponse(
      emptyDocument,
      'https://example.com/empty',
      'full',
    )
    const long = normalizePageResponse(
      longDocument,
      'https://example.com/long',
      'full',
    )

    expect(empty.warning).toBe('The page returned no readable content.')
    expect(long.content).toHaveLength(PAGE_CONTENT_MAX_LENGTH)
    expect(long.truncated).toBe(true)
  })

  it('drops provider URLs that exceed the public tool contract', async () => {
    const oversizedUrl = `https://example.com/${'a'.repeat(HTTP_URL_MAX_LENGTH)}`
    const response = await Effect.runPromise(
      decodeSearchResponse({ web: [{ url: oversizedUrl }] }),
    )
    const document = await Effect.runPromise(
      decodePageResponse({
        images: [oversizedUrl],
        metadata: { sourceURL: oversizedUrl },
      }),
    )

    expect(normalizeSearchResponse(response, 5)).toEqual({ results: [] })
    expect(
      normalizePageResponse(document, 'https://example.com/requested', 'full'),
    ).toMatchObject({
      images: [],
      url: 'https://example.com/requested',
    })
  })

  it('does not split a surrogate pair while clamping provider text', async () => {
    const title = `${'x'.repeat(PROVIDER_TITLE_MAX_LENGTH - 1)}😀trailing`
    const response = await Effect.runPromise(
      decodeSearchResponse({ web: [{ title, url: 'https://example.com' }] }),
    )

    expect(normalizeSearchResponse(response, 5).results[0]?.title).toBe(
      'x'.repeat(PROVIDER_TITLE_MAX_LENGTH - 1),
    )
  })

  it('replaces provider and decode failures with one compact error', async () => {
    const providerFailure = firecrawlRequestErrorFromCause(
      new ConvexError({
        code: 'firecrawl_request_failed',
        message: 'private provider payload',
        path: '/v2/scrape',
        status: 401,
      }),
    )

    expect(providerFailure).toMatchObject({
      providerCode: 'firecrawl_request_failed',
      providerPath: '/v2/scrape',
      providerStatus: '401',
    })
    await expect(
      runFirecrawlOperation('read', Effect.fail(providerFailure)),
    ).rejects.toMatchObject({
      data: {
        code: 'FIRECRAWL_OPERATION_FAILED',
        operation: 'read',
      },
    })
  })

  it('rejects malformed provider payloads before normalization', async () => {
    await expect(
      Effect.runPromise(decodeSearchResponse({ web: [{ url: 42 }] })),
    ).rejects.toBeDefined()
    await expect(
      Effect.runPromise(decodePageResponse({ images: [null] })),
    ).rejects.toBeDefined()
  })
})
