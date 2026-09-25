import { APP_PREFERENCES_STORAGE_KEY } from '#shared/utils/appPreferences'
import { useAppPreferences } from '~/composables/useAppPreferences'
import { onBrowserStorageKeyChange } from '~/utils/browserStorage'

export default defineNuxtPlugin((nuxtApp) => {
  const { hydrate, syncFromStorage } = useAppPreferences()
  let stopStorageSync: (() => void) | undefined

  nuxtApp.hook('app:mounted', () => {
    hydrate()
    stopStorageSync = onBrowserStorageKeyChange(APP_PREFERENCES_STORAGE_KEY, syncFromStorage)
  })

  import.meta.hot?.dispose(() => stopStorageSync?.())
})
