import { describe, expect, it } from 'vitest'
import type { Story, StoryDetail } from '#shared/types'
import {
  createFeedStructuredData,
  createStoryStructuredData,
  createWebsiteStructuredData,
  serializeStructuredData,
  type StructuredData,
} from './structuredData'

const story: Story = {
  objectID: '42',
  title: 'A useful story',
  author: 'alice',
  created_at: '2026-08-15T00:00:00Z',
  points: 10,
  url: 'https://example.com/story',
  num_comments: 5,
}

describe('structured data', () => {
  it('describes HN Glance as a website without inventing an organization', () => {
    const data = createWebsiteStructuredData()

    expect(data).toMatchObject({
      '@type': 'WebSite',
      url: 'https://hnglance.com/',
      name: 'HN Glance',
    })
    expect(data).not.toHaveProperty('publisher')
  })

  it('maps feed stories to ranked internal WebPage entries', () => {
    const data = createFeedStructuredData('Top Stories', '/top', [story])

    expect(data).toMatchObject({
      '@type': 'ItemList',
      url: 'https://hnglance.com/top',
      numberOfItems: 1,
      itemListElement: [{
        '@type': 'ListItem',
        position: 1,
        item: {
          '@type': 'WebPage',
          url: 'https://hnglance.com/item/42',
          name: 'A useful story',
        },
      }],
    })
  })

  it('describes the HN Glance story page rather than the external article', () => {
    const detail: StoryDetail = {
      created_at: story.created_at,
      author: story.author,
      title: story.title,
      url: story.url,
      text: null,
      points: story.points,
      children: [],
    }
    const data = createStoryStructuredData('42', detail)
    const graph = data['@graph'] as StructuredData[]

    expect(graph[0]).toMatchObject({
      '@type': 'WebPage',
      url: 'https://hnglance.com/item/42',
      name: 'A useful story',
    })
    expect(graph.some(entry => entry['@type'] === 'Article')).toBe(false)
    expect(graph.some(entry => entry['@type'] === 'BreadcrumbList')).toBe(true)
  })

  it('escapes markup-capable characters before embedding JSON-LD in HTML', () => {
    expect(serializeStructuredData({ name: '</script><script>' }))
      .toContain('\\u003c/script>\\u003cscript>')
  })
})
