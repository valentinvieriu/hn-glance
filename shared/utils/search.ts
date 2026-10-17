import { getFirstQueryValue } from './hn'
import { SCREENSHOT_RETENTION_DAYS } from './screenshot'

export const SEARCH_PATH = '/search'
export const SEARCH_QUERY_MAX_LENGTH = 200

export const SEARCH_RANGES = ['week', 'month', 'year', 'all'] as const
export const SEARCH_SORTS = ['relevance', 'newest'] as const

export type SearchRange = typeof SEARCH_RANGES[number]
export type SearchSort = typeof SEARCH_SORTS[number]
export type SearchMode = 'text' | 'url'

// The default month range is the screenshot retention window, so result cards
// can have a real source preview rather than the wireframe fallback.
export const DEFAULT_SEARCH_RANGE: SearchRange = 'month'
export const DEFAULT_SEARCH_SORT: SearchSort = 'relevance'

const SECONDS_PER_DAY = 24 * 60 * 60

export const SEARCH_RANGE_DAYS: Record<Exclude<SearchRange, 'all'>, number> = {
  week: 7,
  month: SCREENSHOT_RETENTION_DAYS,
  year: 365,
}

export type SearchRouteState = {
  query: string
  range: SearchRange
  sort: SearchSort
}

export const normalizeSearchQuery = (value: unknown) => {
  const query = getFirstQueryValue(value)

  if (typeof query !== 'string') return ''

  return query
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, SEARCH_QUERY_MAX_LENGTH)
    .trim()
}

export const parseSearchRange = (value: unknown): SearchRange => {
  const range = getFirstQueryValue(value)

  return SEARCH_RANGES.find(candidate => candidate === range) ?? DEFAULT_SEARCH_RANGE
}

export const parseSearchSort = (value: unknown): SearchSort => {
  const sort = getFirstQueryValue(value)

  return SEARCH_SORTS.find(candidate => candidate === sort) ?? DEFAULT_SEARCH_SORT
}

export const parseSearchRoute = (query: Record<string, unknown>): SearchRouteState => ({
  query: normalizeSearchQuery(query.q),
  range: parseSearchRange(query.range),
  sort: parseSearchSort(query.sort),
})

/** Route query for a search; product defaults are omitted to keep links short. */
export const getSearchRouteQuery = ({ query, range, sort }: Partial<SearchRouteState>) => {
  const routeQuery: Record<string, string> = {}
  const normalizedQuery = normalizeSearchQuery(query)

  if (normalizedQuery) routeQuery.q = normalizedQuery
  if (range && range !== DEFAULT_SEARCH_RANGE) routeQuery.range = range
  if (sort && sort !== DEFAULT_SEARCH_SORT) routeQuery.sort = sort

  return routeQuery
}

export const getSearchPath = (state: Partial<SearchRouteState> = {}) => {
  const search = new URLSearchParams(getSearchRouteQuery(state)).toString()

  return search ? `${SEARCH_PATH}?${search}` : SEARCH_PATH
}

/**
 * A pasted link searches for every HN submission of that source. Only explicit
 * HTTP(S) URLs qualify, so a query such as `node.js` stays a text search.
 */
export const getSearchSourceUrl = (query: string) => {
  if (!/^https?:\/\//iu.test(query) || /\s/u.test(query)) return null

  try {
    const url = new URL(query)

    return url.hostname.includes('.') ? url.href : null
  } catch {
    return null
  }
}

export const getSearchMode = (query: string): SearchMode => {
  return getSearchSourceUrl(query) ? 'url' : 'text'
}

/** Range start in Unix seconds, floored to the hour so upstream queries repeat. */
export const getSearchRangeStart = (range: SearchRange, nowMs = Date.now()) => {
  if (range === 'all') return null

  const hourFloor = Math.floor(nowMs / 1000 / 3600) * 3600

  return hourFloor - SEARCH_RANGE_DAYS[range] * SECONDS_PER_DAY
}

export type SearchFilterKind = 'phrase' | 'exclude' | 'author' | 'show'

export type SearchFilter = {
  kind: SearchFilterKind
  value: string
  /** The exact query text that produced the filter, for removal. */
  source: string
}

export type ParsedSearchQuery = {
  /** Plain words plus phrase words: the terms ranking requires. */
  terms: string
  /** The query for Algolia, with phrases quoted and exclusions prefixed. */
  upstreamQuery: string
  phrases: string[]
  excluded: string[]
  author: string | null
  showHn: boolean
  filters: SearchFilter[]
}

const PHRASE_PATTERN = /"([^"]+)"/gu
const AUTHOR_PATTERN = /(^|\s)by:([A-Za-z0-9_-]{1,64})(?=\s|$)/giu
const EXCLUDE_PATTERN = /(^|\s)-([\p{L}\p{N}][^\s"]*)/gu
const SHOW_HN_PATTERN = /(^|\s)show\s+hn:?(?=\s|$)/giu

/**
 * A small, conventional operator vocabulary: `"exact phrase"`, `-word`,
 * `by:username`, and the words `Show HN`. Everything else is plain text.
 */
export const parseSearchQuery = (query: string): ParsedSearchQuery => {
  const filters: SearchFilter[] = []
  const phrases: string[] = []
  const excluded: string[] = []
  let author: string | null = null
  let showHn = false
  let rest = query

  rest = rest.replace(PHRASE_PATTERN, (source, phrase: string) => {
    const value = normalizeSearchQuery(phrase)
    if (value) {
      phrases.push(value)
      filters.push({ kind: 'phrase', value, source })
    }
    return ' '
  })
  rest = rest.replace(AUTHOR_PATTERN, (match, space: string, username: string) => {
    author ??= username
    filters.push({ kind: 'author', value: username, source: match.trim() })
    return space
  })
  rest = rest.replace(SHOW_HN_PATTERN, (match, space: string) => {
    if (!showHn) filters.push({ kind: 'show', value: 'Show HN', source: match.trim() })
    showHn = true
    return space
  })
  rest = rest.replace(EXCLUDE_PATTERN, (match, space: string, word: string) => {
    excluded.push(word)
    filters.push({ kind: 'exclude', value: word, source: match.trim() })
    return space
  })

  const words = normalizeSearchQuery(rest)
  const terms = normalizeSearchQuery([words, ...phrases].join(' '))
  const upstreamQuery = normalizeSearchQuery([
    words,
    ...phrases.map(phrase => `"${phrase}"`),
    ...excluded.map(word => `-${word}`),
  ].join(' '))

  return { terms, upstreamQuery, phrases, excluded, author, showHn, filters }
}

export const removeSearchFilter = (query: string, filter: SearchFilter) => {
  const index = query.indexOf(filter.source)

  return index === -1
    ? query
    : normalizeSearchQuery(`${query.slice(0, index)} ${query.slice(index + filter.source.length)}`)
}
