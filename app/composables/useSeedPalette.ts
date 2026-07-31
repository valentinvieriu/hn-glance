type SeedPaletteStyle = Record<string, string>

const DEFAULT_SEED = 'hn'
const DEFAULT_CONTEXT_SEED = 'hn-visual-palette'
const HARMONY_OFFSETS = [0, 28, -28, 58, -58, 88, -88, 118, -118, 148, -148, 180]
const STORY_CONTEXT_HUES = [205, 225, 245, 265, 285] as const

const normalizeHue = (hue: number) => ((hue % 360) + 360) % 360

const hashSeed = (seed: string | number | null | undefined): number => {
  const value = String(seed ?? DEFAULT_SEED)
  let hash = 2166136261

  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

const getSeedHue = (
  seed: string | number | null | undefined,
  contextSeed: string | number | null | undefined = DEFAULT_CONTEXT_SEED,
): number => {
  const seedHash = hashSeed(seed)
  const contextHue = hashSeed(contextSeed) % 360
  const offset = HARMONY_OFFSETS[seedHash % HARMONY_OFFSETS.length] ?? 0
  const jitter = Math.floor(seedHash / HARMONY_OFFSETS.length) % 17 - 8

  return normalizeHue(contextHue + offset + jitter)
}

export const getSeedPaletteStyle = (
  seed: string | number | null | undefined,
  contextSeed: string | number | null | undefined = DEFAULT_CONTEXT_SEED,
): SeedPaletteStyle => {
  const hue = getSeedHue(seed, contextSeed)

  return {
    '--seed-hue': `${hue}`,
  }
}

export const getStoryContextPaletteStyle = (
  storyId: string | number | null | undefined,
  domain: string | number | null | undefined,
): SeedPaletteStyle => {
  const paletteIndex = hashSeed(`${storyId ?? DEFAULT_SEED}:${domain ?? DEFAULT_CONTEXT_SEED}`)
    % STORY_CONTEXT_HUES.length
  const hue = STORY_CONTEXT_HUES[paletteIndex] ?? STORY_CONTEXT_HUES[0]

  return {
    '--story-context-hue': `${hue}`,
  }
}
