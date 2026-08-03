<template>
  <div class="min-h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
    <div class="layout-frame py-8 md:py-10">
      <div v-if="error" class="text-center mt-20">
        <h1 class="text-3xl font-display font-semibold mb-4">Error</h1>
        <p class="mb-6 leading-7">{{ error }}</p>
        <NuxtLink
          to="/"
          class="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded"
        >
          Back to Home
        </NuxtLink>
      </div>

      <div v-else-if="isLoading" class="text-center mt-20">
        <h1 class="text-3xl font-display font-semibold mb-4">Loading...</h1>
      </div>

      <div v-else-if="story" class="story-detail-layout grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
        <div
          class="story-detail-primary story-context-palette min-w-0"
          :style="storyContextPaletteStyle"
        >
          <article class="story-detail-article min-w-0">
          <h1 class="story-detail-title mb-3 text-3xl font-display leading-tight text-gray-900 dark:text-gray-100 md:text-4xl">
            {{ story.title }}
          </h1>
          <a
            v-if="storyExternalUrl"
            :href="storyExternalUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="story-source-link meta-text mb-3 inline-flex items-center gap-1.5"
            :aria-label="`Open source on ${storyDomain}`"
          >
            <span class="truncate">{{ storyDomain }}</span>
            <LucideExternalLink :size="14" aria-hidden="true" />
          </a>
          <div class="meta-text mb-4 text-gray-600 dark:text-gray-400">
            by
            <NuxtLink
              :to="getHnUserPath(story.author)"
              class="font-medium text-gray-700 hover:text-gray-900 hover:underline dark:text-gray-300 dark:hover:text-gray-100"
            >
              {{ story.author }}
            </NuxtLink>
            • {{ timeAgo }}
          </div>
          <div class="meta-text flex items-center gap-4 mb-6">
            <span :class="['flex', 'items-center', 'gap-1', story.points >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400']">
              <LucideTrendingUp class="w-4 h-4" aria-hidden="true" />
              {{ story.points }}
            </span>
            <a
              href="#comments"
              aria-label="Jump to comments"
              class="flex items-center gap-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <LucideMessageSquare class="w-4 h-4" aria-hidden="true" />
              {{ commentCount }}
            </a>
          </div>
          <div
            class="source-screenshot-preview seed-palette-surface mb-6 lg:mb-8"
            :data-screenshot-attempt="screenshotRequestAttempt + 1"
            :data-screenshot-state="screenshotPreviewState"
            :style="screenshotPreviewStyle"
            data-testid="source-screenshot-preview"
          >
            <StoryPlaceholderVisual
              :domain="storyDomain"
              :seed="storyId ?? 'story'"
              :state="screenshotPreviewState"
              presentation="detail"
            />
            <img
              :key="`${screenshotSrc}:${screenshotRequestAttempt}`"
              ref="screenshotImage"
              :alt="`Preview of ${story.title}`"
              width="1440"
              height="11111"
              :src="screenshotSrc"
              loading="eager"
              fetchpriority="high"
              decoding="async"
              class="source-screenshot-preview-image"
              :aria-hidden="screenshotPreviewState === 'failed'"
              @load="handleScreenshotPreviewLoad"
              @error="handleScreenshotPreviewError"
            />
            <button
              v-if="screenshotPreviewState === 'loaded'"
              type="button"
              class="source-preview-open-button"
              aria-label="Open source preview at full size"
              @click="openScreenshotPreview"
            ></button>
            <a
              v-if="storyExternalUrl"
              :href="storyExternalUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="source-preview-source-link"
              :aria-label="`Open ${storyDomain} externally`"
              data-testid="compact-source-preview"
            >
              <span class="source-preview-domain-chip meta-text">
                <span>{{ storyDomain }}</span>
                <LucideExternalLink class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </span>
            </a>
            <span
              v-if="screenshotPreviewState === 'loaded'"
              class="source-preview-expand-label"
              aria-hidden="true"
            >
              <LucideMaximize2 class="h-4 w-4" />
              <span>Full size</span>
            </span>
          </div>
          <div
            class="story-detail-text reading-text rich-text reading-measure mb-5 text-base leading-7 text-gray-700 dark:text-gray-300"
            v-html="sanitizedText"
          ></div>
          </article>
          <div ref="storyContextRoot" class="story-detail-history min-w-0">
            <SubmissionHistory
              v-if="story && storyId"
              :current-created-at="story.created_at"
              :current-story-id="storyId"
              :submissions="submissionHistory"
            />
          </div>
          <section class="story-detail-related min-w-0">
            <RelatedStories
              v-if="storyId"
              :failed="storyContextFailed"
              :status="storyContextStatus"
              :stories="similarStories"
            />
            <CommentLinks
              v-if="story"
              :comments="story.children"
              :story-url="story.url"
              :author-comment-counts="authorCommentCounts"
              :thread-author-palettes="commentThreadAuthorPalettes"
              :root-comment-ids="rootCommentIds"
              @jump-to-comment="jumpToComment"
            />
          </section>
        </div>
        <aside id="comments" class="story-detail-comments min-w-0 scroll-mt-24">
          <div class="comments-toolbar">
            <div class="comments-title-group">
              <h2 class="section-title mb-0 text-2xl font-semibold text-gray-900 dark:text-gray-100">Comments</h2>
              <span v-if="commentCount > 0" class="comments-count text-gray-600 dark:text-gray-400">
                {{ commentCount }} total
              </span>
            </div>
            <button
              v-if="canToggleAllComments"
              type="button"
              class="expand-comments-button text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
              @click="toggleExpandAllComments"
            >
              <LucideChevronsUp v-if="areAllCommentsExpanded" class="w-4 h-4" />
              <LucideChevronsDown v-else class="w-4 h-4" />
              <span>{{ areAllCommentsExpanded ? 'Hide deep replies' : 'Expand all' }}</span>
            </button>
          </div>
          <div v-if="story.children.length === 0" class="text-gray-500 leading-7">
            No comments yet.
          </div>
          <div v-else class="comments-list">
            <CommentThread
              v-for="comment in story.children"
              :key="comment.id"
              :comment="comment"
              :story-author="story.author"
              :author-comment-counts="authorCommentCounts"
              :author-palette="getCommentThreadAuthorPaletteForRoot(comment.id)"
              :comment-authors="commentAuthors"
              :descendant-comment-counts="descendantCommentCounts"
              :parent-comment-ids="parentCommentIds"
              :root-comment-ids="rootCommentIds"
              :hidden-reply-ids="hiddenReplyIds"
              :jump-target-comment-id="jumpTargetCommentId"
              :toggle-replies-hidden="toggleRepliesHidden"
              :jump-to-comment="jumpToComment"
            />
          </div>
        </aside>
        <dialog
          ref="screenshotDialog"
          class="source-preview-dialog"
          aria-labelledby="source-preview-dialog-title"
          @click.self="closeScreenshotPreview"
          @close="handleScreenshotDialogClose"
        >
          <div class="source-preview-dialog-shell">
            <div class="source-preview-dialog-header">
              <div class="min-w-0">
                <p id="source-preview-dialog-title" class="font-display font-semibold">Source preview</p>
                <p class="meta-text truncate text-gray-500 dark:text-gray-400">{{ storyDomain }}</p>
              </div>
              <button
                type="button"
                class="source-preview-dialog-close"
                aria-label="Close source preview"
                @click="closeScreenshotPreview"
              >
                <LucideX class="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div class="source-preview-dialog-scroll">
              <img
                v-if="isScreenshotDialogOpen"
                :alt="`Expanded preview of ${story.title}`"
                width="1440"
                :src="originalScreenshotSrc"
                decoding="async"
                class="source-preview-dialog-image"
              />
            </div>
          </div>
        </dialog>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { LucideExternalLink, LucideTrendingUp, LucideMessageSquare, LucideChevronsDown, LucideChevronsUp, LucideMaximize2, LucideX } from '@lucide/vue';
