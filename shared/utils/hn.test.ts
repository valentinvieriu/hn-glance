import { describe, expect, it } from 'vitest'
import {
  getCommentIdFromHash,
  getFirstQueryValue,
  getHnFeedIdsUrl,
  getHnItemUrl,
  getHnReplyUrl,
  getHnUserPath,
  getHnUserUrl,
  isHnFeed,
  normalizeHnItemId,
  normalizeHnUsername,
} from './hn'

describe('HN identifiers and paths', () => {
  it('normalizes route params with one shared validation policy', () => {
    expect(normalizeHnItemId(['123'])).toBe('123')
    expect(normalizeHnItemId('0')).toBeNull()
    expect(normalizeHnItemId('000123')).toBeNull()
    expect(normalizeHnItemId('9007199254740992')).toBeNull()
    expect(normalizeHnUsername(['alice_42'])).toBe('alice_42')
    expect(normalizeHnUsername('../alice')).toBe('')
    expect(normalizeHnUsername('$alice')).toBe('')
    expect(normalizeHnUsername('a'.repeat(65))).toBe('')
  })

  it('reads the first value of repeated route and query params', () => {
    expect(getFirstQueryValue(['a', 'b'])).toBe('a')
    expect(getFirstQueryValue('a')).toBe('a')
    expect(getFirstQueryValue(undefined)).toBeUndefined()
  })

  it('parses comment deep-link hashes', () => {
    expect(getCommentIdFromHash('#comment-42')).toBe(42)
    expect(getCommentIdFromHash('#comment-0')).toBeNull()
    expect(getCommentIdFromHash('#comments')).toBeNull()
    expect(getCommentIdFromHash('')).toBeNull()
  })

  it('encodes item, user, and reply destinations', () => {
    expect(getHnItemUrl('123')).toBe('https://news.ycombinator.com/item?id=123')
    expect(getHnUserPath('alice 42')).toBe('/user/alice%2042')
    expect(getHnUserUrl('alice 42')).toBe('https://news.ycombinator.com/user?id=alice%2042')
    expect(getHnReplyUrl({ id: 7, parent_id: 3 }))
      .toBe('https://news.ycombinator.com/reply?id=7&goto=item%3Fid%3D3%237')
  })

  it('names the four discovery feeds and their Firebase ID lists', () => {
    expect(isHnFeed('show')).toBe(true)
    expect(isHnFeed('ask')).toBe(false)
    expect(getHnFeedIdsUrl('top')).toBe('https://hacker-news.firebaseio.com/v0/topstories.json')
  })
})
