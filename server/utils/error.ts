import { createError } from 'h3'

type UpstreamErrorMessages = {
  failureMessage: string
  logMessage: string
  notFoundMessage: string
}

export const getErrorStatusCode = (error: unknown): number | null => {
  if (!error || typeof error !== 'object') {
    return null
  }

  if ('statusCode' in error && typeof error.statusCode === 'number') {
    return error.statusCode
  }

  if ('response' in error && error.response && typeof error.response === 'object') {
    const response = error.response as { status?: unknown }

    if (typeof response.status === 'number') {
      return response.status
    }
  }

  return null
}

/** Pass upstream 404s through with a route-specific message; log and hide anything else. */
export const createUpstreamError = (error: unknown, messages: UpstreamErrorMessages) => {
  if (getErrorStatusCode(error) === 404) {
    return createError({
      statusCode: 404,
      statusMessage: messages.notFoundMessage,
    })
  }

  console.error(messages.logMessage, error)
  return createError({
    statusCode: 500,
    statusMessage: messages.failureMessage,
  })
}
