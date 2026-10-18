import type { SearchStory } from '#shared/types'
import {
  getSearchRangeStart,
  getSearchSourceUrl,
  parseSearchQuery,
  type SearchRange,
  type SearchSort,
} from '#shared/utils/search'
import { canonicalizeSubmissionUrl, selectSubmissionHistory } from './previousSubmissions'
import { planSearchQuery, type SearchPlan } from './queryPlanner'
import { collectCandidates, type CandidateEvidence } from './relatedStories'
import { rankSearchStories, type SearchRankingOptions } from './searchRanking'
import { getSemanticScores, type SemanticAi } from './semanticRanking'
import {
  fetchCommentLinkedStories,
  fetchStoryHits,
  fetchSubmissionHistoryHits,
} from './storyRetrieval'

export type SearchOutcome = {
  stories: SearchStory[]
  /**
   * Some upstream channels, or the semantic pass, failed: the results are
   * usable but incomplete.
   */
  partial: boolean
  /**
   * The semantic pass: applied in full, screened only (its refinement stage
   * failed), or failed; and the relevance model's time.
   */
  semantic?: { status: 'applied' | 'screened' | 'failed', durationMs: number }
  /** The semantic pass's query plan: whether one was used, and its time. */
  plan?: { status: 'applied' | 'failed', durationMs: number }
}

/** Upstream failures that leave nothing trustworthy to show. */
export class SearchUnavailableError extends Error {}

// Algolia completes every word as a prefix, so "c" retrieves "Customers"
// before any C-language title. Short terms are searched as exact words.
// Ranking rejects typo matches, so retrieval never spends slots on them.
const hasShortTerm = (query: string) => query.split(' ').some(word => /^[\p{L}\p{N}]{1,2}$/u.test(word))

// A multi-word query with fewer complete title matches takes the semantic pass.
const MIN_COMPLETE_TITLE_MATCHES = 8
// Comment hits on popular topics cluster on a few stories; below this many
// distinct stories, the comment channel reads one more page.
const MIN_COMMENT_LINKED_STORIES = 8
// A pasted link lists its own submissions, not the story page's compact
// history, so it reads a wider candidate page.
const SOURCE_SEARCH_CANDIDATE_LIMIT = 100

