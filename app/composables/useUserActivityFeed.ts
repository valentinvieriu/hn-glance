import type { MaybeRefOrGetter, Ref } from 'vue'
import { computed, ref, toValue, watch } from 'vue'
import type { UserActivityPage } from '#shared/types'

export const USER_ACTIVITY_PAGE_SIZE = 30

type UserActivityEndpoint = 'comments' | 'stories'

const mergeByObjectId = <T extends { objectID: string }>(currentItems: T[], incomingItems: T[]) => {
  const seen = new Set(currentItems.map(item => item.objectID))
  const mergedItems = [...currentItems]

  for (const item of incomingItems) {
    if (!seen.has(item.objectID)) {
      seen.add(item.objectID)
      mergedItems.push(item)
    }
  }

  return mergedItems
}

/**
 * One paginated user activity list. The first page is SSR data; later pages
 * follow the API's page number, then its `before` cursor once Algolia's page
 * window is exhausted. Await `initialPage` in the page setup.
 */
export const useUserActivityFeed = <T extends { objectID: string }>(
  endpoint: UserActivityEndpoint,
  username: MaybeRefOrGetter<string>,
  loadMoreErrorMessage: string,
) => {
  const items = ref([]) as Ref<T[]>
  const total = ref(0)
  const hasMore = ref(false)
  const nextPage = ref<number | null>(null)
  const nextCursor = ref<number | null>(null)
  const isLoadingMore = ref(false)
  const errorMessage = ref<string | null>(null)

  const fetchPage = (query: Record<string, number>) => {
    return $fetch<UserActivityPage<T>>(
      `/api/user/${encodeURIComponent(toValue(username))}/${endpoint}`,
      { query: { hitsPerPage: USER_ACTIVITY_PAGE_SIZE, ...query } },
    )
  }

  const initialPage = useAsyncData<UserActivityPage<T> | null>(
    () => `user-${endpoint}:${toValue(username) || 'missing'}:${USER_ACTIVITY_PAGE_SIZE}`,
    async () => toValue(username) ? await fetchPage({ page: 0 }) : null,
    { default: () => null },
  )

  const applyPage = (page: UserActivityPage<T> | null | undefined, append = false) => {
    if (!page) {
      return
    }

    items.value = append ? mergeByObjectId(items.value, page.items) : page.items
    total.value = page.nbHits
    hasMore.value = page.hasMore
    nextPage.value = page.nextPage
    nextCursor.value = page.nextCursor
  }

  watch(initialPage.data, page => applyPage(page), { immediate: true })
  watch(initialPage.error, (error) => {
    errorMessage.value = error?.message ?? null
  }, { immediate: true })

  const loadMore = async () => {
    if (!toValue(username) || isLoadingMore.value || !hasMore.value) {
      return
    }

    isLoadingMore.value = true
    errorMessage.value = null

    try {
      const query: Record<string, number> = nextPage.value !== null
        ? { page: nextPage.value }
        : nextCursor.value !== null
          ? { before: nextCursor.value }
          : { page: 0 }

      applyPage(await fetchPage(query), true)
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : loadMoreErrorMessage
    } finally {
      isLoadingMore.value = false
    }
  }

  return {
    items,
    total,
    hasMore,
    isLoadingMore,
    isInitialLoading: computed(() => initialPage.pending.value && items.value.length === 0),
    errorMessage,
    loadMore,
    initialPage,
  }
}
