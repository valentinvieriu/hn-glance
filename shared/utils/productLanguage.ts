export type DiscussionSiblingKind = 'reply' | 'root-comment'
export type DiscussionRowState = 'current' | 'reading-path' | null

const pluralize = (
  count: number,
  singular: string,
  plural = `${singular}s`,
) => `${count} ${count === 1 ? singular : plural}`

const terms = {
  branch: 'Branch',
  commentReader: 'Comment reader',
  currentComment: 'Current comment',
  discussion: 'Discussion',
  discussionFocus: 'Discussion focus',
  parentComment: 'Parent comment',
  readingMode: 'Reading mode',
  readingPath: 'Reading path',
  replies: 'Replies',
  rootComment: 'Root comment',
  rootComments: 'Root comments',
} as const

const actions = {
  expandAllReplies: 'Expand all replies',
  focusDiscussion: 'Focus discussion',
  goToCurrentComment: 'Go to current comment',
  goToRootComment: 'Go to root comment',
  hideDeepReplies: 'Hide deep replies',
  overview: 'Overview',
  replyOnHackerNews: 'Reply on HN',
  returnToOverview: 'Return to overview',
  showRootComments: 'Show root comments',
} as const

const states = {
  current: 'Current',
  originalPoster: 'OP',
  readingPath: terms.readingPath,
} as const

const messages = {
  commentHasNoText: 'Comment has no text.',
  endOfBranch: 'End of branch',
  noCommentsYet: 'No comments yet.',
  selectRootComment: 'Select a root comment to read it.',
} as const

const context = {
  replyingTo: 'Replying to',
} as const

const sort = {
  hn: 'HN order',
  discussed: 'Most discussed',
  recent: 'Recent activity',
  rootComments: 'Sort root comments',
} as const

const sections = {
  fromDiscussion: 'From the Discussion',
  linksInComment: 'Links in this comment',
} as const

const siblingLabel = (
  direction: 'Next' | 'Previous',
  siblingKind: DiscussionSiblingKind,
) => siblingKind === 'root-comment'
  ? `${direction} root comment`
  : `${direction} reply`

const replySummary = (directReplyCount: number, descendantCount: number) => {
  const directLabel = pluralize(directReplyCount, 'reply', 'replies')

  if (descendantCount <= directReplyCount) {
    return directLabel
  }

  const directDetail = pluralize(directReplyCount, 'direct reply', 'direct replies')
  const branchDetail = pluralize(descendantCount, 'reply', 'replies')

  return `${directDetail} · ${branchDetail} in branch`
}

export const discussionLanguage = {
  terms,
  actions,
  states,
  messages,
  context,
  sort,
  sections,
  format: {
    authorActivity: (author: string, count: number) => {
      return `${author} has made ${pluralize(count, 'comment')} on this story`
    },
    commentCount: (count: number) => pluralize(count, 'comment'),
    commentPermalink: (author: string, timeAgo: string) => {
      return `Permalink to ${author}'s comment from ${timeAgo}`
    },
    depth: (depth: number) => `Depth ${depth}`,
    directReplyCount: (count: number) => pluralize(count, 'direct reply', 'direct replies'),
    linkCountSharedInComments: (count: number) => {
      return `${pluralize(count, 'link')} shared in comments`
    },
    nextSibling: (siblingKind: DiscussionSiblingKind) => siblingLabel('Next', siblingKind),
    parentCommentBy: (author: string) => `Parent comment by ${author}`,
    pathStep: (index: number, isCurrent: boolean) => {
      if (isCurrent) {
        return states.current
      }

      return index === 0 ? terms.rootComment : `Reply ${index}`
    },
    previousSibling: (siblingKind: DiscussionSiblingKind) => siblingLabel('Previous', siblingKind),
    replyDisclosure: (show: boolean, summary: string, author: string) => {
      return `${show ? 'Show' : 'Hide'} ${summary} from ${author}`
    },
    replyDisclosureAction: (show: boolean, summary: string) => {
      return `${show ? 'Show' : 'Hide'} ${summary}`
    },
    replyOnHackerNews: (author: string) => {
      return `Reply to ${author} on Hacker News (opens in a new tab)`
    },
    replyPosition: (
      index: number,
      total: number,
      siblingKind: DiscussionSiblingKind,
    ) => {
      const unit = siblingKind === 'root-comment'
        ? (total === 1 ? 'root comment' : 'root comments')
        : (total === 1 ? 'reply' : 'replies')

      return `${index} of ${total} ${unit}`
    },
    repliesTo: (author: string) => `Replies to ${author}`,
    replySummary,
    rootCommentBy: (author: string) => `Root comment by ${author}`,
    rootCommentCount: (count: number) => pluralize(count, 'root comment'),
    rowLabel: (
      author: string,
      timeAgo: string,
      state: DiscussionRowState,
      continuation: string,
    ) => {
      const stateLabel = state === 'current'
        ? 'current comment'
        : state === 'reading-path'
          ? 'on reading path'
          : ''

      return [author, timeAgo, stateLabel, continuation].filter(Boolean).join(', ')
    },
  },
  accessibility: {
    ancestry: (author: string) => `Comment ancestry for ${author}`,
    commentPermalink: 'Comment permalink',
    commentNavigation: 'Comment navigation',
    completeReadingPath: 'Complete comment reading path',
    discussionFocus: terms.discussionFocus,
    endOfBranch: 'end of branch',
    jumpToDiscussion: 'Jump to discussion',
    jumpToParentComment: (author: string) => `Jump to parent comment by ${author}`,
    jumpToRootComment: (author: string) => `Jump to root comment by ${author}`,
    originalPoster: 'Submitted this story',
    readingPath: terms.readingPath,
  },
} as const

export const productLanguage = {
  discussion: discussionLanguage,
} as const
