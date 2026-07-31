import { describe, expect, it } from 'vitest'
import { getSourceFaviconUrl } from './sourceFavicon'

describe('source favicon URLs', () => {
  it('uses only the safe HTTP origin as the favicon identity', () => {
    expect(getSourceFaviconUrl('https://www.example.com/article?id=42#section')).toBe(
      'https://www.google.com/s2/favicons?domain_url=https%3A%2F%2Fwww.example.com&sz=64',
    )
  })

  it('rejects invalid, unsafe, and credentialed URLs', () => {
    expect(getSourceFaviconUrl('javascript:alert(1)')).toBe('')
    expect(getSourceFaviconUrl('https://user:password@example.com/article')).toBe('')
    expect(getSourceFaviconUrl('not a URL')).toBe('')
  })
})
