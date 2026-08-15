export const SITE_ORIGIN = 'https://hnglance.com'

export const getCanonicalUrl = (routePath: string) => {
  const normalizedPath = routePath.startsWith('/') ? routePath : `/${routePath}`
  const url = new URL(normalizedPath, SITE_ORIGIN)

  url.search = ''
  url.hash = ''

  return url.href
}
