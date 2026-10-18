import type { H3Event } from 'h3'
import type { StorySearchResponse } from '#shared/types'
import {
  getSearchMode,
  normalizeSearchQuery,
  parseSearchRange,
  parseSearchSort,
} from '#shared/utils/search'
import { formatServerTiming } from '#shared/utils/serverTiming'
import type { SemanticAi } from '../utils/semanticRanking'

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

export default defineEventHandler(async (event) => {
  const params = getQuery(event)
  const query = normalizeSearchQuery(params.q)

  if (!query) {
    throw createError({
      statusCode: 400,
      message: 'Search query is required',
    })
  }

  await requireHumanSession(event)

  const range = parseSearchRange(params.range)
  const sort = parseSearchSort(params.sort)
  const mode = getSearchMode(query)
  const ai = (event.context.cloudflare?.env as { AI?: SemanticAi } | undefined)?.AI

  try {
    const searchStartedAt = performance.now()
    const { stories, partial, semantic, plan } = await searchStories(query, range, sort, ai)

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
    }, ...(plan ? [{
      name: 'plan',
      duration: plan.durationMs,
      description: `Workers AI query plan (${plan.status})`,
    }] : []), ...(semantic ? [{
      name: 'semantic',
      duration: semantic.durationMs,
      description: 'Workers AI semantic ranking',
    }] : [])]))
    setHeader(event, 'X-HN-Search-Rank', semantic?.status ?? 'lexical')

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
