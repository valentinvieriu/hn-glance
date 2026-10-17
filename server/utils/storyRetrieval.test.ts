import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchCommentLinkedStories,
  fetchStoryHits,
  fetchSubmissionHistoryHits,
} from './storyRetrieval'

describe('story retrieval channels', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('marks upstream failures instead of reporting an empty match', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(new Error('Algolia unavailable')))
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(fetchStoryHits({ query: 'zig' }, 'title')).resolves
      .toEqual({ hits: [], kind: 'title', failed: true })
    await expect(fetchCommentLinkedStories('zig')).resolves
      .toEqual({ hits: [], kind: 'comment', failed: true })
    await expect(fetchSubmissionHistoryHits('example.com/post')).resolves
      .toEqual({ hits: [], failed: true })
  })

  it('reports genuinely empty results as successful', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ hits: [] }))

    await expect(fetchStoryHits({ query: 'zig' }, 'title')).resolves
      .toEqual({ hits: [], kind: 'title' })
    await expect(fetchSubmissionHistoryHits('example.com/post')).resolves
      .toEqual({ hits: [], failed: false })
  })
})
