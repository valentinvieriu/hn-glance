import type { Comment } from '../types'
import type { CommentNavigationNode } from './comments'

export const DISCUSSION_VISITS_STORAGE_KEY = 'hn-glance:discussion-visits'
export const DISCUSSION_VISITS_VERSION = 1 as const
export const DISCUSSION_VISIT_TTL_MS = 30 * 24 * 60 * 60 * 1_000
export const MAX_DISCUSSION_VISIT_STORIES = 100
export const MAX_DISCUSSION_VISIT_COMMENT_IDS = 20_000
export const MAX_DISCUSSION_VISIT_COMMENT_IDS_PER_STORY = 5_000

export type DiscussionVisitEntry = {
  lastVisitedAt: number
  seenCommentIds: number[]
}

export type DiscussionVisits = {
  stories: Record<string, DiscussionVisitEntry>
  version: typeof DISCUSSION_VISITS_VERSION
}

export type DiscussionVisitStart = {
  hadBaseline: boolean
  isTracked: boolean
  newCommentIds: number[]
  visits: DiscussionVisits
}

export const getCommentIdsInTreeOrder = (comments: Comment[]): number[] => {
  const ids: number[] = []
  const stack = [...comments].reverse()

  while (stack.length > 0) {
    const comment = stack.pop()

    if (!comment) {
      continue
    }

    ids.push(comment.id)

    for (let index = comment.children.length - 1; index >= 0; index -= 1) {
      const child = comment.children[index]

      if (child) {
        stack.push(child)
      }
    }
  }

  return ids
}

