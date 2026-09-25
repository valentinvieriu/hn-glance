import { describe, expect, it } from 'vitest'
import {
  getMediaType,
  getScreenshotPath,
  isBoundedWebpScreenshot,
  isScreenshotAcceptedOutcome,
  isScreenshotSourceRoute,
  SCREENSHOT_PROFILE_VERSION,
  SCREENSHOT_RETENTION_DAYS,
  SCREENSHOT_RETENTION_SECONDS,
  SCREENSHOT_STORAGE_PREFIX,
} from './screenshot'

const createWebp = (byteLength: number) => {
  const bytes = new Uint8Array(byteLength)
  bytes.set([0x52, 0x49, 0x46, 0x46], 0)
  bytes.set([0x57, 0x45, 0x42, 0x50], 8)
  return bytes
}

describe('screenshot profile URL', () => {
  it('uses one versioned canonical path for every consumer', () => {
    expect(SCREENSHOT_PROFILE_VERSION).toBe('v9')
    expect(SCREENSHOT_RETENTION_DAYS).toBe(28)
    expect(SCREENSHOT_RETENTION_SECONDS).toBe(2_419_200)
    expect(getScreenshotPath('48876506'))
      .toBe('/api/screenshot/48876506?profile=v9')
  })

  it('keeps the active v9 storage prefix stable', () => {
    expect(SCREENSHOT_STORAGE_PREFIX).toBe('screenshots/v9/items/')
  })

  it('recognizes only trusted capture outcomes and source routes', () => {
    expect(isScreenshotAcceptedOutcome('ok')).toBe(true)
    expect(isScreenshotAcceptedOutcome('challenge')).toBe(false)
    expect(isScreenshotSourceRoute('ladder')).toBe(true)
    expect(isScreenshotSourceRoute('caller-provided')).toBe(false)
  })
})

describe('getMediaType', () => {
  it('drops parameters and normalizes case', () => {
    expect(getMediaType(' Image/WebP ; charset=binary')).toBe('image/webp')
    expect(getMediaType('text/html')).toBe('text/html')
  })

  it('treats a missing header as an empty media type', () => {
    expect(getMediaType(null)).toBe('')
    expect(getMediaType(undefined)).toBe('')
    expect(getMediaType('')).toBe('')
  })
})

describe('isBoundedWebpScreenshot', () => {
  it('accepts a RIFF WebP container within the byte bounds', () => {
    expect(isBoundedWebpScreenshot(createWebp(1024))).toBe(true)
    expect(isBoundedWebpScreenshot(createWebp(2048), 2048)).toBe(true)
  })

  it('rejects undersized, oversized, and non-WebP payloads', () => {
    expect(isBoundedWebpScreenshot(createWebp(1023))).toBe(false)
    expect(isBoundedWebpScreenshot(createWebp(2049), 2048)).toBe(false)
    expect(isBoundedWebpScreenshot(new Uint8Array(1024))).toBe(false)
  })
})
