type BrowserStorageKind = 'local' | 'session'

// Storage can be unavailable, blocked, or full. Callers retain their in-memory
// state so reading never depends on persistence succeeding.
const getBrowserStorage = (kind: BrowserStorageKind) => {
  return kind === 'session' ? window.sessionStorage : window.localStorage
}

export const readBrowserStorage = (
  key: string,
  kind: BrowserStorageKind = 'local',
): string | null => {
  if (!import.meta.client) {
    return null
  }

  try {
    return getBrowserStorage(kind).getItem(key)
  } catch {
    return null
  }
}

export const writeBrowserStorage = (
  key: string,
  value: string,
  kind: BrowserStorageKind = 'local',
): boolean => {
  if (!import.meta.client) {
    return false
  }

  try {
    getBrowserStorage(kind).setItem(key, value)
    return true
  } catch {
    return false
  }
}

export const removeBrowserStorage = (
  key: string,
  kind: BrowserStorageKind = 'local',
) => {
  if (!import.meta.client) {
    return
  }

  try {
    getBrowserStorage(kind).removeItem(key)
  } catch {
    // Nothing to clean up when storage is unavailable.
  }
}

/**
 * Follows writes to one key from other tabs. Returns the unsubscribe function.
 */
export const onBrowserStorageKeyChange = (
  key: string,
  callback: (newValue: string | null) => void,
) => {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === key) {
      callback(event.newValue)
    }
  }

  window.addEventListener('storage', handleStorage)

  return () => window.removeEventListener('storage', handleStorage)
}
