import { SCREENSHOT_PROFILE_VERSION } from '#shared/utils/screenshot'
import type { ScreenshotPrepareResponse } from '#shared/utils/screenshotJobs'

export default defineEventHandler(async (event): Promise<ScreenshotPrepareResponse> => {
  const env = await requireScreenshotAgent(event)
  const storyId = requireHnItemIdParam(event)
  requireScreenshotStorage(env)

  const runtimeConfig = useScreenshotRuntimeConfig(event, env)
  const previewKey = getR2PreviewScreenshotKey(storyId)
  const preview = await headR2Screenshot(
    env,
    previewKey,
    runtimeConfig.screenshotR2TtlDays,
  )

  if (preview?.isFresh) {
    return { status: 'ready' }
  }

  const job = await resolveScreenshotJob(storyId, runtimeConfig)

  if (job.status === 'skip') {
    return {
      reason: job.skipReason,
      status: 'skipped',
    }
  }

  const probe = await probeCaptureUrlContent(job.sourceDecision.captureUrl, runtimeConfig)

  if (probe.policy === 'skip') {
    return {
      reason: probe.skipReason,
      status: 'skipped',
    }
  }

  return {
    captureUrl: probe.captureUrl,
    profile: SCREENSHOT_PROFILE_VERSION,
    status: 'capture',
  }
})
