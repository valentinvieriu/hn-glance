import {
  acknowledgeDiscussionVisit,
  beginDiscussionVisit,
  createEmptyDiscussionVisits,
  deserializeDiscussionVisits,
  DISCUSSION_VISITS_STORAGE_KEY,
  serializeDiscussionVisits,
  type DiscussionVisits,
} from '#shared/utils/discussionVisits'
import { readBrowserStorage, writeBrowserStorage } from '~/utils/browserStorage'

const DISCUSSION_VISITS_STATE_KEY = 'hn-glance:discussion-visits-state'
const DISCUSSION_VISITS_HYDRATED_STATE_KEY = 'hn-glance:discussion-visits-hydrated'

export const useDiscussionVisits = () => {
  const visits = useState<DiscussionVisits>(
    DISCUSSION_VISITS_STATE_KEY,
    createEmptyDiscussionVisits,
  )
  const isHydrated = useState<boolean>(
    DISCUSSION_VISITS_HYDRATED_STATE_KEY,
    () => false,
  )

  const persist = () => {
    writeBrowserStorage(
      DISCUSSION_VISITS_STORAGE_KEY,
      serializeDiscussionVisits(visits.value),
    )
  }

  const hydrate = () => {
    if (!import.meta.client || isHydrated.value) {
      return
    }

    visits.value = deserializeDiscussionVisits(
      readBrowserStorage(DISCUSSION_VISITS_STORAGE_KEY),
    )
    isHydrated.value = true
  }

  const syncFromStorage = (serializedVisits: string | null) => {
    if (!import.meta.client) {
      return
    }

    visits.value = deserializeDiscussionVisits(serializedVisits)
    isHydrated.value = true
  }

  const beginVisit = (storyId: string | number, currentCommentIds: Iterable<number>) => {
    hydrate()
    const result = beginDiscussionVisit(visits.value, storyId, currentCommentIds)

    visits.value = result.visits
    persist()

    return {
      hadBaseline: result.hadBaseline,
      isTracked: result.isTracked,
      newCommentIds: new Set(result.newCommentIds) as ReadonlySet<number>,
    }
  }

  const acknowledgeVisit = (
    storyId: string | number,
    currentCommentIds: Iterable<number>,
  ) => {
    hydrate()
    visits.value = acknowledgeDiscussionVisit(
      visits.value,
      storyId,
      currentCommentIds,
    )
    persist()
  }

  return {
    acknowledgeVisit,
    beginVisit,
    hydrate,
    isHydrated: computed(() => isHydrated.value),
    syncFromStorage,
  }
}
