export const readBrowserStorage = (key: string): string | null => {
  if (!import.meta.client) {
    return null
  }

  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export const writeBrowserStorage = (key: string, value: string): boolean => {
  if (!import.meta.client) {
    return false
  }

  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    // Storage can be unavailable, blocked, or full. Callers retain their
    // in-memory state so reading never depends on persistence succeeding.
    return false
  }
}
