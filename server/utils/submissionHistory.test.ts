import { describe, expect, it } from 'vitest'
import type { AlgoliaStoryHit } from './algolia'
import {
  canonicalizeSubmissionUrl,
  selectSubmissionHistory,
  SUBMISSION_HISTORY_CANDIDATE_LIMIT,
} from './previousSubmissions'

const SOURCE_URL = 'https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models'
const SOURCE_TIMESTAMP = 1_785_012_155

const story = (
  objectID: string,
  created_at_i: number,
  overrides: Partial<AlgoliaStoryHit> = {},
): AlgoliaStoryHit => ({
  objectID,
  title: 'The new rules of context engineering for Claude 5 generation models',
  url: SOURCE_URL,
  created_at_i,
  created_at: new Date(created_at_i * 1000).toISOString(),
  points: 10,
  num_comments: 2,
  author: 'author',
  ...overrides,
})

describe('canonicalizeSubmissionUrl', () => {
  it('normalizes harmless source URL formatting and known tracking parameters', () => {
    expect(canonicalizeSubmissionUrl(
      'http://www.Example.com:80/path/%7Eauthor/?utm_source=hn&fbclid=123#section',
    )).toBe('example.com/path/~author')
  })

  it('sorts and preserves query parameters that can identify different targets', () => {
    expect(canonicalizeSubmissionUrl(
      'https://example.com/read?source=docs&ref=home&a=2&a=1',
    )).toBe('example.com/read?a=1&a=2&ref=home&source=docs')

    expect(canonicalizeSubmissionUrl('https://example.com/read?id=one'))
      .not.toBe(canonicalizeSubmissionUrl('https://example.com/read?id=two'))
  })

  it('rejects malformed, credentialed, and non-HTTP URLs', () => {
    expect(canonicalizeSubmissionUrl('not a URL')).toBe('')
    expect(canonicalizeSubmissionUrl('javascript:alert(1)')).toBe('')
    expect(canonicalizeSubmissionUrl('https://user:pass@example.com/article')).toBe('')
  })
})

describe('selectSubmissionHistory', () => {
  const exampleHits = [
    story('49051361', SOURCE_TIMESTAMP, { points: 462, num_comments: 404, author: 'mellosouls' }),
    story('49040821', 1_784_922_758, { points: 14, num_comments: 1, author: 'opwizardx' }),
    story('49046425', 1_784_976_246, { points: 6, num_comments: 0, author: 'e2e4' }),
  ]

  it('returns the same chronological history for every matching item page', () => {
    const expectedIds = ['49040821', '49046425', '49051361']

    for (const currentStory of exampleHits) {
      const submissions = selectSubmissionHistory(exampleHits, currentStory)

      expect(submissions.map(submission => submission.objectID)).toEqual(expectedIds)
    }
  })

  it('accepts harmless URL variants while rejecting meaningful URL differences', () => {
    const submissions = selectSubmissionHistory([
      story('100', SOURCE_TIMESTAMP - 10, {
        url: `${SOURCE_URL}/?utm_campaign=launch#comments`,
      }),
      story('101', SOURCE_TIMESTAMP - 20, {
        url: `${SOURCE_URL}?source=docs`,
      }),
      story('102', SOURCE_TIMESTAMP + 10),
    ], {
      url: SOURCE_URL,
    })

    expect(submissions.map(submission => submission.objectID)).toEqual([
      '100',
      '102',
    ])
  })

  it('returns a bounded history and ignores URL-less source stories', () => {
    const hits = Array.from(
      { length: SUBMISSION_HISTORY_CANDIDATE_LIMIT + 8 },
      (_, index) => story(String(200 + index), SOURCE_TIMESTAMP + index),
    )

    expect(selectSubmissionHistory(hits, {
      url: SOURCE_URL,
    })).toHaveLength(SUBMISSION_HISTORY_CANDIDATE_LIMIT)
    expect(selectSubmissionHistory(hits, {
      url: '',
    })).toEqual([])
  })
})
