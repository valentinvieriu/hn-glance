import { describe, expect, it } from 'vitest'
import type { AlgoliaStoryHit } from '../../utils/algolia'
import {
  buildTitleQuery,
  getSearchTermTokens,
  rankRelatedStories,
  rankSearchStories,
  type RelatedSearchKind,
  type SearchResult,
} from '../../utils/relatedStories'

const story = (
  objectID: string,
  title: string,
  created_at_i: number,
  url = `https://story-${objectID}.example/${objectID}`,
  overrides: Partial<AlgoliaStoryHit> = {},
): AlgoliaStoryHit => ({
  objectID,
  title,
  created_at: new Date(created_at_i * 1000).toISOString(),
  created_at_i,
  points: 20,
  num_comments: 5,
  author: 'author',
  url,
  ...overrides,
})

// Keys come from the same tokenizer as the server's per-term lookups.
const frequencies = (query: string, counts: number[]) => Object.fromEntries(
  getSearchTermTokens(query).map((token, index) => [token, counts[index] ?? 0]),
)

const comment = (id: string, text: string) => ({ id, text, snippet: `snippet ${id}` })

const result = (
  kind: RelatedSearchKind,
  hits: AlgoliaStoryHit[],
): SearchResult => ({ kind, hits })

describe('buildTitleQuery', () => {
  it('preserves Unicode terms and splits compounds into searchable concepts', () => {
    expect(buildTitleQuery('Qwen-Image-3.0: Déjà vu in 東京')).toBe(
      'qwen-image-3.0 qwen image 3.0 déjà 東京',
    )
  })
})

