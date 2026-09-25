export const SCREENSHOT_PROFILE_VERSION = 'v9'
export const SCREENSHOT_RETENTION_DAYS = 28
export const SCREENSHOT_RETENTION_SECONDS = SCREENSHOT_RETENTION_DAYS * 24 * 60 * 60
export const SCREENSHOT_PREVIEW_HEIGHT = 11111
export const SCREENSHOT_PREVIEW_MAX_BYTES = 2_000_000
export const SCREENSHOT_PREVIEW_QUALITY = 55
export const SCREENSHOT_PREVIEW_WIDTH = 1440
export const SCREENSHOT_STORAGE_PREFIX = `screenshots/${SCREENSHOT_PROFILE_VERSION}/items/`
const SCREENSHOT_PREVIEW_MIN_BYTES = 1024
const SCREENSHOT_ACCEPTED_OUTCOMES = ['ok', 'access_gate'] as const
const SCREENSHOT_SOURCE_ROUTES = ['direct', 'ladder'] as const

export type ScreenshotAcceptedOutcome = typeof SCREENSHOT_ACCEPTED_OUTCOMES[number]
export type ScreenshotSourceRoute = typeof SCREENSHOT_SOURCE_ROUTES[number]

export const isScreenshotAcceptedOutcome = (value: string): value is ScreenshotAcceptedOutcome => {
  return SCREENSHOT_ACCEPTED_OUTCOMES.some((outcome) => outcome === value)
}

export const isScreenshotSourceRoute = (value: string): value is ScreenshotSourceRoute => {
  return SCREENSHOT_SOURCE_ROUTES.some((route) => route === value)
}

/** Lowercase media type without parameters, or '' when the header is absent. */
export const getMediaType = (contentType: string | null | undefined) => {
  return contentType?.split(';')[0]?.trim().toLowerCase() ?? ''
}

/** Checks the preview byte bounds and the RIFF....WEBP container signature. */
export const isBoundedWebpScreenshot = (
  bytes: Uint8Array,
  maximumBytes = SCREENSHOT_PREVIEW_MAX_BYTES,
) => {
  return bytes.byteLength >= SCREENSHOT_PREVIEW_MIN_BYTES
    && bytes.byteLength <= maximumBytes
    && bytes[0] === 0x52
    && bytes[1] === 0x49
    && bytes[2] === 0x46
    && bytes[3] === 0x46
    && bytes[8] === 0x57
    && bytes[9] === 0x45
    && bytes[10] === 0x42
    && bytes[11] === 0x50
}

export const getScreenshotPath = (storyId: string | number) => {
  return `/api/screenshot/${encodeURIComponent(String(storyId))}?profile=${SCREENSHOT_PROFILE_VERSION}`
}
