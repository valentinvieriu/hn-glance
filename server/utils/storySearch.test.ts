import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AlgoliaStoryHit } from './algolia'
import { QUERY_PLANNER_MODEL } from './queryPlanner'
import type { SemanticAi } from './semanticRanking'
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

type Channel = 'title' | 'recent-title' | 'full-text' | 'comment' | 'comment-stories' | 'broadened' | 'planned' | 'alternative' | 'source'

const channelOf = ({ params, byDate }: AlgoliaRequest): Channel => {
  if (params.get('tags') === 'comment') return 'comment'
  if (params.has('filters')) return 'comment-stories'
  if (params.get('restrictSearchableAttributes') === 'url') return 'source'
  if (params.get('query')?.includes('"')) return 'planned'
  if (params.get('queryType') === 'prefixNone' && params.get('hitsPerPage') === '15') return 'alternative'
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

/**
 * A Workers AI stand-in: the planner returns `plan`; Clef scores each story by
 * title, with `refine` overriding `screen` when a story is judged alone.
 */
const fakeAi = ({ plan = null, screen = {}, refine = {}, failScreen = false, failRefine = false }: {
  plan?: unknown
  screen?: Record<string, number>
  refine?: Record<string, number>
  failScreen?: boolean
  failRefine?: boolean
}) => {
  const run = vi.fn(async (model: string, input: Record<string, unknown>) => {
    if (model === QUERY_PLANNER_MODEL) return { response: plan }

    const stories = (input.state as { stories: Array<{ key: string, title: string }> }).stories
    const alone = stories.length === 1

    if ((alone && failRefine) || (!alone && failScreen)) throw new Error('3040: Capacity temporarily exceeded')

    return {
      answers: Object.fromEntries(stories.map(({ key, title }) => [key, {
        score: (alone ? refine[title] : undefined) ?? screen[title] ?? 0,
      }])),
    }
  })

  return { ai: { run } satisfies SemanticAi, run }
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

  it('takes the semantic pass only for multi-word queries with too few complete title matches', async () => {
    const single = fakeAi({})
    const singleWord = stubAlgolia({ title: () => ({ hits: [story('1', 'Zig build system explained')] }) })
    await searchStories('zig', 'month', 'relevance', single.ai)

    expect(singleWord.map(request => request.channel)).not.toContain('broadened')
    expect(single.run).not.toHaveBeenCalled()

    const { ai } = fakeAi({
      plan: { anchors: ['waf'], context: ['self hosting'], alternatives: ['NAXSI'] },
      screen: { 'SafeLine, a self-hosted WAF': 2.4, 'NAXSI, a WAF for Nginx': 2, 'Self-hosting like it is 2025': 1.6 },
      // Judged alone, the generic story no longer passes.
      refine: { 'Self-hosting like it is 2025': 0.8 },
    })
    const requests = stubAlgolia({
      broadened: () => ({ hits: [story('2', 'Self-hosting like it is 2025')] }),
      planned: () => ({ hits: [story('3', 'SafeLine, a self-hosted WAF')] }),
      alternative: () => ({ hits: [story('4', 'NAXSI, a WAF for Nginx')] }),
    })
    const outcome = await searchStories('self hosting waf', 'month', 'relevance', ai)

    expect(outcome).toMatchObject({ partial: false, semantic: { status: 'applied' }, plan: { status: 'applied' } })
    expect(outcome.stories.map(item => item.objectID)).toEqual(['3', '4'])

    // Anchors match exactly; context words and short alternatives never complete as prefixes.
    const planned = requests.find(request => request.channel === 'planned')?.params
    expect(planned?.get('query')).toBe('"waf" self hosting')
    expect(planned?.get('optionalWords')).toBe('self hosting')
    expect(planned?.get('advancedSyntax')).toBe('true')
    expect(requests.find(request => request.channel === 'alternative')?.params.get('query')).toBe('NAXSI')
  })

  it('reports a failed semantic pass as partial and keeps complete matches', async () => {
    const responders = {
      title: () => ({ hits: [story('5', 'Self hosting a WAF at home')] }),
      broadened: () => ({ hits: [story('6', 'Self-hosting like it is 2025')] }),
    }

    stubAlgolia(responders)
    await expect(searchStories('self hosting waf', 'month', 'relevance', fakeAi({ failScreen: true }).ai))
      .resolves.toMatchObject({ partial: true, semantic: { status: 'failed' }, stories: [{ objectID: '5' }] })

    // Without the Workers AI binding, the semantic pass cannot run either.
    stubAlgolia(responders)
    await expect(searchStories('self hosting waf', 'month', 'relevance'))
      .resolves.toMatchObject({ partial: true, semantic: { status: 'failed' }, stories: [{ objectID: '5' }] })
  })

  it('keeps screening scores when refinement fails', async () => {
    stubAlgolia({
      broadened: () => ({ hits: [story('7', 'SafeLine, a self-hosted WAF'), story('8', 'Waffle recipes')] }),
    })

    await expect(searchStories('self hosting waf', 'month', 'relevance', fakeAi({
      screen: { 'SafeLine, a self-hosted WAF': 2.2 },
      failRefine: true,
    }).ai)).resolves.toMatchObject({
      partial: false,
      semantic: { status: 'screened' },
      plan: { status: 'failed' },
      stories: [{ objectID: '7' }],
    })
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
