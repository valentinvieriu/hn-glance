import type { RelatedStory } from '#shared/types'

const ALGOLIA_API_URL = 'https://hn.algolia.com/api/v1'

const ALGOLIA_SEARCH_ENDPOINTS = {
  date: `${ALGOLIA_API_URL}/search_by_date`,
  relevance: `${ALGOLIA_API_URL}/search`,
} as const

export type AlgoliaSearchOrder = keyof typeof ALGOLIA_SEARCH_ENDPOINTS

export type AlgoliaRankingInfo = {
  nbExactWords?: number | null
  nbTypos?: number | null
  proximityDistance?: number | null
  words?: number | null
}

export type AlgoliaStoryHit = {
  _rankingInfo?: AlgoliaRankingInfo | null
  author?: string | null
  created_at?: string | null
  created_at_i?: number | null
  num_comments?: number | null
  objectID?: string
  points?: number | null
  title?: string | null
  url?: string | null
}

export type AlgoliaCommentHit = {
  _snippetResult?: {
    comment_text?: { value?: string | null } | null
  } | null
  comment_text?: string | null
  created_at?: string | null
  created_at_i?: number | null
  objectID?: string
  points?: number | null
  story_id?: number | string | null
  story_title?: string | null
  story_url?: string | null
}

export type AlgoliaUserProfile = {
  username?: string | null
  created_at?: string | null
  karma?: number | null
  about?: string | null
}

type AlgoliaSearchResponse<THit> = {
  hits?: THit[]
  hitsPerPage?: number
  nbHits?: number
  nbPages?: number
  page?: number
}

export type AlgoliaRequestOptions = {
  /** Aborts the request, including retries, such as a channel time budget. */
  signal?: AbortSignal
}

export const searchAlgolia = <THit>(
  params: Record<string, string> | URLSearchParams,
  order: AlgoliaSearchOrder = 'relevance',
  { signal }: AlgoliaRequestOptions = {},
) => {
  const searchParams = params instanceof URLSearchParams
    ? params
    : new URLSearchParams(params)

  return $fetch<AlgoliaSearchResponse<THit>>(
    `${ALGOLIA_SEARCH_ENDPOINTS[order]}?${searchParams}`,
    signal ? { signal } : undefined,
  )
}

export const searchAlgoliaHits = async <THit>(
  params: Record<string, string> | URLSearchParams,
  order: AlgoliaSearchOrder = 'relevance',
  options: AlgoliaRequestOptions = {},
) => {
  const response = await searchAlgolia<THit>(params, order, options)

  return response.hits ?? []
}

export const fetchAlgoliaItem = <TItem>(itemId: string) => {
  return $fetch<TItem>(`${ALGOLIA_API_URL}/items/${encodeURIComponent(itemId)}`)
}

export const fetchAlgoliaUser = (username: string) => {
  return $fetch<AlgoliaUserProfile>(`${ALGOLIA_API_URL}/users/${encodeURIComponent(username)}`)
}

export const mapAlgoliaStorySummary = (hit: AlgoliaStoryHit): RelatedStory => ({
  title: hit.title ?? 'Untitled',
  objectID: hit.objectID ?? '',
  created_at: hit.created_at
    ?? (hit.created_at_i ? new Date(hit.created_at_i * 1000).toISOString() : ''),
  points: hit.points ?? 0,
  num_comments: hit.num_comments ?? 0,
  author: hit.author ?? 'Unknown',
})
