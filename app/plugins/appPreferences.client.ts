import { APP_PREFERENCES_STORAGE_KEY } from '#shared/utils/appPreferences'
import { useAppPreferences } from '~/composables/useAppPreferences'

export default defineNuxtPlugin((nuxtApp) => {
  const { hydrate, syncFromStorage } = useAppPreferences()

  const handleStorage = (event: StorageEvent) => {
    if (event.key === APP_PREFERENCES_STORAGE_KEY) {
      syncFromStorage(event.newValue)
    }
  }

  nuxtApp.hook('app:mounted', () => {
    hydrate()
    window.addEventListener('storage', handleStorage)
  })

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      window.removeEventListener('storage', handleStorage)
    })
  }
})
