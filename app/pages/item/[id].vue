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

      <template v-else-if="story">
      <div
        class="story-detail-layout grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start"
        :inert="isDiscussionFocusActive ? true : undefined"
        :aria-hidden="isDiscussionFocusActive ? 'true' : undefined"
      >
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
              :aria-label="discussionLanguage.accessibility.jumpToDiscussion"
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
          <div ref="discussionEngagementTarget" class="comments-toolbar">
            <div class="comments-title-group">
              <h2 class="section-title mb-0 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {{ discussionLanguage.terms.discussion }}
              </h2>
              <span v-if="commentCount > 0" class="comments-count text-gray-600 dark:text-gray-400">
                {{ discussionLanguage.format.commentCount(commentCount) }}
              </span>
            </div>
            <div v-if="commentCount > 0 || canSortComments || canToggleAllComments" class="comments-actions">
              <NewCommentsNavigation
                :count="newCommentCount"
                :position="newCommentPosition"
                @mark-seen="markAllNewCommentsSeen"
                @next="navigateToNextNewComment"
                @previous="navigateToPreviousNewComment"
              />
              <label
                v-if="canSortComments"
                class="comments-sort-control text-gray-700 dark:text-gray-300"
              >
                <LucideArrowDownUp class="h-4 w-4 shrink-0" aria-hidden="true" />
                <span class="sr-only">{{ discussionLanguage.sort.rootComments }}</span>
                <select
                  v-model="commentSort"
                  class="comments-sort-select"
                  :aria-label="discussionLanguage.sort.rootComments"
                >
                  <option value="hn">{{ discussionLanguage.sort.hn }}</option>
                  <option value="discussed">{{ discussionLanguage.sort.discussed }}</option>
                  <option value="recent">{{ discussionLanguage.sort.recent }}</option>
                </select>
              </label>
              <button
                v-if="canToggleAllComments"
                type="button"
                class="expand-comments-button text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                @click="toggleExpandAllComments"
              >
                <LucideChevronsUp v-if="areAllCommentsExpanded" class="w-4 h-4" />
                <LucideChevronsDown v-else class="w-4 h-4" />
                <span>
                  {{ areAllCommentsExpanded
                    ? discussionLanguage.actions.hideDeepReplies
                    : discussionLanguage.actions.expandAllReplies }}
                </span>
              </button>
              <button
                v-if="commentCount > 0"
                type="button"
                class="focus-comments-button text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                :aria-label="discussionLanguage.actions.focusDiscussion"
                @click="enterDiscussionFocus"
              >
                <LucideMaximize2 class="h-4 w-4" aria-hidden="true" />
                <span>{{ discussionLanguage.actions.focusDiscussion }}</span>
              </button>
            </div>
          </div>
          <div v-if="story.children.length === 0" class="text-gray-500 leading-7">
            {{ discussionLanguage.messages.noCommentsYet }}
          </div>
          <div v-else class="comments-list">
            <CommentThread
              v-for="comment in sortedComments"
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
              :new-comment-ids="newCommentIds"
              :new-descendant-counts="newDescendantCounts"
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
                :src="screenshotSrc"
                decoding="async"
                class="source-preview-dialog-image"
              />
            </div>
          </div>
        </dialog>
      </div>
      <ConversationBrowser
        v-if="isDiscussionFocusActive && storyId"
        :author-comment-counts="authorCommentCounts"
        :comment-count="commentCount"
        :descendant-counts="descendantCommentCounts"
        :navigation-nodes="commentNavigationNodes"
        :new-comment-count="newCommentCount"
        :new-comment-ids="newCommentIds"
        :new-comment-position="newCommentPosition"
        :new-descendant-counts="newDescendantCounts"
        :reader-mode="discussionReaderMode"
        :root-comments="sortedComments"
        :selected-comment-id="focusedCommentId"
        :source-url="storyExternalUrl"
        :story-author="story.author"
        :story-domain="storyDomain"
        :story-id="storyId"
        :story-title="story.title"
        :thread-author-palettes="commentThreadAuthorPalettes"
        @exit="exitDiscussionFocus"
        @mark-new-seen="markAllNewCommentsSeen"
        @next-new="navigateToNextNewComment"
        @previous-new="navigateToPreviousNewComment"
        @reader-mode="setDiscussionReaderMode"
        @select="selectFocusedComment"
      />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { LucideArrowDownUp, LucideExternalLink, LucideTrendingUp, LucideMessageSquare, LucideChevronsDown, LucideChevronsUp, LucideMaximize2, LucideX } from '@lucide/vue';
