import type { RelatedStory, SearchMatch, SearchStory } from '#shared/types'
import type { SearchSort } from '#shared/utils/search'
import {
  mapAlgoliaStorySummary,
  type AlgoliaRankingInfo,
  type AlgoliaStoryHit,
} from './algolia'
import { canonicalizeSubmissionUrl } from './previousSubmissions'

const MAX_RELATED_STORIES = 6
const MAX_STORIES_PER_HOST = 3
const TITLE_SIMILARITY_THRESHOLD = 0.82
const RELATED_TOKEN_LIMIT = 24

export type RelatedSourceStory = Pick<AlgoliaStoryHit, 'title' | 'url' | 'created_at_i'>

type RelatedStoryCandidate = RelatedStory & {
  url: string
  created_at_i: number
}

export type RelatedSearchKind = 'title' | 'recent-title' | 'full-text' | 'comment'

export type SearchResult = {
  hits: AlgoliaStoryHit[]
  kind: RelatedSearchKind
  /** The channel failed upstream, so its empty hits are not a real "no match". */
  failed?: boolean
  /** Comments that retrieved each story, keyed by story ID, best first. */
  commentEvidence?: Record<string, CommentEvidence[]>
}

export type CommentEvidence = {
  id: string
  /** Full comment HTML, used to validate the match. */
  text: string
  /** Short plain-text excerpt around the match. */
  snippet: string
}

type CandidateEvidence = RelatedStoryCandidate & {
  ranks: Map<RelatedSearchKind, number>
  rankingInfo: Map<RelatedSearchKind, AlgoliaRankingInfo>
}

type ScoredCandidate = {
  candidate: CandidateEvidence
  canonicalUrl: string
  score: number
  tokens: Set<string>
}

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'against', 'how', 'i', 'in', 'into', 'is', 'it', 'its', 'new', 'of', 'on',
  'or', 'our', 'over', 'show', 'that', 'the', 'their', 'this', 'to',
  'using', 'was', 'we', 'what', 'when', 'where', 'which', 'why',
  'with', 'you', 'your', 'hn', 'pdf', 'video', 'write', 'writing',
  'written', 'build', 'building', 'built', 'make', 'making', 'made',
  'create', 'creating', 'created', 'intro', 'introduction', 'guide',
  'law', 'laws', 'predecessor', 'rule', 'rules', 'successor', 'versus', 'via', 'vs'
])

const SHORT_TECH_TERMS = new Set([
  'ai', 'ar', 'c#', 'c++', 'db', 'go', 'js', 'llm', 'ml',
  'os', 'ts', 'ui', 'ux', 'vm', 'vr'
])

const GENERIC_HOST_TERMS = new Set([
  'github', 'gitlab', 'medium', 'substack', 'youtube', 'youtu',
  'twitter', 'x', 'reddit', 'wikipedia', 'arxiv', 'archive',
  'google', 'docs', 'drive', 'dropbox'
])

const HOST_NOISE_TERMS = new Set([
  'www', 'm', 'mobile', 'amp', 'blog', 'blogs', 'news', 'docs',
  'developer', 'developers', 'www2', 'com', 'net', 'org', 'io',
  'dev', 'app', 'co', 'ai', 'edu', 'gov'
])

const GENERIC_COMPOUND_TERMS = new Set([
  'open-source', 'real-time', 'self-hosted', 'state-of-the-art',
])

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, ' ')

const cleanTitle = (title: string) => title
  .replace(/^\s*(ask|launch|show|tell)\s+hn:\s*/i, '')
  .replace(/\s*\[(pdf|video|audio|slides?)\]\s*$/i, '')
  .replace(/\s*\((\d{4}|pdf|video|audio|slides?)\)\s*$/i, '')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeToken = (value: string) => {
  const token = value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/^[._-]+|[._-]+$/gu, '')

  // Dotted names ("node.js", "docs.rs") are identities, not plurals.
  if (token.includes('.')) return token

  if (token.length > 4 && token.endsWith('ies')) {
    return `${token.slice(0, -3)}y`
  }

  if (token.length > 4 && token.endsWith('s') && !token.endsWith('ss')) {
    return token.slice(0, -1)
  }

  return token
}

