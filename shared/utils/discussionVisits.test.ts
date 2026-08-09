import { describe, expect, it } from 'vitest'
import {
  acknowledgeDiscussionVisit,
  beginDiscussionVisit,
  countMatchingDescendants,
  createEmptyDiscussionVisits,
  deserializeDiscussionVisits,
  DISCUSSION_VISITS_STORAGE_KEY,
  DISCUSSION_VISITS_VERSION,
  DISCUSSION_VISIT_TTL_MS,
  getCommentIdsInTreeOrder,
  MAX_DISCUSSION_VISIT_COMMENT_IDS,
  MAX_DISCUSSION_VISIT_COMMENT_IDS_PER_STORY,
  MAX_DISCUSSION_VISIT_STORIES,
  pruneDiscussionVisits,
} from './discussionVisits'
import { summarizeCommentTree } from './comments'
import type { Comment } from '../types'

const comment = (id: number, children: Comment[] = []): Comment => ({
  author: `user-${id}`,
  children,
  created_at: '2026-08-09T00:00:00.000Z',
  id,
  parent_id: null,
  text: `Comment ${id}`,
})

describe('discussion visit memory', () => {
  it('keeps new-comment navigation in rendered tree order and counts matching descendants', () => {
    const comments = [
      comment(1, [comment(2), comment(3, [comment(4)])]),
      comment(5),
    ]
    const summary = summarizeCommentTree(comments)

    expect(getCommentIdsInTreeOrder(comments)).toEqual([1, 2, 3, 4, 5])
    expect(countMatchingDescendants(
      summary.navigationNodes,
      new Set([2, 4]),
    )).toEqual(new Map([
      [1, 2],
      [3, 1],
    ]))
  })

  it('uses a separate versioned store and establishes a quiet first baseline', () => {
    expect(DISCUSSION_VISITS_STORAGE_KEY).toBe('hn-glance:discussion-visits')

    const firstVisit = beginDiscussionVisit(
      createEmptyDiscussionVisits(),
      42,
      [101, 102, 103],
      1_000,
    )

    expect(firstVisit.hadBaseline).toBe(false)
    expect(firstVisit.isTracked).toBe(true)
    expect(firstVisit.newCommentIds).toEqual([])
    expect(firstVisit.visits).toEqual({
      stories: {
        42: {
          lastVisitedAt: 1_000,
          seenCommentIds: [101, 102, 103],
        },
      },
      version: DISCUSSION_VISITS_VERSION,
    })
  })

  it('compares exact identities and freezes the old baseline until acknowledgement', () => {
    const baseline = beginDiscussionVisit(
      createEmptyDiscussionVisits(),
      42,
      [101, 102],
      1_000,
    ).visits
    const revisit = beginDiscussionVisit(baseline, 42, [101, 102, 103, 104], 2_000)

    expect(revisit.hadBaseline).toBe(true)
    expect(revisit.newCommentIds).toEqual([103, 104])
    expect(revisit.visits.stories['42']?.seenCommentIds).toEqual([101, 102])

    const acknowledged = acknowledgeDiscussionVisit(
      revisit.visits,
      42,
      [101, 102, 103, 104],
      2_500,
    )
    const nextVisit = beginDiscussionVisit(acknowledged, 42, [101, 102, 103, 104], 3_000)

    expect(nextVisit.newCommentIds).toEqual([])
  })

  it('treats expired, malformed, and unsupported data as no baseline', () => {
    const now = DISCUSSION_VISIT_TTL_MS + 10_000
    const expired = deserializeDiscussionVisits(JSON.stringify({
      stories: {
        42: {
          lastVisitedAt: 1,
          seenCommentIds: [101],
        },
      },
      version: DISCUSSION_VISITS_VERSION,
    }), now)

    expect(expired).toEqual(createEmptyDiscussionVisits())
    expect(deserializeDiscussionVisits('{not-json', now)).toEqual(createEmptyDiscussionVisits())
    expect(deserializeDiscussionVisits(JSON.stringify({ version: 99 }), now))
      .toEqual(createEmptyDiscussionVisits())
  })

  it('evicts whole least-recently-visited stories to enforce global caps', () => {
    const stories = Object.fromEntries(
      Array.from({ length: MAX_DISCUSSION_VISIT_STORIES + 2 }, (_, index) => [
        String(index + 1),
        {
          lastVisitedAt: index + 1,
          seenCommentIds: [10_000 + index],
        },
      ]),
    )
    const pruned = pruneDiscussionVisits({
      stories,
      version: DISCUSSION_VISITS_VERSION,
    }, 10_000)

    expect(Object.keys(pruned.stories)).toHaveLength(MAX_DISCUSSION_VISIT_STORIES)
    expect(pruned.stories['1']).toBeUndefined()
    expect(pruned.stories[String(MAX_DISCUSSION_VISIT_STORIES + 2)]).toBeDefined()
  })

  it('skips oversized stories instead of storing a partial identity baseline', () => {
    const oversizedIds = Array.from(
      { length: MAX_DISCUSSION_VISIT_COMMENT_IDS_PER_STORY + 1 },
      (_, index) => index + 1,
    )
    const visit = beginDiscussionVisit(createEmptyDiscussionVisits(), 42, oversizedIds, 1_000)

    expect(visit.isTracked).toBe(false)
    expect(visit.newCommentIds).toEqual([])
    expect(visit.visits.stories['42']).toBeUndefined()
  })

  it('does not partially trim a story when the total identity cap is reached', () => {
    const fullStoryIds = Array.from(
      { length: MAX_DISCUSSION_VISIT_COMMENT_IDS_PER_STORY },
      (_, index) => index + 1,
    )
    const storyCount = Math.ceil(
      MAX_DISCUSSION_VISIT_COMMENT_IDS / MAX_DISCUSSION_VISIT_COMMENT_IDS_PER_STORY,
    ) + 1
    const stories = Object.fromEntries(
      Array.from({ length: storyCount }, (_, index) => [
        String(index + 1),
        {
          lastVisitedAt: index + 1,
          seenCommentIds: fullStoryIds.map(id => id + index * 10_000),
        },
      ]),
    )
    const pruned = pruneDiscussionVisits({
      stories,
      version: DISCUSSION_VISITS_VERSION,
    }, 10_000)
    const retainedIds = Object.values(pruned.stories)
      .reduce((total, entry) => total + entry.seenCommentIds.length, 0)

    expect(retainedIds).toBeLessThanOrEqual(MAX_DISCUSSION_VISIT_COMMENT_IDS)
    expect(Object.values(pruned.stories).every((entry) => {
      return entry.seenCommentIds.length === MAX_DISCUSSION_VISIT_COMMENT_IDS_PER_STORY
    })).toBe(true)
  })
})
