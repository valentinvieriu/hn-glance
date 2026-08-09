import type { Comment } from '#shared/types'
import { htmlToPlainText, truncateAtWordBoundary } from './html'

const DEFAULT_COMMENT_DEPTH = 3

/**
 * A subtree only starts behind a reply gate when hiding it actually saves
 * scanning effort. Below this size the replies are cheaper to read than the
 * disclosure control.
 */
const HIDDEN_REPLY_SUBTREE_MIN_DESCENDANTS = 4

export type CommentSort = 'hn' | 'discussed' | 'recent'

export type CommentTreeSummary = {
  authorCounts: ReadonlyMap<string, number>
  commentAuthors: ReadonlyMap<number, string>
  descendantCounts: ReadonlyMap<number, number>
  navigationNodes: ReadonlyMap<number, CommentNavigationNode>
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

export type CommentNavigationNode = {
  comment: Comment
  depth: number
  nextSiblingId: number | null
  parentId: number | null
  previousSiblingId: number | null
  rootId: number
  siblingCount: number
  siblingIndex: number
}

type CommentFrame = {
  comment: Comment
  depth: number
  nextSiblingId: number | null
  parentCommentId: number | null
  previousSiblingId: number | null
  rootCommentId: number
  siblingCount: number
  siblingIndex: number
  visited: boolean
}

export const summarizeCommentTree = (
  comments: Comment[],
  maximumDepth = DEFAULT_COMMENT_DEPTH,
): CommentTreeSummary => {
  const authorCounts = new Map<string, number>()
  const commentAuthors = new Map<number, string>()
  const descendantCounts = new Map<number, number>()
  const navigationNodes = new Map<number, CommentNavigationNode>()
  const latestActivityTimestamps = new Map<number, number>()
  const parentCommentIds = new Map<number, number | null>()
  const rootCommentIds = new Map<number, number>()
  const defaultHiddenReplyIds = new Set<number>()
  const stack: CommentFrame[] = comments.map((comment, siblingIndex) => ({
    comment,
    depth: 1,
    nextSiblingId: comments[siblingIndex + 1]?.id ?? null,
    parentCommentId: null,
    previousSiblingId: comments[siblingIndex - 1]?.id ?? null,
    rootCommentId: comment.id,
    siblingCount: comments.length,
    siblingIndex,
    visited: false,
  }))
  let total = 0

  while (stack.length > 0) {
    const frame = stack.pop()

    if (!frame) {
      continue
    }

    const {
      comment,
      depth,
      nextSiblingId,
      parentCommentId,
      previousSiblingId,
      rootCommentId,
      siblingCount,
      siblingIndex,
      visited,
    } = frame
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
    navigationNodes.set(comment.id, {
      comment,
      depth,
      nextSiblingId,
      parentId: parentCommentId,
      previousSiblingId,
      rootId: rootCommentId,
      siblingCount,
      siblingIndex,
    })

    stack.push({
      comment,
      depth,
      nextSiblingId,
      parentCommentId,
      previousSiblingId,
      rootCommentId,
      siblingCount,
      siblingIndex,
      visited: true,
    })
    children.forEach((child, childIndex) => {
      stack.push({
        comment: child,
        depth: depth + 1,
        nextSiblingId: children[childIndex + 1]?.id ?? null,
        parentCommentId: comment.id,
        previousSiblingId: children[childIndex - 1]?.id ?? null,
        rootCommentId,
        siblingCount: children.length,
        siblingIndex: childIndex,
        visited: false,
      })
    })
  }

  return {
    authorCounts,
    commentAuthors,
    descendantCounts,
    navigationNodes,
    latestActivityTimestamps,
    parentCommentIds,
    rootCommentIds,
    defaultHiddenReplyIds,
    total,
  }
}

export const getCommentPreview = (
  text: string | null | undefined,
  maxLength = 180,
): string => {
  return truncateAtWordBoundary(htmlToPlainText(text ?? ''), maxLength)
}

export const getCommentPathFromIndex = (
  navigationNodes: ReadonlyMap<number, CommentNavigationNode>,
  commentId: number,
): number[] | null => {
  const path: number[] = []
  const visited = new Set<number>()
  let currentId: number | null = commentId

  while (currentId !== null) {
    if (visited.has(currentId)) {
      return null
    }

    const node = navigationNodes.get(currentId)

    if (!node) {
      return null
    }

    visited.add(currentId)
    path.push(currentId)
    currentId = node.parentId
  }

  return path.reverse()
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