import { useSanitizer } from '~/composables/useSanitizer';
import {
  getCommentThreadAuthorPalette,
  getSeedPaletteStyle,
  getStoryContextPaletteStyle,
  type CommentThreadAuthorPalette,
} from '~/composables/useSeedPalette';
import type {
  RelatedStory,
  StoryContextResponse,
  StoryDetail,
} from '#shared/types'
import {
  getCommentPathIds,
  getExpandedCommentDisclosure,
  getSmartCommentDisclosure,
  revealCommentPath,
  summarizeCommentTree,
  toggleCommentReplies,
} from '#shared/utils/comments'
import { formatTimeAgo } from '#shared/utils/date'
import { getHnItemUrl, getHnUserPath, normalizeHnItemId } from '#shared/utils/hn'
import { getScreenshotPath } from '#shared/utils/screenshot'
import { appendServerTiming } from '#shared/utils/serverTiming'

const route = useRoute();

const storyId = computed(() => normalizeHnItemId(route.params.id))
const storyDataKey = computed(() => `story-detail:${storyId.value ?? 'missing'}`)
const serverTimingHeader = useResponseHeader('Server-Timing')
const pageSsrStartedAt = import.meta.server ? performance.now() : null

if (import.meta.server && pageSsrStartedAt !== null) {
  useNuxtApp().hook('app:rendered', () => {
    serverTimingHeader.value = appendServerTiming(serverTimingHeader.value, [
      {
        name: 'page-ssr',
        duration: performance.now() - pageSsrStartedAt,
        description: 'Nuxt page data and render',
      },
    ])
  })
}

