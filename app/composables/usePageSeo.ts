import type { MaybeRefOrGetter } from 'vue'
import { computed, toValue } from 'vue'
import { getCanonicalUrl } from '#shared/utils/canonical'

type PageSeoOptions = {
  title: MaybeRefOrGetter<string | undefined>
  description: MaybeRefOrGetter<string | undefined>
  /** Route path for the canonical and og:url links; null omits both. */
  path?: MaybeRefOrGetter<string | null>
  robots?: MaybeRefOrGetter<string | undefined>
}

/**
 * Page-level head metadata: one title and description mirrored to Open Graph
 * and Twitter, plus the canonical URL. Site-wide social image tags live in
 * `app.vue`. A getter returning `undefined` omits that tag.
 */
export const usePageSeo = ({ title, description, path, robots }: PageSeoOptions) => {
  const canonicalUrl = computed(() => {
    const routePath = path === undefined ? null : toValue(path)

    return routePath ? getCanonicalUrl(routePath) : null
  })
  const getTitle = () => toValue(title)
  const getDescription = () => toValue(description)

  useHead(() => ({
    link: canonicalUrl.value
      ? [{
          key: 'canonical',
          rel: 'canonical',
          href: canonicalUrl.value,
        }]
      : [],
  }))

  useSeoMeta({
    title: getTitle,
    description: getDescription,
    ogTitle: getTitle,
    ogDescription: getDescription,
    ogUrl: () => canonicalUrl.value ?? undefined,
    twitterTitle: getTitle,
    twitterDescription: getDescription,
    robots: () => toValue(robots),
  })
}
