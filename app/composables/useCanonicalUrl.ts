import type { MaybeRefOrGetter } from 'vue'
import { computed, toValue } from 'vue'
import { getCanonicalUrl } from '#shared/utils/canonical'

export const useCanonicalUrl = (routePath: MaybeRefOrGetter<string | null>) => {
  const canonicalUrl = computed(() => {
    const path = toValue(routePath)

    return path ? getCanonicalUrl(path) : null
  })

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
    ogUrl: () => canonicalUrl.value ?? undefined,
  })

  return canonicalUrl
}