const { data: storyData, pending, error: fetchError } = useAsyncData<StoryDetail | null>(
  storyDataKey,
  async () => {
    const id = storyId.value

    if (!id) {
      return null
    }

    const storyDataStartedAt = performance.now()
    const response = await $fetch.raw<StoryDetail>(`/api/item/${id}`)

    if (import.meta.server) {
      serverTimingHeader.value = appendServerTiming(response.headers.get('server-timing'), [
        {
          name: 'story-data',
          duration: performance.now() - storyDataStartedAt,
          description: 'SSR story data request',
        },
      ])
    }

    return response._data ?? null
  },
  {
    default: () => null,
    watch: [storyId],
  },
)

const story = computed(() => storyData.value)
const error = computed(() => {
  if (!storyId.value) {
    return 'Story ID is required'
  }

  if (fetchError.value) {
    return fetchError.value.message
  }

  if (!pending.value && !story.value) {
    return 'Story not found'
  }

  return null
})
const isLoading = computed(() => pending.value)
const storyContextRoot = ref<HTMLElement | null>(null)
const isStoryContextNearViewport = ref(false)
let storyContextObserver: IntersectionObserver | null = null
type StoryContextPayload = StoryContextResponse | RelatedStory[]
const {
  data: storyContextData,
  status: storyContextStatus,
  error: storyContextError,
  execute: executeStoryContext,
  clear: clearStoryContext,
} = useLazyFetch<StoryContextPayload>(
  () => `/api/related/${storyId.value ?? 'invalid'}?format=story-context-v6`,
  {
    default: () => ({
      submissionHistory: [],
      similarStories: [],
    }),
    immediate: false,
    server: false,
    watch: false,
  },
)
const storyContext = computed<StoryContextResponse>(() => {
  if (Array.isArray(storyContextData.value)) {
    return {
      submissionHistory: [],
      similarStories: storyContextData.value,
    }
  }

  return storyContextData.value
})
const submissionHistory = computed(() => storyContext.value.submissionHistory)
const similarStories = computed(() => storyContext.value.similarStories)
const storyContextFailed = computed(() => Boolean(storyContextError.value))
const loadStoryContext = () => {
  if (storyId.value && storyContextStatus.value === 'idle') {
    void executeStoryContext()
  }
}
const screenshotSrc = computed(() => storyId.value ? getScreenshotPath(storyId.value) : '')
const originalScreenshotSrc = screenshotSrc
const storyExternalUrl = computed(() => {
  if (story.value?.url) {
    return story.value.url
  }

  return storyId.value
    ? getHnItemUrl(storyId.value)
    : ''
})
type ScreenshotPreviewState = 'loading' | 'loaded' | 'failed'
const SCREENSHOT_RETRY_DELAYS_MS = [16_000, 45_000] as const
const screenshotPreviewState = ref<ScreenshotPreviewState>('loading')
const screenshotRequestAttempt = ref(0)
const screenshotImage = ref<HTMLImageElement | null>(null)
const screenshotDialog = ref<HTMLDialogElement | null>(null)
const isScreenshotDialogOpen = ref(false)
let screenshotRetryTimer: ReturnType<typeof setTimeout> | undefined

