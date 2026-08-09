import { computed } from 'vue'
import {
  APP_PREFERENCES_STORAGE_KEY,
  APP_PREFERENCES_VERSION,
  createDefaultAppPreferences,
  deserializeAppPreferences,
  serializeAppPreferences,
  type AppPreferences,
  type CommentReaderMode,
  type RootCommentOrder,
} from '#shared/utils/appPreferences'
import { readBrowserStorage, writeBrowserStorage } from '~/utils/browserStorage'

const PREFERENCES_STATE_KEY = 'hn-glance:app-preferences'
const PREFERENCES_HYDRATED_STATE_KEY = 'hn-glance:app-preferences-hydrated'

export const useAppPreferences = () => {
  const preferences = useState<AppPreferences>(
    PREFERENCES_STATE_KEY,
    createDefaultAppPreferences,
  )
  const isHydrated = useState<boolean>(PREFERENCES_HYDRATED_STATE_KEY, () => false)

  const persist = (nextPreferences: AppPreferences) => {
    if (!import.meta.client) {
      return
    }

    writeBrowserStorage(
      APP_PREFERENCES_STORAGE_KEY,
      serializeAppPreferences(nextPreferences),
    )
  }

  const replacePreferences = (nextPreferences: AppPreferences, shouldPersist: boolean) => {
    preferences.value = nextPreferences

    if (shouldPersist) {
      persist(nextPreferences)
    }
  }

  const hydrate = () => {
    if (!import.meta.client || isHydrated.value) {
      return
    }

    const storedPreferences = deserializeAppPreferences(
      readBrowserStorage(APP_PREFERENCES_STORAGE_KEY),
    )

    replacePreferences(storedPreferences, false)
    isHydrated.value = true
  }

  const syncFromStorage = (serializedPreferences: string | null) => {
    if (!import.meta.client) {
      return
    }

    replacePreferences(deserializeAppPreferences(serializedPreferences), false)
    isHydrated.value = true
  }

  const setDiscussionReaderMode = (readerMode: CommentReaderMode) => {
    replacePreferences({
      discussion: {
        ...preferences.value.discussion,
        readerMode,
      },
      version: APP_PREFERENCES_VERSION,
    }, true)
  }

  const setRootCommentOrder = (rootCommentOrder: RootCommentOrder) => {
    replacePreferences({
      discussion: {
        ...preferences.value.discussion,
        rootCommentOrder,
      },
      version: APP_PREFERENCES_VERSION,
    }, true)
  }

  return {
    discussionReaderMode: computed(() => preferences.value.discussion.readerMode),
    hydrate,
    isHydrated: computed(() => isHydrated.value),
    preferences: computed(() => preferences.value),
    rootCommentOrder: computed(() => preferences.value.discussion.rootCommentOrder),
    setDiscussionReaderMode,
    setRootCommentOrder,
    syncFromStorage,
  }
}
