import { describe, expect, it } from 'vitest'
import { getCanonicalUrl, SITE_ORIGIN } from './canonical'

describe('getCanonicalUrl', () => {
  it('builds absolute URLs against the production origin', () => {
    expect(getCanonicalUrl('/top')).toBe(`${SITE_ORIGIN}/top`)
    expect(getCanonicalUrl('privacy')).toBe(`${SITE_ORIGIN}/privacy`)
  })

  it('removes query parameters and fragments from route state', () => {
    expect(getCanonicalUrl('/item/42?sort=recent&view=discussion#comment-7'))
      .toBe(`${SITE_ORIGIN}/item/42`)
    expect(getCanonicalUrl('/top?utm_source=example'))
      .toBe(`${SITE_ORIGIN}/top`)
  })
})
