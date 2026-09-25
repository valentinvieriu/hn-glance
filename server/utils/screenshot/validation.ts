import { isBoundedWebpScreenshot } from '#shared/utils/screenshot'

export const validateWebpScreenshot = (
  bytes: ArrayBuffer,
  maximumBytes: number,
) => {
  if (!isBoundedWebpScreenshot(new Uint8Array(bytes), maximumBytes)) {
    throw new Error('Screenshot result is not a bounded WebP image')
  }

  return bytes
}
