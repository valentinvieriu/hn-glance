export const getSourceFaviconUrl = (url: string): string => {
  try {
    const sourceUrl = new URL(url)

    if (
      !['http:', 'https:'].includes(sourceUrl.protocol)
      || sourceUrl.username
      || sourceUrl.password
    ) {
      return ''
    }

    return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(sourceUrl.origin)}&sz=64`
  } catch {
    return ''
  }
}
