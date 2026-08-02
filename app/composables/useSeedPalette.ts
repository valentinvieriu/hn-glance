import type { Comment } from '#shared/types'

export type SeedPaletteStyle = Record<string, string>

export type CommentThreadAuthorPalette = {
  authorCounts: ReadonlyMap<string, number>
  authorStyles: ReadonlyMap<string, SeedPaletteStyle>
}

const DEFAULT_SEED = 'hn'
const DEFAULT_CONTEXT_SEED = 'hn-visual-palette'
const HARMONY_OFFSETS = [0, 28, -28, 58, -58, 88, -88, 118, -118, 148, -148, 180]
const STORY_CONTEXT_HUES = [205, 225, 245, 265, 285] as const
const THREAD_HUE_CANDIDATE_COUNT = 36

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

const getCircularHueDistance = (left: number, right: number) => {
  const distance = Math.abs(left - right) % 360

  return Math.min(distance, 360 - distance)
}

const addAuthorConstraint = (
  constraints: Map<string, Set<string>>,
  leftAuthor: string | null | undefined,
  rightAuthor: string | null | undefined,
) => {
  if (!leftAuthor || !rightAuthor || leftAuthor === rightAuthor) {
    return
  }

  const leftConstraints = constraints.get(leftAuthor) ?? new Set<string>()
  const rightConstraints = constraints.get(rightAuthor) ?? new Set<string>()

  leftConstraints.add(rightAuthor)
  rightConstraints.add(leftAuthor)
  constraints.set(leftAuthor, leftConstraints)
  constraints.set(rightAuthor, rightConstraints)
}

/**
 * Assigns author colours in first-appearance order while keeping adjacent
 * conversational voices apart. Parent/child turns, neighbouring replies at a
 * fork, and neighbouring comments in reading order constrain one another.
 * Distant authors may reuse colour, which keeps large discussions varied
 * without exhausting the hue wheel.
 */
export const getCommentThreadAuthorPalette = (
  rootComment: Comment,
  contextSeed: string | number | null | undefined = DEFAULT_CONTEXT_SEED,
): CommentThreadAuthorPalette => {
  const authorCounts = new Map<string, number>()
  const authorOrder: string[] = []
  const constraints = new Map<string, Set<string>>()
  const stack: Array<{ comment: Comment; parentAuthor?: string }> = [{ comment: rootComment }]
  let previousAuthor: string | undefined

  while (stack.length > 0) {
    const frame = stack.pop()

    if (!frame) {
      continue
    }

    const { comment, parentAuthor } = frame
    const children = comment.children ?? []

    if (!authorCounts.has(comment.author)) {
      authorOrder.push(comment.author)
    }
    authorCounts.set(comment.author, (authorCounts.get(comment.author) ?? 0) + 1)

    addAuthorConstraint(constraints, parentAuthor, comment.author)
    addAuthorConstraint(constraints, previousAuthor, comment.author)

    for (let index = 1; index < children.length; index += 1) {
      addAuthorConstraint(constraints, children[index - 1]?.author, children[index]?.author)
    }

    previousAuthor = comment.author

    for (let index = children.length - 1; index >= 0; index -= 1) {
      const child = children[index]

      if (child) {
        stack.push({ comment: child, parentAuthor: comment.author })
      }
    }
  }

  const assignedHues = new Map<string, number>()
  const authorStyles = new Map<string, SeedPaletteStyle>()

  for (const author of authorOrder) {
    const preferredHue = getSeedHue(author, contextSeed)
    const constrainedHues = [...(constraints.get(author) ?? [])]
      .map(constrainedAuthor => assignedHues.get(constrainedAuthor))
      .filter((hue): hue is number => hue !== undefined)
    let selectedHue = preferredHue

    if (constrainedHues.length > 0) {
      let bestSeparation = -1
      let bestPreferredDistance = Number.POSITIVE_INFINITY

      for (let index = 0; index < THREAD_HUE_CANDIDATE_COUNT; index += 1) {
        const candidateHue = normalizeHue(
          preferredHue + index * (360 / THREAD_HUE_CANDIDATE_COUNT),
        )
        const separation = Math.min(
          ...constrainedHues.map(hue => getCircularHueDistance(candidateHue, hue)),
        )
        const preferredDistance = getCircularHueDistance(candidateHue, preferredHue)

        if (
          separation > bestSeparation
          || (separation === bestSeparation && preferredDistance < bestPreferredDistance)
        ) {
          selectedHue = candidateHue
          bestSeparation = separation
          bestPreferredDistance = preferredDistance
        }
      }
    }

    assignedHues.set(author, selectedHue)
    authorStyles.set(author, { '--seed-hue': `${selectedHue}` })
  }

  return {
    authorCounts,
    authorStyles,
  }
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
