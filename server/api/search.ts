import type { H3Event } from 'h3'
import type { SearchStory, StorySearchResponse } from '#shared/types'
import {
  getSearchMode,
  getSearchRangeStart,
  getSearchSourceUrl,
  normalizeSearchQuery,
  parseSearchQuery,
  parseSearchRange,
  parseSearchSort,
  type SearchSort,
} from '#shared/utils/search'
import { formatServerTiming } from '#shared/utils/serverTiming'

const SEARCH_CACHE_MAX_AGE_SECONDS = 300
const SEARCH_CACHE_STALE_SECONDS = 600

const setSearchCacheHeaders = (event: H3Event) => {
  setHeaders(event, {
    'Content-Type': 'application/json',
    'Cache-Control': `public, max-age=${SEARCH_CACHE_MAX_AGE_SECONDS}, stale-while-revalidate=${SEARCH_CACHE_STALE_SECONDS}`,
    'CDN-Cache-Control': `public, max-age=${SEARCH_CACHE_MAX_AGE_SECONDS}`,
    'Cloudflare-CDN-Cache-Control': `public, max-age=${SEARCH_CACHE_MAX_AGE_SECONDS}`,
  })
}

type SearchOutcome = {
  stories: SearchStory[]
  /** Some upstream channels failed: the results are usable but incomplete. */
  partial: boolean
}

class SearchUnavailableError extends Error {}

// Algolia completes every word as a prefix, so "c" retrieves "Customers"
// before any C-language title. Short terms are searched as exact words.
const hasShortTerm = (query: string) => query.split(' ').some(word => /^[\p{L}\p{N}]{1,2}$/u.test(word))

// The all-words pass is broadened only when it leaves fewer title matches.
const MIN_COMPLETE_TITLE_MATCHES = 8
// Comment hits on popular topics cluster on a few stories; below this many
// distinct stories, the comment channel reads one more page.
const MIN_COMMENT_LINKED_STORIES = 8
// Bounds the per-term rarity lookups the partial pass makes.
const MAX_WEIGHTED_TERMS = 6

const searchText = async (query: string, rangeStart: number | null, sort: SearchSort): Promise<SearchOutcome> => {
  const parsed = parseSearchQuery(query)
  const filterOnly = !parsed.terms

  // Exclusions alone ("-game") describe nothing to find.
  if (filterOnly && !parsed.author && !parsed.showHn) {
    return { stories: [], partial: false }
  }

  const storyTags = [
    'story',
    ...(parsed.showHn ? ['show_hn'] : []),
    ...(parsed.author ? [`author_${parsed.author}`] : []),
  ].join(',')
  const rangeParams: Record<string, string> = rangeStart === null
    ? {}
    : { numericFilters: `created_at_i>${rangeStart}` }
  const matchParams: Record<string, string> = {
    ...(hasShortTerm(parsed.terms) ? { queryType: 'prefixNone' } : {}),
    ...(parsed.phrases.length > 0 || parsed.excluded.length > 0 ? { advancedSyntax: 'true' } : {}),
  }
  const titleParams = {
    query: parsed.upstreamQuery,
    tags: storyTags,
    restrictSearchableAttributes: 'title',
    ...matchParams,
    ...rangeParams,
  }
  const rankingOptions: SearchRankingOptions = {
    sort,
    rangeStart,
    nowSeconds: Math.floor(Date.now() / 1000),
    phrases: parsed.phrases,
    excluded: parsed.excluded,
    filterOnly,
    uncappedHosts: Boolean(parsed.author),
  }

  const results = await Promise.all([
    fetchStoryHits({ ...titleParams, hitsPerPage: '40' }, 'title'),
    fetchStoryHits({ ...titleParams, hitsPerPage: '30' }, 'recent-title', 'date'),
    fetchStoryHits({
      query: parsed.upstreamQuery,
      tags: storyTags,
      hitsPerPage: '30',
      ...matchParams,
      ...rangeParams,
    }, 'full-text'),
    ...(filterOnly ? [] : [fetchCommentLinkedStories(parsed.upstreamQuery, {
      ...rangeParams,
      matchParams,
      storyTags,
      minStories: MIN_COMMENT_LINKED_STORIES,
    })]),
  ])

  if (results.every(result => result.failed)) {
    throw new SearchUnavailableError('Every search channel failed')
  }

  let stories = rankSearchStories(results, parsed.terms, rankingOptions)

  // Strict first: only a multi-word query with too few complete title matches
  // retrieves partial matches, and those always rank below complete ones.
  const titleMatchCount = stories.filter(story => story.match === 'title').length

  if (!filterOnly && parsed.terms.includes(' ') && titleMatchCount < MIN_COMPLETE_TITLE_MATCHES) {
    const termTokens = getSearchTermTokens(parsed.terms).slice(0, MAX_WEIGHTED_TERMS)
    const [broadened, termFrequencies] = await Promise.all([
      fetchStoryHits({
        ...titleParams,
        optionalWords: parsed.terms,
        hitsPerPage: '40',
      }, 'title'),
      fetchTitleTermFrequencies(termTokens, {
        tags: storyTags,
        ...matchParams,
        ...rangeParams,
      }),
    ])

    results.push(broadened)
    stories = rankSearchStories(results, parsed.terms, {
      ...rankingOptions,
      allowPartial: true,
      termFrequencies: termFrequencies ?? undefined,
    })
  }

  const partial = results.some(result => result.failed)

  // With a channel down, "nothing matched" cannot be distinguished from the outage.
  if (partial && stories.length === 0) {
    throw new SearchUnavailableError('Search channels failed without results')
  }

  return { stories, partial }
}