onBeforeUnmount(() => {
  if (screenshotRetryTimer) {
    clearTimeout(screenshotRetryTimer)
  }

  clearCommentHighlight()
  storyContextObserver?.disconnect()
  screenshotDialog.value?.close()
})
const storyDomain = computed(() => {
  if (!storyExternalUrl.value) {
    return 'source'
  }

  try {
    return new URL(storyExternalUrl.value).hostname.replace(/^www\./, '')
  } catch {
    return 'source'
  }
})

const storyContextPaletteStyle = computed(() => {
  return getStoryContextPaletteStyle(storyId.value, storyDomain.value)
})

const screenshotPreviewStyle = computed(() => {
  return getSeedPaletteStyle(storyId.value, storyDomain.value)
})

const getPreviewStateFromImage = (image: HTMLImageElement): ScreenshotPreviewState => {
  return image.naturalWidth > 1 && image.naturalHeight > 1 ? 'loaded' : 'failed'
}

const scheduleScreenshotRetry = () => {
  const retryDelay = SCREENSHOT_RETRY_DELAYS_MS[screenshotRequestAttempt.value]

  if (retryDelay === undefined || screenshotRetryTimer) {
    return
  }

  screenshotRetryTimer = setTimeout(() => {
    screenshotRetryTimer = undefined
    screenshotPreviewState.value = 'loading'
    screenshotRequestAttempt.value += 1
  }, retryDelay)
}

const updateScreenshotPreviewState = (image: HTMLImageElement) => {
  screenshotPreviewState.value = getPreviewStateFromImage(image)

  if (screenshotPreviewState.value === 'failed') {
    scheduleScreenshotRetry()
  }
}

const handleScreenshotPreviewLoad = (event: Event) => {
  updateScreenshotPreviewState(event.target as HTMLImageElement)
}

const handleScreenshotPreviewError = () => {
  screenshotPreviewState.value = 'failed'
  scheduleScreenshotRetry()
}

