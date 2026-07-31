import { describe, expect, it } from 'vitest'
import type { Comment } from '#shared/types'
import { getCommentPathIds, getCommentPreview, summarizeCommentTree } from './comments'

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

  it('arms the collapse gate only at the default depth', () => {
    // depth 3 is comment 3; its subtree holds comments 4-8, so five descendants.
    const summary = summarizeCommentTree(chain(8))

    expect([...summary.defaultCollapsedIds]).toEqual([3])
  })

  it('leaves small subtrees expanded at the default depth', () => {
    // depth 3 is comment 3, with only comments 4-5 below it.
    const summary = summarizeCommentTree(chain(5))

    expect(summary.defaultCollapsedIds.size).toBe(0)
  })

  it('never collapses above the default depth', () => {
    const summary = summarizeCommentTree([
      comment(1, 'alice', [
        comment(2, 'bob', [comment(3, 'carol'), comment(4, 'dave'), comment(5, 'erin')]),
      ]),
    ])

    expect(summary.defaultCollapsedIds.size).toBe(0)
  })

  it('collapses every branch that reaches the default depth', () => {
    const summary = summarizeCommentTree([
      comment(1, 'alice', [
        comment(2, 'bob', [
          comment(3, 'carol', [comment(4, 'a'), comment(5, 'b'), comment(6, 'c'), comment(7, 'd')]),
          comment(8, 'dave', [comment(9, 'e'), comment(10, 'f'), comment(11, 'g'), comment(12, 'h')]),
        ]),
      ]),
    ])

    expect([...summary.defaultCollapsedIds].sort((a, b) => a - b)).toEqual([3, 8])
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