// A pasted link lists the HN submissions of that source across all time.
// Relevance puts the largest discussion first: that is where the value is.
const searchSourceUrl = async (sourceUrl: string, sort: SearchSort): Promise<SearchOutcome> => {
  const canonicalUrl = canonicalizeSubmissionUrl(sourceUrl)

  if (!canonicalUrl) return { stories: [], partial: false }

  const { hits, failed } = await fetchSubmissionHistoryHits(canonicalUrl)

  if (failed) {
    throw new SearchUnavailableError('Submission history lookup failed')
  }

  // History summaries omit the source URL; cards link each submission's own URL.
  const hitUrls = new Map(hits.map(hit => [hit.objectID, hit.url?.trim() ?? '']))
  const stories = selectSubmissionHistory(hits, { url: sourceUrl })
    .map(story => ({
      ...story,
      url: hitUrls.get(story.objectID) ?? '',
      match: 'title' as const,
    }))
    .filter(story => story.url)

  return {
    stories: sort === 'newest'
      ? stories.reverse()
      : stories.sort((first, second) => (
        second.num_comments - first.num_comments
          || second.points - first.points
      )),
    partial: false,
  }
}

export default defineEventHandler(async (event) => {
  const params = getQuery(event)
  const query = normalizeSearchQuery(params.q)

  if (!query) {
    throw createError({
      statusCode: 400,
      message: 'Search query is required',
    })
  }

  const range = parseSearchRange(params.range)
  const sort = parseSearchSort(params.sort)
  const mode = getSearchMode(query)

  try {
    const searchStartedAt = performance.now()
    const sourceUrl = getSearchSourceUrl(query)
    const { stories, partial } = sourceUrl
      ? await searchSourceUrl(sourceUrl, sort)
      : await searchText(query, getSearchRangeStart(range), sort)

    // Partial results are shown but never cached past the upstream failure.
    if (partial) {
      setHeader(event, 'Cache-Control', 'no-store')
    } else {
      setSearchCacheHeaders(event)
    }
    setHeader(event, 'Server-Timing', formatServerTiming([{
      name: 'search',
      duration: performance.now() - searchStartedAt,
      description: mode === 'url' ? 'Algolia submission history' : 'Algolia search and ranking',
    }]))

    return {
      query,
      mode,
      range,
      sort,
      partial,
      stories,
    } satisfies StorySearchResponse
  } catch (error) {
    setHeader(event, 'Cache-Control', 'no-store')

    if (error instanceof SearchUnavailableError) {
      throw createError({
        statusCode: 502,
        message: 'Search is temporarily unavailable',
        cause: error,
      })
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to search stories',
      cause: error,
    })
  }
})
