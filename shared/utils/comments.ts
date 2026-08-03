import type { Comment } from '#shared/types'

export const DEFAULT_COMMENT_DEPTH = 3

/**
 * A subtree only starts behind a reply gate when hiding it actually saves
 * scanning effort. Below this size the replies are cheaper to read than the
 * disclosure control.
 */
export const HIDDEN_REPLY_SUBTREE_MIN_DESCENDANTS = 4

export type CommentSort = 'hn' | 'discussed' | 'recent'

export type CommentTreeSummary = {
  authorCounts: ReadonlyMap<string, number>
  commentAuthors: ReadonlyMap<number, string>
  descendantCounts: ReadonlyMap<number, number>
  latestActivityTimestamps: ReadonlyMap<number, number>
  parentCommentIds: ReadonlyMap<number, number | null>
  rootCommentIds: ReadonlyMap<number, number>
  /**
   * Comments whose replies are hidden on first render. The gate is armed at
   * exactly `maximumDepth`, never below it, so opening one of these renders the
   * rest of the chain in a single click instead of one click per level.
   */
  defaultHiddenReplyIds: ReadonlySet<number>
  total: number
}

type CommentFrame = {
  comment: Comment
  depth: number
  parentCommentId: number | null
  rootCommentId: number
  visited: boolean
}

export const summarizeCommentTree = (
  comments: Comment[],
  maximumDepth = DEFAULT_COMMENT_DEPTH,
): CommentTreeSummary => {
  const authorCounts = new Map<string, number>()
  const commentAuthors = new Map<number, string>()
  const descendantCounts = new Map<number, number>()
  const latestActivityTimestamps = new Map<number, number>()
  const parentCommentIds = new Map<number, number | null>()
  const rootCommentIds = new Map<number, number>()
  const defaultHiddenReplyIds = new Set<number>()
  const stack: CommentFrame[] = comments.map((comment) => ({
    comment,
    depth: 1,
    parentCommentId: null,
    rootCommentId: comment.id,
    visited: false,
  }))
  let total = 0

  while (stack.length > 0) {
    const frame = stack.pop()

    if (!frame) {
      continue
    }

    const { comment, depth, parentCommentId, rootCommentId, visited } = frame
    const children = comment.children ?? []

    if (visited) {
      const descendantCount = children.reduce((count, child) => {
        return count + 1 + (descendantCounts.get(child.id) ?? 0)
      }, 0)
      const createdAtTimestamp = Date.parse(comment.created_at)
      const latestActivityTimestamp = children.reduce((latestTimestamp, child) => {
        return Math.max(
          latestTimestamp,
          latestActivityTimestamps.get(child.id) ?? Number.NEGATIVE_INFINITY,
        )
      }, Number.isFinite(createdAtTimestamp) ? createdAtTimestamp : Number.NEGATIVE_INFINITY)
      descendantCounts.set(comment.id, descendantCount)
      latestActivityTimestamps.set(comment.id, latestActivityTimestamp)

      if (
        depth === maximumDepth
        && descendantCount >= HIDDEN_REPLY_SUBTREE_MIN_DESCENDANTS
      ) {
        defaultHiddenReplyIds.add(comment.id)
      }

      continue
    }

    total += 1
    authorCounts.set(comment.author, (authorCounts.get(comment.author) ?? 0) + 1)
    commentAuthors.set(comment.id, comment.author)
    parentCommentIds.set(comment.id, parentCommentId)
    rootCommentIds.set(comment.id, rootCommentId)

    stack.push({ comment, depth, parentCommentId, rootCommentId, visited: true })
    children.forEach((child) => {
      stack.push({
        comment: child,
        depth: depth + 1,
        parentCommentId: comment.id,
        rootCommentId,
        visited: false,
      })
    })
  }

  return {
    authorCounts,
    commentAuthors,
    descendantCounts,
    latestActivityTimestamps,
    parentCommentIds,
    rootCommentIds,
    defaultHiddenReplyIds,
    total,
  }
}

export const sortCommentThreads = (
  comments: Comment[],
  sort: CommentSort,
  summary: Pick<CommentTreeSummary, 'descendantCounts' | 'latestActivityTimestamps'>,
): Comment[] => {
  if (sort === 'hn') {
    return comments
  }

  const originalIndexes = new Map(comments.map((comment, index) => [comment.id, index]))

  return [...comments].sort((left, right) => {
    const leftValue = sort === 'discussed'
      ? summary.descendantCounts.get(left.id) ?? 0
      : summary.latestActivityTimestamps.get(left.id) ?? Number.NEGATIVE_INFINITY
    const rightValue = sort === 'discussed'
      ? summary.descendantCounts.get(right.id) ?? 0
      : summary.latestActivityTimestamps.get(right.id) ?? Number.NEGATIVE_INFINITY

    return rightValue - leftValue
      || (originalIndexes.get(left.id) ?? 0) - (originalIndexes.get(right.id) ?? 0)
  })
}

export const getCommentReplyCountLabel = (
  directReplyCount: number,
  descendantCount: number,
) => {
  const directLabel = `${directReplyCount} ${directReplyCount === 1 ? 'reply' : 'replies'}`

  return descendantCount > directReplyCount
    ? `${directLabel} · ${descendantCount} in thread`
    : directLabel
}

const toggleCommentId = (ids: ReadonlySet<number>, commentId: number) => {
  const nextIds = new Set(ids)

  if (!nextIds.delete(commentId)) {
    nextIds.add(commentId)
  }

  return nextIds
}

export const toggleCommentReplies = (
  hiddenReplyIds: ReadonlySet<number>,
  commentId: number,
): ReadonlySet<number> => toggleCommentId(hiddenReplyIds, commentId)

export const getExpandedCommentDisclosure = (): ReadonlySet<number> => new Set()

export const getSmartCommentDisclosure = (
  defaultHiddenReplyIds: ReadonlySet<number>,
): ReadonlySet<number> => new Set(defaultHiddenReplyIds)

export const revealCommentPath = (
  hiddenReplyIds: ReadonlySet<number>,
  pathIds: readonly number[],
): ReadonlySet<number> => {
  const revealedReplyIds = new Set(hiddenReplyIds)
  pathIds.slice(0, -1).forEach(commentId => revealedReplyIds.delete(commentId))
  return revealedReplyIds
}

export const getCommentPathIds = (
  comments: Comment[],
  commentId: number,
): number[] | null => {
  const stack: Array<{ comment: Comment; path: number[] }> = comments
    .map(comment => ({ comment, path: [] as number[] }))
    .reverse()

  while (stack.length > 0) {
    const frame = stack.pop()

    if (!frame) continue

    const path = [...frame.path, frame.comment.id]

    if (frame.comment.id === commentId) {
      return path
    }

    const children = frame.comment.children ?? []
    for (let index = children.length - 1; index >= 0; index -= 1) {
      const child = children[index]
      if (child) stack.push({ comment: child, path })
    }
  }

  return null
}