type TokenizeOptions = {
  stopwords: ReadonlySet<string>
  /** Typed queries keep every short term, such as the languages C and R. */
  keepShortTokens: boolean
}

const RELATED_TOKENIZE: TokenizeOptions = { stopwords: STOPWORDS, keepShortTokens: false }

const isUsefulToken = (token: string, { stopwords, keepShortTokens }: TokenizeOptions) => {
  if (!token || stopwords.has(token)) return false
  if (/\d/u.test(token)) return true
  if (/[^\x00-\x7F]/u.test(token)) return true
  if (token.length >= 3 || keepShortTokens) return true
  return SHORT_TECH_TERMS.has(token)
}

const addToken = (
  tokens: string[],
  seen: Set<string>,
  value: string,
  maxTokens: number,
  options: TokenizeOptions,
) => {
  const token = normalizeToken(value)

  if (!isUsefulToken(token, options) || seen.has(token) || tokens.length >= maxTokens) return

  seen.add(token)
  tokens.push(token)
}

const tokenize = (
  value: string,
  maxTokens = RELATED_TOKEN_LIMIT,
  options: TokenizeOptions = RELATED_TOKENIZE,
): string[] => {
  const words = stripHtml(value)
    .replace(/&[#\p{L}\p{N}]+;/gu, ' ')
    .match(/[\p{L}\p{N}][\p{L}\p{N}+#._-]*/gu) ?? []
  const tokens: string[] = []
  const seen = new Set<string>()

  for (const word of words) {
    addToken(tokens, seen, word, maxTokens, options)

    const styledParts = word
      .replace(/([\p{Ll}\p{N}])([\p{Lu}])/gu, '$1 $2')
      .split(/\s+/u)
    const compoundParts = styledParts.flatMap(part => part.split(/[-_]+/u))

    for (const part of compoundParts) {
      addToken(tokens, seen, part, maxTokens, options)
    }

    for (const part of compoundParts) {
      if (part.includes('.') && !/^\d+(?:\.\d+)+$/u.test(part)) {
        for (const dotPart of part.split('.')) {
          addToken(tokens, seen, dotPart, maxTokens, options)
        }
      }

      const alphaPrefix = part.match(/^[\p{L}]{2,}(?=\d)/u)?.[0]
      if (alphaPrefix) {
        addToken(tokens, seen, alphaPrefix, maxTokens, options)
      }
    }

    if (tokens.length >= maxTokens) break
  }

  return tokens
}

export const buildTitleQuery = (title: string) => {
  const tokens = tokenize(cleanTitle(title), 10)
    .slice(0, 8)

  return tokens.length > 0 ? tokens.join(' ') : cleanTitle(title)
}

const normalizeHost = (url?: string | null) => {
  if (!url) return ''

  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return ''
  }
}

const getHostTerms = (value?: string | null) => {
  if (!value) return []

  try {
    return new URL(value).hostname
      .toLowerCase()
      .replace(/^www\./, '')
      .split('.')
      .map(normalizeToken)
      .filter(term => term && !HOST_NOISE_TERMS.has(term) && !GENERIC_HOST_TERMS.has(term))
      .slice(0, 2)
  } catch {
    return []
  }
}

const canonicalizeUrl = (value?: string | null) => {
  if (!value) return ''

  try {
    const url = new URL(value)
    url.hash = ''

    for (const key of Array.from(url.searchParams.keys())) {
      if (key.startsWith('utm_') || ['fbclid', 'gclid', 'ref', 'source'].includes(key)) {
        url.searchParams.delete(key)
      }
    }

    url.searchParams.sort()

    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    const pathname = url.pathname.replace(/\/+$/, '')
    const search = url.searchParams.toString()

    return `${host}${pathname}${search ? `?${search}` : ''}`
  } catch {
    return value
  }
}

const getAnchorTokens = (sourceTitle: string, sourceUrl?: string | null) => {
  const titleTokens = new Set(tokenize(sourceTitle))
  const anchors = new Set(
    getHostTerms(sourceUrl).filter(term => titleTokens.has(term)),
  )

  for (const token of titleTokens) {
    if (
      (/\d/u.test(token) && /\p{L}/u.test(token))
      || /[+#]/u.test(token)
      || (/[-_]/u.test(token) && !GENERIC_COMPOUND_TERMS.has(token))
    ) {
      anchors.add(token)
    }
  }

  return anchors
}

const getBigrams = (tokens: string[]) => {
  const bigrams = new Set<string>()

  for (let index = 0; index < tokens.length - 1; index += 1) {
    bigrams.add(`${tokens[index]}\u0000${tokens[index + 1]}`)
  }

  return bigrams
}

const getPopularityScore = (hit: AlgoliaStoryHit) => {
  const points = Math.max(hit.points ?? 0, 0)
  const comments = Math.max(hit.num_comments ?? 0, 0)

  return Math.min(5, Math.log10(points + 1) * 2)
    + Math.min(3, Math.log10(comments + 1) * 1.5)
}

const getRecencyScore = (candidateTimestamp: number, sourceTimestamp: number) => {
  if (!candidateTimestamp || !sourceTimestamp) return 0

  const fiveYearsInSeconds = 5 * 365.25 * 24 * 60 * 60
  const distance = Math.abs(candidateTimestamp - sourceTimestamp)

  return Math.exp(-distance / fiveYearsInSeconds) * 6
}

const getRankScore = (rank?: number) => {
  if (rank === undefined) return 0
  return 21 / (21 + rank)
}

const getRetrievalScore = (candidate: CandidateEvidence, queryTokenCount: number) => {
  const titleRank = Math.max(
    getRankScore(candidate.ranks.get('title')),
    getRankScore(candidate.ranks.get('recent-title')),
  )
  const titleRankingInfo = [
    candidate.rankingInfo.get('title'),
    candidate.rankingInfo.get('recent-title'),
  ].filter((info): info is AlgoliaRankingInfo => Boolean(info))
  const exactCoverage = titleRankingInfo.reduce((best, info) => (
    Math.max(best, Math.min(1, Math.max(info.nbExactWords ?? 0, 0) / Math.max(queryTokenCount, 1)))
  ), 0)
  const typoPenalty = titleRankingInfo.reduce((best, info) => (
    Math.min(best, Math.max(info.nbTypos ?? 0, 0))
  ), Number.POSITIVE_INFINITY)
  const exactScore = exactCoverage * 10 / (1 + (Number.isFinite(typoPenalty) ? typoPenalty : 0))

  return titleRank * 12
    + getRankScore(candidate.ranks.get('full-text')) * 4
    + getRankScore(candidate.ranks.get('comment')) * 3
    + exactScore
}

const getTokenSimilarity = (
  sourceTokens: string[],
  candidateTokens: Set<string>,
  tokenWeights: Map<string, number>,
) => {
  const matchedTokens = sourceTokens.filter(token => candidateTokens.has(token))
  const sourceWeight = sourceTokens.reduce((total, token) => total + (tokenWeights.get(token) ?? 1), 0)
  const matchedWeight = matchedTokens.reduce((total, token) => total + (tokenWeights.get(token) ?? 1), 0)
  const sourceCoverage = sourceWeight > 0 ? matchedWeight / sourceWeight : 0
  const candidatePrecision = matchedTokens.length / Math.max(
    1,
    Math.min(candidateTokens.size, sourceTokens.length),
  )

  return {
    matchedTokens,
    similarity: sourceCoverage * 0.75 + candidatePrecision * 0.25,
  }
}

const getSetSimilarity = (first: Set<string>, second: Set<string>) => {
  if (first.size === 0 || second.size === 0) return 0

  let intersection = 0
  for (const token of first) {
    if (second.has(token)) intersection += 1
  }

  return intersection / (first.size + second.size - intersection)
}

const toRelatedStory = (hit: AlgoliaStoryHit): RelatedStoryCandidate | null => {
  if (!hit.objectID || !hit.title) return null

  return {
    ...mapAlgoliaStorySummary(hit),
    created_at_i: hit.created_at_i ?? 0,
    url: hit.url ?? '',
  }
}

type DiversityOptions = {
  limit: number
  getHostLimit: (host: string) => number
  /**
   * Similar Stories collapses near-identical titles from any host. Search
   * collapses them only within one host, because different sources with the
   * same title can be very different pages.
   */
  similarTitlesAcrossHosts: boolean
}

const RELATED_DIVERSITY: DiversityOptions = {
  limit: MAX_RELATED_STORIES,
  getHostLimit: () => MAX_STORIES_PER_HOST,
  similarTitlesAcrossHosts: true,
}

const selectDiverseStories = <T extends ScoredCandidate>(
  scoredCandidates: T[],
  { limit, getHostLimit, similarTitlesAcrossHosts }: DiversityOptions = RELATED_DIVERSITY,
) => {
  const selected: T[] = []
  const seenUrls = new Set<string>()
  const hostCounts = new Map<string, number>()

  for (const scored of scoredCandidates) {
    const host = normalizeHost(scored.candidate.url)

    if (scored.canonicalUrl && seenUrls.has(scored.canonicalUrl)) continue
    if (host && (hostCounts.get(host) ?? 0) >= getHostLimit(host)) continue
    if (selected.some(existing => (
      (similarTitlesAcrossHosts || normalizeHost(existing.candidate.url) === host)
      && getSetSimilarity(scored.tokens, existing.tokens) >= TITLE_SIMILARITY_THRESHOLD
    ))) continue

    selected.push(scored)

    if (scored.canonicalUrl) seenUrls.add(scored.canonicalUrl)
    if (host) hostCounts.set(host, (hostCounts.get(host) ?? 0) + 1)
    if (selected.length === limit) break
  }

  return selected
}

/** Merges the retrieval channels into one candidate per story, keeping each channel's best rank. */
const collectCandidates = (results: SearchResult[], excludeId?: string) => {
  const candidates = new Map<string, CandidateEvidence>()

  for (const result of results) {
    result.hits.forEach((hit, index) => {
      const story = toRelatedStory(hit)

      if (!story || story.objectID === excludeId) return

      const existing = candidates.get(story.objectID)

      if (existing) {
        existing.ranks.set(result.kind, Math.min(existing.ranks.get(result.kind) ?? index, index))
        if (hit._rankingInfo) existing.rankingInfo.set(result.kind, hit._rankingInfo)
      } else {
        candidates.set(story.objectID, {
          ...story,
          ranks: new Map([[result.kind, index]]),
          rankingInfo: hit._rankingInfo
            ? new Map([[result.kind, hit._rankingInfo]])
            : new Map(),
        })
      }
    })
  }

  return candidates
}

export const rankRelatedStories = (
  results: SearchResult[],
  source: RelatedSourceStory,
  excludeId: string,
) => {
  const sourceTitle = cleanTitle(source.title ?? '')
  const sourceTokens = tokenize(sourceTitle)
  const sourceBigrams = getBigrams(sourceTokens)
  const sourceAnchors = getAnchorTokens(sourceTitle, source.url)
  const sourceHost = normalizeHost(source.url)
  const exactSourceUrl = canonicalizeSubmissionUrl(source.url)
  const candidates = collectCandidates(results, excludeId)

  if (sourceTokens.length === 0) return []

  const candidateTokens = new Map<string, Set<string>>()
  const documentFrequency = new Map<string, number>()

  for (const candidate of candidates.values()) {
    const tokens = new Set(tokenize(cleanTitle(candidate.title)))
    candidateTokens.set(candidate.objectID, tokens)

    for (const sourceToken of sourceTokens) {
      if (tokens.has(sourceToken)) {
        documentFrequency.set(sourceToken, (documentFrequency.get(sourceToken) ?? 0) + 1)
      }
    }
  }

  const tokenWeights = new Map(sourceTokens.map(token => [
    token,
    1 + Math.log((candidates.size + 1) / ((documentFrequency.get(token) ?? 0) + 1)),
  ]))
  const queryTokenCount = buildTitleQuery(sourceTitle).split(' ').filter(Boolean).length
  const scoredCandidates: ScoredCandidate[] = []

  for (const candidate of candidates.values()) {
    const tokens = candidateTokens.get(candidate.objectID) ?? new Set<string>()
    const { matchedTokens, similarity } = getTokenSimilarity(sourceTokens, tokens, tokenWeights)
    const candidateBigrams = getBigrams(Array.from(tokens))
    const bigramMatches = Array.from(sourceBigrams).filter(bigram => candidateBigrams.has(bigram)).length
    const anchorMatch = matchedTokens.some(token => sourceAnchors.has(token))
    const sameHost = Boolean(sourceHost && normalizeHost(candidate.url) === sourceHost)
    const isExactSourceUrl = Boolean(
      exactSourceUrl
      && canonicalizeSubmissionUrl(candidate.url) === exactSourceUrl,
    )
    const strongTitleMatch = matchedTokens.length >= 2
      && (similarity >= 0.28 || bigramMatches > 0)
      && (
        sourceAnchors.size === 0
        || anchorMatch
        || (matchedTokens.length >= 3 && similarity >= 0.4)
      )
    const anchoredRelation = anchorMatch && (sameHost || matchedTokens.length >= 2)

    // Exact prior submissions belong to the submission history, not suggestions.
    if (isExactSourceUrl || !(strongTitleMatch || anchoredRelation)) continue

    const score = similarity * 100
      + Math.min(2, bigramMatches) * 8
      + (anchorMatch ? 12 : 0)
      + (sameHost ? 4 : 0)
      + getRetrievalScore(candidate, queryTokenCount)
      + getPopularityScore(candidate)
      + getRecencyScore(candidate.created_at_i, source.created_at_i ?? 0)

    scoredCandidates.push({
      candidate,
      canonicalUrl: canonicalizeUrl(candidate.url),
      score,
      tokens,
    })
  }

  const selectedStories = selectDiverseStories(scoredCandidates.sort((first, second) => (
    second.score - first.score
      || second.candidate.points - first.candidate.points
      || second.candidate.created_at_i - first.candidate.created_at_i
      || Number(second.candidate.objectID) - Number(first.candidate.objectID)
  )))

  return selectedStories
    .sort((first, second) => (
      second.candidate.created_at_i - first.candidate.created_at_i
      || second.score - first.score
      || Number(second.candidate.objectID) - Number(first.candidate.objectID)
    ))
    .map(({ candidate }) => candidate)
    .map(({ created_at_i: _createdAt, ranks: _ranks, rankingInfo: _rankingInfo, ...story }) => story)
}

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
   * The fallback pass for multi-word queries with too few complete matches:
   * stories missing one term qualify, always ranked below complete matches.
   */
  allowPartial?: boolean
  /**
   * Retrieval already applied the whole query as filters (such as `by:pg`),
   * so every candidate qualifies without text terms.
   */
  filterOnly?: boolean
  /** An author filter asks for one person's sources, so hosts are not capped. */
  uncappedHosts?: boolean
  /**
   * Upstream hit counts per term. Rarity across HN weights terms better than
   * the candidate pool, which retrieval skews toward the query's own terms.
   */
  termFrequencies?: Record<string, number>
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

const getSearchTerms = (value: string): SearchTerm[] => {
  const words = stripHtml(lowercase(value)).replace(/&[#\p{L}\p{N}]+;/gu, ' ').match(SEARCH_WORD_PATTERN) ?? []
  const terms: SearchTerm[] = []
  const seen = new Set<string>()

  for (const word of words) {
    const [token, ...parts] = tokenize(word, SEARCH_WORD_LIMIT, SEARCH_TOKENIZE)

    if (!token || seen.has(token)) continue

    seen.add(token)
    // A domain is one identity; "github.com" must not match "github" plus "com".
    terms.push({ token, parts: DOMAIN_TOKEN_PATTERN.test(token) ? [] : parts })

    if (terms.length === SEARCH_WORD_LIMIT) break
  }

  return terms
}

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
 * A split word ("local-first") also matches through its parts. Given a title's
 * token stream, the parts must be adjacent ("local first"), so "small local
 * models first" does not match.
 */
const termMatches = (term: SearchTerm, candidateTokens: Set<string>, stream?: string[]) => {
  if (tokenMatches(term.token, candidateTokens)) return true
  if (term.parts.length === 0) return false

  return stream
    ? containsSequence(stream, term.parts)
    : term.parts.every(part => tokenMatches(part, candidateTokens))
}

// A partial match may miss only a light term: with "kubernetes alternatives
// for small teams", missing "small" is acceptable, missing "kubernetes" is not.
const PARTIAL_MIN_COVERAGE = 0.65
const COMPLETE_MATCH_BONUS = 40

/** Relative rarity: the most common query term weighs 1, rarer terms more. */
const getUpstreamTermWeights = (terms: SearchTerm[], frequencies: number[]) => {
  const mostCommon = Math.max(...frequencies)

  return new Map(terms.map((term, index) => [
    term.token,
    1 + Math.log((mostCommon + 1) / ((frequencies[index] ?? 0) + 1)),
  ]))
}

/** The term tokens ranking requires for a query, for per-term upstream lookups. */
export const getSearchTermTokens = (query: string) => getSearchTerms(query).map(term => term.token)

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
  tokens: Set<string>
}

const getTokenizedComments = (results: SearchResult[]) => {
  const tokenizedComments = new Map<string, TokenizedComment[]>()

  for (const result of results) {
    for (const [storyId, comments] of Object.entries(result.commentEvidence ?? {})) {
      const entries = tokenizedComments.get(storyId) ?? []

      for (const comment of comments) {
        entries.push({
          comment,
          tokens: new Set(tokenizeSearchText(
            comment.text.slice(0, SEARCH_COMMENT_TEXT_LIMIT),
            SEARCH_COMMENT_TOKEN_LIMIT,
          )),
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
    allowPartial = false,
    filterOnly = false,
    uncappedHosts = false,
    termFrequencies,
  }: SearchRankingOptions,
): SearchStory[] => {
  const terms = getSearchTerms(query)

  if (terms.length === 0 && !filterOnly) return []

  const phraseSequences = phrases
    .map(phrase => getSearchTerms(phrase).map(term => term.token))
    .filter(sequence => sequence.length > 1)
  const excludedTerms = excluded.flatMap(word => getSearchTerms(word))
  const termTokens = terms.map(term => term.token)
  const queryPhrase = termTokens.join(' ')
  const queryBigrams = getBigrams(termTokens)
  const queryAnchors = getAnchorTokens(query)
  const anchorTerms = terms.filter(term => queryAnchors.has(term.token))
  const recencyScale = rangeStart === null
    ? FIVE_YEARS_IN_SECONDS
    : Math.max(nowSeconds - rangeStart, 1)
  const candidates = collectCandidates(results)
  const tokenizedComments = getTokenizedComments(results)
  const titleWords = new Map<string, string[]>()
  const titleStreams = new Map<string, string[]>()
  const matchTokens = new Map<string, Set<string>>()
  const documentFrequency = new Map<string, number>()

  for (const candidate of candidates.values()) {
    const stream = tokenizeSearchText(candidate.title, SEARCH_TITLE_TOKEN_LIMIT)
    const searchable = new Set([...stream, ...getHostSearchTokens(candidate.url)])
    titleWords.set(candidate.objectID, getSearchTerms(candidate.title).map(term => term.token))
    titleStreams.set(candidate.objectID, stream)
    matchTokens.set(candidate.objectID, searchable)

    for (const term of terms) {
      if (termMatches(term, searchable, stream)) {
        documentFrequency.set(term.token, (documentFrequency.get(term.token) ?? 0) + 1)
      }
    }
  }

  const upstreamFrequencies = terms.map(term => termFrequencies?.[term.token])
  const termWeights = upstreamFrequencies.every(frequency => frequency !== undefined)
    ? getUpstreamTermWeights(terms, upstreamFrequencies as number[])
    : new Map(terms.map(term => [
      term.token,
      1 + Math.log((candidates.size + 1) / ((documentFrequency.get(term.token) ?? 0) + 1)),
    ]))
  const totalWeight = terms.reduce((total, term) => total + (termWeights.get(term.token) ?? 1), 0)
  // The rarest term is the query's topic ("kubernetes" in "kubernetes
  // alternatives for small teams"); a partial match may never drop it.
  const rarestTerm = terms.reduce<SearchTerm | undefined>((rarest, term) => (
    !rarest || (termWeights.get(term.token) ?? 0) > (termWeights.get(rarest.token) ?? 0) ? term : rarest
  ), undefined)

  // Every term is required by default. The partial pass admits a story missing
  // one light term, never the rarest one.
  const evaluate = (searchable: Set<string>, stream?: string[]) => {
    if (terms.length === 0) return { coverage: 1, complete: true, qualifies: true }

    const matchedTerms = terms.filter(term => termMatches(term, searchable, stream))
    const matchedWeight = matchedTerms.reduce((total, term) => total + (termWeights.get(term.token) ?? 1), 0)
    const coverage = totalWeight > 0 ? matchedWeight / totalWeight : 0
    const complete = matchedTerms.length === terms.length
    const partial = allowPartial
      && terms.length >= 2
      && matchedTerms.length >= terms.length - 1
      && rarestTerm !== undefined
      && matchedTerms.includes(rarestTerm)
      && coverage >= PARTIAL_MIN_COVERAGE
    const qualifies = anchorTerms.every(term => matchedTerms.includes(term)) && (complete || partial)

    return { coverage, complete, qualifies }
  }

  const scoredCandidates: SearchScoredCandidate[] = []

  for (const candidate of candidates.values()) {
    // Search results are a discovery surface: only stories with a source URL.
    if (!candidate.url.trim()) continue
    if (rangeStart !== null && candidate.created_at_i < rangeStart) continue

    const words = titleWords.get(candidate.objectID) ?? []
    const searchable = matchTokens.get(candidate.objectID) ?? new Set<string>()

    if (excludedTerms.some(term => termMatches(term, searchable))) continue

    const titleEvaluation = evaluate(searchable, titleStreams.get(candidate.objectID))
    const titleMatch = titleEvaluation.qualifies
      && phraseSequences.every(sequence => containsSequence(words, sequence))
    const discussionRank = candidate.ranks.get('comment')
    // A discussion match must contain the query in a retrieved comment, with
    // the same rules as titles; Algolia's own comment matching is looser.
    const matchingComment = !titleMatch && discussionRank !== undefined
      ? (tokenizedComments.get(candidate.objectID) ?? [])
        .find(({ tokens }) => evaluate(tokens).qualifies)?.comment
      : undefined

    if (!titleMatch && !matchingComment) continue

    const { coverage, complete } = titleEvaluation

    const candidateBigrams = getBigrams(words)
    const bigramMatches = Array.from(queryBigrams).filter(bigram => candidateBigrams.has(bigram)).length
    const phraseMatch = terms.length > 1 && words.join(' ').includes(queryPhrase)
    const relevance = titleMatch
      ? coverage * 100
        + (complete ? COMPLETE_MATCH_BONUS : 0)
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
