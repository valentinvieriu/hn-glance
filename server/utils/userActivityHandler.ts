import type { UserActivityPage } from '#shared/types'
import { formatServerTiming } from '#shared/utils/serverTiming'

type UserActivityHandlerOptions<T> = {
  errorLogMessage: string
  errorStatusMessage: string
  fetchActivity: (
    username: string,
    options: ActivityQueryOptions,
  ) => Promise<UserActivityPage<T>>
  timingDescription: string
}

export const createUserActivityHandler = <T>(
  options: UserActivityHandlerOptions<T>,
) => defineEventHandler(async (event) => {
  const username = requireHnUsernameParam(event)
  const query = getQuery(event)

  try {
    const userActivityStartedAt = performance.now()
    const response = await options.fetchActivity(username, {
      page: normalizeActivityPage(query.page),
      hitsPerPage: normalizeActivityHitsPerPage(query.hitsPerPage),
      before: normalizeActivityBefore(query.before),
    })
    const userActivityDuration = performance.now() - userActivityStartedAt

    setHeader(event, 'Cache-Control', 'public, max-age=120, stale-while-revalidate=600')
    setHeader(event, 'Server-Timing', formatServerTiming([{
      name: 'user-activity',
      duration: userActivityDuration,
      description: options.timingDescription,
    }]))

    return response
  } catch (error) {
    console.error(options.errorLogMessage, error)
    throw createError({
      statusCode: 500,
      statusMessage: options.errorStatusMessage,
    })
  }
})