import { useSanitizer } from '~/composables/useSanitizer';
import { useAppPreferences } from '~/composables/useAppPreferences'
import { useDiscussionVisits } from '~/composables/useDiscussionVisits'
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
  getCommentPathFromIndex,
  getExpandedCommentDisclosure,
  getSmartCommentDisclosure,
  revealCommentPath,
  sortCommentThreads,
  summarizeCommentTree,
  toggleCommentReplies,
} from '#shared/utils/comments'
import {
  DEFAULT_COMMENT_READER_MODE,
  DEFAULT_ROOT_COMMENT_ORDER,
  parseCommentReaderMode,
  parseRootCommentOrder,
  type CommentReaderMode,
  type RootCommentOrder,
} from '#shared/utils/appPreferences'
import {
  countMatchingDescendants,
  getCommentIdsInTreeOrder,
} from '#shared/utils/discussionVisits'
import { formatTimeAgo } from '#shared/utils/date'
import { getHnItemUrl, getHnUserPath, normalizeHnItemId } from '#shared/utils/hn'
import { discussionLanguage } from '#shared/utils/productLanguage'
import { getScreenshotPath } from '#shared/utils/screenshot'
import {
  SITE_SOCIAL_IMAGE_ALT,
  SITE_SOCIAL_IMAGE_HEIGHT,
  SITE_SOCIAL_IMAGE_TYPE,
  SITE_SOCIAL_IMAGE_URL,
  SITE_SOCIAL_IMAGE_WIDTH,
} from '#shared/utils/siteMetadata'
import { createStoryStructuredData } from '#shared/utils/structuredData'
import { appendServerTiming } from '#shared/utils/serverTiming'
import ConversationBrowser from '~/components/comment/ConversationBrowser.vue'
import NewCommentsNavigation from '~/components/comment/NewCommentsNavigation.vue'

definePageMeta({
  validate: route => normalizeHnItemId(route.params.id) !== null,
})

const route = useRoute();
const router = useRouter()
const isClientReady = ref(false)
const {
  discussionReaderMode: preferredDiscussionReaderMode,
  isHydrated: arePreferencesHydrated,
  rootCommentOrder: preferredRootCommentOrder,
  setDiscussionReaderMode: setPreferredDiscussionReaderMode,
  setRootCommentOrder: setPreferredRootCommentOrder,
} = useAppPreferences()
const {
  acknowledgeVisit: acknowledgeDiscussionVisit,
  beginVisit: beginDiscussionVisit,
} = useDiscussionVisits()
const getFirstQueryValue = (value: unknown): string | undefined => {
  const firstValue = Array.isArray(value) ? value[0] : value

  return typeof firstValue === 'string' ? firstValue : undefined
}

const isDiscussionFocus = computed(() => {
  return getFirstQueryValue(route.query.view) === 'discussion'
})
const explicitDiscussionReaderMode = computed(() => {
  return parseCommentReaderMode(route.query.reader)
})
const discussionReaderMode = computed<CommentReaderMode>(() => {
  if (isDiscussionFocus.value && explicitDiscussionReaderMode.value) {
    return explicitDiscussionReaderMode.value
  }

  return DEFAULT_COMMENT_READER_MODE
})
const isDiscussionFocusActive = computed(() => {
  return isDiscussionFocus.value
    && isClientReady.value
    && explicitDiscussionReaderMode.value !== null
})

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

const { data: storyData, pending, error: fetchError } = await useAsyncData<StoryDetail | null>(
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

if (fetchError.value) {
  throw createError({
    statusCode: fetchError.value.statusCode ?? 500,
    statusMessage: fetchError.value.statusMessage ?? 'Failed to fetch story',
    cause: fetchError.value,
  })
}

if (!storyData.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Story not found',
  })
}

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
const discussionEngagementTarget = ref<HTMLElement | null>(null)
const isStoryContextNearViewport = ref(false)
let storyContextObserver: IntersectionObserver | null = null
let discussionEngagementObserver: IntersectionObserver | null = null
let discussionEngagementTimer: ReturnType<typeof setTimeout> | undefined
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
  if (discussionEngagementTimer) {
    clearTimeout(discussionEngagementTimer)
  }
  discussionEngagementObserver?.disconnect()
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

  const pathIds = getCommentPathFromIndex(commentNavigationNodes.value, commentId)

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
  isClientReady.value = true

  if (screenshotImage.value?.complete) {
    updateScreenshotPreviewState(screenshotImage.value)
  }

  const hashedCommentId = getCommentIdFromHash(route.hash)
  if (hashedCommentId && !isDiscussionFocus.value) {
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
  clearDiscussionEngagementTimer()
  discussionEngagementObserver?.disconnect()
  discussionEngagementObserver = null
  initializedDiscussionVisitStoryId.value = null
  hasAcknowledgedNewComments.value = false
  newCommentIds.value = new Set()
  hiddenReplyOverride.value = null
  jumpTargetCommentId.value = null
  clearStoryContext()

  if (isStoryContextNearViewport.value) {
    loadStoryContext()
  }
})