const getCommentIdFromHash = (hash: string) => {
  const commentId = Number(hash.match(/^#comment-(\d+)$/u)?.[1])

  return Number.isSafeInteger(commentId) && commentId > 0 ? commentId : null
}

// Overrides stay null until the reader acts so smart reply gates derive from
// the SSR summary during hydration.
const hiddenReplyOverride = ref<ReadonlySet<number> | null>(null)
const jumpTargetCommentId = ref<number | null>(null)
let commentHighlightTimer: ReturnType<typeof setTimeout> | undefined
let highlightedComment: HTMLElement | null = null

const clearCommentHighlight = () => {
  if (commentHighlightTimer) {
    clearTimeout(commentHighlightTimer)
    commentHighlightTimer = undefined
  }

  highlightedComment?.classList.remove('comment-jump-highlight')
  highlightedComment = null
}

const highlightComment = (target: HTMLElement) => {
  clearCommentHighlight()
  highlightedComment = target
  target.classList.add('comment-jump-highlight')
  commentHighlightTimer = setTimeout(clearCommentHighlight, 1600)
}

const jumpToComment = async (commentId: number, updateHash = true) => {
  if (!Number.isSafeInteger(commentId) || commentId <= 0) {
    return
  }

  const pathIds = getCommentPathIds(story.value?.children ?? [], commentId)

  if (pathIds) {
    // Open only what is required to render the target. Its own reply visibility
    // and every unrelated branch retain their existing state.
    hiddenReplyOverride.value = revealCommentPath(hiddenReplyIds.value, pathIds)
  }
  await nextTick()

  let target = document.getElementById(`comment-${commentId}`)

  if (!target) {
    // Safety net: open the whole tree if targeted expansion missed.
    hiddenReplyOverride.value = getExpandedCommentDisclosure()
    await nextTick()
    target = document.getElementById(`comment-${commentId}`)
  }

  if (!target) {
    return
  }

  jumpTargetCommentId.value = commentId

  if (updateHash) {
    const nextUrl = `${window.location.pathname}${window.location.search}#comment-${commentId}`

    if (window.location.hash !== `#comment-${commentId}`) {
      window.history.pushState(
        window.history.state,
        '',
        nextUrl,
      )
    }
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
    block: 'start',
  })
  target.focus({ preventScroll: true })
  highlightComment(target)
}

onMounted(() => {
  if (screenshotImage.value?.complete) {
    updateScreenshotPreviewState(screenshotImage.value)
  }

  const hashedCommentId = getCommentIdFromHash(route.hash)
  if (hashedCommentId) {
    void jumpToComment(hashedCommentId, false)
  }

  if (!storyContextRoot.value || !('IntersectionObserver' in window)) {
    isStoryContextNearViewport.value = true
    loadStoryContext()
    return
  }

  storyContextObserver = new IntersectionObserver(
    (entries) => {
      if (!entries.some(entry => entry.isIntersecting)) {
        return
      }

      isStoryContextNearViewport.value = true
      storyContextObserver?.disconnect()
      storyContextObserver = null
      loadStoryContext()
    },
    { rootMargin: '400px 0px' },
  )
  storyContextObserver.observe(storyContextRoot.value)
})

const openScreenshotPreview = () => {
  if (
    screenshotPreviewState.value !== 'loaded'
    || !screenshotDialog.value
    || screenshotDialog.value.open
  ) {
    return
  }

  screenshotDialog.value.showModal()
  isScreenshotDialogOpen.value = true
}

const closeScreenshotPreview = () => {
  screenshotDialog.value?.close()
}

const handleScreenshotDialogClose = () => {
  isScreenshotDialogOpen.value = false
}

watch(screenshotSrc, () => {
  if (screenshotRetryTimer) {
    clearTimeout(screenshotRetryTimer)
    screenshotRetryTimer = undefined
  }

  screenshotRequestAttempt.value = 0
  screenshotPreviewState.value = 'loading'
})

watch(storyId, () => {
  clearCommentHighlight()
  hiddenReplyOverride.value = null
  jumpTargetCommentId.value = null
  clearStoryContext()

  if (isStoryContextNearViewport.value) {
    loadStoryContext()
  }
})

watch(() => route.hash, (hash) => {
  const commentId = getCommentIdFromHash(hash)

  if (commentId) {
    void jumpToComment(commentId, false)
  }
})

// Use the sanitizer
const { sanitize } = useSanitizer();
const sanitizedText = computed(() => sanitize(story.value?.text || '', `story-${storyId.value}`));

const commentSummary = computed(() => summarizeCommentTree(story.value?.children || []))
const commentCount = computed(() => commentSummary.value.total)
const authorCommentCounts = computed(() => commentSummary.value.authorCounts)
const commentAuthors = computed(() => commentSummary.value.commentAuthors)
const descendantCommentCounts = computed(() => commentSummary.value.descendantCounts)
const parentCommentIds = computed(() => commentSummary.value.parentCommentIds)
const rootCommentIds = computed(() => commentSummary.value.rootCommentIds)
const defaultHiddenReplyIds = computed(() => commentSummary.value.defaultHiddenReplyIds)
const EMPTY_COMMENT_THREAD_AUTHOR_PALETTE: CommentThreadAuthorPalette = {
  authorCounts: new Map(),
  authorStyles: new Map(),
}
const commentThreadAuthorPalettes = computed(() => {
  const palettes = new Map<number, CommentThreadAuthorPalette>()

  for (const rootComment of story.value?.children ?? []) {
    palettes.set(rootComment.id, getCommentThreadAuthorPalette(rootComment))
  }

  return palettes
})
const getCommentThreadAuthorPaletteForRoot = (rootCommentId: number) => {
  return commentThreadAuthorPalettes.value.get(rootCommentId)
    ?? EMPTY_COMMENT_THREAD_AUTHOR_PALETTE
}

const hiddenReplyIds = computed<ReadonlySet<number>>(() => {
  return hiddenReplyOverride.value ?? defaultHiddenReplyIds.value
})

const areAllCommentsExpanded = computed(() => {
  return hiddenReplyIds.value.size === 0
})

const canToggleAllComments = computed(() => {
  return defaultHiddenReplyIds.value.size > 0
    || hiddenReplyIds.value.size > 0
})

const toggleExpandAllComments = () => {
  hiddenReplyOverride.value = areAllCommentsExpanded.value
    ? getSmartCommentDisclosure(defaultHiddenReplyIds.value)
    : getExpandedCommentDisclosure()
}

const toggleRepliesHidden = (commentId: number) => {
  hiddenReplyOverride.value = toggleCommentReplies(hiddenReplyIds.value, commentId)
}

const timeAgo = computed(() => {
  return formatTimeAgo(story.value?.created_at || '')
});

const requestUrl = useRequestURL()
const siteOrigin = requestUrl.origin
const title = computed(() => story.value?.title ?? 'Loading...')
const seoTitle = computed(() => `${title.value} — HN Glance`)
const socialImage = computed(() => {
  const path = storyId.value
    ? getScreenshotPath(storyId.value)
    : '/icon_x512.png'

  return new URL(path, siteOrigin).href
})

useHead(() => ({
  link: screenshotSrc.value
    ? [{
        key: 'story-screenshot-preload',
        rel: 'preload',
        as: 'image',
        href: screenshotSrc.value,
        fetchpriority: 'high',
      }]
    : [],
}))

useSeoMeta({
  title: seoTitle,
  description: () => story.value ? `Read the story titled "${story.value.title}" by ${story.value.author}.` : 'Loading story...',
  ogTitle: seoTitle,
  ogDescription: () => story.value ? `Read the story titled "${story.value.title}" by ${story.value.author}.` : 'Loading story...',
  ogImage: socialImage,
  twitterCard: 'summary_large_image',
  twitterImage: socialImage,
});
</script>

<style scoped>
.story-detail-primary {
  display: contents;
}

.story-detail-layout {
  gap: var(--layout-section-gap);
}

.story-detail-article {
  order: 1;
}

.story-detail-article > h1 {
  text-wrap: balance;
}

.story-detail-title {
  font-weight: 650;
  letter-spacing: -0.03em;
}

.story-detail-comments {
  order: 3;
}

.story-detail-history {
  min-height: 1px;
  order: 2;
}

.story-detail-related {
  order: 2;
}

.story-source-link {
  color: var(--story-context-accent-strong);
  font-weight: 700;
  text-decoration-color: transparent;
  text-underline-offset: 0.18em;
}

.story-source-link:hover,
.story-source-link:focus-visible {
  color: var(--story-context-accent);
  text-decoration-line: underline;
}

.story-source-link:focus-visible {
  border-radius: 0.2rem;
  outline: 2px solid var(--story-context-focus);
  outline-offset: 2px;
}

.source-screenshot-preview {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 10;
  border: 1px solid color-mix(in oklch, var(--seed-border) 72%, rgb(148 163 184 / 0.26));
  border-radius: 0.75rem;
  background:
    linear-gradient(145deg, color-mix(in oklch, var(--seed-highlight) 54%, transparent), transparent 32%),
    linear-gradient(180deg, var(--seed-surface-raised), var(--seed-surface));
  box-shadow: 0 18px 40px -32px var(--seed-shadow-strong);
}

.source-screenshot-preview::after {
  position: absolute;
  z-index: 2;
  inset: auto 0 0;
  height: 42%;
  content: "";
  background: linear-gradient(to top, rgb(15 23 42 / 0.36), transparent);
  pointer-events: none;
}

.source-screenshot-preview-image {
  position: absolute;
  z-index: 1;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
}

.source-screenshot-preview[data-screenshot-state="failed"] .source-screenshot-preview-image {
  visibility: hidden;
}

.source-preview-open-button {
  position: absolute;
  z-index: 3;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  border-radius: inherit;
  background: transparent;
  cursor: zoom-in;
}

.source-preview-open-button:focus-visible {
  outline: 3px solid var(--seed-accent);
  outline-offset: -3px;
}

.source-preview-source-link {
  position: absolute;
  z-index: 4;
  right: auto;
  bottom: 0.75rem;
  left: 0.75rem;
  display: block;
  width: max-content;
  max-width: calc(100% - 1.5rem);
  border-radius: 999px;
}

.source-preview-source-link:focus-visible {
  outline: 3px solid var(--seed-accent);
  outline-offset: 2px;
}

.source-preview-domain-chip {
  display: inline-flex;
  width: max-content;
  max-width: 100%;
  align-items: center;
  gap: 0.35rem;
  padding: 0.42rem 0.58rem;
  border: 1px solid rgb(255 255 255 / 0.68);
  border-radius: 999px;
  background: rgb(255 255 255 / 0.88);
  color: rgb(31 41 55);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 8px 22px -16px rgb(15 23 42 / 0.75);
  backdrop-filter: blur(12px);
}

.source-preview-domain-chip span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-preview-expand-label {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 4;
  display: inline-flex;
  min-height: 2.25rem;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.7rem;
  border: 1px solid rgb(255 255 255 / 0.68);
  border-radius: 999px;
  background: rgb(255 255 255 / 0.9);
  color: rgb(31 41 55);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 8px 22px -14px rgb(15 23 42 / 0.75);
  backdrop-filter: blur(12px);
  pointer-events: none;
}

@media (min-width: 1024px) {
  .story-detail-primary {
    display: block;
    grid-column: 1;
    grid-row: 1;
  }

  .story-detail-comments {
    grid-column: 2;
    grid-row: 1;
  }

  .story-detail-article {
    display: flex;
    flex-direction: column;
  }

  .story-detail-text {
    order: 1;
  }

  .source-screenshot-preview {
    order: 2;
    aspect-ratio: 4 / 3;
  }

  .source-screenshot-preview[data-screenshot-state="loaded"] {
    aspect-ratio: auto;
  }

  .source-screenshot-preview[data-screenshot-state="loaded"] .source-screenshot-preview-image {
    position: relative;
    inset: auto;
    height: auto;
    object-fit: contain;
  }

}

@media (min-width: 1536px) {
  .story-detail-layout {
    grid-template-columns: minmax(0, 1.35fr) minmax(34rem, 0.9fr);
  }
}

.source-preview-dialog {
  width: min(calc(100vw - 2rem), 90rem);
  height: min(calc(100vh - 2rem), 56rem);
  max-width: none;
  max-height: none;
  padding: 0;
  overflow: hidden;
  border: 1px solid rgb(148 163 184 / 0.32);
  border-radius: 1rem;
  background: white;
  color: rgb(17 24 39);
  box-shadow: 0 36px 90px rgb(15 23 42 / 0.32);
}

.source-preview-dialog::backdrop {
  background: rgb(15 23 42 / 0.72);
  backdrop-filter: blur(5px);
}

.source-preview-dialog-shell {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
}

.source-preview-dialog-header {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0.9rem;
  border-bottom: 1px solid rgb(148 163 184 / 0.24);
  background: rgb(255 255 255 / 0.96);
}

.source-preview-dialog-close {
  display: inline-flex;
  width: 2.25rem;
  height: 2.25rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(148 163 184 / 0.3);
  border-radius: 999px;
  background: rgb(148 163 184 / 0.08);
  color: rgb(55 65 81);
}

.source-preview-dialog-close:hover,
.source-preview-dialog-close:focus-visible {
  background: rgb(148 163 184 / 0.16);
  color: rgb(17 24 39);
}

.source-preview-dialog-scroll {
  min-height: 0;
  flex: 1 1 auto;
  overflow: auto;
  background: rgb(241 245 249);
}

.source-preview-dialog-image {
  display: block;
  width: min(100%, 90rem);
  height: auto;
  margin: 0 auto;
  background: white;
}

.dark .source-screenshot-preview {
  border-color: color-mix(in oklch, var(--seed-border) 82%, rgb(148 163 184 / 0.28));
  background:
    linear-gradient(145deg, color-mix(in oklch, var(--seed-highlight) 50%, transparent), transparent 34%),
    linear-gradient(180deg, var(--seed-surface-raised), var(--seed-surface));
}

.dark .source-preview-expand-label {
  border-color: rgb(255 255 255 / 0.16);
  background: rgb(15 23 42 / 0.82);
  color: rgb(226 232 240);
}

.dark .source-preview-dialog {
  border-color: rgb(148 163 184 / 0.28);
  background: rgb(17 24 39);
  color: rgb(243 244 246);
}

.dark .source-preview-dialog-header {
  border-color: rgb(148 163 184 / 0.18);
  background: rgb(17 24 39 / 0.97);
}

.dark .source-preview-dialog-close {
  border-color: rgb(148 163 184 / 0.22);
  background: rgb(148 163 184 / 0.1);
  color: rgb(209 213 219);
}

.dark .source-preview-dialog-close:hover,
.dark .source-preview-dialog-close:focus-visible {
  background: rgb(148 163 184 / 0.18);
  color: white;
}

.dark .source-preview-dialog-scroll {
  background: rgb(15 23 42);
}

.dark .source-preview-domain-chip {
  border-color: rgb(255 255 255 / 0.16);
  background: rgb(15 23 42 / 0.78);
  color: rgb(226 232 240);
}

.comments-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.comments-title-group {
  display: inline-flex;
  align-items: baseline;
  gap: 0.55rem;
  min-width: 0;
}

.comments-list {
  min-width: 0;
}

/* Cards carry speaker boundaries, so roots need only enough air to separate
   independent conversations. Nested reply spacing stays local to the thread. */
.comments-list > .comment-container + .comment-container {
  margin-top: 1rem;
}

.comments-count {
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1;
}

.expand-comments-button {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2rem;
  padding: 0.35rem 0.7rem;
  border: 1px solid rgb(148 163 184 / 0.24);
  border-radius: 999px;
  background: rgb(148 163 184 / 0.08);
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.expand-comments-button:hover {
  border-color: rgb(148 163 184 / 0.38);
  background: rgb(148 163 184 / 0.13);
}

@media (max-width: 640px) {
  .comments-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
