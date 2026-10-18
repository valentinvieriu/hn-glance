import { htmlToPlainText, truncateAtWordBoundary } from '#shared/utils/html'
import {
  searchAlgolia,
  searchAlgoliaHits,
  type AlgoliaCommentHit,
  type AlgoliaSearchOrder,
  type AlgoliaStoryHit,
} from './algolia'
import { SUBMISSION_HISTORY_CANDIDATE_LIMIT } from './previousSubmissions'
import type { CommentEvidence, RelatedSearchKind, SearchResult } from './relatedStories'

// Retrieval channels shared by Similar Stories and search. Each channel fails
// soft so one Algolia error cannot discard the others, but marks the failure:
// callers must not present or cache an outage as "nothing matched".

const STORY_CANDIDATE_ATTRIBUTES = 'objectID,title,created_at,created_at_i,points,num_comments,author,url'

// Callers wait for every channel, so one stalled channel would hold usable
// results. Each channel's requests, sequential pages and retries included,
// share one budget; a timeout is reported like any other channel failure.
export const RETRIEVAL_CHANNEL_TIMEOUT_MS = 4000

const getChannelSignal = () => ({ signal: AbortSignal.timeout(RETRIEVAL_CHANNEL_TIMEOUT_MS) })

export const fetchStoryHits = async (
  params: Record<string, string>,
  kind: RelatedSearchKind,
  order: AlgoliaSearchOrder = 'relevance',
): Promise<SearchResult> => {
  try {
    const hits = await searchAlgoliaHits<AlgoliaStoryHit>({
      attributesToRetrieve: STORY_CANDIDATE_ATTRIBUTES,
      getRankingInfo: 'true',
      ...params,
    }, order, getChannelSignal())
    return { hits, kind }
  } catch (error) {
    console.warn('Failed to fetch story candidates:', error)
    return { hits: [], kind, failed: true }
  }
}

const COMMENT_PAGE_SIZE = 24
const COMMENT_LINKED_STORY_LIMIT = 12
const COMMENT_SNIPPET_WORDS = 24
const COMMENT_SNIPPET_MAX_LENGTH = 220

const toPlainSnippet = (value: string) => {
  return truncateAtWordBoundary(htmlToPlainText(value), COMMENT_SNIPPET_MAX_LENGTH)
}

/** Stories whose discussions mention the query, in comment-relevance order. */
export const fetchCommentLinkedStories = async (
  query: string,
  { excludeId, numericFilters, matchParams = {}, storyTags = 'story', minStories = 0 }: {
    excludeId?: string
    numericFilters?: string
    /** Matching options for the comment search, such as `queryType`. */
    matchParams?: Record<string, string>
    /** Story tags the linked stories must carry, such as `story,show_hn`. */
    storyTags?: string
    /**
     * When the first comment page yields fewer distinct stories (comments on
     * popular topics cluster on a few stories), read one more page.
     */
    minStories?: number
  } = {},
): Promise<SearchResult> => {
  const rangeParams: Record<string, string> = numericFilters ? { numericFilters } : {}
  const rankedStoryIds: string[] = []
  const commentEvidence: Record<string, CommentEvidence[]> = {}
  const excluded = excludeId ?? ''
  const channel = getChannelSignal()

  const collect = (comments: AlgoliaCommentHit[]) => {
    for (const comment of comments) {
      const storyId = comment.story_id ? String(comment.story_id) : ''

      if (!storyId || storyId === excluded) continue

      if (!commentEvidence[storyId]) {
        if (rankedStoryIds.length === COMMENT_LINKED_STORY_LIMIT) continue
        commentEvidence[storyId] = []
        rankedStoryIds.push(storyId)
      }

      if (comment.objectID && comment.comment_text) {
        commentEvidence[storyId].push({
          id: comment.objectID,
          text: comment.comment_text,
          snippet: toPlainSnippet(comment._snippetResult?.comment_text?.value ?? comment.comment_text),
        })
      }
    }
  }

  const fetchCommentPage = (page: number) => searchAlgolia<AlgoliaCommentHit>({
    attributesToRetrieve: 'story_id,comment_text',
    attributesToSnippet: `comment_text:${COMMENT_SNIPPET_WORDS}`,
    snippetEllipsisText: '…',
    query,
    tags: 'comment',
    hitsPerPage: String(COMMENT_PAGE_SIZE),
    page: String(page),
    ...matchParams,
    ...rangeParams,
  }, 'relevance', channel)

  try {
    const firstPage = await fetchCommentPage(0)
    collect(firstPage.hits ?? [])

    if (rankedStoryIds.length < minStories && (firstPage.nbPages ?? 0) > 1) {
      collect((await fetchCommentPage(1)).hits ?? [])
    }

    if (rankedStoryIds.length === 0) {
      return { hits: [], kind: 'comment', commentEvidence }
    }

    const order = new Map(rankedStoryIds.map((storyId, index) => [storyId, index]))
    const filters = rankedStoryIds.map(storyId => `objectID:${storyId}`).join(' OR ')
    const hits = await searchAlgoliaHits<AlgoliaStoryHit>({
      attributesToRetrieve: STORY_CANDIDATE_ATTRIBUTES,
      tags: storyTags,
      filters,
      hitsPerPage: String(rankedStoryIds.length),
      ...rangeParams,
    }, 'relevance', channel)

    return {
      hits: hits.sort((a, b) => (order.get(a.objectID ?? '') ?? 99) - (order.get(b.objectID ?? '') ?? 99)),
      kind: 'comment',
      commentEvidence,
    }
  } catch (error) {
    console.warn('Failed to fetch comment-linked stories:', error)
    return { hits: [], kind: 'comment', failed: true }
  }
}

export type SubmissionHistoryHits = {
  hits: AlgoliaStoryHit[]
  failed: boolean
}

/**
 * Candidates for exact-source history; callers must match canonical URLs.
 * Other pages sharing the URL's words compete for the same slots.
 */
export const fetchSubmissionHistoryHits = async (
  canonicalUrl: string,
  limit = SUBMISSION_HISTORY_CANDIDATE_LIMIT,
): Promise<SubmissionHistoryHits> => {
  try {
    const hits = await searchAlgoliaHits<AlgoliaStoryHit>({
      attributesToRetrieve: STORY_CANDIDATE_ATTRIBUTES,
      query: canonicalUrl,
      tags: 'story',
      restrictSearchableAttributes: 'url',
      hitsPerPage: String(limit),
    }, 'relevance', getChannelSignal())
    return { hits, failed: false }
  } catch (error) {
    console.warn('Failed to fetch submission history candidates:', error)
    return { hits: [], failed: true }
  }
}
