import type { CommentSort } from './comments'

export const APP_PREFERENCES_STORAGE_KEY = 'hn-glance:preferences'
export const APP_PREFERENCES_VERSION = 1 as const

export type CommentReaderMode = 'comment' | 'path'
export type RootCommentOrder = CommentSort

export const DEFAULT_COMMENT_READER_MODE: CommentReaderMode = 'comment'
export const DEFAULT_ROOT_COMMENT_ORDER: RootCommentOrder = 'hn'

export type AppPreferences = {
  discussion: {
    readerMode: CommentReaderMode
    rootCommentOrder: RootCommentOrder
  }
  version: typeof APP_PREFERENCES_VERSION
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const getFirstValue = (value: unknown) => Array.isArray(value) ? value[0] : value

export const parseCommentReaderMode = (value: unknown): CommentReaderMode | null => {
  const mode = getFirstValue(value)

  return mode === 'comment' || mode === 'path' ? mode : null
}

export const parseRootCommentOrder = (value: unknown): RootCommentOrder | null => {
  const order = getFirstValue(value)

  return order === 'hn' || order === 'discussed' || order === 'recent'
    ? order
    : null
}

export const createDefaultAppPreferences = (): AppPreferences => ({
  discussion: {
    readerMode: DEFAULT_COMMENT_READER_MODE,
    rootCommentOrder: DEFAULT_ROOT_COMMENT_ORDER,
  },
  version: APP_PREFERENCES_VERSION,
})

export const parseAppPreferences = (value: unknown): AppPreferences => {
  const defaults = createDefaultAppPreferences()

  if (!isRecord(value) || value.version !== APP_PREFERENCES_VERSION) {
    return defaults
  }

  const discussion = isRecord(value.discussion) ? value.discussion : {}

  return {
    discussion: {
      readerMode: parseCommentReaderMode(discussion.readerMode)
        ?? defaults.discussion.readerMode,
      rootCommentOrder: parseRootCommentOrder(discussion.rootCommentOrder)
        ?? defaults.discussion.rootCommentOrder,
    },
    version: APP_PREFERENCES_VERSION,
  }
}

export const deserializeAppPreferences = (value: string | null): AppPreferences => {
  if (!value) {
    return createDefaultAppPreferences()
  }

  try {
    return parseAppPreferences(JSON.parse(value))
  } catch {
    return createDefaultAppPreferences()
  }
}

export const serializeAppPreferences = (preferences: AppPreferences): string => {
  return JSON.stringify(parseAppPreferences(preferences))
}
