import { describe, expect, it } from 'vitest'
import type { Comment } from '#shared/types'
import { getCommentPathIds, summarizeCommentTree } from './comments'

const comment = (id: number, author: string, children: Comment[] = []): Comment => ({
  id,
  author,
  children,
  created_at: '2026-07-12T00:00:00Z',
  parent_id: id - 1,
  text: '',
})

describe('comment tree summary', () => {
  it('collects all tree statistics in one traversal', () => {
    const comments = [
      comment(1, 'alice', [
        comment(2, 'bob', [
          comment(3, 'alice', [comment(4, 'carol')]),
        ]),
      ]),
    ]

    const summary = summarizeCommentTree(comments)

    expect(summary.total).toBe(4)
    expect(summary.authorCounts.get('alice')).toBe(2)
    expect(summary.descendantCounts.get(1)).toBe(3)
    expect(summary.descendantCounts.get(3)).toBe(1)
    expect(summary.hasRepliesBeyondDefaultDepth).toBe(true)
  })
})

describe('comment ancestor path lookup', () => {
  const comments = [
    comment(1, 'alice', [
      comment(2, 'bob', [
        comment(3, 'alice', [comment(4, 'carol')]),
      ]),
    ]),
    comment(5, 'dave'),
  ]

  it('returns ancestor ids from root to a nested target', () => {
    expect(getCommentPathIds(comments, 4)).toEqual([1, 2, 3, 4])
  })

  it('returns just the target for a root-level comment', () => {
    expect(getCommentPathIds(comments, 5)).toEqual([5])
  })

  it('returns null for a missing comment id', () => {
    expect(getCommentPathIds(comments, 99)).toBeNull()
  })
})