watch(() => route.hash, (hash) => {
  const commentId = getCommentIdFromHash(hash)

  if (commentId && !isDiscussionFocus.value) {
    void jumpToComment(commentId, false)
  }
})

watch(isDiscussionFocus, (isFocused, wasFocused) => {
  if (isFocused) {
    clearDiscussionEngagementTimer()
    discussionEngagementObserver?.disconnect()
    discussionEngagementObserver = null
    persistNewCommentsAsSeen()
    return
  }

  if (!wasFocused) {
    return
  }

  const commentId = getCommentIdFromHash(route.hash)

  if (commentId) {
    void jumpToComment(commentId, false)
  }
})

// Use the sanitizer
const { sanitize } = useSanitizer();
const sanitizedText = computed(() => sanitize(story.value?.text || '', `story-${storyId.value}`));

const commentSummary = computed(() => summarizeCommentTree(story.value?.children || []))
const explicitRootCommentOrder = computed(() => parseRootCommentOrder(route.query.sort))
const commentSort = computed<RootCommentOrder>({
  get: () => explicitRootCommentOrder.value ?? DEFAULT_ROOT_COMMENT_ORDER,
  set: (sort) => {
    setPreferredRootCommentOrder(sort)

    const query = { ...route.query, sort }
    void router.replace({ query, hash: route.hash })
  },
})
const commentCount = computed(() => commentSummary.value.total)
const authorCommentCounts = computed(() => commentSummary.value.authorCounts)
const commentAuthors = computed(() => commentSummary.value.commentAuthors)
const descendantCommentCounts = computed(() => commentSummary.value.descendantCounts)
const commentNavigationNodes = computed(() => commentSummary.value.navigationNodes)
const parentCommentIds = computed(() => commentSummary.value.parentCommentIds)
const rootCommentIds = computed(() => commentSummary.value.rootCommentIds)
const defaultHiddenReplyIds = computed(() => commentSummary.value.defaultHiddenReplyIds)
const sortedComments = computed(() => sortCommentThreads(
  story.value?.children ?? [],
  commentSort.value,
  commentSummary.value,
))
const currentCommentIds = computed(() => {
  return getCommentIdsInTreeOrder(story.value?.children ?? [])
})
const newCommentIds = ref<ReadonlySet<number>>(new Set())
const initializedDiscussionVisitStoryId = ref<string | null>(null)
const hasAcknowledgedNewComments = ref(false)
const newCommentIdsInDisplayOrder = computed(() => {
  return getCommentIdsInTreeOrder(sortedComments.value)
    .filter(commentId => newCommentIds.value.has(commentId))
})
const newCommentCount = computed(() => newCommentIdsInDisplayOrder.value.length)
const newDescendantCounts = computed(() => {
  return countMatchingDescendants(commentNavigationNodes.value, newCommentIds.value)
})
const focusedCommentId = computed(() => {
  const queryComment = getFirstQueryValue(route.query.comment)
  const queryCommentId = queryComment && /^\d+$/.test(queryComment)
    ? Number(queryComment)
    : null
  const hashCommentId = getCommentIdFromHash(route.hash)

  if (queryCommentId && commentNavigationNodes.value.has(queryCommentId)) {
    return queryCommentId
  }

  if (hashCommentId && commentNavigationNodes.value.has(hashCommentId)) {
    return hashCommentId
  }

  return sortedComments.value[0]?.id ?? null
})
const activeNewCommentId = computed(() => {
  return isDiscussionFocus.value
    ? focusedCommentId.value
    : jumpTargetCommentId.value
})
const newCommentPosition = computed(() => {
  if (!activeNewCommentId.value) {
    return 0
  }

  const index = newCommentIdsInDisplayOrder.value.indexOf(activeNewCommentId.value)

  return index >= 0 ? index + 1 : 0
})