describe('rankRelatedStories', () => {
  it('presents relevance-qualified stories newest first', () => {
    const ranked = rankRelatedStories([
      result('title', [
        story('101', 'Postgres query planner notes', 1_700_000_100),
        story('102', 'Improving a Postgres query planner', 1_700_000_300),
        story('103', 'Inside the Postgres query planner', 1_700_000_200),
      ]),
    ], {
      title: 'Postgres query planner improvements',
      url: 'https://source.example/postgres-planner',
      created_at_i: 1_700_000_400,
    }, '100')

    expect(ranked.map(item => item.objectID)).toEqual(['102', '103', '101'])
    expect(ranked.every(item => item.created_at)).toBe(true)
    expect(ranked.every(item => item.url)).toBe(true)
  })

  it('chooses the six strongest candidates before ordering them newest first', () => {
    const hits = Array.from({ length: 7 }, (_, index) => story(
      String(201 + index),
      `Postgres planner update ${index}`,
      index === 6 ? 1_800_000_000 : 1_700_000_000 + index,
    ))

    const ranked = rankRelatedStories([
      result('title', hits),
    ], {
      title: 'Postgres planner update',
      url: 'https://source.example/postgres-planner',
    }, '200')

    expect(ranked).toHaveLength(6)
    expect(ranked.map(item => item.objectID)).toEqual([
      '206', '205', '204', '203', '202', '201',
    ])
  })

  it('does not let correlated search channels replace title relevance', () => {
    const unrelated = story('301', 'Database reliability lessons', 1_700_000_200)
    const related = story('302', 'Postgres planner reliability lessons', 1_700_000_100)

    const ranked = rankRelatedStories([
      result('full-text', [unrelated, related]),
      result('comment', [unrelated, related]),
    ], {
      title: 'Postgres query planner improvements',
      url: 'https://source.example/postgres-planner',
    }, '300')

    expect(ranked.map(item => item.objectID)).toEqual(['302'])
  })

  it('requires multiple shared concepts for a long-title match', () => {
    const ranked = rankRelatedStories([
      result('title', [
        story('351', 'Apple privacy changes', 1_700_000_300),
        story('352', 'Apple speech APIs compared with Whisper', 1_700_000_200),
      ]),
    ], {
      title: "Apple's SpeechAnalyzer API benchmarked against Whisper",
      url: 'https://source.example/speech-benchmark',
    }, '350')

    expect(ranked.map(item => item.objectID)).toEqual(['352'])
  })

  it('keeps only the strongest candidate for the same canonical URL', () => {
    const ranked = rankRelatedStories([
      result('title', [
        story('401', 'Postgres planner deep dive', 1_700_000_100, 'https://example.com/post?utm_source=hn'),
        story('402', 'Postgres planner discussion', 1_700_000_200, 'https://www.example.com/post?ref=home'),
        story('403', 'Postgres planner benchmarks', 1_700_000_300, 'https://example.com/benchmarks'),
      ]),
    ], {
      title: 'Postgres query planner improvements',
      url: 'https://source.example/postgres-planner',
    }, '400')

    expect(ranked.map(item => item.objectID)).toEqual(['403', '402'])
  })

  it('keeps exact prior submissions out of semantic suggestions', () => {
    const ranked = rankRelatedStories([
      result('title', [
        story('521', 'PCjs Machines', 1_700_000_100, 'https://www.pcjs.org/'),
        story('522', 'PCjs emulator architecture', 1_700_000_200, 'https://pcjs.org/emulator'),
      ]),
    ], {
      title: 'PCjs Machines',
      url: 'https://pcjs.org/',
      created_at_i: 1_800_000_000,
    }, '520')

    expect(ranked.map(item => item.objectID)).toEqual(['522'])
  })

  it('rejects unrelated stories that only share a publisher hostname', () => {
    const ranked = rankRelatedStories([
      result('full-text', [
        story('551', 'In Europe, wind and solar overtake fossil fuels', 1_700_000_300, 'https://e360.yale.edu/digest/wind-solar'),
        story('552', 'China has added forest the size of Texas', 1_700_000_200, 'https://e360.yale.edu/digest/china-forest'),
        story('553', 'Dead coral skeletons hinder reef regeneration', 1_700_000_100, 'https://phys.org/dead-coral-reef'),
      ]),
    ], {
      title: 'Long presumed dead, a thriving coral reef is discovered in West Africa',
      url: 'https://e360.yale.edu/digest/benin-coral-reef',
    }, '550')

    expect(ranked.map(item => item.objectID)).toEqual(['553'])
  })

  it('requires the distinctive anchor for short branded titles', () => {
    const ranked = rankRelatedStories([
      result('title', [
        story('601', 'Thinking Machines releases a model', 1_700_000_300),
        story('602', 'MacOS container machines', 1_700_000_200),
        story('603', 'PCjs emulator for the original IBM PC', 1_700_000_100, 'https://pcjs.org/emulator'),
      ]),
    ], {
      title: 'PCjs Machines',
      url: 'https://pcjs.org/',
    }, '600')

    expect(ranked.map(item => item.objectID)).toEqual(['603'])
  })

  it('does not confuse words inside a brand with a generic topic', () => {
    const ranked = rankRelatedStories([
      result('title', [
        story('621', 'NetNewsWire: Free and open source RSS reader', 1_700_000_300),
        story('622', 'Open ecosystem for privacy-friendly e-readers', 1_700_000_200),
      ]),
    ], {
      title: 'FreeInk: Open ecosystem for e-readers',
      url: 'https://freeink.org/',
    }, '620')

    expect(ranked.map(item => item.objectID)).toEqual(['622'])
  })

  it('uses Algolia exact-match metadata without making it a relevance bypass', () => {
    const ranked = rankRelatedStories([
      result('title', [
        story('651', 'Postgres planner tuning', 1_700_000_200, undefined, {
          _rankingInfo: { words: 3, nbExactWords: 1, nbTypos: 1 },
        }),
        story('652', 'Postgres planner tuning', 1_700_000_100, undefined, {
          _rankingInfo: { words: 3, nbExactWords: 3, nbTypos: 0 },
        }),
      ]),
    ], {
      title: 'Postgres planner tuning',
      url: 'https://source.example/planner',
    }, '650')

    expect(ranked.map(item => item.objectID)).toEqual(['652'])
  })

  it('caps one product hostname so related results retain variety', () => {
    const ranked = rankRelatedStories([
      result('full-text', Array.from({ length: 5 }, (_, index) => story(
        String(701 + index),
        `Qwen ${3 + index} model release`,
        1_700_000_500 - index,
        `https://qwen.ai/blog/model-${index}`,
      ))),
    ], {
      title: 'Qwen-Image-3.0: Rich content and authentic details',
      url: 'https://qwen.ai/blog?id=qwen-image-3.0',
    }, '700')

    expect(ranked).toHaveLength(3)
    expect(ranked.map(item => item.objectID)).toEqual(['701', '702', '703'])
  })

  it('does not treat a shared numeric version as a branded relationship', () => {
    const ranked = rankRelatedStories([
      result('title', [
        story('751', 'Niui 3.0: lightweight rich accessible front end', 1_700_000_300),
        story('752', 'Qwen-Image: native text rendering', 1_700_000_200, 'https://qwen.ai/blog/qwen-image'),
      ]),
    ], {
      title: 'Qwen-Image-3.0: Rich content and authentic details',
      url: 'https://qwen.ai/blog?id=qwen-image-3.0',
    }, '750')

    expect(ranked.map(item => item.objectID)).toEqual(['752'])
  })
})

