import { describe, expect, it } from 'vitest'
import type { Comment } from '#shared/types'
import {
  getCommentPathFromIndex,
  getCommentPreview,
  getExpandedCommentDisclosure,
  getSmartCommentDisclosure,
  revealCommentPath,
  sortCommentThreads,
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
    expect(summary.latestActivityTimestamps.get(1)).toBe(Date.parse('2026-07-12T00:00:00Z'))
  })

  it('records the latest activity anywhere in each subtree', () => {
    const root = comment(1, 'alice', [comment(2, 'bob'), comment(3, 'carol')])
    root.created_at = '2026-07-10T00:00:00Z'
    root.children[0]!.created_at = '2026-07-14T00:00:00Z'
    root.children[1]!.created_at = '2026-07-13T00:00:00Z'

    const summary = summarizeCommentTree([root])

    expect(summary.latestActivityTimestamps.get(1)).toBe(Date.parse('2026-07-14T00:00:00Z'))
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
    expect(summary.navigationNodes.get(3)).toMatchObject({
      depth: 3,
      parentId: 2,
      rootId: 1,
      siblingCount: 1,
      siblingIndex: 0,
    })
  })

  it('indexes sibling navigation in native order', () => {
    const summary = summarizeCommentTree([
      comment(1, 'alice', [comment(2, 'bob'), comment(3, 'carol')]),
      comment(4, 'dave'),
    ])

    expect(summary.navigationNodes.get(1)?.nextSiblingId).toBe(4)
    expect(summary.navigationNodes.get(2)?.previousSiblingId).toBeNull()
    expect(summary.navigationNodes.get(2)?.nextSiblingId).toBe(3)
    expect(summary.navigationNodes.get(3)?.previousSiblingId).toBe(2)
    expect(summary.navigationNodes.get(3)?.nextSiblingId).toBeNull()
    expect(summary.navigationNodes.get(4)?.previousSiblingId).toBe(1)
  })
})

describe('comment thread sorting', () => {
  const comments = [
    comment(1, 'alice', [comment(2, 'bob')]),
    comment(3, 'carol', [comment(4, 'dave'), comment(5, 'erin')]),
    comment(6, 'frank', [comment(7, 'grace'), comment(8, 'heidi')]),
  ]
  comments[0]!.children[0]!.created_at = '2026-07-16T00:00:00Z'
  comments[1]!.children[0]!.created_at = '2026-07-14T00:00:00Z'
  comments[2]!.children[0]!.created_at = '2026-07-15T00:00:00Z'
  const summary = summarizeCommentTree(comments)

  it('preserves the API order for HN order', () => {
    expect(sortCommentThreads(comments, 'hn', summary)).toBe(comments)
  })

  it('sorts complete branches by descendant count with stable ties', () => {
    expect(sortCommentThreads(comments, 'discussed', summary).map(item => item.id)).toEqual([3, 6, 1])
    expect(comments.map(item => item.id)).toEqual([1, 3, 6])
  })

  it('sorts branches by their newest nested activity', () => {
    expect(sortCommentThreads(comments, 'recent', summary).map(item => item.id)).toEqual([1, 6, 3])
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

  it('derives root-to-target paths from the shared navigation index', () => {
    const summary = summarizeCommentTree(comments)

    expect(getCommentPathFromIndex(summary.navigationNodes, 4)).toEqual([1, 2, 3, 4])
    expect(getCommentPathFromIndex(summary.navigationNodes, 5)).toEqual([5])
    expect(getCommentPathFromIndex(summary.navigationNodes, 99)).toBeNull()
  })
})

describe('comment browser previews', () => {
  it('produces a safe compact plain-text excerpt', () => {
    expect(getCommentPreview('<p>Hello &amp; <strong>welcome</strong>.</p>')).toBe('Hello & welcome.')
    expect(getCommentPreview('&#34;Quoted&#34; &#x2F; linked')).toBe('"Quoted" / linked')
  })

  it('truncates long excerpts at a useful word boundary', () => {
    expect(getCommentPreview('A compact comment preview with several words', 24))
      .toBe('A compact comment…')
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