const persistNewCommentsAsSeen = (dismissImmediately = false) => {
  const id = storyId.value

  if (!id || newCommentIds.value.size === 0) {
    return
  }

  if (!hasAcknowledgedNewComments.value) {
    acknowledgeDiscussionVisit(id, currentCommentIds.value)
    hasAcknowledgedNewComments.value = true
    clearDiscussionEngagementTimer()
    discussionEngagementObserver?.disconnect()
    discussionEngagementObserver = null
  }

  if (dismissImmediately) {
    newCommentIds.value = new Set()
  }
}

const clearDiscussionEngagementTimer = () => {
  if (discussionEngagementTimer) {
    clearTimeout(discussionEngagementTimer)
    discussionEngagementTimer = undefined
  }
}

const observeMeaningfulDiscussionReading = async () => {
  discussionEngagementObserver?.disconnect()
  discussionEngagementObserver = null
  clearDiscussionEngagementTimer()

  if (
    !import.meta.client
    || newCommentIds.value.size === 0
    || !('IntersectionObserver' in window)
  ) {
    return
  }

  await nextTick()

  if (!discussionEngagementTarget.value) {
    return
  }

  discussionEngagementObserver = new IntersectionObserver((entries) => {
    const isReadingDiscussion = entries.some((entry) => {
      return entry.isIntersecting && entry.intersectionRatio >= 0.6
    })

    if (!isReadingDiscussion) {
      clearDiscussionEngagementTimer()
      return
    }

    if (discussionEngagementTimer || hasAcknowledgedNewComments.value) {
      return
    }

    discussionEngagementTimer = setTimeout(() => {
      discussionEngagementTimer = undefined
      persistNewCommentsAsSeen()
      discussionEngagementObserver?.disconnect()
      discussionEngagementObserver = null
    }, 1_200)
  }, { threshold: [0.6] })
  discussionEngagementObserver.observe(discussionEngagementTarget.value)
}

const initializeDiscussionVisit = () => {
  const id = storyId.value

  if (
    !import.meta.client
    || !isClientReady.value
    || !id
    || !story.value
    || isLoading.value
    || initializedDiscussionVisitStoryId.value === id
  ) {
    return
  }

  const visit = beginDiscussionVisit(id, currentCommentIds.value)

  initializedDiscussionVisitStoryId.value = id
  hasAcknowledgedNewComments.value = false
  newCommentIds.value = visit.isTracked
    ? visit.newCommentIds
    : new Set()

  if (isDiscussionFocus.value) {
    persistNewCommentsAsSeen()
  } else {
    void observeMeaningfulDiscussionReading()
  }
}

const navigateToNewComment = (direction: 1 | -1) => {
  const ids = newCommentIdsInDisplayOrder.value

  if (ids.length === 0) {
    return
  }

  const currentIndex = activeNewCommentId.value
    ? ids.indexOf(activeNewCommentId.value)
    : -1
  const nextIndex = currentIndex < 0
    ? (direction > 0 ? 0 : ids.length - 1)
    : (currentIndex + direction + ids.length) % ids.length
  const nextCommentId = ids[nextIndex]

  if (!nextCommentId) {
    return
  }

  persistNewCommentsAsSeen()

  if (isDiscussionFocus.value) {
    selectFocusedComment(nextCommentId)
  } else {
    void jumpToComment(nextCommentId)
  }
}

const navigateToNextNewComment = () => navigateToNewComment(1)
const navigateToPreviousNewComment = () => navigateToNewComment(-1)
const markAllNewCommentsSeen = () => persistNewCommentsAsSeen(true)

const enterDiscussionFocus = () => {
  persistNewCommentsAsSeen()
  const windowHashCommentId = import.meta.client
    ? getCommentIdFromHash(window.location.hash)
    : null
  const commentId = windowHashCommentId && commentNavigationNodes.value.has(windowHashCommentId)
    ? windowHashCommentId
    : focusedCommentId.value
  const query = {
    ...route.query,
    view: 'discussion',
    ...(commentId ? { comment: String(commentId) } : {}),
    reader: preferredDiscussionReaderMode.value,
  }

  void router.push({ query, hash: '' })
}

