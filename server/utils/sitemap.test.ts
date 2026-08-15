import { describe, expect, it } from 'vitest'
import type { Story } from '#shared/types'
import {
  createSitemapXml,
  getSitemapUrls,
  renderSitemapXml,
  SITEMAP_ORIGIN,
} from './sitemap'

const createStory = (objectID: string): Story => ({
  objectID,
  title: `Story ${objectID}`,
  author: 'author',
  created_at: '2026-08-15T00:00:00Z',
  points: 1,
  url: 'https://example.com/story',
  num_comments: 0,
})

describe('getSitemapUrls', () => {
  it('includes canonical static pages and deduplicated valid story pages', () => {
    const urls = getSitemapUrls([
      [createStory('42'), createStory('43')],
      [createStory('42'), createStory('not-an-id')],
    ])

    expect(urls).toEqual([
      `${SITEMAP_ORIGIN}/top`,
      `${SITEMAP_ORIGIN}/best`,
      `${SITEMAP_ORIGIN}/new`,
      `${SITEMAP_ORIGIN}/show`,
      `${SITEMAP_ORIGIN}/privacy`,
      `${SITEMAP_ORIGIN}/terms`,
      `${SITEMAP_ORIGIN}/item/42`,
      `${SITEMAP_ORIGIN}/item/43`,
    ])
  })
})

describe('renderSitemapXml', () => {
  it('renders a valid sitemap document and escapes XML values', () => {
    const xml = renderSitemapXml([
      `${SITEMAP_ORIGIN}/item/42?view=a&reader=b`,
    ])

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(xml).toContain('<loc>https://hnglance.com/item/42?view=a&amp;reader=b</loc>')
    expect(xml.endsWith('\n')).toBe(true)
  })
})

describe('createSitemapXml', () => {
  it('keeps a useful static sitemap when no feed is available', () => {
    const xml = createSitemapXml([])

    expect(xml).toContain('<loc>https://hnglance.com/top</loc>')
    expect(xml).toContain('<loc>https://hnglance.com/terms</loc>')
    expect(xml).not.toContain('/item/')
  })
})
