import { getUrlDomain } from '#shared/utils/url'

// Semantic ranking for search's broad pass. Clef Flash, a Workers AI decision
// model, judges how well each candidate story matches the query; ranking then
// uses that judgment instead of requiring every query term.

export const SEMANTIC_MODEL = '@cf/cloudflare/clef-flash'
// Scores run from 0 (irrelevant) to 3 (exactly what the searcher wants).
// Below the midpoint a story only touches the topic in passing.
export const SEMANTIC_MIN_SCORE = 1.5
// Two overlapping stages: batches screen the whole pool, and each story a batch
// passes is re-judged alone as soon as its batch returns. Batched judgments
// are more lenient and depend on candidate order; one call per story judges
// best, but a whole pool of parallel calls exceeds Workers AI capacity.
const SEMANTIC_BATCH_SIZE = 10
const SEMANTIC_CANDIDATE_LIMIT = 70
const SEMANTIC_REFINE_LIMIT = 12
const SEMANTIC_SCREEN_TIMEOUT_MS = 2000
// Refinements still running at the deadline keep their screening scores.
const SEMANTIC_DEADLINE_MS = 2500

const RELEVANCE_INSTRUCTIONS = 'A person typed the query into a Hacker News story search box. How relevant is this story to what they are looking for?'
const RELEVANCE_CRITERIA = [
  'Irrelevant: shares words by coincidence or unrelated',
  'Tangential: touches the topic only in passing',
  'Relevant: substantially about the topic',
  'Exactly what the searcher is looking for',
]

/** The slice of the Workers AI binding semantic ranking needs. */
export type SemanticAi = {
  run: (model: string, input: Record<string, unknown>) => Promise<unknown>
}

export type SemanticCandidate = {
  objectID: string
  title: string
  url: string
  /** For stories found only through a comment: the comment excerpt. */
  commentSnippet?: string
}

type ClefOutput = {
  answers?: Record<string, { score?: number } | undefined>
}

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number) => Promise.race([
  promise,
  new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error('Semantic ranking timed out')), timeoutMs)),
])

const scoreBatch = async (ai: SemanticAi, query: string, stories: SemanticCandidate[]) => {
  const output = await ai.run(SEMANTIC_MODEL, {
    model: 'clef-flash',
    state: {
      query,
      stories: stories.map((story, index) => ({
        key: `s${index}`,
        title: story.title,
        domain: getUrlDomain(story.url, ''),
        ...(story.commentSnippet ? { matching_comment_excerpt: story.commentSnippet } : {}),
      })),
    },
    questions: Object.fromEntries(stories.map((_story, index) => [`s${index}`, {
      type: 'score',
      instructions: `${RELEVANCE_INSTRUCTIONS} Judge only the story with key s${index}.`,
      criteria: RELEVANCE_CRITERIA,
    }])),
  }) as ClefOutput

  return stories.map((story, index) => {
    const score = output.answers?.[`s${index}`]?.score

    if (typeof score !== 'number') throw new Error('Semantic ranking returned an incomplete answer')

    return [story.objectID, score] as const
  })
}

export type SemanticScores = {
  /** Relevance per story ID, 0-3. */
  scores: Map<string, number>
  /** Whether refinement completed; a failed or late one keeps screening scores. */
  refined: boolean
}

/**
 * Relevance per story ID, or null when screening fails or exceeds its budget,
 * so callers fall back to lexical ranking. Refinement failures keep screening
 * scores. Expects candidates in retrieval order: only the first ones are
 * judged, and the earliest passing stories are refined first.
 */
export const getSemanticScores = async (
  ai: SemanticAi,
  query: string,
  candidates: SemanticCandidate[],
): Promise<SemanticScores | null> => {
  const startedAt = performance.now()
  const stories = candidates.slice(0, SEMANTIC_CANDIDATE_LIMIT)
  const scores = new Map<string, number>()
  const refinements: Promise<void>[] = []
  let refined = true

  const refine = (story: SemanticCandidate) => {
    if (refinements.length >= SEMANTIC_REFINE_LIMIT) return

    refinements.push(scoreBatch(ai, query, [story]).then(([judgment]) => {
      if (judgment) scores.set(...judgment)
    }, (error) => {
      refined = false
      console.warn('Semantic refinement unavailable:', error)
    }))
  }

  const batches: SemanticCandidate[][] = []

  for (let index = 0; index < stories.length; index += SEMANTIC_BATCH_SIZE) {
    batches.push(stories.slice(index, index + SEMANTIC_BATCH_SIZE))
  }

  try {
    await withTimeout(Promise.all(batches.map(batch => scoreBatch(ai, query, batch).then((judgments) => {
      judgments.forEach(([storyId, score], index) => {
        scores.set(storyId, score)
        if (score >= SEMANTIC_MIN_SCORE) refine(batch[index]!)
      })
    }))), SEMANTIC_SCREEN_TIMEOUT_MS)
  } catch (error) {
    console.warn('Semantic ranking unavailable:', error)
    return null
  }

  try {
    await withTimeout(
      Promise.all(refinements),
      Math.max(SEMANTIC_DEADLINE_MS - (performance.now() - startedAt), 0),
    )
  } catch {
    refined = false
  }

  // A copy, so refinements finishing after the deadline cannot change ranking.
  return { scores: new Map(scores), refined }
}
