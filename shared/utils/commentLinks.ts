import type { Comment } from '#shared/types'
import { decodeHtmlEntities, htmlToPlainText, truncateAtWordBoundary } from './html'

export const COMMENT_LINK_CATEGORY_ORDER = [
  'documentation',
  'papers',
  'code',
  'wikipedia',
  'news',
  'video',
  'discussion',
  'social',
  'other',
] as const

export type CommentLinkCategory = typeof COMMENT_LINK_CATEGORY_ORDER[number]

export type CommentLinkMention = {
  author: string
  commentId: number
  excerpt: string
}

export type CommentLink = {
  category: CommentLinkCategory
  domain: string
  mentions: CommentLinkMention[]
  order: number
  title: string
  url: string
}

export type CommentLinkGroup = {
  category: CommentLinkCategory
  links: CommentLink[]
}

export type ExtractCommentLinksOptions = {
  excludedUrls?: Array<string | null | undefined>
  includeDescendants?: boolean
  maximumLinks?: number
}

const DEFAULT_MAXIMUM_LINKS = 32
const DEFAULT_MAXIMUM_LINK_CANDIDATES = 128
const HN_HOSTS = new Set(['hn.algolia.com', 'news.ycombinator.com'])
const TRACKING_QUERY_PARAMETERS = new Set([
  'dclid',
  'fbclid',
  'gclid',
  'igshid',
  'mc_cid',
  'mc_eid',
  'msclkid',
])
const GENERIC_LINK_LABEL_PATTERN = /^(?:\[\d+\]|here|link|more|read(?:\s+more)?|source|this)$/iu
const ANCHOR_PATTERN = /<a\b([^>]*)>([\s\S]*?)<\/a>/giu
const BARE_URL_PATTERN = /https?:\/\/[^\s<>"']+/giu

const CATEGORY_HOSTS: Partial<Record<CommentLinkCategory, string[]>> = {
  wikipedia: ['wikipedia.org', 'wikisource.org'],
  video: ['youtube.com', 'youtu.be', 'vimeo.com'],
  code: [
    'bitbucket.org',
    'codeberg.org',
    'github.com',
    'gitlab.com',
    'sr.ht',
  ],
  papers: [
    'aclanthology.org',
    'acm.org',
    'arxiv.org',
    'biorxiv.org',
    'doi.org',
    'ieeexplore.ieee.org',
    'medrxiv.org',
    'openreview.net',
    'pubmed.ncbi.nlm.nih.gov',
    'semanticscholar.org',
    'ssrn.com',
  ],
  news: [
    '9to5mac.com',
    'aeon.co',
    'apnews.com',
    'arstechnica.com',
    'axios.com',
    'bbc.co.uk',
    'bbc.com',
    'bleepingcomputer.com',
    'bloomberg.com',
    'businessinsider.com',
    'cbc.ca',
    'cnbc.com',
    'cnet.com',
    'cnn.com',
    'economist.com',
    'engadget.com',
    'fastcompany.com',
    'finance.yahoo.com',
    'forbes.com',
    'fortune.com',
    'ft.com',
    'gigaom.com',
    'gizmodo.com',
    'hackaday.com',
    'hackernoon.com',
    'hbr.org',
    'iafrikan.com',
    'independent.co.uk',
    'infoq.com',
    'latimes.com',
    'lwn.net',
    'macrumors.com',
    'mashable.com',
    'nature.com',
    'nautil.us',
    'nbcnews.com',
    'newscientist.com',
    'newyorker.com',
    'nextplatform.com',
    'npr.org',
    'nytimes.com',
    'phoronix.com',
    'phys.org',
    'politico.com',
    'qz.com',
    'quantamagazine.org',
    'readwrite.com',
    'reuters.com',
    'sciencedaily.com',
    'scientificamerican.com',
    'sfgate.com',
    'slate.com',
    'spectrum.ieee.org',
    'techcrunch.com',
    'techdirt.com',
    'technologyreview.com',
    'telegraph.co.uk',
    'theatlantic.com',
    'theconversation.com',
    'theguardian.com',
    'thenextweb.com',
    'thenewstack.io',
    'theregister.com',
    'theverge.com',
    'tomshardware.com',
    'torrentfreak.com',
    'venturebeat.com',
    'vice.com',
    'vox.com',
    'wapo.com',
    'washingtonpost.com',
    'wired.com',
    'wsj.com',
    'zdnet.com',
  ],
  social: [
    'bsky.app',
    'facebook.com',
    'instagram.com',
    'linkedin.com',
    'mastodon.social',
    'threads.net',
    'tiktok.com',
    'twitter.com',
    'x.com',
    'xcancel.com',
  ],
  discussion: [
    'dev.to',
    'discuss.systems',
    'hachyderm.io',
    'lobste.rs',
    'mastodon.social',
    'reddit.com',
    'stackoverflow.com',
    'stackexchange.com',
  ],
}

const getAttribute = (attributes: string, attributeName: string) => {
  const attributePattern = new RegExp(
    `${attributeName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>` + '`' + `]+))`,
    'iu',
  )
  const match = attributes.match(attributePattern)

  return match?.[1] ?? match?.[2] ?? match?.[3] ?? ''
}

const hasHost = (hostname: string, candidate: string) => {
  return hostname === candidate || hostname.endsWith(`.${candidate}`)
}

const isTrackingParameter = (key: string) => {
  const normalizedKey = key.toLowerCase()

  return normalizedKey.startsWith('utm_')
    || TRACKING_QUERY_PARAMETERS.has(normalizedKey)
}

const trimTrailingUrlPunctuation = (value: string) => {
  let url = value.replace(/[.,;:!?]+$/u, '')

  const pairs = [
    ['(', ')'],
    ['[', ']'],
    ['{', '}'],
  ] as const

  for (const [opening, closing] of pairs) {
    while (
      url.endsWith(closing)
      && url.split(opening).length < url.split(closing).length
    ) {
      url = url.slice(0, -1)
    }
  }

  return url
}

const normalizeHttpUrl = (value: string) => {
  try {
    const url = new URL(trimTrailingUrlPunctuation(decodeHtmlEntities(value).trim()))

    if (
      !['http:', 'https:'].includes(url.protocol)
      || url.username
      || url.password
    ) {
      return null
    }

    url.hostname = url.hostname.toLowerCase().replace(/\.$/u, '')

    const queryEntries = Array.from(url.searchParams.entries())
      .filter(([key]) => !isTrackingParameter(key))
      .sort(([firstKey, firstValue], [secondKey, secondValue]) => (
        firstKey.localeCompare(secondKey) || firstValue.localeCompare(secondValue)
      ))
    url.search = ''

    for (const [key, queryValue] of queryEntries) {
      url.searchParams.append(key, queryValue)
    }

    if (url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/u, '')
    }

    return url
  } catch {
    return null
  }
}

