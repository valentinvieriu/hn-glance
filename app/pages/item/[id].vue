<template>
  <div class="min-h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
    <div class="layout-frame py-8 md:py-10">
      <template v-if="story">
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
          <SourceScreenshotPreview
            v-if="storyId"
            :domain="storyDomain"
            :external-url="storyExternalUrl"
            :story-id="storyId"
            :title="story.title"
          />
          <div
            class="story-detail-text reading-text rich-text reading-measure mb-5 text-base leading-7 text-gray-700 dark:text-gray-300"
            v-html="sanitizedText"
          ></div>
          </article>
          <div ref="storyContextRoot" class="story-detail-history min-w-0">
            <SubmissionHistory
              v-if="storyId"
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
          <div v-if="story.children.length === 0" class="comments-empty-state text-gray-500">
            <p>{{ discussionLanguage.messages.noCommentsYet }}</p>
            <a
              v-if="storyDiscussionUrl"
              :href="storyDiscussionUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="comments-empty-reply-link"
              :aria-label="discussionLanguage.accessibility.startDiscussionOnHackerNews"
            >
              <span>{{ discussionLanguage.actions.startDiscussionOnHackerNews }}</span>
              <LucideExternalLink class="h-3.5 w-3.5" aria-hidden="true" />
            </a>
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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { LucideArrowDownUp, LucideExternalLink, LucideTrendingUp, LucideMessageSquare, LucideChevronsDown, LucideChevronsUp, LucideMaximize2 } from '@lucide/vue';
import { useSanitizer } from '~/composables/useSanitizer';
import { useCommentDisclosure } from '~/composables/useCommentDisclosure'
import { useDiscussionRoute } from '~/composables/useDiscussionRoute'
import { useNewComments } from '~/composables/useNewComments'
import {
  getCommentThreadAuthorPalette,
  getStoryContextPaletteStyle,
  type CommentThreadAuthorPalette,
} from '~/composables/useSeedPalette';
import type { StoryContextResponse, StoryDetail } from '#shared/types'
import { summarizeCommentTree } from '#shared/utils/comments'
import { formatTimeAgo } from '#shared/utils/date'
import {
  getHnItemUrl,
  getHnUserPath,
  normalizeHnItemId,
} from '#shared/utils/hn'
import { discussionLanguage } from '#shared/utils/productLanguage'
import { getScreenshotPath } from '#shared/utils/screenshot'
import { getUrlDomain } from '#shared/utils/url'
import { createStoryStructuredData } from '#shared/utils/structuredData'
import { appendServerTiming } from '#shared/utils/serverTiming'
import ConversationBrowser from '~/components/comment/ConversationBrowser.vue'
import NewCommentsNavigation from '~/components/comment/NewCommentsNavigation.vue'

definePageMeta({
  validate: route => normalizeHnItemId(route.params.id) !== null,
})

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

