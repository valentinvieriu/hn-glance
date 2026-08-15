const API_PATH_PREFIX = '/api/'
const SCREENSHOT_API_PATH = '/api/screenshot'

export const shouldNoindexApiPath = (pathname: string) => {
  if (!pathname.startsWith(API_PATH_PREFIX)) {
    return false
  }

  return pathname !== SCREENSHOT_API_PATH
    && !pathname.startsWith(`${SCREENSHOT_API_PATH}/`)
}
