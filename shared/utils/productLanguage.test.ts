import { describe, expect, it } from 'vitest'
import { discussionLanguage } from './productLanguage'

describe('discussion product language', () => {
  it('keeps canonical hierarchy and mode terms in one catalog', () => {
    expect(discussionLanguage.terms).toMatchObject({
      currentComment: 'Current comment',
      discussion: 'Discussion',
      parentComment: 'Parent comment',
      readingMode: 'Reading mode',
      readingPath: 'Reading path',
      rootComment: 'Root comment',
      rootComments: 'Root comments',
    })
    expect(discussionLanguage.actions.focusDiscussion).toBe('Focus discussion')
    expect(discussionLanguage.actions.goToRootComment).toBe('Go to root comment')
    expect(discussionLanguage.actions.goToCurrentComment).toBe('Go to current comment')
    expect(discussionLanguage.actions.markAllSeen).toBe('Mark all seen')
    expect(discussionLanguage.actions.startDiscussionOnHackerNews)
      .toBe('Start the discussion on HN')
    expect(discussionLanguage.accessibility.startDiscussionOnHackerNews)
      .toBe('Add the first comment on Hacker News (opens in a new tab)')
  })

  it('names comment and reply counts precisely', () => {
    expect(discussionLanguage.format.commentCount(1)).toBe('1 comment')
    expect(discussionLanguage.format.commentCount(4)).toBe('4 comments')
    expect(discussionLanguage.format.rootCommentCount(1)).toBe('1 root comment')
    expect(discussionLanguage.format.directReplyCount(2)).toBe('2 direct replies')
    expect(discussionLanguage.format.replySummary(1, 1)).toBe('1 reply')
    expect(discussionLanguage.format.replySummary(3, 10))
      .toBe('3 direct replies · 10 replies in branch')
    expect(discussionLanguage.format.newCommentCount(2)).toBe('2 new comments')
    expect(discussionLanguage.format.newCommentCompactCount(2)).toBe('2 new')
    expect(discussionLanguage.format.newCommentCompactPosition(2, 4)).toBe('2 / 4 new')
    expect(discussionLanguage.format.newReplyCount(1)).toBe('1 new reply')
    expect(discussionLanguage.format.newCommentPosition(2, 4)).toBe('2 of 4 new comments')
  })

  it('uses the sibling set to make navigation destinations explicit', () => {
    expect(discussionLanguage.format.previousSibling('root-comment'))
      .toBe('Previous root comment')
    expect(discussionLanguage.format.nextSibling('reply')).toBe('Next reply')
    expect(discussionLanguage.format.replyPosition(2, 4, 'reply'))
      .toBe('2 of 4 replies')
  })

  it('labels reading-path steps without treating depth as a reply number', () => {
    expect(discussionLanguage.format.pathStep(0, false)).toBe('Root comment')
    expect(discussionLanguage.format.pathStep(1, false)).toBe('Reply 1')
    expect(discussionLanguage.format.pathStep(3, true)).toBe('Current')
  })

  it('builds complete accessible phrases from the same vocabulary', () => {
    expect(discussionLanguage.format.rowLabel(
      'alice',
      '2 hours ago',
      'reading-path',
      '2 replies',
    )).toBe('alice, 2 hours ago, on reading path, 2 replies')
    expect(discussionLanguage.format.replyDisclosure(true, '4 replies', 'alice'))
      .toBe('Show 4 replies from alice')
    expect(discussionLanguage.format.rowLabel(
      'alice',
      '2 hours ago',
      null,
      'end of branch',
      true,
    )).toBe('alice, 2 hours ago, new comment, end of branch')
  })
})