export const countMatchingDescendants = (
  navigationNodes: ReadonlyMap<number, CommentNavigationNode>,
  matchingCommentIds: ReadonlySet<number>,
): ReadonlyMap<number, number> => {
  const counts = new Map<number, number>()

  for (const commentId of matchingCommentIds) {
    let parentId = navigationNodes.get(commentId)?.parentId ?? null

    while (parentId) {
      counts.set(parentId, (counts.get(parentId) ?? 0) + 1)
      parentId = navigationNodes.get(parentId)?.parentId ?? null
    }
  }

  return counts
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const isPublicId = (value: unknown): value is number => {
  return Number.isSafeInteger(value) && Number(value) > 0
}

const normalizeStoryId = (value: string | number): string | null => {
  const stringValue = String(value)

  return /^\d+$/u.test(stringValue) && isPublicId(Number(stringValue))
    ? String(Number(stringValue))
    : null
}

const normalizeCommentIds = (values: Iterable<number>): number[] | null => {
  const ids = new Set<number>()

  for (const value of values) {
    if (!isPublicId(value)) {
      continue
    }

    ids.add(value)

    if (ids.size > MAX_DISCUSSION_VISIT_COMMENT_IDS_PER_STORY) {
      return null
    }
  }

  return [...ids].sort((left, right) => left - right)
}

export const createEmptyDiscussionVisits = (): DiscussionVisits => ({
  stories: {},
  version: DISCUSSION_VISITS_VERSION,
})

export const parseDiscussionVisits = (value: unknown): DiscussionVisits => {
  const visits = createEmptyDiscussionVisits()

  if (!isRecord(value) || value.version !== DISCUSSION_VISITS_VERSION || !isRecord(value.stories)) {
    return visits
  }

  for (const [storyKey, rawEntry] of Object.entries(value.stories)) {
    const storyId = normalizeStoryId(storyKey)

    if (!storyId || !isRecord(rawEntry) || !Array.isArray(rawEntry.seenCommentIds)) {
      continue
    }

    const lastVisitedAt = Number(rawEntry.lastVisitedAt)
    const seenCommentIds = normalizeCommentIds(rawEntry.seenCommentIds)

    if (!Number.isFinite(lastVisitedAt) || lastVisitedAt <= 0 || !seenCommentIds) {
      continue
    }

    visits.stories[storyId] = {
      lastVisitedAt,
      seenCommentIds,
    }
  }

  return visits
}

export const pruneDiscussionVisits = (
  value: DiscussionVisits,
  now = Date.now(),
): DiscussionVisits => {
  const parsed = parseDiscussionVisits(value)
  const candidates = Object.entries(parsed.stories)
    .map(([storyId, entry]) => ({
      entry: {
        ...entry,
        lastVisitedAt: Math.min(entry.lastVisitedAt, now),
      },
      storyId,
    }))
    .filter(({ entry }) => now - entry.lastVisitedAt <= DISCUSSION_VISIT_TTL_MS)
    .sort((left, right) => {
      return right.entry.lastVisitedAt - left.entry.lastVisitedAt
        || Number(right.storyId) - Number(left.storyId)
    })

  const visits = createEmptyDiscussionVisits()
  let commentIdCount = 0

  for (const { entry, storyId } of candidates) {
    if (Object.keys(visits.stories).length >= MAX_DISCUSSION_VISIT_STORIES) {
      break
    }

    if (commentIdCount + entry.seenCommentIds.length > MAX_DISCUSSION_VISIT_COMMENT_IDS) {
      continue
    }

    visits.stories[storyId] = entry
    commentIdCount += entry.seenCommentIds.length
  }

  return visits
}

export const deserializeDiscussionVisits = (
  value: string | null,
  now = Date.now(),
): DiscussionVisits => {
  if (!value) {
    return createEmptyDiscussionVisits()
  }

  try {
    return pruneDiscussionVisits(parseDiscussionVisits(JSON.parse(value)), now)
  } catch {
    return createEmptyDiscussionVisits()
  }
}

export const serializeDiscussionVisits = (
  visits: DiscussionVisits,
  now = Date.now(),
): string => JSON.stringify(pruneDiscussionVisits(visits, now))

const withoutStory = (visits: DiscussionVisits, storyId: string): DiscussionVisits => {
  const stories = { ...visits.stories }
  delete stories[storyId]

  return {
    stories,
    version: DISCUSSION_VISITS_VERSION,
  }
}

export const beginDiscussionVisit = (
  value: DiscussionVisits,
  storyIdValue: string | number,
  currentCommentIds: Iterable<number>,
  now = Date.now(),
): DiscussionVisitStart => {
  const storyId = normalizeStoryId(storyIdValue)
  const commentIds = normalizeCommentIds(currentCommentIds)
  const visits = pruneDiscussionVisits(value, now)

  if (!storyId || !commentIds) {
    return {
      hadBaseline: false,
      isTracked: false,
      newCommentIds: [],
      visits: storyId ? withoutStory(visits, storyId) : visits,
    }
  }

  const previousEntry = visits.stories[storyId]

  if (!previousEntry) {
    return {
      hadBaseline: false,
      isTracked: true,
      newCommentIds: [],
      visits: pruneDiscussionVisits({
        stories: {
          ...visits.stories,
          [storyId]: {
            lastVisitedAt: now,
            seenCommentIds: commentIds,
          },
        },
        version: DISCUSSION_VISITS_VERSION,
      }, now),
    }
  }

  const seenCommentIds = new Set(previousEntry.seenCommentIds)
  const newCommentIds = commentIds.filter(commentId => !seenCommentIds.has(commentId))

  return {
    hadBaseline: true,
    isTracked: true,
    newCommentIds,
    visits: pruneDiscussionVisits({
      stories: {
        ...visits.stories,
        [storyId]: {
          lastVisitedAt: now,
          // A visit with no additions can compact identities removed upstream.
          // When additions exist, keep the old baseline until the reader engages.
          seenCommentIds: newCommentIds.length === 0
            ? commentIds
            : previousEntry.seenCommentIds,
        },
      },
      version: DISCUSSION_VISITS_VERSION,
    }, now),
  }
}

export const acknowledgeDiscussionVisit = (
  value: DiscussionVisits,
  storyIdValue: string | number,
  currentCommentIds: Iterable<number>,
  now = Date.now(),
): DiscussionVisits => {
  const storyId = normalizeStoryId(storyIdValue)
  const commentIds = normalizeCommentIds(currentCommentIds)
  const visits = pruneDiscussionVisits(value, now)

  if (!storyId) {
    return visits
  }

  if (!commentIds) {
    return withoutStory(visits, storyId)
  }

  return pruneDiscussionVisits({
    stories: {
      ...visits.stories,
      [storyId]: {
        lastVisitedAt: now,
        seenCommentIds: commentIds,
      },
    },
    version: DISCUSSION_VISITS_VERSION,
  }, now)
}
