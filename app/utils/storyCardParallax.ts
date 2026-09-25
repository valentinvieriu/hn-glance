type StoryCardViewCallback = (isInView: boolean) => void

const MAX_IMAGE_TRANSLATE_PERCENT = 20
const RESIZE_DEBOUNCE_MS = 150

const viewCallbacks = new Map<HTMLElement, StoryCardViewCallback>()
const cardsInView = new Set<HTMLElement>()
const appliedOffsets = new WeakMap<HTMLElement, string>()
let isEnabled: boolean | null = null
let viewObserver: IntersectionObserver | null = null
let isListeningForScroll = false
let isListeningForResize = false
let animationFrameId: number | null = null
let resizeTimeoutId: ReturnType<typeof setTimeout> | null = null
let windowHeight = 0

const readWindowHeight = () => window.innerHeight || document.documentElement.clientHeight

const isParallaxEnabled = () => {
  if (isEnabled === null) {
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches
    const hasTouchInput = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    isEnabled = (hasCoarsePointer || hasTouchInput) && !prefersReducedMotion
  }

  return isEnabled
}

// One frame updates every visible card: all rects are read before any offset
// is written, so scrolling costs one layout per frame instead of one per card.
const updateOffsets = () => {
  animationFrameId = null

  const offsets: Array<[HTMLElement, string]> = []

  for (const card of cardsInView) {
    const rect = card.getBoundingClientRect()
    const progress = Math.max(0, Math.min(1, (windowHeight - rect.top) / (rect.height + windowHeight)))
    const offset = `${(-MAX_IMAGE_TRANSLATE_PERCENT * progress).toFixed(3)}%`

    if (appliedOffsets.get(card) !== offset) {
      offsets.push([card, offset])
    }
  }

  for (const [card, offset] of offsets) {
    appliedOffsets.set(card, offset)
    card.style.setProperty('--story-card-image-offset', offset)
  }
}

const scheduleUpdate = () => {
  if (animationFrameId === null && cardsInView.size > 0) {
    animationFrameId = requestAnimationFrame(updateOffsets)
  }
}

const handleResize = () => {
  if (resizeTimeoutId !== null) {
    clearTimeout(resizeTimeoutId)
  }

  resizeTimeoutId = setTimeout(() => {
    resizeTimeoutId = null
    windowHeight = readWindowHeight()
    scheduleUpdate()
  }, RESIZE_DEBOUNCE_MS)
}

// The scroll listener only exists while at least one card is near the viewport.
const syncScrollListener = () => {
  const shouldListen = cardsInView.size > 0

  if (shouldListen === isListeningForScroll) {
    return
  }

  isListeningForScroll = shouldListen

  if (shouldListen) {
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    return
  }

  window.removeEventListener('scroll', scheduleUpdate)

  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

const syncResizeListener = () => {
  const shouldListen = viewCallbacks.size > 0

  if (shouldListen === isListeningForResize) {
    return
  }

  isListeningForResize = shouldListen

  if (shouldListen) {
    windowHeight = readWindowHeight()
    window.addEventListener('resize', handleResize)
    return
  }

  window.removeEventListener('resize', handleResize)

  if (resizeTimeoutId !== null) {
    clearTimeout(resizeTimeoutId)
    resizeTimeoutId = null
  }
}

const setCardInView = (card: HTMLElement, isInView: boolean) => {
  const callback = viewCallbacks.get(card)

  if (!callback || cardsInView.has(card) === isInView) {
    return
  }

  if (isInView) {
    cardsInView.add(card)
  } else {
    cardsInView.delete(card)
  }

  callback(isInView)
  syncScrollListener()
  scheduleUpdate()
}

const getViewObserver = () => {
  if (viewObserver || !('IntersectionObserver' in window)) {
    return viewObserver
  }

  viewObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => setCardInView(entry.target as HTMLElement, entry.isIntersecting))
    },
    {
      threshold: [0, 0.1, 0.5, 1],
      rootMargin: '25% 0px',
    },
  )

  return viewObserver
}

/**
 * Registers a feed card for the touch-device screenshot parallax. All cards
 * share one Intersection Observer, one passive scroll listener, one resize
 * listener, and one animation frame. Returns false when parallax is disabled
 * (fine pointers or reduced motion), where hover CSS owns the effect instead.
 */
export const observeStoryCardParallax = (card: HTMLElement, onViewChange: StoryCardViewCallback) => {
  if (!import.meta.client || !isParallaxEnabled()) {
    return false
  }

  viewCallbacks.set(card, onViewChange)
  syncResizeListener()

  const observer = getViewObserver()

  if (observer) {
    observer.observe(card)
  } else {
    setCardInView(card, true)
  }

  return true
}

export const unobserveStoryCardParallax = (card: HTMLElement | null) => {
  if (!card || !viewCallbacks.has(card)) {
    return
  }

  viewObserver?.unobserve(card)
  viewCallbacks.delete(card)
  cardsInView.delete(card)
  syncScrollListener()
  syncResizeListener()
}