const exitDiscussionFocus = async () => {
  const commentId = focusedCommentId.value
  const query = { ...route.query }
  delete query.view
  delete query.comment
  delete query.reader

  if (commentId) {
    const pathIds = getCommentPathFromIndex(commentNavigationNodes.value, commentId)

    if (pathIds) {
      hiddenReplyOverride.value = revealCommentPath(hiddenReplyIds.value, pathIds)
      await nextTick()
    }
  }

  const hash = commentId
    ? `#comment-${commentId}`
    : route.hash

  await router.replace({ query, hash })
}

const selectFocusedComment = (commentId: number) => {
  if (!commentNavigationNodes.value.has(commentId)) {
    return
  }

  const query = { ...route.query, comment: String(commentId) }

  void router.replace({ query, hash: '' })
}

const setDiscussionReaderMode = (mode: CommentReaderMode) => {
  setPreferredDiscussionReaderMode(mode)

  if (!isDiscussionFocus.value) {
    return
  }

  const query = { ...route.query, reader: mode }

  void router.replace({ query, hash: '' })
}

watch(
  [isClientReady, storyId, story, isLoading],
  initializeDiscussionVisit,
  { flush: 'post', immediate: true },
)

watch(
  [
    arePreferencesHydrated,
    isDiscussionFocus,
    () => route.query.reader,
    () => route.query.sort,
  ],
  ([preferencesHydrated, isFocused, queryReader, querySort]) => {
    if (import.meta.server || !preferencesHydrated) {
      return
    }

    const query = { ...route.query }
    let shouldReplace = false

    if (!parseRootCommentOrder(querySort)) {
      query.sort = preferredRootCommentOrder.value
      shouldReplace = true
    }

    if (isFocused && !parseCommentReaderMode(queryReader)) {
      query.reader = preferredDiscussionReaderMode.value
      shouldReplace = true
    }

    if (!shouldReplace) {
      return
    }

    void router.replace({ query, hash: route.hash })
  },
  { immediate: true },
)

watch([isDiscussionFocus, focusedCommentId], ([isFocused, commentId]) => {
  const queryComment = getFirstQueryValue(route.query.comment)

  if (import.meta.server || !isFocused || !commentId || queryComment === String(commentId)) {
    return
  }

  const query = { ...route.query, comment: String(commentId) }

  void router.replace({
    query,
    hash: '',
  })
}, { immediate: true })

const canSortComments = computed(() => (story.value?.children.length ?? 0) > 1)
const EMPTY_COMMENT_THREAD_AUTHOR_PALETTE: CommentThreadAuthorPalette = {
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

const title = computed(() => story.value?.title ?? 'Loading...')
const seoTitle = computed(() => `${title.value} — HN Glance`)
useCanonicalUrl(() => storyId.value ? `/item/${storyId.value}` : null)
useStructuredData('story-webpage', () => storyId.value && story.value
  ? createStoryStructuredData(storyId.value, story.value)
  : null)

useHead(() => ({
  bodyAttrs: {
    class: isDiscussionFocusActive.value && story.value ? 'discussion-focus-active' : undefined,
  },
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
  ogImage: SITE_SOCIAL_IMAGE_URL,
  ogImageType: SITE_SOCIAL_IMAGE_TYPE,
  ogImageWidth: SITE_SOCIAL_IMAGE_WIDTH,
  ogImageHeight: SITE_SOCIAL_IMAGE_HEIGHT,
  ogImageAlt: SITE_SOCIAL_IMAGE_ALT,
  twitterCard: 'summary_large_image',
  twitterImage: SITE_SOCIAL_IMAGE_URL,
  twitterImageAlt: SITE_SOCIAL_IMAGE_ALT,
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

.comments-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
}

.comments-sort-control,
.expand-comments-button,
.focus-comments-button {
  min-height: 2rem;
  border: 1px solid rgb(148 163 184 / 0.24);
  border-radius: 999px;
  background: rgb(148 163 184 / 0.08);
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.comments-sort-control {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.55rem;
}

.comments-sort-select {
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  line-height: 1.2;
}

.dark .comments-sort-select {
  color-scheme: dark;
}

.expand-comments-button,
.focus-comments-button {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.7rem;
}

.comments-sort-control:hover,
.comments-sort-control:focus-within,
.expand-comments-button:hover,
.focus-comments-button:hover {
  border-color: rgb(148 163 184 / 0.38);
  background: rgb(148 163 184 / 0.13);
}

.comments-sort-control:focus-within {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

.focus-comments-button:focus-visible,
.expand-comments-button:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

:global(body.discussion-focus-active) {
  overflow: hidden;
}

@media (max-width: 640px) {
  .comments-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .comments-actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
