import type { SemanticAi } from './semanticRanking'
import { SEARCH_STOPWORDS } from './searchRanking'

// Query planning for search's semantic pass. A small Workers AI
// model reads the query and decides how each word is searched: anchors must
// match exactly, context words may be missing, and alternatives name the same
// subject the way HN titles do. Algolia has no notion of term importance, so
// without a plan common words ("self hosting") drown the defining one ("waf").

export const QUERY_PLANNER_MODEL = '@cf/ibm-granite/granite-4.0-h-micro'
const QUERY_PLANNER_TIMEOUT_MS = 1200
const MAX_ANCHORS = 2
const MAX_ALTERNATIVES = 3
const MAX_ALTERNATIVE_WORDS = 4

export type SearchPlan = {
  /** Words or names a useful title must contain, copied from the query. */
  anchors: string[]
  /** Other meaningful query words; titles may omit them. */
  context: string[]
  /** Short searches naming the same subject differently. */
  alternatives: string[]
}

// Output tokens dominate planner latency, so the model writes only anchors and
// alternatives; context words are the remaining query words, derived locally.
const SYSTEM_PROMPT = `You turn a Hacker News search query into keyword searches over story titles. Return JSON: {"anchors": [...], "alternatives": [...]}
- anchors: the term from the query that a relevant title must contain, copied exactly. Choose the shortest term that still names the subject: usually one word or a two-word name. Add a second anchor only when the query compares or combines two named things. Never a generic word such as software, server, alternative, advice, tips, problems, or how.
- alternatives: up to 3 short searches (1-3 words) a relevant title might use instead of the anchor: a synonym, the expanded or abbreviated name, or a well-known tool of exactly that kind. Each must be about the same subject, never a related but different technology. Use [] when unsure.`

const EXAMPLES = [
  { role: 'user', content: 'cheap gpu cloud for training' },
  { role: 'assistant', content: '{"anchors":["gpu"],"alternatives":["GPU rental","RunPod","Lambda Labs"]}' },
  { role: 'user', content: 'react state management libraries' },
  { role: 'assistant', content: '{"anchors":["state management"],"alternatives":["Redux","Zustand","MobX"]}' },
  { role: 'user', content: 'free alternative to photoshop' },
  { role: 'assistant', content: '{"anchors":["photoshop"],"alternatives":["GIMP","Photopea","Krita"]}' },
  { role: 'user', content: 'zfs vs btrfs reliability' },
  { role: 'assistant', content: '{"anchors":["zfs","btrfs"],"alternatives":[]}' },
]

// Constrained decoding: the small model otherwise drops closing brackets.
const terms = (maxItems: number) => ({ type: 'array', items: { type: 'string' }, maxItems })
const RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    type: 'object',
    properties: { anchors: terms(MAX_ANCHORS), alternatives: terms(MAX_ALTERNATIVES) },
    required: ['anchors', 'alternatives'],
  },
}

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number) => Promise.race([
  promise,
  new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error('Query planning timed out')), timeoutMs)),
])

const cleanTerms = (value: unknown, limit: number) => (Array.isArray(value) ? value : [])
  .filter((term): term is string => typeof term === 'string')
  .map(term => term.replace(/["\s]+/gu, ' ').trim())
  .filter(Boolean)
  .slice(0, limit)

// Workers AI returns `response` for some models and an OpenAI-style
// chat completion for others, including Granite.
const parsePlanOutput = (output: unknown): Record<string, unknown> | null => {
  const result = output as { response?: unknown, choices?: { message?: { content?: unknown } }[] } | null
  const body = result?.response ?? result?.choices?.[0]?.message?.content

  if (body && typeof body === 'object') return body as Record<string, unknown>
  if (typeof body !== 'string') return null

  try {
    return JSON.parse(body.match(/\{[\s\S]*\}/u)?.[0] ?? '')
  } catch {
    return null
  }
}

/**
 * A search plan for a multi-word query, or null when the model fails, times
 * out, or returns nothing usable; search then proceeds without it.
 */
export const planSearchQuery = async (ai: SemanticAi, query: string): Promise<SearchPlan | null> => {
  try {
    const output = await withTimeout(ai.run(QUERY_PLANNER_MODEL, {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...EXAMPLES,
        { role: 'user', content: query },
      ],
      response_format: RESPONSE_FORMAT,
      max_tokens: 80,
      temperature: 0,
    }), QUERY_PLANNER_TIMEOUT_MS)
    const raw = parsePlanOutput(output)

    if (!raw) return null

    const normalizedQuery = query.toLocaleLowerCase('en-US')
    // Anchors become required exact matches, so only words the user typed qualify.
    const anchors = cleanTerms(raw.anchors, MAX_ANCHORS)
      .filter(anchor => normalizedQuery.includes(anchor.toLocaleLowerCase('en-US')))
    const anchorWords = new Set(anchors.flatMap(anchor => anchor.toLocaleLowerCase('en-US').split(' ')))
    const context = [...new Set(normalizedQuery.split(' '))]
      .filter(word => word && !anchorWords.has(word) && !SEARCH_STOPWORDS.has(word))
    const alternatives = cleanTerms(raw.alternatives, MAX_ALTERNATIVES)
      .filter(alternative => alternative.split(' ').length <= MAX_ALTERNATIVE_WORDS)

    return anchors.length > 0 || alternatives.length > 0 ? { anchors, context, alternatives } : null
  } catch (error) {
    console.warn('Query planning unavailable:', error)
    return null
  }
}
