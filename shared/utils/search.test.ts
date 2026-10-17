import { describe, expect, it } from 'vitest'
import {
  getSearchMode,
  getSearchPath,
  getSearchRangeStart,
  getSearchSourceUrl,
  normalizeSearchQuery,
  parseSearchQuery,
  removeSearchFilter,
  parseSearchRoute,
  SEARCH_QUERY_MAX_LENGTH,
} from './search'

describe('search route state', () => {
  it('normalizes queries from repeated and untrusted query values', () => {
    expect(normalizeSearchQuery(['  rust \n async  ', 'ignored'])).toBe('rust async')
    expect(normalizeSearchQuery(42)).toBe('')
    expect(normalizeSearchQuery('x'.repeat(SEARCH_QUERY_MAX_LENGTH + 20))).toHaveLength(SEARCH_QUERY_MAX_LENGTH)
  })

  it('falls back to product defaults for unknown range and sort values', () => {
    expect(parseSearchRoute({ q: 'zig', range: 'decade', sort: 'points' })).toEqual({
      query: 'zig',
      range: 'month',
      sort: 'relevance',
    })
    expect(parseSearchRoute({ q: 'zig', range: ['all'], sort: 'newest' })).toEqual({
      query: 'zig',
      range: 'all',
      sort: 'newest',
    })
  })

  it('builds short shareable paths that omit defaults', () => {
    expect(getSearchPath()).toBe('/search')
    expect(getSearchPath({ query: ' zig ', range: 'month', sort: 'relevance' })).toBe('/search?q=zig')
    expect(getSearchPath({ query: 'c++ & rust', range: 'all', sort: 'newest' }))
      .toBe('/search?q=c%2B%2B+%26+rust&range=all&sort=newest')
  })
})

describe('search modes', () => {
  it('treats only explicit HTTP(S) links as source URL searches', () => {
    expect(getSearchSourceUrl('https://example.com/post?id=1')).toBe('https://example.com/post?id=1')
    expect(getSearchMode('http://example.com')).toBe('url')
    expect(getSearchMode('node.js')).toBe('text')
    expect(getSearchMode('example.com/post')).toBe('text')
    expect(getSearchMode('https://localhost')).toBe('text')
    expect(getSearchMode('https://example.com rust')).toBe('text')
  })

  it('floors range starts to the hour so equal searches repeat upstream', () => {
    const now = Date.UTC(2026, 9, 17, 12, 34, 56)
    const hour = Date.UTC(2026, 9, 17, 12) / 1000

    expect(getSearchRangeStart('week', now)).toBe(hour - 7 * 86_400)
    expect(getSearchRangeStart('month', now)).toBe(hour - 28 * 86_400)
    expect(getSearchRangeStart('all', now)).toBeNull()
  })
})

describe('search query operators', () => {
  it('parses phrases, exclusions, authors, and Show HN', () => {
    const parsed = parseSearchQuery('show hn "distributed systems" rust -game by:pg')

    expect(parsed).toMatchObject({
      terms: 'rust distributed systems',
      upstreamQuery: 'rust "distributed systems" -game',
      phrases: ['distributed systems'],
      excluded: ['game'],
      author: 'pg',
      showHn: true,
    })
    expect(parsed.filters.map(filter => filter.kind).sort()).toEqual(['author', 'exclude', 'phrase', 'show'])
  })

  it('keeps hyphenated words and lookalike operators as plain text', () => {
    expect(parseSearchQuery('local-first by:../x showcase hn')).toMatchObject({
      terms: 'local-first by:../x showcase hn',
      excluded: [],
      author: null,
      showHn: false,
    })
  })

  it('removes one filter by its source text', () => {
    const query = 'rust -game by:pg'
    const [exclusion] = parseSearchQuery(query).filters.filter(filter => filter.kind === 'exclude')

    expect(removeSearchFilter(query, exclusion!)).toBe('rust by:pg')
  })
})
