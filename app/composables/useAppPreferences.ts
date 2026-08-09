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

    try {
      window.localStorage.setItem(
        APP_PREFERENCES_STORAGE_KEY,
        serializeAppPreferences(nextPreferences),
      )
    } catch {
      // Storage can be unavailable, blocked, or full. The in-memory preference
      // remains useful for the current app session.
    }
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

    let storedPreferences = createDefaultAppPreferences()

    try {
      storedPreferences = deserializeAppPreferences(
        window.localStorage.getItem(APP_PREFERENCES_STORAGE_KEY),
      )
    } catch {
      // Falling back to defaults is an expected stateless mode.
    }

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