const { data: storyData, pending: isLoading, error: fetchError } = await useAsyncData<StoryDetail | null>(
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
  { default: () => null },
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
const storyContextRoot = ref<HTMLElement | null>(null)
let storyContextObserver: IntersectionObserver | null = null
const {
  data: storyContext,
  status: storyContextStatus,
  error: storyContextError,
  execute: executeStoryContext,
} = useLazyFetch<StoryContextResponse>(
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
const storyDiscussionUrl = computed(() => storyId.value
  ? getHnItemUrl(storyId.value)
  : '')
const storyDomain = computed(() => getUrlDomain(storyExternalUrl.value, 'source'))

const storyContextPaletteStyle = computed(() => {
  return getStoryContextPaletteStyle(storyId.value, storyDomain.value)
})

// Use the sanitizer
const { sanitize } = useSanitizer();
const sanitizedText = computed(() => sanitize(story.value?.text || '', `story-${storyId.value}`));

const commentSummary = computed(() => summarizeCommentTree(story.value?.children || []))
const commentCount = computed(() => commentSummary.value.total)
const authorCommentCounts = computed(() => commentSummary.value.authorCounts)
const commentAuthors = computed(() => commentSummary.value.commentAuthors)
const descendantCommentCounts = computed(() => commentSummary.value.descendantCounts)
const commentNavigationNodes = computed(() => commentSummary.value.navigationNodes)
const parentCommentIds = computed(() => commentSummary.value.parentCommentIds)
const rootCommentIds = computed(() => commentSummary.value.rootCommentIds)

const {
  commentSort,
  discussionReaderMode,
  enterDiscussionFocus,
  exitDiscussionFocus: leaveDiscussionFocus,
  focusedCommentId,
  isDiscussionFocus,
  isDiscussionFocusActive,
  selectFocusedComment,
  setDiscussionReaderMode,
  sortedComments,
} = useDiscussionRoute({
  rootComments: () => story.value?.children ?? [],
  summary: commentSummary,
})

const {
  areAllCommentsExpanded,
  canToggleAllComments,
  hiddenReplyIds,
  jumpTargetCommentId,
  jumpToComment,
  revealComment,
  toggleExpandAllComments,
  toggleRepliesHidden,
} = useCommentDisclosure({
  summary: commentSummary,
  isDiscussionFocus,
})

const discussionEngagementTarget = ref<HTMLElement | null>(null)
const {
  markAllNewCommentsSeen,
  navigateToNextNewComment,
  navigateToPreviousNewComment,
  newCommentCount,
  newCommentIds,
  newCommentPosition,
  newDescendantCounts,
} = useNewComments({
  engagementTarget: discussionEngagementTarget,
  storyId,
  comments: () => story.value?.children,
  sortedComments,
  navigationNodes: commentNavigationNodes,
  isLoading,
  isDiscussionFocus,
  focusedCommentId,
  jumpTargetCommentId,
  selectFocusedComment,
  jumpToComment,
})

// The overview renders the current comment's ancestors before the hash jump.
const exitDiscussionFocus = async () => {
  if (focusedCommentId.value) {
    await revealComment(focusedCommentId.value)
  }

  await leaveDiscussionFocus()
}

onMounted(() => {
  if (!storyContextRoot.value || !('IntersectionObserver' in window)) {
    loadStoryContext()
    return
  }

  storyContextObserver = new IntersectionObserver(
    (entries) => {
      if (!entries.some(entry => entry.isIntersecting)) {
        return
      }

      storyContextObserver?.disconnect()
      storyContextObserver = null
      loadStoryContext()
    },
    { rootMargin: '400px 0px' },
  )
  storyContextObserver.observe(storyContextRoot.value)
})

onBeforeUnmount(() => {
  storyContextObserver?.disconnect()
})

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

const timeAgo = computed(() => {
  return formatTimeAgo(story.value?.created_at || '')
});

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

usePageSeo({
  title: () => `${story.value?.title ?? 'Loading...'} — HN Glance`,
  description: () => story.value
    ? `Read the story titled "${story.value.title}" by ${story.value.author}.`
    : 'Loading story...',
  path: () => storyId.value ? `/item/${storyId.value}` : null,
})
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
}

@media (min-width: 1536px) {
  .story-detail-layout {
    grid-template-columns: minmax(0, 1.35fr) minmax(34rem, 0.9fr);
  }
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

.comments-empty-state {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  line-height: 1.75;
}

.comments-empty-reply-link {
  display: inline-flex;
  min-height: 2rem;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid rgb(148 163 184 / 0.24);
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
  background: rgb(148 163 184 / 0.08);
  color: rgb(55 65 81);
  font-size: 0.8125rem;
  font-weight: 650;
  line-height: 1;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.comments-empty-reply-link:hover {
  border-color: rgb(148 163 184 / 0.38);
  background: rgb(148 163 184 / 0.13);
  color: rgb(17 24 39);
}

.comments-empty-reply-link:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

.dark .comments-empty-reply-link {
  color: rgb(209 213 219);
}

.dark .comments-empty-reply-link:hover {
  color: rgb(243 244 246);
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
