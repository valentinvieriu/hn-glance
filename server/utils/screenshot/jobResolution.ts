import { HN_FIREBASE_API_URL, isValidHnItemId } from '#shared/utils/hn'
import type { ScreenshotSkipReason } from '#shared/utils/screenshotJobs'
import {
  createScreenshotSourceDecision,
  normalizeSourceUrl,
  type ScreenshotCaptureDecision,
} from './sourcePolicy'
import type { ScreenshotRuntimeConfig } from './types'

type HnFirebaseStory = {
  dead?: unknown
  deleted?: unknown
  type?: unknown
  url?: unknown
}

type ResolvedScreenshotCaptureJob = {
  sourceDecision: ScreenshotCaptureDecision
  status: 'capture'
}

type ResolvedScreenshotSkipJob = {
  skipReason: ScreenshotSkipReason
  status: 'skip'
}

type ResolvedScreenshotJob = ResolvedScreenshotCaptureJob | ResolvedScreenshotSkipJob

const resolveStorySourceUrl = async (storyId: string) => {
  const response = await fetch(`${HN_FIREBASE_API_URL}/item/${storyId}.json`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(3000),
  })

  if (!response.ok) {
    throw new Error(`HN item lookup returned ${response.status}`)
  }

  const story = await response.json() as HnFirebaseStory | null

  if (story?.type !== 'story' || story.dead === true || story.deleted === true) {
    return null
  }

  return normalizeSourceUrl(story.url)
}

export const resolveScreenshotJob = async (
  storyId: string,
  runtimeConfig: ScreenshotRuntimeConfig,
): Promise<ResolvedScreenshotJob> => {
  if (!isValidHnItemId(storyId)) {
    return {
      skipReason: 'invalid-url',
      status: 'skip',
    }
  }

  const sourceUrl = await resolveStorySourceUrl(storyId)

  if (!sourceUrl) {
    return {
      skipReason: 'invalid-url',
      status: 'skip',
    }
  }

  const sourceDecision = createScreenshotSourceDecision(sourceUrl, runtimeConfig)

  return {
    sourceDecision,
    status: 'capture',
  }
}
