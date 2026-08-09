import { describe, expect, it } from 'vitest'
import {
  decodeHtmlEntities,
  htmlToPlainText,
  truncateAtWordBoundary,
} from './html'

describe('shared HTML text normalization', () => {
  it('decodes supported named and numeric entities safely', () => {
    expect(decodeHtmlEntities('&quot;Hello&#x2F;world&quot; &amp; it&apos;s&colon;')).toBe('"Hello/world" & it\'s:')
    expect(decodeHtmlEntities('&unknown; &#0;')).toBe('&unknown; &#0;')
  })

  it('turns the HN HTML subset into compact plain text', () => {
    expect(htmlToPlainText('<p>Hello &amp; <strong>welcome</strong> .</p>')).toBe('Hello & welcome.')
  })

  it('shares predictable word-boundary truncation across previews and excerpts', () => {
    expect(truncateAtWordBoundary('A compact comment preview with several words', 24))
      .toBe('A compact comment…')
  })
})