describe('rankSearchStories', () => {
  const now = 1_760_000_000
  const day = 86_400
  const options = { sort: 'relevance' as const, rangeStart: now - 30 * day, nowSeconds: now }
  const ids = (stories: Array<{ objectID: string }>) => stories.map(item => item.objectID)

  it('matches one-word queries that the similar-stories threshold would reject', () => {
    const ranked = rankSearchStories([
      result('title', [
        story('201', 'Type-safe HTML templating in Zig', now - day),
        story('202', 'Best-selling Zigbee temperature sensors tested', now - day),
      ]),
    ], 'zig', options)

    expect(ids(ranked)).toEqual(['201'])
    expect(ranked[0]?.match).toBe('title')
  })

  it('requires every term of a short query but lets long terms complete as prefixes', () => {
    const ranked = rankSearchStories([
      result('title', [
        story('211', 'Async Rust: where does the scheduler live?', now - day),
        story('212', 'Syncing Rust GCC back end', now - day),
        story('213', 'Rust async runtimes on PostgreSQL', now - day),
      ]),
    ], 'rust async', options)

    expect(ids(ranked).sort()).toEqual(['211', '213'])
    expect(ids(rankSearchStories([
      result('title', [story('214', 'PostgreSQL internals', now - day)]),
    ], 'postgres', options))).toEqual(['214'])
  })

  it('keeps title words that similar-story matching treats as noise', () => {
    const ranked = rankSearchStories([
      result('title', [
        story('221', 'A video editing pipeline in the browser', now - day),
        story('222', 'Editing large photos in the browser', now - day),
      ]),
    ], 'video editing', options)

    expect(ids(ranked)).toEqual(['221'])
  })

  it('admits discussion matches and labels them separately', () => {
    const ranked = rankSearchStories([
      result('title', [story('231', 'Wasmtime 30 released', now - day)]),
      {
        ...result('comment', [story('232', 'What I learned running a CDN', now - 2 * day)]),
        commentEvidence: { 232: [comment('c232', 'We moved our edge functions to <i>Wasmtime</i> last year.')] },
      },
    ], 'wasmtime', options)

    expect(ids(ranked)).toEqual(['231', '232'])
    expect(ranked.map(item => item.match)).toEqual(['title', 'discussion'])
    expect(ranked[0]?.comment).toBeUndefined()
    expect(ranked[1]?.comment).toEqual({ id: 'c232', snippet: 'snippet c232' })
  })

  it('drops stories without a source URL and stories outside the range', () => {
    const ranked = rankSearchStories([
      result('title', [
        story('241', 'Ask HN: Who uses Zig in production?', now - day, ''),
        story('242', 'Zig in 2019', now - 400 * day),
        story('243', 'Zig build system explained', now - day),
      ]),
    ], 'zig', options)

    expect(ids(ranked)).toEqual(['243'])
  })

  it('keeps the best-discussed submission when a source was posted repeatedly', () => {
    const url = 'https://blog.example/async-rust'
    const ranked = rankSearchStories([
      result('title', [
        story('251', 'Async Rust scheduler', now - day, url, { points: 3, num_comments: 0 }),
        story('252', 'Async Rust scheduler', now - 2 * day, url, { points: 300, num_comments: 120 }),
      ]),
    ], 'rust scheduler', options)

    expect(ids(ranked)).toEqual(['252'])
  })

  it('caps hosts for topical queries but not when the query names the host', () => {
    const hits = Array.from({ length: 6 }, (_, index) => story(
      String(261 + index),
      `GitHub Actions trick ${index + 1}`,
      now - day,
      `https://github.com/example/repo-${index}`,
    ))

    expect(rankSearchStories([result('title', hits)], 'actions', options)).toHaveLength(4)
    expect(rankSearchStories([result('title', hits)], 'github', options)).toHaveLength(6)
  })

  it('keeps meaningful one- and two-letter terms such as C and R', () => {
    const ranked = rankSearchStories([
      result('title', [
        story('281', 'How to C in 2026', now - day),
        story('282', 'A message to our customers', now - day),
        story('283', 'Tidy data in R', now - day),
      ]),
    ], 'c', options)

    expect(ids(ranked)).toEqual(['281'])
    expect(ids(rankSearchStories([result('title', [story('283', 'Tidy data in R', now - day)])], 'r', options)))
      .toEqual(['283'])
  })

  it('ignores contraction fragments in typed queries', () => {
    expect(ids(rankSearchStories([
      result('title', [story('284', "What's new in Zig", now - day)]),
    ], "what's zig", options))).toEqual(['284'])
  })

  it('matches a domain query by source hostname, including subdomains', () => {
    const ranked = rankSearchStories([
      result('full-text', [
        story('291', 'Release notes for a small parser', now - day, 'https://github.com/acme/parser'),
        story('292', 'Engineering notes', now - day, 'https://blog.github.com/notes'),
        story('293', 'Mirroring repositories', now - day, 'https://gitlab.com/acme/mirror'),
      ]),
    ], 'github.com', options)

    expect(ids(ranked).sort()).toEqual(['291', '292'])
  })

  it('keeps same-titled stories from different sources but collapses one host', () => {
    const ranked = rankSearchStories([
      result('title', [
        story('301', 'Zig tutorial', now - day, 'https://one.example/zig'),
        story('302', 'Zig tutorial', now - day, 'https://two.example/zig'),
        story('303', 'Zig tutorial', now - 2 * day, 'https://one.example/zig-tutorial'),
      ]),
    ], 'zig', options)

    expect(ids(ranked).sort()).toEqual(['301', '302'])
  })

  it('applies Newest before the result limit', () => {
    const popular = Array.from({ length: 30 }, (_, index) => story(
      String(400 + index),
      `Zig article ${index}`,
      now - (10 + index) * 3600,
      `https://host-${index}.example/zig`,
      { points: 500, num_comments: 200 },
    ))
    const newest = story('499', 'Zig article fresh', now - 60, 'https://fresh.example/zig', {
      points: 1,
      num_comments: 0,
    })

    expect(ids(rankSearchStories([result('title', [...popular, newest])], 'zig', options)))
      .not.toContain('499')
    expect(ids(rankSearchStories([result('title', [...popular, newest])], 'zig', {
      ...options,
      sort: 'newest',
    }))[0]).toBe('499')
  })

  it('keeps title matches ahead of newer discussion-only matches under Newest', () => {
    const ranked = rankSearchStories([
      result('title', [story('511', 'Zig release notes', now - 3 * day)]),
      {
        ...result('comment', [story('512', 'What I self-host', now - 60)]),
        commentEvidence: { 512: [comment('c512', 'My home lab tools are all written in Zig.')] },
      },
    ], 'zig', { ...options, sort: 'newest' })

    expect(ids(ranked)).toEqual(['511', '512'])
  })

  it('matches regardless of capitalization or camel-case splitting', () => {
    const hits = [
      story('601', 'A javascript compiler', now - day),
      story('602', 'JavaScript engines explained', now - day),
      story('603', 'Java Script tags considered harmful', now - day),
      story('604', 'Java tooling news', now - day),
    ]

    for (const query of ['JavaScript', 'javascript', 'JAVASCRIPT']) {
      expect(ids(rankSearchStories([result('title', hits)], query, options)).sort()).toEqual(['601', '602'])
    }

    expect(ids(rankSearchStories([result('title', hits)], 'Java', options)).sort()).toEqual(['603', '604'])
  })

  it('requires discussion matches to contain the query in their comment text', () => {
    const ranked = rankSearchStories([
      {
        ...result('comment', [
          story('611', 'A message to our customers', now - day),
          story('612', 'Systems programming today', now - day),
          story('613', 'Retrieved without comment text', now - day),
        ]),
        commentEvidence: {
          611: [comment('c611', 'Our customers deserve better.')],
          612: [
            comment('c612a', 'Unrelated aside about build times.'),
            comment('c612b', 'Most of this still compiles as plain C with a few changes.'),
          ],
        },
      },
    ], 'c', options)

    expect(ids(ranked)).toEqual(['612'])
    expect(ranked[0]?.match).toBe('discussion')
    expect(ranked[0]?.comment?.id).toBe('c612b')
  })

  it('matches domain queries only on the exact host or a genuine subdomain', () => {
    const ranked = rankSearchStories([
      result('full-text', [
        story('621', 'Repository', now - day, 'https://github.com/acme/repo'),
        story('622', 'Engineering', now - day, 'https://blog.github.com/notes'),
        story('623', 'Forum', now - day, 'https://github.community/t/1'),
        story('624', 'Lookalike', now - day, 'https://github.com.other.example/x'),
      ]),
    ], 'github.com', options)

    expect(ids(ranked).sort()).toEqual(['621', '622'])
    expect(ids(rankSearchStories([
      result('full-text', [story('625', 'Crate docs', now - day, 'https://docs.rs/serde')]),
    ], 'docs.rs', options))).toEqual(['625'])
  })

  it('keeps title tags such as [pdf] and Show HN searchable', () => {
    const hits = [
      story('631', 'The database paper [pdf]', now - day),
      story('632', 'Show HN: A tiny Zig web server', now - day),
      story('633', 'The database paper', now - day, 'https://other.example/paper'),
    ]

    expect(ids(rankSearchStories([result('title', hits)], 'pdf', options))).toEqual(['631'])
    expect(ids(rankSearchStories([result('title', hits)], 'show hn zig', options))).toEqual(['632'])
  })

  it('keeps distinct pages whose URLs differ only by ref, source, or port', () => {
    const ranked = rankSearchStories([
      result('title', [
        story('641', 'Zig docs one', now - day, 'https://docs.example/page?ref=a'),
        story('642', 'Zig docs two', now - day, 'https://docs.example/page?ref=b'),
        story('643', 'Zig docs three', now - day, 'https://docs.example:8443/page'),
        story('644', 'Zig docs tracked', now - day, 'https://docs.example/page?ref=a&utm_source=x'),
      ]),
    ], 'zig', options)

    expect(ids(ranked).sort()).toEqual(['641', '642', '643'])
  })

  it('requires every term unless the partial pass is enabled, and ranks partial matches lower', () => {
    const hits = [
      story('701', 'Local-first developer utilities', now - day, undefined, { points: 900 }),
      story('702', 'Local-first software, a manifesto', now - 2 * day, undefined, { points: 5 }),
      story('703', 'Software estimates are hard', now - day, undefined, { points: 900 }),
      story('704', 'Software tooling roundup', now - day, undefined, { points: 900 }),
      story('705', 'Hiring for software roles', now - day, undefined, { points: 900 }),
    ]

    expect(ids(rankSearchStories([result('title', hits)], 'local-first software', options))).toEqual(['702'])

    // Upstream rarity, not the skewed candidate pool, decides which term is light.
    const partial = rankSearchStories([result('title', hits)], 'local-first software', {
      ...options,
      allowPartial: true,
      termFrequencies: frequencies('local-first software', [39, 2400]),
    })
    expect(ids(partial)).toEqual(['702', '701'])
  })

  it('never lets a partial match drop the query\'s rarest term', () => {
    const ranked = rankSearchStories([
      result('title', [
        story('731', 'CDP alternatives for startups and small teams', now - day),
        story('732', 'Kubernetes alternatives for small teams', now - day),
        story('733', 'Kubernetes alternatives for teams', now - day),
      ]),
    ], 'kubernetes alternatives for small teams', {
      ...options,
      allowPartial: true,
      termFrequencies: frequencies('kubernetes alternatives for small teams', [900, 2600, 8000, 7000]),
    })

    expect(ids(ranked)).toEqual(['732', '733'])
  })

  it('matches a split word through adjacent parts only', () => {
    const hits = [
      story('741', 'Google local first AI meeting dictation', now - day),
      story('742', 'A CLI designed around small local models first', now - day),
    ]

    expect(ids(rankSearchStories([result('title', hits)], 'local-first', options))).toEqual(['741'])
  })

  it('requires quoted phrases in order and drops excluded words', () => {
    const hits = [
      story('711', 'Distributed systems reading list', now - day),
      story('712', 'Systems that are distributed by default', now - day),
      story('713', 'Rust game engines compared', now - day),
      story('714', 'Rust compile times', now - day),
    ]

    expect(ids(rankSearchStories([result('title', hits)], 'distributed systems', {
      ...options,
      phrases: ['distributed systems'],
    }))).toEqual(['711'])
    expect(ids(rankSearchStories([result('title', hits)], 'rust', { ...options, excluded: ['game'] })))
      .toEqual(['714'])
  })

  it('ranks filter-only searches without text terms and without host caps', () => {
    const hits = Array.from({ length: 6 }, (_, index) => story(
      String(721 + index),
      `Essay ${index + 1}`,
      now - (index + 1) * day,
      `https://paulgraham.com/essay-${index}.html`,
    ))

    expect(rankSearchStories([result('title', hits)], '', options)).toEqual([])
    expect(rankSearchStories([result('title', hits)], '', {
      ...options,
      filterOnly: true,
      uncappedHosts: true,
    })).toHaveLength(6)
  })

  it('orders relevance-qualified results newest first on request', () => {
    const ranked = rankSearchStories([
      result('title', [
        story('271', 'Zig compiler internals', now - 5 * day, undefined, { points: 900 }),
        story('272', 'Zig package manager notes', now - day, undefined, { points: 2 }),
      ]),
    ], 'zig', { ...options, sort: 'newest' })

    expect(ids(ranked)).toEqual(['272', '271'])
  })
})
