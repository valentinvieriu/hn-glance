import { afterEach, describe, expect, it, vi } from 'vitest'
import { createUpstreamError, getErrorStatusCode } from './error'

const messages = {
  failureMessage: 'Failed to fetch story',
  logMessage: 'Error fetching story:',
  notFoundMessage: 'Story not found',
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('error status extraction', () => {
  it('supports H3 and fetch-style errors', () => {
    expect(getErrorStatusCode({ statusCode: 404 })).toBe(404)
    expect(getErrorStatusCode({ response: { status: 429 } })).toBe(429)
    expect(getErrorStatusCode(new Error('unknown'))).toBeNull()
  })
})

describe('upstream error mapping', () => {
  it('passes not-found responses through with the route message', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = createUpstreamError({ response: { status: 404 } }, messages)

    expect(error).toMatchObject({ statusCode: 404, statusMessage: 'Story not found' })
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('logs and hides every other failure', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const cause = new Error('Algolia unavailable')
    const error = createUpstreamError(cause, messages)

    expect(error).toMatchObject({ statusCode: 500, statusMessage: 'Failed to fetch story' })
    expect(consoleError).toHaveBeenCalledWith('Error fetching story:', cause)
  })
})
