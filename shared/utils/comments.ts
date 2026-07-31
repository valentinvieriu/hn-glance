import type { Comment } from '#shared/types'

export const DEFAULT_COMMENT_DEPTH = 3

/**
 * A subtree only starts collapsed when hiding it actually saves scanning effort.
 * Below this size the replies are cheaper to read than the disclosure control.
 */
export const COLLAPSED_SUBTREE_MIN_DESCENDANTS = 4

export const COMMENT_PREVIEW_LENGTH = 100

export type CommentTreeSummary = {
  authorCounts: ReadonlyMap<string, number>
  descendantCounts: ReadonlyMap<number, number>
  /**
   * Comments whose replies are hidden on first render. The gate is armed at
   * exactly `maximumDepth`, never below it, so opening one of these renders the
   * rest of the chain in a single click instead of one click per level.
   */
  defaultCollapsedIds: ReadonlySet<number>
  total: number
}

type CommentFrame = {
  comment: Comment
  depth: number
  visited: boolean
}

export const summarizeCommentTree = (
  comments: Comment[],
  maximumDepth = DEFAULT_COMMENT_DEPTH,
): CommentTreeSummary => {
  const authorCounts = new Map<string, number>()
  const descendantCounts = new Map<number, number>()
  const defaultCollapsedIds = new Set<number>()
  const stack: CommentFrame[] = comments.map((comment) => ({
    comment,
    depth: 1,
    visited: false,
  }))
  let total = 0

  while (stack.length > 0) {
    const frame = stack.pop()

    if (!frame) {
      continue
    }

    const { comment, depth, visited } = frame
    const children = comment.children ?? []

    if (visited) {
      const descendantCount = children.reduce((count, child) => {
        return count + 1 + (descendantCounts.get(child.id) ?? 0)
      }, 0)
      descendantCounts.set(comment.id, descendantCount)

      if (depth === maximumDepth && descendantCount >= COLLAPSED_SUBTREE_MIN_DESCENDANTS) {
        defaultCollapsedIds.add(comment.id)
      }

      continue
    }

    total += 1
    authorCounts.set(comment.author, (authorCounts.get(comment.author) ?? 0) + 1)

    stack.push({ comment, depth, visited: true })
    children.forEach((child) => {
      stack.push({ comment: child, depth: depth + 1, visited: false })
    })
  }

  return {
    authorCounts,
    descendantCounts,
    defaultCollapsedIds,
    total,
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