const getComparableUrl = (value: string) => {
  const url = normalizeHttpUrl(value)

  if (!url) return ''

  url.hash = ''
  return url.href
}

const EXCERPT_MAXIMUM_LENGTH = 140

const getCommentExcerpt = (text: string) => {
  return truncateAtWordBoundary(htmlToPlainText(text), EXCERPT_MAXIMUM_LENGTH, 0.5)
}

const safeDecodeURIComponent = (value: string) => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const humanizePathSegment = (value: string) => {
  const label = safeDecodeURIComponent(value)
    .replace(/\.(?:aspx?|html?|pdf)$/iu, '')
    .replace(/[_-]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()

  if (!label) return ''

  return `${label.charAt(0).toLocaleUpperCase()}${label.slice(1)}`
}

const deriveLinkTitle = (url: URL, category: CommentLinkCategory) => {
  const pathSegments = url.pathname
    .split('/')
    .filter(Boolean)

  if (category === 'wikipedia') {
    return humanizePathSegment(pathSegments.at(-1) ?? '') || 'Wikipedia article'
  }

  if (category === 'video') {
    const hostname = url.hostname.replace(/^www\./u, '')

    if (hostname === 'youtu.be' || hasHost(hostname, 'youtube.com')) {
      return 'YouTube video'
    }

    if (hasHost(hostname, 'vimeo.com')) {
      return 'Vimeo video'
    }

    return 'Video'
  }

  if (category === 'code' && pathSegments.length >= 2) {
    return pathSegments.slice(0, 2).map(safeDecodeURIComponent).join('/')
  }

  if (url.hostname === 'arxiv.org' && pathSegments.length > 0) {
    return `arXiv ${safeDecodeURIComponent(pathSegments.at(-1) ?? '')}`
  }

  const label = humanizePathSegment(pathSegments.at(-1) ?? '')

  // Opaque single-token slugs (e.g. BBC article ids) read as noise; prefer the host.
  const isOpaqueSlug = label.length < 3
    || (label.length >= 8 && !label.includes(' ') && /\d/u.test(label))

  return (isOpaqueSlug ? '' : label) || url.hostname.replace(/^www\./u, '')
}

const getLinkTitle = (
  rawLabel: string,
  url: URL,
  category: CommentLinkCategory,
) => {
  const label = htmlToPlainText(rawLabel)
  const decodedUrl = decodeHtmlEntities(url.href)
  const useDerivedTitle = (
    label.length < 2
    || label.length > 120
    || GENERIC_LINK_LABEL_PATTERN.test(label)
    || /^https?:\/\//iu.test(label)
    || label === decodedUrl
  )
  const title = useDerivedTitle ? deriveLinkTitle(url, category) : label

  return title.length > 100 ? `${title.slice(0, 99).trimEnd()}…` : title
}

export const categorizeCommentLink = (url: URL): CommentLinkCategory => {
  const hostname = url.hostname.replace(/^www\./u, '')

  for (const category of ['wikipedia', 'video', 'code'] as const) {
    if (CATEGORY_HOSTS[category]?.some(candidate => hasHost(hostname, candidate))) {
      return category
    }
  }

  if (hostname.startsWith('forge.') || hostname.startsWith('git.')) {
    return 'code'
  }

  if (
    url.pathname.toLowerCase().endsWith('.pdf')
    || CATEGORY_HOSTS.papers?.some(candidate => hasHost(hostname, candidate))
  ) {
    return 'papers'
  }

  if (
    hostname.endsWith('.gov')
    || hostname.startsWith('docs.')
    || hostname.startsWith('developer.')
    || hostname.includes('readthedocs.')
    || /\/(?:docs?|documentation|manual|policies?|reference|standards?)(?:[/.#-]|$)/iu.test(url.pathname)
    || /(?:^|[-_/])policy(?:[-_./]|$)/iu.test(url.pathname)
  ) {
    return 'documentation'
  }

  for (const category of ['news', 'social', 'discussion'] as const) {
    if (CATEGORY_HOSTS[category]?.some(candidate => hasHost(hostname, candidate))) {
      return category
    }
  }

  return 'other'
}

export const compareCommentLinks = (first: CommentLink, second: CommentLink): number => {
  return COMMENT_LINK_CATEGORY_ORDER.indexOf(first.category)
    - COMMENT_LINK_CATEGORY_ORDER.indexOf(second.category)
    || first.order - second.order
}

export const extractCommentLinks = (
  comments: Comment[],
  options: ExtractCommentLinksOptions = {},
): CommentLink[] => {
  const maximumLinks = Math.max(0, options.maximumLinks ?? DEFAULT_MAXIMUM_LINKS)
  const maximumCandidates = Math.max(
    maximumLinks,
    Math.min(DEFAULT_MAXIMUM_LINK_CANDIDATES, maximumLinks * 4),
  )
  const excludedUrls = new Set(
    (options.excludedUrls ?? [])
      .map(value => value ? getComparableUrl(value) : '')
      .filter(Boolean),
  )
  const linksByUrl = new Map<string, CommentLink>()
  const stack = [...comments].reverse()

  const addLink = (rawUrl: string, rawLabel: string, comment: Comment) => {
    const url = normalizeHttpUrl(rawUrl)

    if (!url) return

    const domain = url.hostname.replace(/^www\./u, '')
    const comparableUrl = getComparableUrl(url.href)

    if (
      HN_HOSTS.has(domain)
      || excludedUrls.has(comparableUrl)
    ) {
      return
    }

    const key = url.href
    const existing = linksByUrl.get(key)

    if (existing) {
      if (!existing.mentions.some(mention => mention.commentId === comment.id)) {
        existing.mentions.push({
          author: comment.author,
          commentId: comment.id,
          excerpt: getCommentExcerpt(comment.text ?? ''),
        })
      }
      return
    }

    if (linksByUrl.size >= maximumCandidates) return

    const category = categorizeCommentLink(url)
    linksByUrl.set(key, {
      category,
      domain,
      mentions: [{
        author: comment.author,
        commentId: comment.id,
        excerpt: getCommentExcerpt(comment.text ?? ''),
      }],
      order: linksByUrl.size,
      title: getLinkTitle(rawLabel, url, category),
      url: url.href,
    })
  }

  while (stack.length > 0) {
    const comment = stack.pop()

    if (!comment) continue

    const textWithoutAnchors = (comment.text ?? '').replace(
      ANCHOR_PATTERN,
      (_match, attributes: string, label: string) => {
        addLink(getAttribute(attributes, 'href'), label, comment)
        return ' '
      },
    )

    for (const match of textWithoutAnchors.matchAll(BARE_URL_PATTERN)) {
      addLink(match[0], match[0], comment)
    }

    if (options.includeDescendants !== false) {
      const children = comment.children ?? []
      for (let index = children.length - 1; index >= 0; index -= 1) {
        const child = children[index]
        if (child) stack.push(child)
      }
    }
  }

  return Array.from(linksByUrl.values())
    .sort(compareCommentLinks)
    .slice(0, maximumLinks)
}

export const groupCommentLinks = (links: CommentLink[]): CommentLinkGroup[] => {
  return COMMENT_LINK_CATEGORY_ORDER
    .map(category => ({
      category,
      links: links.filter(link => link.category === category),
    }))
    .filter(group => group.links.length > 0)
}
