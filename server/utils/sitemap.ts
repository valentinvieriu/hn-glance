import type { Story } from '#shared/types'
import { SITE_ORIGIN } from '../../shared/utils/canonical'
import { isValidHnItemId } from '../../shared/utils/hn'

export const SITEMAP_ORIGIN = SITE_ORIGIN

export const SITEMAP_FEEDS = [
  'top',
  'best',
  'new',
  'show',
] as const

const SITEMAP_STATIC_PATHS = [
  '/top',
  '/best',
  '/new',
  '/show',
  '/about',
  '/privacy',
  '/terms',
] as const

const escapeXml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;')

export const getSitemapUrls = (feedStories: readonly Story[][]) => {
  const urls = new Set(
    SITEMAP_STATIC_PATHS.map(path => new URL(path, SITEMAP_ORIGIN).href),
  )

  feedStories.flat().forEach((story) => {
    if (isValidHnItemId(story.objectID)) {
      urls.add(new URL(`/item/${story.objectID}`, SITEMAP_ORIGIN).href)
    }
  })

  return [...urls]
}

export const renderSitemapXml = (urls: readonly string[]) => {
  const entries = urls
    .map(url => `  <url><loc>${escapeXml(url)}</loc></url>`)
    .join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    '</urlset>',
    '',
  ].join('\n')
}

export const createSitemapXml = (feedStories: readonly Story[][]) => {
  return renderSitemapXml(getSitemapUrls(feedStories))
}
