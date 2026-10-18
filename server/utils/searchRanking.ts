import type { SearchMatch, SearchStory } from '#shared/types'
import type { SearchSort } from '#shared/utils/search'
import { canonicalizeSubmissionUrl } from './previousSubmissions'
import { SEMANTIC_MIN_SCORE } from './semanticRanking'
import {
  collectCandidates,
  getBigrams,
  getPopularityScore,
  getRankScore,
  getRetrievalScore,
  normalizeToken,
  selectDiverseStories,
  stripHtml,
  tokenize,
  type CommentEvidence,
  type ScoredCandidate,
  type SearchResult,
  type TokenizeOptions,
} from './relatedStories'

// Search shares retrieval, candidate merging, and diversity selection with
// Similar Stories, but typed queries need their own matching policy: every
// term is required and Algolia's prefix and typo matches are rejected.

const MAX_SEARCH_STORIES = 30
const MAX_SEARCH_STORIES_PER_HOST = 4
const MAX_SEARCH_DISCUSSION_MATCHES = 6
const SEARCH_PREFIX_MIN_LENGTH = 6
const SEARCH_WORD_LIMIT = 12
const SEARCH_TITLE_TOKEN_LIMIT = 64
const SEARCH_COMMENT_TOKEN_LIMIT = 600
const SEARCH_COMMENT_TEXT_LIMIT = 6000
const FIVE_YEARS_IN_SECONDS = 5 * 365.25 * 24 * 60 * 60

// Typed queries are deliberate, so only grammatical words are dropped. Title
// noise such as "video", "guide", "pdf", or "show" can be exactly what a
// reader wants, so search also matches raw titles rather than `cleanTitle`.
const SEARCH_STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how',
  'i', 'in', 'into', 'is', 'it', 'its', 'of', 'on', 'or', 'our', 'that',
  'the', 'their', 'this', 'to', 'was', 'we', 'what', 'when', 'where',
  'which', 'why', 'with', 'you', 'your',
  // Contraction fragments split off by the tokenizer ("Zig's", "don't").
  'd', 'll', 'm', 're', 's', 't', 've',
])

