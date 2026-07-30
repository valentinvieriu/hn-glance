import type { SubmissionHistoryEntry } from '../../shared/types'
import type { AlgoliaStoryHit } from './algolia'

export const SUBMISSION_HISTORY_CANDIDATE_LIMIT = 16

const TRACKING_QUERY_PARAMETERS = new Set([
  'dclid',
  'fbclid',
  'gclid',
  'igshid',
  'mc_cid',
  'mc_eid',
  'msclkid',
])

export type SubmissionHistorySource = {
  url?: string | null
}

const normalizePercentEncoding = (value: string) => {
  return value.replace(/%([0-9a-f]{2})/giu, (match, hex: string) => {
    const character = String.fromCharCode(Number.parseInt(hex, 16))

    return /^[a-z0-9\-._~]$/iu.test(character)
      ? character
      : `%${hex.toUpperCase()}`
  })
}

const isTrackingParameter = (key: string) => {
  const normalizedKey = key.toLowerCase()

  return normalizedKey.startsWith('utm_')
    || TRACKING_QUERY_PARAMETERS.has(normalizedKey)
}

export const canonicalizeSubmissionUrl = (value?: string | null) => {
  if (!value) return ''

  try {
    const url = new URL(value)

    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      return ''
    }

    const hostname = url.hostname
      .toLowerCase()
      .replace(/\.$/u, '')
      .replace(/^www\./u, '')

    if (!hostname) return ''

    const queryEntries = Array.from(url.searchParams.entries())
      .filter(([key]) => !isTrackingParameter(key))
      .sort(([firstKey, firstValue], [secondKey, secondValue]) => (
        firstKey.localeCompare(secondKey) || firstValue.localeCompare(secondValue)
      ))
    const searchParams = new URLSearchParams()

    for (const [key, queryValue] of queryEntries) {
      searchParams.append(key, queryValue)
    }

    const port = url.port ? `:${url.port}` : ''
    const pathname = normalizePercentEncoding(url.pathname).replace(/\/+$/u, '')
    const search = searchParams.toString()

    return `${hostname}${port}${pathname}${search ? `?${search}` : ''}`
  } catch {
    return ''
  }
}

export const selectSubmissionHistory = (
  hits: AlgoliaStoryHit[],
  source: SubmissionHistorySource,
): SubmissionHistoryEntry[] => {
  const sourceUrl = canonicalizeSubmissionUrl(source.url)

  if (!sourceUrl) return []

  const matches = new Map<string, AlgoliaStoryHit>()

  for (const hit of hits) {
    const candidateId = hit.objectID ?? ''
    const candidateTimestamp = hit.created_at_i ?? 0

    if (
      !candidateId
      || !hit.title
      || candidateTimestamp <= 0
      || canonicalizeSubmissionUrl(hit.url) !== sourceUrl
    ) {
      continue
    }

    matches.set(candidateId, hit)
  }

  return Array.from(matches.values())
    .sort((first, second) => (
      (first.created_at_i ?? 0) - (second.created_at_i ?? 0)
      || Number(first.objectID) - Number(second.objectID)
    ))
    .slice(0, SUBMISSION_HISTORY_CANDIDATE_LIMIT)
    .map(hit => ({
      title: hit.title ?? 'Untitled',
      objectID: hit.objectID ?? '',
      created_at: hit.created_at
        ?? (hit.created_at_i ? new Date(hit.created_at_i * 1000).toISOString() : ''),
      points: hit.points ?? 0,
      num_comments: hit.num_comments ?? 0,
      author: hit.author ?? 'Unknown',
    }))
}
