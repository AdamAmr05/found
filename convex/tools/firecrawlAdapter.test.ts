import { describe, expect, it } from 'vitest'

import {
  MAX_PAGE_CONTENT_LENGTH,
  normalizePageResponse,
  normalizeSearchResponse,
} from './firecrawlAdapter'

describe('Firecrawl result normalization', () => {
  it('drops malformed and duplicate search results without inventing fields', () => {
    const output = normalizeSearchResponse(
      {
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
      },
      5,
    )

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

  it('keeps a focused answer and removes unsafe image payloads', () => {
    const output = normalizePageResponse(
      {
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
      },
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

  it('reports empty and truncated pages explicitly', () => {
    const empty = normalizePageResponse({}, 'https://example.com/empty', 'full')
    const long = normalizePageResponse(
      { markdown: 'x'.repeat(MAX_PAGE_CONTENT_LENGTH + 10) },
      'https://example.com/long',
      'full',
    )

    expect(empty.warning).toBe('The page returned no readable content.')
    expect(long.content).toHaveLength(MAX_PAGE_CONTENT_LENGTH)
    expect(long.truncated).toBe(true)
  })
})
