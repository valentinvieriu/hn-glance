import { DISCUSSION_VISITS_STORAGE_KEY } from '#shared/utils/discussionVisits'
import { useDiscussionVisits } from '~/composables/useDiscussionVisits'
import { onBrowserStorageKeyChange } from '~/utils/browserStorage'

export default defineNuxtPlugin(() => {
  const { syncFromStorage } = useDiscussionVisits()
  const stopStorageSync = onBrowserStorageKeyChange(DISCUSSION_VISITS_STORAGE_KEY, syncFromStorage)

  import.meta.hot?.dispose(stopStorageSync)
})
