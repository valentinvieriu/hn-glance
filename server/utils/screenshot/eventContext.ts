import type { H3Event } from 'h3'

export const getScreenshotEnv = (event: H3Event) => {
  return event.context.cloudflare?.env as ScreenshotEnv | undefined
}

export const useScreenshotRuntimeConfig = (
  event: H3Event,
  env: ScreenshotEnv | undefined,
) => {
  return resolveScreenshotRuntimeConfig(
    useRuntimeConfig(event) as ScreenshotRuntimeConfig,
    env,
  )
}

export const requireScreenshotStorage = (env: ScreenshotEnv | undefined) => {
  if (!env?.SCREENSHOTS_BUCKET) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Screenshot storage is unavailable',
    })
  }
}
