import type { Comment } from '#shared/types'

export const DEFAULT_COMMENT_DEPTH = 3

/**
 * A subtree only starts behind a reply gate when hiding it actually saves
 * scanning effort. Below this size the replies are cheaper to read than the
 * disclosure control.
 */
export const HIDDEN_REPLY_SUBTREE_MIN_DESCENDANTS = 4

export const COMMENT_PREVIEW_LENGTH = 100

export type CommentDisclosureState = {
  compactedIds: ReadonlySet<number>
  hiddenReplyIds: ReadonlySet<number>
}

export type CommentTreeSummary = {
  authorCounts: ReadonlyMap<string, number>
  commentAuthors: ReadonlyMap<number, string>
  descendantCounts: ReadonlyMap<number, number>
  parentCommentIds: ReadonlyMap<number, number | null>
  rootCommentIds: ReadonlyMap<number, number>
  previousSiblingIds: ReadonlyMap<number, number>
  nextSiblingIds: ReadonlyMap<number, number>
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
  const parentCommentIds = new Map<number, number | null>()
  const rootCommentIds = new Map<number, number>()
  const previousSiblingIds = new Map<number, number>()
  const nextSiblingIds = new Map<number, number>()
  const defaultHiddenReplyIds = new Set<number>()
  const stack: CommentFrame[] = comments.map((comment) => ({
    comment,
    depth: 1,
    parentCommentId: null,
    rootCommentId: comment.id,
    visited: false,
  }))
  let total = 0

  const recordSiblingNavigation = (siblings: Comment[]) => {
    siblings.forEach((comment, index) => {
      const previousSibling = siblings[index - 1]
      const nextSibling = siblings[index + 1]

      if (previousSibling) {
        previousSiblingIds.set(comment.id, previousSibling.id)
      }
      if (nextSibling) {
        nextSiblingIds.set(comment.id, nextSibling.id)
      }
    })
  }

  recordSiblingNavigation(comments)

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
      descendantCounts.set(comment.id, descendantCount)

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
    recordSiblingNavigation(children)

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
    parentCommentIds,
    rootCommentIds,
    previousSiblingIds,
    nextSiblingIds,
    defaultHiddenReplyIds,
    total,
  }
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

export const toggleCommentCompaction = (
  state: CommentDisclosureState,
  commentId: number,
): CommentDisclosureState => ({
  compactedIds: toggleCommentId(state.compactedIds, commentId),
  hiddenReplyIds: state.hiddenReplyIds,
})

export const toggleCommentReplies = (
  state: CommentDisclosureState,
  commentId: number,
): CommentDisclosureState => ({
  compactedIds: state.compactedIds,
  hiddenReplyIds: toggleCommentId(state.hiddenReplyIds, commentId),
})

export const getExpandedCommentDisclosure = (): CommentDisclosureState => ({
  compactedIds: new Set(),
  hiddenReplyIds: new Set(),
})

export const getSmartCommentDisclosure = (
  defaultHiddenReplyIds: ReadonlySet<number>,
): CommentDisclosureState => ({
  compactedIds: new Set(),
  hiddenReplyIds: new Set(defaultHiddenReplyIds),
})

export const revealCommentPath = (
  state: CommentDisclosureState,
  pathIds: readonly number[],
): CommentDisclosureState => {
  const compactedIds = new Set(state.compactedIds)
  const hiddenReplyIds = new Set(state.hiddenReplyIds)

  pathIds.forEach(commentId => compactedIds.delete(commentId))
  pathIds.slice(0, -1).forEach(commentId => hiddenReplyIds.delete(commentId))

  return {
    compactedIds,
    hiddenReplyIds,
  }
}

const PLAIN_TEXT_ENTITIES: Record<string, string> = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&nbsp;': ' ',
  '&#x27;': "'",
  '&#39;': "'",
  '&#x2f;': '/',
  '&#47;': '/',
}

/**
 * Flattens HN comment markup into a one-line summary for collapsed rows.
 * The result is plain text rendered through interpolation, never `v-html`, so
 * decoding entities here cannot reintroduce markup the sanitizer would strip.
 */
export const getCommentPreview = (
  text: string | null | undefined,
  maxLength = COMMENT_PREVIEW_LENGTH,
): string => {
  const plain = (text ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(
      /&(?:lt|gt|quot|nbsp|#x27|#39|#x2F|#47);/gi,
      match => PLAIN_TEXT_ENTITIES[match.toLowerCase()] ?? match,
    )
    // Ampersands decode last so `&amp;lt;` stays literal instead of becoming `<`.
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()

  if (plain.length <= maxLength) {
    return plain
  }

  const clipped = plain.slice(0, maxLength)
  const lastSpace = clipped.lastIndexOf(' ')
  // Fall back to a hard cut when the tail is one very long token (a bare URL).
  const truncated = lastSpace > maxLength * 0.6 ? clipped.slice(0, lastSpace) : clipped

  return `${truncated.trimEnd()}…`
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
