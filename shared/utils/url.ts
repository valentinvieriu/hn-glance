/** Display domain for a source URL: its hostname without a leading `www.`. */
export const getUrlDomain = <T extends string>(url: string | null | undefined, fallback: T) => {
  if (!url) {
    return fallback
  }

  try {
    return new URL(url).hostname.replace(/^www\./u, '') || fallback
  } catch {
    return fallback
  }
}
