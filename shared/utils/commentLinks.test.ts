import { describe, expect, it } from 'vitest'
import type { Comment } from '#shared/types'
import {
  categorizeCommentLink,
  compareCommentLinks,
  extractCommentLinks,
  groupCommentLinks,
  type CommentLink,
} from './commentLinks'

const comment = (
  id: number,
  author: string,
  text: string,
  children: Comment[] = [],
): Comment => ({
  id,
  author,
  children,
  created_at: '2026-07-31T00:00:00Z',
  parent_id: id - 1,
  text,
})

describe('comment link extraction', () => {
  it('extracts useful outbound links and preserves their comment mentions', () => {
    const comments = [
      comment(
        1,
        'alice',
        '<p>See <a href="https://en.wikipedia.org/wiki/Monkey_selfie_copyright_dispute">this</a>.</p>',
        [
          comment(2, 'bob', '<p>Repo: https://github.com/simonw/llm.</p>'),
        ],
      ),
      comment(3, 'carol', '<p><a href="https://github.com/simonw/llm?utm_source=hn">LLM CLI</a></p>'),
    ]

    const links = extractCommentLinks(comments)
    const wikipedia = links.find(link => link.category === 'wikipedia')
    const code = links.find(link => link.category === 'code')

    expect(wikipedia).toMatchObject({
      domain: 'en.wikipedia.org',
      title: 'Monkey selfie copyright dispute',
      uniqueAuthorCount: 1,
    })
    expect(wikipedia?.mentions).toEqual([
      expect.objectContaining({ author: 'alice', commentId: 1, depth: 1 }),
    ])
    expect(code).toMatchObject({
      domain: 'github.com',
      title: 'simonw/llm',
      uniqueAuthorCount: 2,
      url: 'https://github.com/simonw/llm',
    })
    expect(code?.mentions).toEqual([
      expect.objectContaining({ author: 'bob', commentId: 2, depth: 2 }),
      expect.objectContaining({ author: 'carol', commentId: 3, depth: 1 }),
    ])
  })

  it('excludes the story source, HN links, unsafe URLs, and duplicate tracking variants', () => {
    const sourceUrl = 'https://example.com/article'
    const links = extractCommentLinks([
      comment(1, 'alice', `
        <p><a href="${sourceUrl}?utm_source=hn">story</a></p>
        <p><a href="https://news.ycombinator.com/item?id=1">HN</a></p>
        <p><a href="javascript:alert(1)">unsafe</a></p>
        <p><a href="https://docs.example.dev/guide?utm_campaign=one">Guide</a></p>
        <p><a href="https://docs.example.dev/guide?utm_campaign=two">Guide again</a></p>
      `),
    ], {
      excludedUrls: [sourceUrl],
    })

    expect(links).toHaveLength(1)
    expect(links[0]?.category).toBe('documentation')
  })

  it('recognizes common source categories without fetching link metadata', () => {
    expect(categorizeCommentLink(new URL('https://youtu.be/example'))).toBe('video')
    expect(categorizeCommentLink(new URL('https://arxiv.org/abs/2606.11755'))).toBe('papers')
    expect(categorizeCommentLink(new URL('https://pubmed.ncbi.nlm.nih.gov/12345678'))).toBe('papers')
    expect(categorizeCommentLink(new URL('https://ieeexplore.ieee.org/document/123456'))).toBe('papers')
    expect(categorizeCommentLink(new URL('https://developer.mozilla.org/en-US/docs/Web/API'))).toBe('documentation')
    expect(categorizeCommentLink(new URL('https://openai.com/policies/service-terms'))).toBe('documentation')
    expect(categorizeCommentLink(new URL('https://gcc.gnu.org/ai-policy.html'))).toBe('documentation')
    expect(categorizeCommentLink(new URL('https://www.copyright.gov/ai'))).toBe('documentation')
    expect(categorizeCommentLink(new URL('https://forge.sourceware.org/project/commit/123'))).toBe('code')
    expect(categorizeCommentLink(new URL('https://en.wikisource.org/wiki/Example'))).toBe('wikipedia')
    expect(categorizeCommentLink(new URL('https://www.reuters.com/world/example'))).toBe('news')
    expect(categorizeCommentLink(new URL('https://www.theverge.com/2026/7/31/example'))).toBe('news')
    expect(categorizeCommentLink(new URL('https://spectrum.ieee.org/example-article'))).toBe('news')
    expect(categorizeCommentLink(new URL('https://x.com/example/status/123'))).toBe('social')
    expect(categorizeCommentLink(new URL('https://lobste.rs/s/example'))).toBe('discussion')
    expect(categorizeCommentLink(new URL('https://example.com/post'))).toBe('other')
  })

  it('keeps the output bounded while continuing to collect duplicate mentions', () => {
    const links = extractCommentLinks([
      comment(1, 'alice', 'https://one.example/path'),
      comment(2, 'bob', 'https://two.example/path'),
      comment(3, 'carol', 'https://one.example/path'),
    ], {
      maximumLinks: 1,
    })

    expect(links).toHaveLength(1)
    expect(links[0]?.mentions).toHaveLength(2)
    expect(links[0]?.uniqueAuthorCount).toBe(2)
  })

  it('applies the output limit after category-value ordering', () => {
    const links = extractCommentLinks([
      comment(1, 'alice', 'https://example.com/post'),
      comment(2, 'bob', 'https://developer.mozilla.org/en-US/docs/Web/API'),
    ], {
      maximumLinks: 1,
    })

    expect(links).toHaveLength(1)
    expect(links[0]?.category).toBe('documentation')
  })

  it('orders links by source-category value, then capture order', () => {
    const links = extractCommentLinks([
      comment(1, 'alice', 'https://example.com/first https://x.com/alice/status/1'),
      comment(2, 'bob', 'https://youtube.com/watch?v=1 https://github.com/example/project'),
      comment(3, 'carol', 'https://developer.mozilla.org/en-US/docs/Web/API'),
      comment(4, 'dave', 'https://example.com/second'),
    ])

    expect(links.map(link => link.category)).toEqual([
      'documentation',
      'code',
      'video',
      'social',
      'other',
      'other',
    ])
    expect(links.slice(-2).map(link => link.url)).toEqual([
      'https://example.com/first',
      'https://example.com/second',
    ])
  })

  it('compares links by category value before capture order', () => {
    const link = (overrides: Partial<CommentLink>): CommentLink => ({
      category: 'other',
      domain: 'example.com',
      mentions: [{ author: 'alice', commentId: 1, depth: 1, excerpt: '' }],
      order: 0,
      title: 'Example',
      uniqueAuthorCount: 1,
      url: 'https://example.com',
      ...overrides,
    })
    expect(compareCommentLinks(
      link({ category: 'documentation', order: 2 }),
      link({ category: 'other', order: 0 }),
    )).toBeLessThan(0)
    expect(compareCommentLinks(link({ order: 0 }), link({ order: 1 }))).toBeLessThan(0)
  })

  it('groups ranked links into stable category order', () => {
    const links = extractCommentLinks([
      comment(1, 'alice', 'https://example.com/post'),
      comment(2, 'bob', 'https://github.com/simonw/llm'),
      comment(3, 'carol', 'https://en.wikipedia.org/wiki/Streisand_effect'),
      comment(4, 'dave', 'https://example.com/post'),
    ])
    const groups = groupCommentLinks(links)

    expect(groups.map(group => group.category)).toEqual(['code', 'wikipedia', 'other'])
    expect(groups.at(-1)?.links[0]?.mentions).toHaveLength(2)
  })

  it('derives distinct titles for video links without fetching metadata', () => {
    const links = extractCommentLinks([
      comment(1, 'alice', 'https://youtu.be/dQw4w9WgXcQ'),
      comment(2, 'bob', 'https://vimeo.com/123456'),
      comment(3, 'carol', '<a href="https://www.youtube.com/watch?v=abc123">Talk on distributed systems</a>'),
    ])
    const titles = links.map(link => link.title).sort()

    expect(titles).toEqual(['Talk on distributed systems', 'Vimeo video', 'YouTube video'])
  })

  it('captures a bounded plain-text excerpt of the first mentioning comment', () => {
    const longTail = 'word '.repeat(60).trim()
    const links = extractCommentLinks([
      comment(1, 'alice', `<p>Check <a href="https://example.com/post">this</a> because ${longTail}</p>`, [
        comment(2, 'bob', '<p>Also https://example.com/post</p>'),
      ]),
    ])

    const excerpt = links[0]?.mentions[0]?.excerpt ?? ''

    expect(excerpt.startsWith('Check this because word')).toBe(true)
    expect(excerpt.endsWith('…')).toBe(true)
    expect(excerpt.length).toBeLessThanOrEqual(141)
    expect(excerpt).not.toContain('<')
  })
})
