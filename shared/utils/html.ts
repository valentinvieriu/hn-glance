const HTML_ENTITY_PATTERN = /&(#\d+|#x[\da-f]+|amp|apos|colon|gt|lt|nbsp|quot);/giu

const NAMED_HTML_ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  apos: "'",
  colon: ':',
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
}

export const decodeHtmlEntities = (value: string): string => value.replace(
  HTML_ENTITY_PATTERN,
  (entity, code: string) => {
    if (code[0] !== '#') {
      return NAMED_HTML_ENTITIES[code.toLowerCase()] ?? entity
    }

    const radix = code[1]?.toLowerCase() === 'x' ? 16 : 10
    const offset = radix === 16 ? 2 : 1
    const codePoint = Number.parseInt(code.slice(offset), radix)

    return Number.isSafeInteger(codePoint) && codePoint > 0 && codePoint <= 0x10FFFF
      ? String.fromCodePoint(codePoint)
      : entity
  },
)

export const htmlToPlainText = (value: string): string => {
  return decodeHtmlEntities(value.replace(/<[^>]*>/gu, ' '))
    .replace(/\s+/gu, ' ')
    .replace(/\s+([.,;:!?])/gu, '$1')
    .trim()
}

export const truncateAtWordBoundary = (
  value: string,
  maximumLength: number,
  minimumBoundaryRatio = 0.6,
): string => {
  const boundedLength = Math.max(0, Math.floor(maximumLength))

  if (value.length <= boundedLength) {
    return value
  }

  if (boundedLength === 0) {
    return ''
  }

  const clipped = value.slice(0, boundedLength)
  const lastSpace = clipped.lastIndexOf(' ')
  const truncated = lastSpace > boundedLength * minimumBoundaryRatio
    ? clipped.slice(0, lastSpace)
    : clipped

  return `${truncated.trimEnd()}…`
}
