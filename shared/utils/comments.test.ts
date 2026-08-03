import { describe, expect, it } from 'vitest'
import type { Comment } from '#shared/types'
import {
  getCommentPathIds,
  getCommentReplyCountLabel,
  getExpandedCommentDisclosure,
  getSmartCommentDisclosure,
  revealCommentPath,
  summarizeCommentTree,
  toggleCommentReplies,
} from './comments'

const comment = (id: number, author: string, children: Comment[] = []): Comment => ({
  id,
  author,
  children,
  created_at: '2026-07-12T00:00:00Z',
  parent_id: id - 1,
  text: '',
})

/** A linear reply chain rooted at depth 1, so `chain(5)` reaches depth 5. */
const chain = (length: number, startId = 1): Comment[] => {
  let node: Comment[] = []

  for (let id = startId + length - 1; id >= startId; id -= 1) {
    node = [comment(id, `author-${id}`, node)]
  }

  return node
}

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
  })

  it('arms the hidden-reply gate only at the default depth', () => {
    // depth 3 is comment 3; its subtree holds comments 4-8, so five descendants.
    const summary = summarizeCommentTree(chain(8))

    expect([...summary.defaultHiddenReplyIds]).toEqual([3])
  })

  it('leaves small subtrees expanded at the default depth', () => {
    // depth 3 is comment 3, with only comments 4-5 below it.
    const summary = summarizeCommentTree(chain(5))

    expect(summary.defaultHiddenReplyIds.size).toBe(0)
  })

  it('never hides replies above the default depth', () => {
    const summary = summarizeCommentTree([
      comment(1, 'alice', [
        comment(2, 'bob', [comment(3, 'carol'), comment(4, 'dave'), comment(5, 'erin')]),
      ]),
    ])

    expect(summary.defaultHiddenReplyIds.size).toBe(0)
  })

  it('hides every qualifying branch at the default depth', () => {
    const summary = summarizeCommentTree([
      comment(1, 'alice', [
        comment(2, 'bob', [
          comment(3, 'carol', [comment(4, 'a'), comment(5, 'b'), comment(6, 'c'), comment(7, 'd')]),
          comment(8, 'dave', [comment(9, 'e'), comment(10, 'f'), comment(11, 'g'), comment(12, 'h')]),
        ]),
      ]),
    ])

    expect([...summary.defaultHiddenReplyIds].sort((a, b) => a - b)).toEqual([3, 8])
  })

  it('records parent and root identities during the same traversal', () => {
    const summary = summarizeCommentTree([
      comment(1, 'alice', [
        comment(2, 'bob', [comment(3, 'carol')]),
      ]),
      comment(4, 'dave'),
    ])

    expect(summary.parentCommentIds.get(1)).toBeNull()
    expect(summary.parentCommentIds.get(3)).toBe(2)
    expect(summary.rootCommentIds.get(3)).toBe(1)
    expect(summary.rootCommentIds.get(4)).toBe(4)
    expect(summary.commentAuthors.get(3)).toBe('carol')
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

describe('comment reply disclosure state', () => {
  it('toggles a comment reply gate independently', () => {
    const expanded = getExpandedCommentDisclosure()
    const repliesHidden = toggleCommentReplies(expanded, 2)
    const repliesShownAgain = toggleCommentReplies(repliesHidden, 2)

    expect([...repliesHidden]).toEqual([2])
    expect(repliesShownAgain.size).toBe(0)
  })

  it('expands all comments and restores smart defaults predictably', () => {
    const smart = getSmartCommentDisclosure(new Set([3, 8]))
    const modified = toggleCommentReplies(smart, 3)
    const expanded = getExpandedCommentDisclosure()
    const restored = getSmartCommentDisclosure(new Set([3, 8]))

    expect([...modified]).toEqual([8])
    expect(expanded.size).toBe(0)
    expect([...restored]).toEqual([3, 8])
  })

  it('reveals only the target path and preserves unrelated branch state', () => {
    const revealed = revealCommentPath(new Set([1, 2, 3, 9]), [1, 2, 3])

    expect([...revealed]).toEqual([3, 9])
  })
})

describe('comment reply count label', () => {
  it('distinguishes direct replies from the full descendant count', () => {
    expect(getCommentReplyCountLabel(3, 10)).toBe('3 replies · 10 in thread')
  })

  it('uses a singular direct reply without a redundant thread total', () => {
    expect(getCommentReplyCountLabel(1, 1)).toBe('1 reply')
  })
})
