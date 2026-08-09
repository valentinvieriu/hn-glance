import { describe, expect, it } from 'vitest'
import {
  APP_PREFERENCES_STORAGE_KEY,
  APP_PREFERENCES_VERSION,
  createDefaultAppPreferences,
  deserializeAppPreferences,
  parseAppPreferences,
  parseCommentReaderMode,
  parseRootCommentOrder,
  serializeAppPreferences,
} from './appPreferences'

describe('app preferences', () => {
  it('uses one purpose-specific, versioned storage key', () => {
    expect(APP_PREFERENCES_STORAGE_KEY).toBe('hn-glance:preferences')
    expect(createDefaultAppPreferences()).toEqual({
      discussion: {
        readerMode: 'comment',
        rootCommentOrder: 'hn',
      },
      version: APP_PREFERENCES_VERSION,
    })
  })

  it('parses explicit reader modes and root-comment orders', () => {
    expect(parseCommentReaderMode('comment')).toBe('comment')
    expect(parseCommentReaderMode(['path', 'comment'])).toBe('path')
    expect(parseCommentReaderMode('unknown')).toBeNull()
    expect(parseRootCommentOrder('hn')).toBe('hn')
    expect(parseRootCommentOrder(['discussed', 'recent'])).toBe('discussed')
    expect(parseRootCommentOrder('unknown')).toBeNull()
  })

  it('retains valid fields and defaults invalid fields independently', () => {
    expect(parseAppPreferences({
      discussion: {
        readerMode: 'path',
        rootCommentOrder: 'unknown',
      },
      version: APP_PREFERENCES_VERSION,
    })).toEqual({
      discussion: {
        readerMode: 'path',
        rootCommentOrder: 'hn',
      },
      version: APP_PREFERENCES_VERSION,
    })
  })

  it('falls back safely for corrupt or unsupported stored values', () => {
    expect(deserializeAppPreferences('{not-json')).toEqual(createDefaultAppPreferences())
    expect(deserializeAppPreferences(JSON.stringify({
      discussion: {
        readerMode: 'path',
        rootCommentOrder: 'recent',
      },
      version: 99,
    }))).toEqual(createDefaultAppPreferences())
  })

  it('serializes only the validated preference schema', () => {
    const serialized = serializeAppPreferences({
      discussion: {
        readerMode: 'path',
        rootCommentOrder: 'recent',
      },
      version: APP_PREFERENCES_VERSION,
    })

    expect(deserializeAppPreferences(serialized)).toEqual({
      discussion: {
        readerMode: 'path',
        rootCommentOrder: 'recent',
      },
      version: APP_PREFERENCES_VERSION,
    })
  })
})
