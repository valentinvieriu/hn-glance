import { createError, defineEventHandler, getRouterParams, setHeader, setHeaders, type H3Event } from 'h3'
import type { StoryContextResponse } from '#shared/types'
import { isValidHnItemId } from '#shared/utils/hn'
import { formatServerTiming, type ServerTimingMetric } from '#shared/utils/serverTiming'
import {
  searchAlgoliaHits,
  type AlgoliaCommentHit,
  type AlgoliaSearchOrder,
  type AlgoliaStoryHit,
} from '../../utils/algolia'
import { getErrorStatusCode } from '../../utils/error'
import {
  buildTitleQuery,
  rankRelatedStories,
  type RelatedSearchKind,
  type RelatedSourceStory,
  type SearchResult,
} from '../../utils/relatedStories'
import {
  canonicalizeSubmissionUrl,
  selectSubmissionHistory,
  SUBMISSION_HISTORY_CANDIDATE_LIMIT,
} from '../../utils/previousSubmissions'

const RELATED_STORY_ATTRIBUTES = 'objectID,title,created_at,created_at_i,points,num_comments,author,url'
const SOURCE_STORY_ATTRIBUTES = 'title,url,created_at_i'

const setRelatedCacheHeaders = (event: H3Event) => {
  setHeaders(event, {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=1800',
    'CDN-Cache-Control': 'public, max-age=3600',
    'Cloudflare-CDN-Cache-Control': 'public, max-age=3600'
  })
}

const fetchStoryHits = async (
  params: Record<string, string>,
  weight: number,
  kind: RelatedSearchKind,
  order: AlgoliaSearchOrder = 'relevance',
): Promise<SearchResult> => {
  try {
    const hits = await searchAlgoliaHits<AlgoliaStoryHit>({
      attributesToRetrieve: RELATED_STORY_ATTRIBUTES,
      getRankingInfo: 'true',
      ...params,
    }, order)
    return { hits, kind, weight }
  } catch (error) {
    console.warn('Failed to fetch related story candidates:', error)
    return { hits: [], kind, weight }
  }
}

const fetchCommentLinkedStories = async (query: string, excludeId: string): Promise<SearchResult> => {
  try {
    const comments = await searchAlgoliaHits<AlgoliaCommentHit>({
      attributesToRetrieve: 'story_id',
      query,
      tags: 'comment',
      hitsPerPage: '24'
    })

    const rankedStoryIds: string[] = []
    const seen = new Set<string>([excludeId])

    for (const comment of comments) {
      const storyId = comment.story_id ? String(comment.story_id) : ''

      if (!storyId || seen.has(storyId)) continue

      seen.add(storyId)
      rankedStoryIds.push(storyId)

      if (rankedStoryIds.length === 12) break
    }

    if (rankedStoryIds.length === 0) {
      return { hits: [], kind: 'comment', weight: 26 }
    }

    const order = new Map(rankedStoryIds.map((storyId, index) => [storyId, index]))
    const filters = rankedStoryIds.map(storyId => `objectID:${storyId}`).join(' OR ')
    const hits = await searchAlgoliaHits<AlgoliaStoryHit>({
      attributesToRetrieve: RELATED_STORY_ATTRIBUTES,
      tags: 'story',
      filters,
      hitsPerPage: String(rankedStoryIds.length)
    })

    return {
      hits: hits.sort((a, b) => (order.get(a.objectID ?? '') ?? 99) - (order.get(b.objectID ?? '') ?? 99)),
      kind: 'comment',
      weight: 26
    }
  } catch (error) {
    console.warn('Failed to fetch comment-linked related stories:', error)
    return { hits: [], kind: 'comment', weight: 26 }
  }
}

const fetchSubmissionHistoryHits = async (query: string): Promise<AlgoliaStoryHit[]> => {
  try {
    return await searchAlgoliaHits<AlgoliaStoryHit>({
      attributesToRetrieve: RELATED_STORY_ATTRIBUTES,
      query,
      tags: 'story',
      restrictSearchableAttributes: 'url',
      hitsPerPage: String(SUBMISSION_HISTORY_CANDIDATE_LIMIT),
    })
  } catch (error) {
    console.warn('Failed to fetch submission history candidates:', error)
    return []
  }
}

