import type { Story, StoryDetail } from '#shared/types'
import { getCanonicalUrl, SITE_ORIGIN } from './canonical'
import { SITE_DESCRIPTION, SITE_LOCALE, SITE_NAME } from './siteMetadata'

export type StructuredData = Record<string, unknown>

const WEBSITE_ID = `${SITE_ORIGIN}/#website`

export const serializeStructuredData = (value: StructuredData) => {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

export const createWebsiteStructuredData = (): StructuredData => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  url: `${SITE_ORIGIN}/`,
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  inLanguage: SITE_LOCALE,
})

export const createFeedStructuredData = (
  name: string,
  routePath: string,
  stories: readonly Story[],
): StructuredData => {
  const url = getCanonicalUrl(routePath)

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${url}#itemlist`,
    url,
    name,
    numberOfItems: stories.length,
    itemListElement: stories.map((story, index) => {
      const storyUrl = getCanonicalUrl(`/item/${story.objectID}`)

      return {
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'WebPage',
          '@id': storyUrl,
          url: storyUrl,
          name: story.title,
        },
      }
    }),
  }
}

export const createStoryStructuredData = (
  storyId: string,
  story: StoryDetail,
): StructuredData => {
  const storyUrl = getCanonicalUrl(`/item/${storyId}`)
  const breadcrumbId = `${storyUrl}#breadcrumb`

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${storyUrl}#webpage`,
        url: storyUrl,
        name: story.title,
        description: `HN Glance overview and Hacker News discussion for “${story.title}”.`,
        inLanguage: SITE_LOCALE,
        isPartOf: {
          '@id': WEBSITE_ID,
        },
        breadcrumb: {
          '@id': breadcrumbId,
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': breadcrumbId,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            item: {
              '@id': getCanonicalUrl('/top'),
              name: 'Top Stories',
            },
          },
          {
            '@type': 'ListItem',
            position: 2,
            item: {
              '@id': storyUrl,
              name: story.title,
            },
          },
        ],
      },
    ],
  }
}
