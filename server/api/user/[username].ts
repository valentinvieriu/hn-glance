import type { HNUserProfile } from '#shared/types'
import { formatServerTiming } from '#shared/utils/serverTiming'

export default defineEventHandler(async (event) => {
  const username = requireHnUsernameParam(event)

  try {
    const hnUserStartedAt = performance.now()
    const userExists = await fetchHnUserExists(username)
    const hnUserDuration = performance.now() - hnUserStartedAt

    if (!userExists) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found',
      })
    }

    const algoliaUserStartedAt = performance.now()
    const profile = await fetchAlgoliaUser(username)
    const algoliaUserDuration = performance.now() - algoliaUserStartedAt

    if (!profile?.username) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found',
      })
    }

    const userNormalizeStartedAt = performance.now()
    const userProfile: HNUserProfile = {
      username: profile.username,
      created_at: profile.created_at || '',
      karma: profile.karma || 0,
      about: profile.about || null,
    }
    const userNormalizeDuration = performance.now() - userNormalizeStartedAt

    setHeader(event, 'Cache-Control', 'public, max-age=300, stale-while-revalidate=900')
    setHeader(event, 'Server-Timing', formatServerTiming([
      {
        name: 'hn-user',
        duration: hnUserDuration,
        description: 'HN Firebase user existence',
      },
      {
        name: 'algolia-user',
        duration: algoliaUserDuration,
        description: 'Algolia user profile',
      },
      {
        name: 'user-normalize',
        duration: userNormalizeDuration,
        description: 'HN Glance user normalization',
      },
    ]))

    return userProfile
  } catch (error) {
    throw createUpstreamError(error, {
      failureMessage: 'Failed to fetch user profile',
      logMessage: 'Error fetching user profile:',
      notFoundMessage: 'User not found',
    })
  }
})
