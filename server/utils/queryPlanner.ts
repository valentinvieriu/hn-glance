import type { SemanticAi } from './semanticRanking'

// Query planning for search's semantic pass. A small Workers AI
// model reads the query and decides how each word is searched: anchors must
// match exactly, context words may be missing, and alternatives name the same
// subject the way HN titles do. Algolia has no notion of term importance, so
// without a plan common words ("self hosting") drown the defining one ("waf").

export const QUERY_PLANNER_MODEL = '@cf/qwen/qwen3-30b-a3b-fp8'
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

const SYSTEM_PROMPT = `You plan keyword searches over Hacker News story titles for a search query.
Return only JSON: {"anchors": [...], "context": [...], "alternatives": [...]}
- anchors: at most two words or exact phrases copied from the query that define its subject: the most distinctive technical term, name, or topic phrase. A useful title must contain them. Never use a generic word alone, such as software, server, engineers, advice, tips, guide, or how.
- context: the other meaningful query words. They refine the subject, but a useful title may omit them. Leave out filler words.
- alternatives: up to 3 short searches (1-3 words) that name the same subject the way HN titles would: synonyms, expanded abbreviations, or specific tools and products. Never a broader or different topic.`

const EXAMPLES = [
  { role: 'user', content: 'cheap gpu cloud for training' },
  { role: 'assistant', content: '{"anchors":["gpu"],"context":["cheap","cloud","training"],"alternatives":["GPU rental","RunPod","Lambda Labs"]}' },
  { role: 'user', content: 'home media server setup' },
  { role: 'assistant', content: '{"anchors":["media server"],"context":["home","setup"],"alternatives":["Jellyfin","Plex server","homelab media"]}' },
]

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number) => Promise.race([
  promise,
  new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error('Query planning timed out')), timeoutMs)),
])

const cleanTerms = (value: unknown, limit: number) => (Array.isArray(value) ? value : [])
  .filter((term): term is string => typeof term === 'string')
  .map(term => term.replace(/["\s]+/gu, ' ').trim())
  .filter(Boolean)
  .slice(0, limit)

const parsePlanOutput = (output: unknown): Record<string, unknown> | null => {
  const body = (output as { response?: unknown } | null)?.response

  if (body && typeof body === 'object') return body as Record<string, unknown>
  if (typeof body !== 'string') return null

  try {
    return JSON.parse(body.replace(/<think>[\s\S]*?<\/think>/gu, '').match(/\{[\s\S]*\}/u)?.[0] ?? '')
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
        { role: 'user', content: `${query} /no_think` },
      ],
      max_tokens: 120,
      temperature: 0,
    }), QUERY_PLANNER_TIMEOUT_MS)
    const raw = parsePlanOutput(output)

    if (!raw) return null

    const normalizedQuery = query.toLocaleLowerCase('en-US')
    // Anchors become required exact matches, so only words the user typed qualify.
    const anchors = cleanTerms(raw.anchors, MAX_ANCHORS)
      .filter(anchor => normalizedQuery.includes(anchor.toLocaleLowerCase('en-US')))
    const context = cleanTerms(raw.context, 8)
      .filter(word => !anchors.some(anchor => anchor.toLocaleLowerCase('en-US') === word.toLocaleLowerCase('en-US')))
    const alternatives = cleanTerms(raw.alternatives, MAX_ALTERNATIVES)
      .filter(alternative => alternative.split(' ').length <= MAX_ALTERNATIVE_WORDS)

    return anchors.length > 0 || alternatives.length > 0 ? { anchors, context, alternatives } : null
  } catch (error) {
    console.warn('Query planning unavailable:', error)
    return null
  }
}