const searchText = async (
  query: string,
  rangeStart: number | null,
  sort: SearchSort,
  ai: SemanticAi | undefined,
): Promise<SearchOutcome> => {
  const parsed = parseSearchQuery(query)
  const filterOnly = !parsed.terms

  // Exclusions alone ("-game") describe nothing to find.
  if (filterOnly && !parsed.author && !parsed.showHn) {
    return { stories: [], partial: false }
  }

  const storyTags = [
    'story',
    ...(parsed.showHn ? ['show_hn'] : []),
    ...(parsed.author ? [`author_${parsed.author}`] : []),
  ].join(',')
  const rangeParams: Record<string, string> = rangeStart === null
    ? {}
    : { numericFilters: `created_at_i>${rangeStart}` }
  const matchParams: Record<string, string> = {
    typoTolerance: 'false',
    ...(hasShortTerm(parsed.terms) ? { queryType: 'prefixNone' } : {}),
    ...(parsed.phrases.length > 0 || parsed.excluded.length > 0 ? { advancedSyntax: 'true' } : {}),
  }
  const titleParams = {
    query: parsed.upstreamQuery,
    tags: storyTags,
    restrictSearchableAttributes: 'title',
    ...matchParams,
    ...rangeParams,
  }
  const rankingOptions: SearchRankingOptions = {
    sort,
    rangeStart,
    nowSeconds: Math.floor(Date.now() / 1000),
    phrases: parsed.phrases,
    excluded: parsed.excluded,
    filterOnly,
    uncappedHosts: Boolean(parsed.author),
  }

  // The semantic pass judges loose matches with Workers AI models instead of
  // requiring every term. Its query plan and broad retrieval start alongside
  // the strict channels, so the pass adds little latency when it is needed;
  // they are discarded when strict matching finds enough titles.
  const multiWord = !filterOnly && parsed.terms.includes(' ')
  const broadRetrieval = multiWord
    ? Promise.all([
      fetchStoryHits({ ...titleParams, optionalWords: parsed.terms, hitsPerPage: '40' }, 'title'),
      fetchStoryHits({
        query: parsed.upstreamQuery,
        tags: storyTags,
        optionalWords: parsed.terms,
        hitsPerPage: '30',
        ...matchParams,
        ...rangeParams,
      }, 'full-text'),
    ])
    : null

  // Anchors are quoted so they match exactly while context words may be
  // missing; alternatives are short names, so they never complete as prefixes.
  const fetchPlannedStories = (plan: SearchPlan) => {
    const planParams: Record<string, string> = {
      query: [...plan.anchors.map(anchor => `"${anchor}"`), ...plan.context].join(' '),
      tags: storyTags,
      typoTolerance: 'false',
      advancedSyntax: 'true',
      ...(plan.context.length > 0 ? { optionalWords: plan.context.join(' ') } : {}),
      ...rangeParams,
    }

    return Promise.all([
      ...(plan.anchors.length > 0
        ? [
          fetchStoryHits({ ...planParams, restrictSearchableAttributes: 'title', hitsPerPage: '30' }, 'title'),
          fetchStoryHits({ ...planParams, hitsPerPage: '20' }, 'full-text'),
        ]
        : []),
      ...plan.alternatives.map(alternative => fetchStoryHits({
        query: alternative,
        tags: storyTags,
        restrictSearchableAttributes: 'title',
        typoTolerance: 'false',
        queryType: 'prefixNone',
        hitsPerPage: '15',
        ...rangeParams,
      }, 'title')),
    ])
  }
  const planStartedAt = performance.now()
  const plannedRetrieval = multiWord && ai
    ? planSearchQuery(ai, parsed.terms).then(async (plan) => {
      const durationMs = performance.now() - planStartedAt
      return { plan, durationMs, results: plan ? await fetchPlannedStories(plan) : [] }
    })
    : null

  const results = await Promise.all([
    fetchStoryHits({ ...titleParams, hitsPerPage: '40' }, 'title'),
    fetchStoryHits({ ...titleParams, hitsPerPage: '30' }, 'recent-title', 'date'),
    fetchStoryHits({
      query: parsed.upstreamQuery,
      tags: storyTags,
      hitsPerPage: '30',
      ...matchParams,
      ...rangeParams,
    }, 'full-text'),
    ...(filterOnly ? [] : [fetchCommentLinkedStories(parsed.upstreamQuery, {
      ...rangeParams,
      matchParams,
      storyTags,
      minStories: MIN_COMMENT_LINKED_STORIES,
    })]),
  ])

  if (results.every(result => result.failed)) {
    throw new SearchUnavailableError('Every search channel failed')
  }

  let stories = rankSearchStories(results, parsed.terms, rankingOptions)
  const titleMatchCount = stories.filter(story => story.match === 'title').length
  let semanticOutcome: SearchOutcome['semantic']
  let planOutcome: SearchOutcome['plan']

  if (broadRetrieval && titleMatchCount < MIN_COMPLETE_TITLE_MATCHES) {
    const [broadResults, planned] = await Promise.all([broadRetrieval, plannedRetrieval])

    results.push(...broadResults)

    if (planned) {
      // Planned searches only widen the pool, so their failures do not make results partial.
      results.push(...planned.results.filter(result => !result.failed))
      planOutcome = { status: planned.plan ? 'applied' : 'failed', durationMs: planned.durationMs }
    }

    // The model judges a bounded pool, best-retrieved first in any channel.
    // Stories found only through a comment are judged with that comment.
    const bestRank = (candidate: CandidateEvidence) => Math.min(...candidate.ranks.values())
    const commentSnippets = new Map(results.flatMap(result => Object.entries(result.commentEvidence ?? {}))
      .map(([storyId, comments]) => [storyId, comments[0]?.snippet] as const))
    const candidates = [...collectCandidates(results).values()]
      .filter(candidate => candidate.url.trim()
        && (rangeStart === null || candidate.created_at_i >= rangeStart))
      .sort((first, second) => bestRank(first) - bestRank(second))
      .map(candidate => ({
        ...candidate,
        commentSnippet: candidate.ranks.size === 1 && candidate.ranks.has('comment')
          ? commentSnippets.get(candidate.objectID)
          : undefined,
      }))
    const modelStartedAt = performance.now()
    const semanticResult = ai ? await getSemanticScores(ai, parsed.terms, candidates) : null

    semanticOutcome = {
      status: !semanticResult ? 'failed' : semanticResult.refined ? 'applied' : 'screened',
      durationMs: performance.now() - modelStartedAt,
    }
    // Without model judgments, the wider pool still yields its complete matches.
    stories = rankSearchStories(results, parsed.terms, {
      ...rankingOptions,
      semanticScores: semanticResult?.scores,
    })
  }

  // A failed channel or semantic pass leaves results incomplete.
  const partial = semanticOutcome?.status === 'failed' || results.some(result => result.failed)

  // With a channel down, "nothing matched" cannot be distinguished from the outage.
  if (partial && stories.length === 0) {
    throw new SearchUnavailableError('Search channels failed without results')
  }

  return {
    stories,
    partial,
    ...(semanticOutcome ? { semantic: semanticOutcome } : {}),
    ...(planOutcome ? { plan: planOutcome } : {}),
  }
}

// A pasted link lists the HN submissions of that source across all time.
// Relevance puts the largest discussion first: that is where the value is.
const searchSourceUrl = async (sourceUrl: string, sort: SearchSort): Promise<SearchOutcome> => {
  const canonicalUrl = canonicalizeSubmissionUrl(sourceUrl)

  if (!canonicalUrl) return { stories: [], partial: false }

  const { hits, failed } = await fetchSubmissionHistoryHits(canonicalUrl, SOURCE_SEARCH_CANDIDATE_LIMIT)

  if (failed) {
    throw new SearchUnavailableError('Submission history lookup failed')
  }

  // History summaries omit the source URL; cards link each submission's own URL.
  const hitUrls = new Map(hits.map(hit => [hit.objectID, hit.url?.trim() ?? '']))
  const stories = selectSubmissionHistory(hits, { url: sourceUrl }, SOURCE_SEARCH_CANDIDATE_LIMIT)
    .map(story => ({
      ...story,
      url: hitUrls.get(story.objectID) ?? '',
      match: 'title' as const,
    }))
    .filter(story => story.url)

  return {
    stories: sort === 'newest'
      ? stories.reverse()
      : stories.sort((first, second) => (
        second.num_comments - first.num_comments
          || second.points - first.points
      )),
    partial: false,
  }
}

/**
 * Runs a normalized, non-empty query; throws `SearchUnavailableError` on
 * outages. Without the Workers AI binding the semantic pass reports failure.
 */
export const searchStories = (
  query: string,
  range: SearchRange,
  sort: SearchSort,
  ai?: SemanticAi,
): Promise<SearchOutcome> => {
  const sourceUrl = getSearchSourceUrl(query)

  return sourceUrl
    ? searchSourceUrl(sourceUrl, sort)
    : searchText(query, getSearchRangeStart(range), sort, ai)
}
