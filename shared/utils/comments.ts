import type { Comment } from '#shared/types'

export const DEFAULT_COMMENT_DEPTH = 3

export type CommentTreeSummary = {
  authorCounts: ReadonlyMap<string, number>
  descendantCounts: ReadonlyMap<number, number>
  hasRepliesBeyondDefaultDepth: boolean
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
  const stack: CommentFrame[] = comments.map((comment) => ({
    comment,
    depth: 1,
    visited: false,
  }))
  let hasRepliesBeyondDefaultDepth = false
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
      continue
    }

    total += 1
    authorCounts.set(comment.author, (authorCounts.get(comment.author) ?? 0) + 1)

    if (depth >= maximumDepth && children.length > 0) {
      hasRepliesBeyondDefaultDepth = true
    }

    stack.push({ comment, depth, visited: true })
    children.forEach((child) => {
      stack.push({ comment: child, depth: depth + 1, visited: false })
    })
  }

  return {
    authorCounts,
    descendantCounts,
    hasRepliesBeyondDefaultDepth,
    total,
  }
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
