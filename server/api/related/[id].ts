import type { H3Event } from 'h3'
import type { StoryContextResponse } from '#shared/types'
import { isValidHnItemId } from '#shared/utils/hn'
import { formatServerTiming, type ServerTimingMetric } from '#shared/utils/serverTiming'

const SOURCE_STORY_ATTRIBUTES = 'title,url,created_at_i'

const setRelatedCacheHeaders = (event: H3Event) => {
  setHeaders(event, {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=1800',
    'CDN-Cache-Control': 'public, max-age=3600',
    'Cloudflare-CDN-Cache-Control': 'public, max-age=3600'
  })
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
  const id = getRouterParam(event, 'id')

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
        optionalWords: titleQuery,
        tags: 'story',
        restrictSearchableAttributes: 'title',
        hitsPerPage: '24'
      }, 'title'))

      searches.push(fetchStoryHits({
        query: titleQuery,
        optionalWords: titleQuery,
        tags: 'story',
        restrictSearchableAttributes: 'title',
        hitsPerPage: '18'
      }, 'recent-title', 'date'))

      searches.push(fetchStoryHits({
        query: titleQuery,
        tags: 'story',
        hitsPerPage: '18'
      }, 'full-text'))

      searches.push(fetchCommentLinkedStories(titleQuery, { excludeId: id }))
    }

    const submissionHistorySearch = submissionUrlQuery
      ? fetchSubmissionHistoryHits(submissionUrlQuery)
      : Promise.resolve<SubmissionHistoryHits | null>(null)

    const relatedSearchesStartedAt = performance.now()
    const [results, submissionHistoryResult] = await Promise.all([
      Promise.all(searches),
      submissionHistorySearch,
    ])
    const relatedSearchesDuration = performance.now() - relatedSearchesStartedAt
    const channelFailures = [
      ...results.map(result => Boolean(result.failed)),
      ...(submissionHistoryResult ? [submissionHistoryResult.failed] : []),
    ]

    if (channelFailures.length > 0 && channelFailures.every(Boolean)) {
      setHeader(event, 'Cache-Control', 'no-store')
      throw createError({
        statusCode: 502,
        message: 'Story context is temporarily unavailable',
      })
    }

    const submissionHistoryHits = submissionHistoryResult?.hits ?? []
    const relatedRankStartedAt = performance.now()
    const relatedStories = rankRelatedStories(results, story, id)
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

    // A partial context must not stay cached for an hour after the outage.
    if (channelFailures.some(Boolean)) {
      setHeader(event, 'Cache-Control', 'no-store')
    } else {
      setRelatedCacheHeaders(event)
    }
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
