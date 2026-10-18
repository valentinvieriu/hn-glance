import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AlgoliaStoryHit } from './algolia'
import { searchStories, SearchUnavailableError } from './storySearch'

const nowSeconds = Math.floor(Date.now() / 1000)

const story = (objectID: string, title: string, overrides: Partial<AlgoliaStoryHit> = {}): AlgoliaStoryHit => ({
  objectID,
  title,
  created_at: new Date((nowSeconds - 3600) * 1000).toISOString(),
  created_at_i: nowSeconds - 3600,
  points: 20,
  num_comments: 5,
  author: 'author',
  url: `https://story-${objectID}.example/post`,
  ...overrides,
})

type AlgoliaRequest = {
  params: URLSearchParams
  byDate: boolean
  signal?: AbortSignal
}

type Channel = 'title' | 'recent-title' | 'full-text' | 'comment' | 'comment-stories' | 'broadened' | 'frequency' | 'source'

const channelOf = ({ params, byDate }: AlgoliaRequest): Channel => {
  if (params.get('tags') === 'comment') return 'comment'
  if (params.has('filters')) return 'comment-stories'
  if (params.get('restrictSearchableAttributes') === 'url') return 'source'
  if (params.get('hitsPerPage') === '0') return 'frequency'
  if (params.has('optionalWords')) return 'broadened'
  if (params.get('restrictSearchableAttributes') === 'title') return byDate ? 'recent-title' : 'title'
  return 'full-text'
}

/** Routes each Algolia request to a per-channel responder; unrouted channels return no hits. */
const stubAlgolia = (responders: Partial<Record<Channel, (request: AlgoliaRequest) => unknown>>) => {
  const requests: Array<AlgoliaRequest & { channel: Channel }> = []

  vi.stubGlobal('$fetch', vi.fn(async (url: string, options?: { signal?: AbortSignal }) => {
    const parsed = new URL(url)
    const request = {
      params: parsed.searchParams,
      byDate: parsed.pathname.endsWith('/search_by_date'),
      signal: options?.signal,
    }
    const channel = channelOf(request)
    requests.push({ ...request, channel })

    return responders[channel]?.(request) ?? { hits: [] }
  }))

  return requests
}

const fail = () => {
  throw new Error('Algolia unavailable')
}

describe('searchStories', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('fails when every retrieval channel fails', async () => {
    stubAlgolia({ 'title': fail, 'recent-title': fail, 'full-text': fail, 'comment': fail })

    await expect(searchStories('zig', 'month', 'relevance')).rejects.toBeInstanceOf(SearchUnavailableError)
  })

  it('returns flagged partial results when only some channels fail', async () => {
    stubAlgolia({
      'title': () => ({ hits: [story('1', 'Zig build system explained')] }),
      'comment': fail,
    })

    await expect(searchStories('zig', 'month', 'relevance')).resolves.toMatchObject({
      partial: true,
      stories: [{ objectID: '1', match: 'title' }],
    })
  })

  it('fails rather than reporting no match when a partial search finds nothing', async () => {
    stubAlgolia({ comment: fail })

    await expect(searchStories('zig', 'month', 'relevance')).rejects.toBeInstanceOf(SearchUnavailableError)
  })

  it('reports a stalled channel as failed once its time budget runs out', async () => {
    const timeout = AbortSignal.timeout.bind(AbortSignal)
    vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => timeout(20))
    stubAlgolia({
      title: () => ({ hits: [story('1', 'Zig build system explained')] }),
      comment: ({ signal }) => new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(signal.reason))
      }),
    })

    await expect(searchStories('zig', 'month', 'relevance')).resolves.toMatchObject({
      partial: true,
      stories: [{ objectID: '1' }],
    })
  })

  it('broadens only multi-word queries with too few complete title matches', async () => {
    const singleWord = stubAlgolia({ title: () => ({ hits: [story('1', 'Zig build system explained')] }) })
    await searchStories('zig', 'month', 'relevance')
    expect(singleWord.map(request => request.channel)).not.toContain('broadened')

    const multiWord = stubAlgolia({
      title: () => ({ hits: [story('2', 'Rust async runtimes')] }),
      broadened: () => ({ hits: [story('2', 'Rust async runtimes'), story('3', 'Async Python patterns')] }),
      frequency: ({ params }) => ({ hits: [], nbHits: params.get('query') === 'rust' ? 900 : 4000 }),
    })
    const { stories } = await searchStories('rust async', 'month', 'relevance')

    expect(multiWord.filter(request => request.channel === 'frequency').map(request => request.params.get('query')))
      .toEqual(['rust', 'async'])
    // "Async Python" misses the rarest term, so the partial pass cannot admit it.
    expect(stories.map(item => item.objectID)).toEqual(['2'])
  })

  it('weights terms by all-time exact counts and skips lookups for long queries', async () => {
    const short = stubAlgolia({ title: () => ({ hits: [story('4', 'Home lab power tracking')] }) })
    await searchStories('home lab server', 'month', 'relevance')
    const [lookup] = short.filter(request => request.channel === 'frequency')

    expect(lookup?.params.get('tags')).toBe('story')
    expect(lookup?.params.get('typoTolerance')).toBe('false')
    expect(lookup?.params.has('numericFilters')).toBe(false)
    expect(short.find(request => request.channel === 'title')?.params.get('typoTolerance')).toBe('false')

    const long = stubAlgolia({ title: () => ({ hits: [story('5', 'Postgres is slow')] }) })
    await searchStories('why my postgres database server runs slow today', 'month', 'relevance')

    expect(long.map(request => request.channel)).toContain('broadened')
    expect(long.map(request => request.channel)).not.toContain('frequency')
  })

  it('lists a pasted link\'s exact-source submissions, largest discussion first', async () => {
    const url = 'https://example.com/post'
    const requests = stubAlgolia({
      source: () => ({
        hits: [
          story('11', 'First post', { url, created_at_i: 200, num_comments: 3 }),
          story('12', 'Big discussion', { url: `${url}?utm_source=hn`, created_at_i: 100, num_comments: 300 }),
          story('13', 'Different page', { url: `${url}/other`, created_at_i: 300, num_comments: 900 }),
        ],
      }),
    })

    const relevance = await searchStories(url, 'month', 'relevance')
    const newest = await searchStories(url, 'month', 'newest')

    expect(requests[0]?.params.get('hitsPerPage')).toBe('100')
    expect(relevance.stories.map(item => item.objectID)).toEqual(['12', '11'])
    expect(relevance.stories[0]?.url).toBe(`${url}?utm_source=hn`)
    expect(newest.stories.map(item => item.objectID)).toEqual(['11', '12'])
  })
})
