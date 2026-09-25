/** 32-bit FNV-1a hash used for deterministic, story-seeded visuals. */
export const hashSeed = (seed: string): number => {
  let hash = 2166136261

  for (const character of seed) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}