const SEARCH_TOKENIZE: TokenizeOptions = { stopwords: SEARCH_STOPWORDS, keepShortTokens: true }
const SEARCH_WORD_PATTERN = /[\p{L}\p{N}][\p{L}\p{N}+#._-]*/gu
const DOMAIN_TOKEN_PATTERN = /^[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.\p{L}{2,}$/u

export type SearchRankingOptions = {
  sort: SearchSort
  /** Search window start in Unix seconds; null searches all time. */
  rangeStart: number | null
  nowSeconds: number
  /** Quoted phrases whose words must appear together in a matching title. */
  phrases?: string[]
  /** Words no result title or source may contain. */
  excluded?: string[]
  /**
   * Retrieval already applied the whole query as filters (such as `by:pg`),
   * so every candidate qualifies without text terms.
   */
  filterOnly?: boolean
  /** An author filter asks for one person's sources, so hosts are not capped. */
  uncappedHosts?: boolean
  /**
   * Model-judged relevance per story ID (0-3), for the semantic pass. Stories
   * then qualify by that judgment instead of exact terms; phrases and
   * exclusions still apply.
   */
  semanticScores?: Map<string, number>
}

/**
 * One typed word. It matches whole ("local-first") or through all of its own
 * parts ("local" and "first"), so splitting a word never adds requirements.
 */
type SearchTerm = {
  token: string
  parts: string[]
}

type SearchScoredCandidate = ScoredCandidate & {
  match: SearchMatch
  comment?: CommentEvidence
}

// Search lowercases before tokenizing, so camel-case splitting (a Similar
// Stories recall aid) cannot make capitalization change what matches, and
// "java" does not match "JavaScript".
const lowercase = (value: string) => value.toLocaleLowerCase('en-US')

const tokenizeSearchText = (value: string, maxTokens: number) => {
  return tokenize(lowercase(value), maxTokens, SEARCH_TOKENIZE)
}

const getSearchWords = (value: string) => {
  return stripHtml(lowercase(value)).replace(/&[#\p{L}\p{N}]+;/gu, ' ').match(SEARCH_WORD_PATTERN) ?? []
}

/**
 * The positional parts of one word: "local-first" is local, first; "node.js"
 * is node, js; "gpt4" is gpt, 4. Version numbers such as 3.11 stay whole.
 */
const getWordParts = (word: string) => word
  .split(/[-_]+/u)
  .flatMap(part => (part.includes('.') && !/^\d+(?:\.\d+)+$/u.test(part) ? part.split('.') : [part]))
  .flatMap(part => part.split(/(?<=\p{L})(?=\p{N})/u))
  .map(normalizeToken)
  .filter(Boolean)

const APOSTROPHE_ENTITY_PATTERN = /&#(?:x27|39);|&apos;/giu
const CONTRACTION_PATTERN = /(\p{L})['’](?:d|ll|m|re|s|t|ve)(?![\p{L}\p{N}])/gu

/**
 * Every word part of a text in order, repeats and stopwords kept, for phrase
 * and split-word adjacency. Token sets deduplicate and drop stopwords, so they
 * can only answer membership. Contraction endings are dropped on both sides,
 * so "Zig's compiler" contains the phrase "zig compiler".
 */
const getWordStream = (value: string) => getSearchWords(
  value.replace(APOSTROPHE_ENTITY_PATTERN, '\'').replace(CONTRACTION_PATTERN, '$1'),
).flatMap(getWordParts)

const getSearchTerms = (value: string): SearchTerm[] => {
  const terms: SearchTerm[] = []
  const seen = new Set<string>()

  for (const word of getSearchWords(value)) {
    const [token] = tokenize(word, SEARCH_WORD_LIMIT, SEARCH_TOKENIZE)

    if (!token || seen.has(token)) continue

    const parts = getWordParts(word)
    seen.add(token)
    // A domain is one identity; "github.com" must not match "github" plus "com".
    terms.push({ token, parts: DOMAIN_TOKEN_PATTERN.test(token) || parts.length < 2 ? [] : parts })

    if (terms.length === SEARCH_WORD_LIMIT) break
  }

  return terms
}

/** One title or comment, prepared once for every term and phrase check. */
type SearchableText = {
  /** Deduplicated tokens for membership, prefix, and host checks. */
  tokens: Set<string>
  /** Ordered word parts for phrase and split-word adjacency. */
  stream: string[]
}

const toSearchableText = (text: string, maxTokens: number, extraTokens: string[] = []): SearchableText => ({
  tokens: new Set([...tokenizeSearchText(text, maxTokens), ...extraTokens]),
  stream: getWordStream(text),
})

/**
 * Host terms a query can match: each label except the TLD ("github") and each
 * registrable suffix ("blog.github.com", "github.com"), so a domain query
 * matches its host and genuine subdomains only.
 */
const getHostSearchTokens = (url: string) => {
  try {
    const labels = new URL(url).hostname.toLowerCase().replace(/^www\./u, '').split('.')
    const suffixes = labels.slice(0, -1).map((_label, index) => labels.slice(index).join('.'))

    return [...labels.slice(0, -1), ...suffixes].map(normalizeToken).filter(Boolean)
  } catch {
    return []
  }
}

// Algolia also matches prefixes and typos ("zig" finds "Zigbee"). Results must
// contain each query term, so only long plain words may complete as a prefix;
// dotted names such as domains match exactly.
const tokenMatches = (queryToken: string, candidateTokens: Set<string>) => {
  if (candidateTokens.has(queryToken)) return true
  if (queryToken.length < SEARCH_PREFIX_MIN_LENGTH || queryToken.includes('.')) return false

  for (const token of candidateTokens) {
    if (token.startsWith(queryToken)) return true
  }

  return false
}

/**
 * A split word ("local-first") also matches through its parts, which must be
 * adjacent ("local first"), so "small local models first" does not match.
 * Titles and comments use the same rule.
 */
const termMatches = (term: SearchTerm, text: SearchableText) => {
  if (tokenMatches(term.token, text.tokens)) return true

  return term.parts.length > 0 && containsSequence(text.stream, term.parts)
}

// A lexical title match contains every term.
const TITLE_MATCH_RELEVANCE = 140
// Semantic title relevance starts where lexical title matches do, so
// discussion-only context stays below every title match, and spans 90 points
// from the qualifying score to a perfect one, so popularity and recency still
// separate equally relevant titles.
const SEMANTIC_RELEVANCE_BASE = 100
const SEMANTIC_RELEVANCE_SCALE = 60
const SEMANTIC_COMPLETE_MATCH_BONUS = 10

const containsSequence = (words: string[], sequence: string[]) => {
  if (sequence.length === 0) return true

  for (let start = 0; start + sequence.length <= words.length; start += 1) {
    if (sequence.every((word, offset) => words[start + offset] === word)) return true
  }

  return false
}

/** Expects score order; keeps the first candidate for each canonical source URL. */
const keepStrongestPerSource = <T extends ScoredCandidate>(rankedCandidates: T[]) => {
  const seenUrls = new Set<string>()

  return rankedCandidates.filter((scored) => {
    if (!scored.canonicalUrl) return true
    if (seenUrls.has(scored.canonicalUrl)) return false

    seenUrls.add(scored.canonicalUrl)
    return true
  })
}

type TokenizedComment = {
  comment: CommentEvidence
  text: SearchableText
}

const getTokenizedComments = (results: SearchResult[]) => {
  const tokenizedComments = new Map<string, TokenizedComment[]>()

  for (const result of results) {
    for (const [storyId, comments] of Object.entries(result.commentEvidence ?? {})) {
      const entries = tokenizedComments.get(storyId) ?? []

      for (const comment of comments) {
        entries.push({
          comment,
          text: toSearchableText(comment.text.slice(0, SEARCH_COMMENT_TEXT_LIMIT), SEARCH_COMMENT_TOKEN_LIMIT),
        })
      }

      tokenizedComments.set(storyId, entries)
    }
  }

  return tokenizedComments
}

export const rankSearchStories = (
  results: SearchResult[],
  query: string,
  {
    sort,
    rangeStart,
    nowSeconds,
    phrases = [],
    excluded = [],
    filterOnly = false,
    uncappedHosts = false,
    semanticScores,
  }: SearchRankingOptions,
): SearchStory[] => {
  const terms = getSearchTerms(query)

  if (terms.length === 0 && !filterOnly) return []

  // Quoted phrases keep their stopwords: "state of the art" is not "state art".
  const phraseSequences = phrases
    .map(getWordStream)
    .filter(sequence => sequence.length > 0)
  const excludedTerms = excluded.flatMap(word => getSearchTerms(word))
  const termTokens = terms.map(term => term.token)
  const queryStream = getWordStream(query)
  const queryBigrams = getBigrams(termTokens)
  const recencyScale = rangeStart === null
    ? FIVE_YEARS_IN_SECONDS
    : Math.max(nowSeconds - rangeStart, 1)
  const candidates = collectCandidates(results)
  const tokenizedComments = getTokenizedComments(results)
  const titleWords = new Map<string, string[]>()
  const titleTexts = new Map<string, SearchableText>()

  for (const candidate of candidates.values()) {
    // A title matches through its words and its source host.
    titleWords.set(candidate.objectID, getSearchTerms(candidate.title).map(term => term.token))
    titleTexts.set(
      candidate.objectID,
      toSearchableText(candidate.title, SEARCH_TITLE_TOKEN_LIMIT, getHostSearchTokens(candidate.url)),
    )
  }

  // Every term and quoted phrase is required. Titles and comment evidence
  // share this one judgment.
  const evaluate = (text: SearchableText) => {
    const complete = terms.every(term => termMatches(term, text))

    return {
      complete,
      qualifies: complete && phraseSequences.every(sequence => containsSequence(text.stream, sequence)),
    }
  }

  const scoredCandidates: SearchScoredCandidate[] = []

  for (const candidate of candidates.values()) {
    // Search results are a discovery surface: only stories with a source URL.
    if (!candidate.url.trim()) continue
    if (rangeStart !== null && candidate.created_at_i < rangeStart) continue

    const words = titleWords.get(candidate.objectID) ?? []
    const titleText = titleTexts.get(candidate.objectID) ?? { tokens: new Set<string>(), stream: [] }

    if (excludedTerms.some(term => termMatches(term, titleText))) continue

    const titleEvaluation = evaluate(titleText)
    const semanticScore = semanticScores?.get(candidate.objectID)
    const discussionRank = candidate.ranks.get('comment')
    // With model judgments, every story must pass them; a story found only
    // through a comment was judged with that comment and stays a discussion match.
    const semanticQualifies = semanticScore !== undefined && semanticScore >= SEMANTIC_MIN_SCORE
    const commentOnly = candidate.ranks.size === 1 && discussionRank !== undefined
    const titleMatch = semanticScores
      ? semanticQualifies
        && !commentOnly
        && phraseSequences.every(sequence => containsSequence(titleText.stream, sequence))
      : titleEvaluation.qualifies
    // A discussion match must contain the query in a retrieved comment, with
    // the same rules as titles; Algolia's own comment matching is looser.
    const matchingComment = !titleMatch && discussionRank !== undefined && (!semanticScores || semanticQualifies)
      ? (tokenizedComments.get(candidate.objectID) ?? [])
        .find(({ text }) => evaluate(text).qualifies)?.comment
      : undefined

    if (!titleMatch && !matchingComment) continue

    const { complete } = titleEvaluation

    const candidateBigrams = getBigrams(words)
    const bigramMatches = Array.from(queryBigrams).filter(bigram => candidateBigrams.has(bigram)).length
    const phraseMatch = terms.length > 1 && containsSequence(titleText.stream, queryStream)
    const relevance = titleMatch && semanticScore !== undefined
      ? SEMANTIC_RELEVANCE_BASE
        + (semanticScore - SEMANTIC_MIN_SCORE) * SEMANTIC_RELEVANCE_SCALE
        + (complete ? SEMANTIC_COMPLETE_MATCH_BONUS : 0)
      : titleMatch
      ? TITLE_MATCH_RELEVANCE
        + Math.min(2, bigramMatches) * 8
        + (phraseMatch ? 15 : 0)
        + getRetrievalScore(candidate, terms.length)
      : 30 + getRankScore(discussionRank) * 20
    const age = Math.max(nowSeconds - candidate.created_at_i, 0)
    const score = relevance
      + getPopularityScore(candidate) * 2
      + Math.exp(-age / recencyScale) * 8

    scoredCandidates.push({
      candidate,
      // Exact-source identity: unlike Similar Stories' looser key, it keeps
      // ports and meaningful parameters such as `ref` or `source`.
      canonicalUrl: canonicalizeSubmissionUrl(candidate.url) || candidate.url,
      match: titleMatch ? 'title' : 'discussion',
      comment: matchingComment,
      score,
      tokens: new Set(words),
    })
  }

  // A query naming a host ("github", "github.com") asks for that host, so it is not capped.
  const getHostLimit = (host: string) => {
    const hostTokens = getHostSearchTokens(`https://${host}`)

    return uncappedHosts || termTokens.some(token => hostTokens.includes(token))
      ? MAX_SEARCH_STORIES
      : MAX_SEARCH_STORIES_PER_HOST
  }

  let discussionMatches = 0
  const rankedCandidates = scoredCandidates
    .sort((first, second) => (
      second.score - first.score
        || second.candidate.points - first.candidate.points
        || Number(second.candidate.objectID) - Number(first.candidate.objectID)
    ))
    // Discussion-only matches add context; they must not crowd out title matches.
    .filter(scored => scored.match === 'title' || ++discussionMatches <= MAX_SEARCH_DISCUSSION_MATCHES)
  // Newest orders matches by date before the result limit applies, with title
  // matches ahead of discussion-only context. A reposted source still keeps its
  // strongest, usually best-discussed, submission.
  const orderedCandidates = sort === 'newest'
    ? keepStrongestPerSource(rankedCandidates).sort((first, second) => (
      Number(first.match === 'discussion') - Number(second.match === 'discussion')
        || second.candidate.created_at_i - first.candidate.created_at_i
        || Number(second.candidate.objectID) - Number(first.candidate.objectID)
    ))
    : rankedCandidates
  const selected = selectDiverseStories(orderedCandidates, {
    limit: MAX_SEARCH_STORIES,
    getHostLimit,
    similarTitlesAcrossHosts: false,
  })

  return selected.map(({ candidate, match, comment }) => ({
    objectID: candidate.objectID,
    title: candidate.title,
    url: candidate.url,
    author: candidate.author,
    points: candidate.points,
    num_comments: candidate.num_comments,
    created_at: candidate.created_at,
    match,
    ...(comment ? { comment: { id: comment.id, snippet: comment.snippet } } : {}),
  }))
}
