const HN_ITEM_ID_PATTERN = /^[1-9]\d{0,14}$/
const HN_USERNAME_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
const HN_COMMENT_HASH_PATTERN = /^#comment-(\d+)$/u
const HN_WEB_ORIGIN = 'https://news.ycombinator.com'

export const HN_FIREBASE_API_URL = 'https://hacker-news.firebaseio.com/v0'
export const HN_FEEDS = ['top', 'best', 'new', 'show'] as const

export type HnFeed = typeof HN_FEEDS[number]

export const isHnFeed = (value: unknown): value is HnFeed => {
  return HN_FEEDS.some(feed => feed === value)
}

export const getHnFeedIdsUrl = (feed: HnFeed) => {
  return `${HN_FIREBASE_API_URL}/${feed}stories.json`
}

/** Route params and query values may repeat; HN Glance only reads the first. */
export const getFirstQueryValue = (value: unknown): unknown => {
  return Array.isArray(value) ? value[0] : value
}

export const isValidHnItemId = (value: unknown): value is string => {
  return typeof value === 'string'
    && HN_ITEM_ID_PATTERN.test(value)
    && Number.isSafeInteger(Number(value))
}

export const normalizeHnItemId = (value: unknown) => {
  const itemId = getFirstQueryValue(value)

  return isValidHnItemId(itemId) ? itemId : null
}

export const isValidHnUsername = (value: unknown): value is string => {
  return typeof value === 'string' && HN_USERNAME_PATTERN.test(value)
}

export const normalizeHnUsername = (value: unknown) => {
  const username = getFirstQueryValue(value)

  return isValidHnUsername(username) ? username : ''
}

export const getCommentIdFromHash = (hash: string) => {
  const commentId = Number(hash.match(HN_COMMENT_HASH_PATTERN)?.[1])

  return Number.isSafeInteger(commentId) && commentId > 0 ? commentId : null
}

export const getHnItemUrl = (itemId: string | number) => {
  return `${HN_WEB_ORIGIN}/item?id=${encodeURIComponent(String(itemId))}`
}

export const getHnUserUrl = (username: string) => {
  return `${HN_WEB_ORIGIN}/user?id=${encodeURIComponent(username)}`
}

export const getHnReplyUrl = (comment: { id: number, parent_id: number | null }) => {
  return `${HN_WEB_ORIGIN}/reply?id=${comment.id}&goto=item%3Fid%3D${comment.parent_id}%23${comment.id}`
}

export const getHnUserPath = (username: string) => {
  return `/user/${encodeURIComponent(username)}`
}
