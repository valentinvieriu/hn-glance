import { formatServerTiming } from '#shared/utils/serverTiming'

export default defineEventHandler(async (event) => {
  const id = requireHnItemIdParam(event)

  try {
    const algoliaStartedAt = performance.now()
    const hnResponse = await fetchAlgoliaItem<AlgoliaItemResponse>(id)
    const algoliaDuration = performance.now() - algoliaStartedAt

    if (!hnResponse?.id) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Story not found',
      })
    }

    const normalizeStartedAt = performance.now()
    const story = normalizeStoryDetail(hnResponse)
    const normalizeDuration = performance.now() - normalizeStartedAt

    setHeader(event, 'Cache-Control', 'public, max-age=120, stale-while-revalidate=600')
    setHeader(event, 'Server-Timing', formatServerTiming([
      {
        name: 'algolia',
        duration: algoliaDuration,
        description: 'Algolia item fetch',
      },
      {
        name: 'normalize',
        duration: normalizeDuration,
        description: 'HN Glance story normalization',
      },
    ]))

    return story
  } catch (error) {
    throw createUpstreamError(error, {
      failureMessage: 'Failed to fetch story',
      logMessage: 'Error fetching story:',
      notFoundMessage: 'Story not found',
    })
  }
})
