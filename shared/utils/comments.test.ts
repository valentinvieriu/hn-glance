import { describe, expect, it } from 'vitest'
import type { Comment } from '#shared/types'
import {
  getCommentPathIds,
  getCommentPreview,
  getCommentReplyCountLabel,
  getExpandedCommentDisclosure,
  getSmartCommentDisclosure,
  revealCommentPath,
  summarizeCommentTree,
  toggleCommentCompaction,
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

  it('records sibling navigation in native order with explicit boundaries', () => {
    const summary = summarizeCommentTree([
      comment(1, 'alice', [
        comment(2, 'bob'),
        comment(3, 'carol'),
        comment(4, 'dave'),
      ]),
      comment(5, 'erin'),
    ])

    expect(summary.previousSiblingIds.get(1)).toBeUndefined()
    expect(summary.nextSiblingIds.get(1)).toBe(5)
    expect(summary.previousSiblingIds.get(5)).toBe(1)
    expect(summary.nextSiblingIds.get(5)).toBeUndefined()

    expect(summary.previousSiblingIds.get(2)).toBeUndefined()
    expect(summary.nextSiblingIds.get(2)).toBe(3)
    expect(summary.previousSiblingIds.get(3)).toBe(2)
    expect(summary.nextSiblingIds.get(3)).toBe(4)
    expect(summary.previousSiblingIds.get(4)).toBe(3)
    expect(summary.nextSiblingIds.get(4)).toBeUndefined()
  })
})

describe('collapsed comment preview', () => {
  it('strips markup and collapses whitespace', () => {
    expect(getCommentPreview('<p>Hello   <a href="https://x.test">world</a></p>')).toBe(
      'Hello world',
    )
  })

  it('decodes the entities HN emits', () => {
    expect(getCommentPreview('&gt; quoted &amp; &quot;cited&quot; &#x27;text&#x27;')).toBe(
      '> quoted & "cited" \'text\'',
    )
  })

  it('does not double-decode escaped ampersands into markup', () => {
    expect(getCommentPreview('&amp;lt;script&amp;gt;')).toBe('&lt;script&gt;')
  })

  it('truncates on a word boundary', () => {
    const preview = getCommentPreview('alpha beta gamma delta epsilon', 20)

    expect(preview).toBe('alpha beta gamma…')
  })

  it('hard-cuts a single oversized token', () => {
    const preview = getCommentPreview(`a ${'x'.repeat(40)}`, 20)

    expect(preview).toBe(`a ${'x'.repeat(18)}…`)
  })

  it('returns an empty string for missing text', () => {
    expect(getCommentPreview(null)).toBe('')
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

describe('comment disclosure state', () => {
  it('keeps compaction and reply disclosure independent', () => {
    const initial = getExpandedCommentDisclosure()
    const repliesHidden = toggleCommentReplies(initial, 2)
    const compacted = toggleCommentCompaction(repliesHidden, 2)
    const expandedAgain = toggleCommentCompaction(compacted, 2)

    expect([...compacted.compactedIds]).toEqual([2])
    expect([...compacted.hiddenReplyIds]).toEqual([2])
    expect(expandedAgain.compactedIds.size).toBe(0)
    expect([...expandedAgain.hiddenReplyIds]).toEqual([2])
  })

  it('expands all comments and restores smart defaults predictably', () => {
    const smart = getSmartCommentDisclosure(new Set([3, 8]))
    const modified = toggleCommentCompaction(toggleCommentReplies(smart, 3), 4)
    const expanded = getExpandedCommentDisclosure()
    const restored = getSmartCommentDisclosure(new Set([3, 8]))

    expect([...modified.compactedIds]).toEqual([4])
    expect([...modified.hiddenReplyIds]).toEqual([8])
    expect(expanded.compactedIds.size).toBe(0)
    expect(expanded.hiddenReplyIds.size).toBe(0)
    expect(restored.compactedIds.size).toBe(0)
    expect([...restored.hiddenReplyIds]).toEqual([3, 8])
  })

  it('reveals only the target path and preserves unrelated branch state', () => {
    const revealed = revealCommentPath({
      compactedIds: new Set([1, 2, 3, 9]),
      hiddenReplyIds: new Set([1, 2, 3, 9]),
    }, [1, 2, 3])

    expect([...revealed.compactedIds]).toEqual([9])
    expect([...revealed.hiddenReplyIds]).toEqual([3, 9])
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
