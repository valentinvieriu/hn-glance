import { defineEventHandler, setHeaders } from 'h3'
import type { Story } from '#shared/types'
import {
  createSitemapXml,
  SITEMAP_FEEDS,
} from '../utils/sitemap'

const SITEMAP_CACHE_MAX_AGE_SECONDS = 300
const SITEMAP_CACHE_STALE_MAX_AGE_SECONDS = 900

export default defineEventHandler(async (event) => {
  const feedResults = await Promise.allSettled(
    SITEMAP_FEEDS.map(feed => event.$fetch<Story[]>(`/api/${feed}`)),
  )
  const feedStories = feedResults.flatMap((result, index) => {
    if (result.status === 'fulfilled') {
      return [result.value]
    }

    console.warn(`Failed to load ${SITEMAP_FEEDS[index]} stories for sitemap`, result.reason)
    return []
  })

  setHeaders(event, {
    'Content-Type': 'application/xml; charset=UTF-8',
    'Cache-Control': `public, max-age=${SITEMAP_CACHE_MAX_AGE_SECONDS}, stale-while-revalidate=${SITEMAP_CACHE_STALE_MAX_AGE_SECONDS}`,
  })

  return createSitemapXml(feedStories)
})
