import { describe, expect, it } from 'vitest'
import { getStoryContextPaletteStyle } from './useSeedPalette'

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
