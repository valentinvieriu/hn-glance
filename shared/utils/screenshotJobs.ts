import { isHnFeed, isValidHnItemId, type HnFeed } from './hn'
import { SCREENSHOT_PROFILE_VERSION } from './screenshot'

export const SCREENSHOT_JOB_PROTOCOL_VERSION = 1 as const

export type ScreenshotJobFeed = HnFeed

export type ScreenshotSkipReason =
  | 'blocked-hostname'
  | 'invalid-url'
  | 'non-html-content'
  | 'unverified-content'

export type ScreenshotJobMessage = {
  discoveredAt: string
  feed: ScreenshotJobFeed
  profile: typeof SCREENSHOT_PROFILE_VERSION
  protocolVersion: typeof SCREENSHOT_JOB_PROTOCOL_VERSION
  rank: number
  reason: 'scheduled'
  storyId: string
}

export type ScreenshotPrepareResponse =
  | {
      captureUrl: string
      profile: typeof SCREENSHOT_PROFILE_VERSION
      status: 'capture'
    }
  | {
      reason: ScreenshotSkipReason
      status: 'skipped'
    }
  | {
      status: 'ready'
    }

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export const parseScreenshotJobMessage = (value: unknown): ScreenshotJobMessage | null => {
  if (!isRecord(value)) {
    return null
  }

  if (
    value.protocolVersion !== SCREENSHOT_JOB_PROTOCOL_VERSION
    || value.profile !== SCREENSHOT_PROFILE_VERSION
    || value.reason !== 'scheduled'
    || !isValidHnItemId(value.storyId)
    || !isHnFeed(value.feed)
    || !Number.isSafeInteger(value.rank)
    || Number(value.rank) < 1
    || typeof value.discoveredAt !== 'string'
    || !Number.isFinite(Date.parse(value.discoveredAt))
  ) {
    return null
  }

  return {
    discoveredAt: value.discoveredAt,
    feed: value.feed,
    profile: SCREENSHOT_PROFILE_VERSION,
    protocolVersion: SCREENSHOT_JOB_PROTOCOL_VERSION,
    rank: Number(value.rank),
    reason: 'scheduled',
    storyId: value.storyId,
  }
}
