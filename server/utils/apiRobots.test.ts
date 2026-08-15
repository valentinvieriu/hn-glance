import { describe, expect, it } from 'vitest'
import { shouldNoindexApiPath } from './apiRobots'

describe('shouldNoindexApiPath', () => {
  it('marks public JSON APIs and internal JSON endpoints as noindex', () => {
    expect(shouldNoindexApiPath('/api/top')).toBe(true)
    expect(shouldNoindexApiPath('/api/item/42')).toBe(true)
    expect(shouldNoindexApiPath('/api/user/alice/comments')).toBe(true)
    expect(shouldNoindexApiPath('/api/internal/screenshot-jobs/42/prepare')).toBe(true)
  })

  it('keeps screenshot image responses and non-API routes crawlable', () => {
    expect(shouldNoindexApiPath('/api/screenshot')).toBe(false)
    expect(shouldNoindexApiPath('/api/screenshot/42')).toBe(false)
    expect(shouldNoindexApiPath('/item/42')).toBe(false)
    expect(shouldNoindexApiPath('/sitemap.xml')).toBe(false)
  })
})
