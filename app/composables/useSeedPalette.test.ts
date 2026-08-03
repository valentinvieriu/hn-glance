import { describe, expect, it } from 'vitest'
import type { Comment } from '#shared/types'
import {
  getCommentThreadAuthorPalette,
  getStoryContextPaletteStyle,
} from './useSeedPalette'

const STORY_CONTEXT_HUES = new Set(['205', '225', '245', '265', '285'])

describe('getStoryContextPaletteStyle', () => {
  it('is deterministic for a story and source domain', () => {
    expect(getStoryContextPaletteStyle('49108685', 'lwn.net')).toEqual(
      getStoryContextPaletteStyle('49108685', 'lwn.net'),
    )
  })

  it('keeps story context inside the restrained editorial hue set', () => {
    const palettes = Array.from({ length: 30 }, (_, index) => (
      getStoryContextPaletteStyle(index, `source-${index}.example`)
    ))

    for (const palette of palettes) {
      expect(STORY_CONTEXT_HUES.has(palette['--story-context-hue'] ?? '')).toBe(true)
    }
  })
})

const comment = (id: number, author: string, children: Comment[] = []): Comment => ({
  id,
  author,
  children,
  created_at: '2026-08-02T00:00:00Z',
  parent_id: id - 1,
  text: '',
})

const getHue = (palette: ReturnType<typeof getCommentThreadAuthorPalette>, author: string) => {
  return Number(palette.authorStyles.get(author)?.['--seed-hue'])
}

const circularDistance = (left: number, right: number) => {
  const distance = Math.abs(left - right) % 360

  return Math.min(distance, 360 - distance)
}

describe('getCommentThreadAuthorPalette', () => {
  it('separates adjacent authors that would otherwise hash to similar purples', () => {
    const palette = getCommentThreadAuthorPalette(
      comment(1, 'simonw', [comment(2, 'zmmmmm', [comment(3, 'simonw')])]),
    )

    expect(circularDistance(getHue(palette, 'simonw'), getHue(palette, 'zmmmmm'))).toBeGreaterThanOrEqual(170)
  })

  it('keeps neighbouring branches visually distinct', () => {
    const palette = getCommentThreadAuthorPalette(
      comment(1, 'root', [
        comment(2, 'alice'),
        comment(3, 'bob'),
        comment(4, 'carol'),
      ]),
    )

    expect(circularDistance(getHue(palette, 'alice'), getHue(palette, 'bob'))).toBeGreaterThanOrEqual(90)
    expect(circularDistance(getHue(palette, 'bob'), getHue(palette, 'carol'))).toBeGreaterThanOrEqual(90)
  })

  it('keeps earlier assignments stable when a thread grows', () => {
    const initial = getCommentThreadAuthorPalette(
      comment(1, 'root', [comment(2, 'alice')]),
    )
    const extended = getCommentThreadAuthorPalette(
      comment(1, 'root', [comment(2, 'alice'), comment(3, 'later')]),
    )

    expect(getHue(extended, 'root')).toBe(getHue(initial, 'root'))
    expect(getHue(extended, 'alice')).toBe(getHue(initial, 'alice'))
  })
})
