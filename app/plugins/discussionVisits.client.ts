import { DISCUSSION_VISITS_STORAGE_KEY } from '#shared/utils/discussionVisits'
import { useDiscussionVisits } from '~/composables/useDiscussionVisits'

export default defineNuxtPlugin(() => {
  const { syncFromStorage } = useDiscussionVisits()

  const handleStorage = (event: StorageEvent) => {
    if (event.key === DISCUSSION_VISITS_STORAGE_KEY) {
      syncFromStorage(event.newValue)
    }
  }

  window.addEventListener('storage', handleStorage)

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      window.removeEventListener('storage', handleStorage)
    })
  }
})