const fetchSourceStory = async (id: string) => {
  const stories = await searchAlgoliaHits<RelatedSourceStory>({
    attributesToRetrieve: SOURCE_STORY_ATTRIBUTES,
    filters: `objectID:${id}`,
    hitsPerPage: '1',
    tags: 'story',
  })

  return stories[0] ?? null
}

export default defineEventHandler(async (event) => {
  const params = getRouterParams(event)
  const id = params.id

  if (!isValidHnItemId(id)) {
    throw createError({
      statusCode: 400,
      message: 'Story ID is required'
    })
  }

  try {
    const sourceItemStartedAt = performance.now()
    const story = await fetchSourceStory(id)
    const sourceItemDuration = performance.now() - sourceItemStartedAt
    
    if (!story || !story.title) {
      throw createError({
        statusCode: 404,
        message: 'Story not found'
      })
    }

    const titleQuery = buildTitleQuery(story.title)
    const optionalTitleWords = titleQuery
    const submissionUrlQuery = canonicalizeSubmissionUrl(story.url)

    if (!titleQuery && !submissionUrlQuery) {
      setRelatedCacheHeaders(event)
      setHeader(event, 'Server-Timing', formatServerTiming([{
        name: 'source-item',
        duration: sourceItemDuration,
        description: 'Algolia source item',
      }]))
      return {
        submissionHistory: [],
        similarStories: [],
      } satisfies StoryContextResponse
    }

    const searches: Array<Promise<SearchResult>> = []

    if (titleQuery) {
      searches.push(fetchStoryHits({
        query: titleQuery,
        optionalWords: optionalTitleWords,
        tags: 'story',
        restrictSearchableAttributes: 'title',
        hitsPerPage: '24'
      }, 80, 'title'))

      searches.push(fetchStoryHits({
        query: titleQuery,
        optionalWords: optionalTitleWords,
        tags: 'story',
        restrictSearchableAttributes: 'title',
        hitsPerPage: '18'
      }, 62, 'recent-title', 'date'))

      searches.push(fetchStoryHits({
        query: titleQuery,
        tags: 'story',
        hitsPerPage: '18'
      }, 52, 'full-text'))

      searches.push(fetchCommentLinkedStories(titleQuery, id))
    }

    const submissionHistorySearch = submissionUrlQuery
      ? fetchSubmissionHistoryHits(submissionUrlQuery)
      : Promise.resolve<AlgoliaStoryHit[]>([])

    const relatedSearchesStartedAt = performance.now()
    const [results, submissionHistoryHits] = await Promise.all([
      Promise.all(searches),
      submissionHistorySearch,
    ])
    const relatedSearchesDuration = performance.now() - relatedSearchesStartedAt
    const relatedRankStartedAt = performance.now()
    const relatedStories = rankRelatedStories(results, story, id, {
      excludeExactSourceUrl: true,
    })
    const relatedRankDuration = performance.now() - relatedRankStartedAt
    const historyMatchStartedAt = performance.now()
    const submissionHistory = selectSubmissionHistory(submissionHistoryHits, story)
    const historyMatchDuration = performance.now() - historyMatchStartedAt
    const timingMetrics: ServerTimingMetric[] = [
      {
        name: 'source-item',
        duration: sourceItemDuration,
        description: 'Algolia source item',
      },
      {
        name: 'related-searches',
        duration: relatedSearchesDuration,
        description: 'Concurrent Algolia story-context searches',
      },
      {
        name: 'related-rank',
        duration: relatedRankDuration,
        description: 'Related-story ranking',
      },
      {
        name: 'history-match',
        duration: historyMatchDuration,
        description: 'Submission-history URL matching',
      },
    ]

    setRelatedCacheHeaders(event)
    setHeader(event, 'Server-Timing', formatServerTiming(timingMetrics))

    return {
      submissionHistory,
      similarStories: relatedStories,
    } satisfies StoryContextResponse

  } catch (error: unknown) {
    if (getErrorStatusCode(error) !== null) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to fetch story context',
      cause: error
    })
  }
})
