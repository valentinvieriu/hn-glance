<template>
  <SiteErrorPage
    v-if="pageError"
    :status-code="pageErrorStatusCode"
    :status-message="pageErrorTitle"
  />

  <div v-else class="user-shell grid-paper-backdrop seed-palette-surface min-h-full text-slate-900 dark:text-slate-100" :style="userPaletteStyle">
    <div class="layout-frame py-8 md:py-10">
      <div>
        <header class="user-hero layout-content">
          <div class="min-w-0">
            <p class="user-kicker meta-text mb-2 inline-flex items-center gap-2 font-semibold uppercase">
              <span class="user-kicker-dot h-2.5 w-2.5 rounded-full" aria-hidden="true"></span>
              HN user
            </p>
            <h1 class="mb-3 text-3xl font-display font-semibold leading-tight md:text-5xl">
              {{ displayUsername }}
            </h1>
            <div class="meta-text flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-600 dark:text-slate-300">
              <span class="inline-flex items-center gap-1.5">
                <LucideTrendingUp class="h-4 w-4" aria-hidden="true" />
                {{ formattedKarma }}
              </span>
              <span v-if="joinedDate" class="inline-flex items-center gap-1.5">
                <LucideClock class="h-4 w-4" aria-hidden="true" />
                {{ joinedDate }}
              </span>
            </div>
            <div
              v-if="sanitizedAbout"
              class="rich-text user-about mt-5 max-w-3xl text-sm leading-7 text-slate-700 dark:text-slate-200"
              v-html="sanitizedAbout"
            ></div>
          </div>

          <div class="user-summary-panel">
            <div class="user-summary-grid">
              <div class="user-stat">
                <span class="user-stat-label">Posts</span>
                <span class="user-stat-value">{{ formattedPostTotal }}</span>
              </div>
              <div class="user-stat">
                <span class="user-stat-label">Comments</span>
                <span class="user-stat-value">{{ formattedCommentTotal }}</span>
              </div>
            </div>
            <a
              :href="hnUserUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="user-hn-link"
            >
              <LucideExternalLink class="h-4 w-4" aria-hidden="true" />
              <span>View on HN</span>
            </a>
          </div>
        </header>

        <div class="activity-toolbar layout-content">
          <div class="activity-tabs" role="tablist" aria-label="User activity">
            <button
              type="button"
              role="tab"
              class="activity-tab"
              :class="{ 'activity-tab-active': activeTab === 'posts' }"
              :aria-selected="activeTab === 'posts'"
              @click="activeTab = 'posts'"
            >
              <LucideFileText class="h-4 w-4" aria-hidden="true" />
              <span>Posts</span>
              <span class="activity-tab-count">{{ formattedPostTotal }}</span>
            </button>
            <button
              type="button"
              role="tab"
              class="activity-tab"
              :class="{ 'activity-tab-active': activeTab === 'comments' }"
              :aria-selected="activeTab === 'comments'"
              @click="activeTab = 'comments'"
            >
              <LucideMessageSquare class="h-4 w-4" aria-hidden="true" />
              <span>Comments</span>
              <span class="activity-tab-count">{{ formattedCommentTotal }}</span>
            </button>
          </div>
        </div>

        <UserActivityPanel
          v-show="activeTab === 'posts'"
          :active="activeTab === 'posts'"
          empty-text="No posts found."
          :error-message="posts.errorMessage.value"
          :has-more="posts.hasMore.value"
          :is-empty="posts.items.value.length === 0"
          :is-initial-loading="posts.isInitialLoading.value"
          :is-loading-more="posts.isLoadingMore.value"
          label="Posts"
          loading-text="Loading posts"
          @load-more="posts.loadMore"
        >
          <template #loading>
            <div class="story-grid" aria-busy="true">
              <div
                v-for="index in 6"
                :key="`user-post-loading-${index}`"
                class="user-post-skeleton"
                aria-hidden="true"
              >
                <div class="user-post-skeleton-shot"></div>
                <div class="user-post-skeleton-body">
                  <span class="skeleton-line w-28"></span>
                  <span class="skeleton-line w-11/12"></span>
                  <span class="skeleton-line w-8/12"></span>
                </div>
              </div>
            </div>
          </template>

          <div class="story-grid">
            <StoryCard
              v-for="post in posts.items.value"
              :key="post.objectID"
              :story="post"
            />
          </div>
        </UserActivityPanel>

        <UserActivityPanel
          v-show="activeTab === 'comments'"
          class="layout-content"
          :active="activeTab === 'comments'"
          empty-text="No comments found."
          :error-message="comments.errorMessage.value"
          :has-more="comments.hasMore.value"
          :is-empty="comments.items.value.length === 0"
          :is-initial-loading="comments.isInitialLoading.value"
          :is-loading-more="comments.isLoadingMore.value"
          label="Comments"
          loading-text="Loading comments"
          @load-more="comments.loadMore"
        >
          <template #loading>
            <div class="space-y-4" aria-busy="true">
              <div
                v-for="index in 6"
                :key="`user-comment-loading-${index}`"
                class="user-comment-skeleton"
                aria-hidden="true"
              >
                <span class="skeleton-line w-9/12"></span>
                <span class="skeleton-line w-full"></span>
                <span class="skeleton-line w-10/12"></span>
              </div>
            </div>
          </template>

          <div class="space-y-4">
            <UserCommentCard
              v-for="comment in comments.items.value"
              :key="comment.objectID"
              :comment="comment"
            />
          </div>
        </UserActivityPanel>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  LucideClock,
  LucideExternalLink,
  LucideFileText,
  LucideMessageSquare,
  LucideTrendingUp,
} from '@lucide/vue'
import type { HNUserProfile, UserComment, UserPost } from '#shared/types'
import { formatCalendarDate, formatTimeAgo } from '#shared/utils/date'
import { getHnUserPath, getHnUserUrl, normalizeHnUsername } from '#shared/utils/hn'
import { useSanitizer } from '~/composables/useSanitizer'
import { getSeedPaletteStyle } from '~/composables/useSeedPalette'
import { useUserActivityFeed } from '~/composables/useUserActivityFeed'

definePageMeta({
  validate: route => normalizeHnUsername(route.params.username) !== '',
})

type ActivityTab = 'comments' | 'posts'

const route = useRoute()
const { sanitize } = useSanitizer()
const numberFormatter = new Intl.NumberFormat('en-US')

const username = computed(() => normalizeHnUsername(route.params.username))
const activeTab = ref<ActivityTab>('posts')

const { data: profile, pending: profilePending, error: profileFetchError } = await useAsyncData<HNUserProfile | null>(
  () => `user-profile:${username.value || 'missing'}`,
  async () => {
    if (!username.value) {
      return null
    }

    return await $fetch<HNUserProfile>(`/api/user/${encodeURIComponent(username.value)}`)
  },
  { default: () => null },
)

const profileUsername = computed(() => profile.value?.username ?? '')
const posts = useUserActivityFeed<UserPost>('stories', profileUsername, 'Failed to load posts')
const comments = useUserActivityFeed<UserComment>('comments', profileUsername, 'Failed to load comments')

await Promise.all([posts.initialPage, comments.initialPage])

const pageError = computed(() => {
  if (!username.value) {
    return 'A valid HN username is required.'
  }

  if (profileFetchError.value) {
    return profileFetchError.value.message
  }

  if (!profilePending.value && !profile.value) {
    return 'This HN user could not be loaded.'
  }

  return null
})
const pageErrorTitle = computed(() => {
  return profileFetchError.value && profileFetchError.value.statusCode !== 404
    ? 'User unavailable'
    : 'User not found'
})
const pageErrorStatusCode = computed(() => profileFetchError.value?.statusCode ?? 404)

const displayUsername = computed(() => profile.value?.username || username.value)
const userPaletteStyle = computed(() => getSeedPaletteStyle(displayUsername.value))
const hnUserUrl = computed(() => getHnUserUrl(displayUsername.value))
const formattedKarma = computed(() => `${numberFormatter.format(profile.value?.karma || 0)} karma`)
const formattedPostTotal = computed(() => numberFormatter.format(posts.total.value))
const formattedCommentTotal = computed(() => numberFormatter.format(comments.total.value))
const sanitizedAbout = computed(() => sanitize(profile.value?.about || '', `user-about-${displayUsername.value}`))

const joinedDate = computed(() => {
  if (!profile.value?.created_at) {
    return ''
  }

  const createdAt = new Date(profile.value.created_at)

  if (Number.isNaN(createdAt.getTime())) {
    return ''
  }

  return `${formatCalendarDate(createdAt)} (${formatTimeAgo(createdAt)})`
})

// While the error page is shown, SiteErrorPage owns the title and robots tags.
usePageSeo({
  title: () => pageError.value ? undefined : `${displayUsername.value} on HN Glance`,
  description: () => pageError.value ? undefined : `Posts and comments by ${displayUsername.value} on Hacker News.`,
  path: () => pageError.value ? null : getHnUserPath(displayUsername.value),
  robots: () => pageError.value ? undefined : 'index, follow',
})

if (import.meta.server && (profileFetchError.value || !profile.value)) {
  const requestEvent = useRequestEvent()

  if (requestEvent) {
    setResponseStatus(
      requestEvent,
      profileFetchError.value?.statusCode ?? 404,
      profileFetchError.value?.statusMessage ?? 'User not found',
    )
  }
}
</script>

<style scoped>
.user-shell {
  --grid-paper-mask-strength: 0.46;
  --grid-paper-fade: 72%;
  background:
    radial-gradient(circle at 8% -9%, var(--seed-ring) 0, transparent 31rem),
    radial-gradient(circle at 90% -7%, rgb(249 115 22 / 0.14) 0, transparent 29rem),
    linear-gradient(135deg, rgb(248 250 252) 0%, rgb(241 245 249) 52%, rgb(255 247 237) 100%);
}

.dark .user-shell {
  background:
    radial-gradient(circle at 8% -9%, var(--seed-ring) 0, transparent 31rem),
    radial-gradient(circle at 90% -7%, rgb(249 115 22 / 0.14) 0, transparent 29rem),
    linear-gradient(135deg, rgb(15 23 42) 0%, rgb(17 24 39) 52%, rgb(12 18 31) 100%);
}

.user-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--seed-border);
}

.user-kicker {
  color: var(--seed-accent-strong);
}

.user-kicker-dot {
  background: var(--seed-accent);
  box-shadow:
    0 0 0 4px var(--seed-ring),
    0 8px 22px var(--seed-ring);
}

.user-about {
  border-left: 3px solid var(--seed-border);
  padding-left: 1rem;
}

.user-summary-panel {
  align-self: start;
  border: 1px solid color-mix(in oklch, var(--seed-border) 82%, transparent);
  border-radius: 0.5rem;
  background:
    linear-gradient(135deg, var(--seed-highlight), transparent 36%),
    linear-gradient(180deg, var(--seed-surface-raised), var(--seed-surface)),
    rgb(255 255 255 / 0.74);
  padding: 1rem;
  box-shadow:
    0 16px 42px var(--seed-shadow),
    inset 0 1px 0 rgb(255 255 255 / 0.34);
}

.dark .user-summary-panel {
  background:
    linear-gradient(135deg, var(--seed-highlight), transparent 36%),
    linear-gradient(180deg, var(--seed-surface-raised), var(--seed-surface)),
    rgb(15 23 42 / 0.62);
  box-shadow:
    0 16px 42px var(--seed-shadow),
    inset 0 1px 0 rgb(255 255 255 / 0.08);
}

.user-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.user-stat {
  min-width: 0;
  border-radius: 0.45rem;
  border: 1px solid var(--seed-metric-border);
  background:
    linear-gradient(180deg, var(--seed-highlight), transparent 48%),
    var(--seed-metric-bg);
  padding: 0.8rem;
  box-shadow: 0 1px 0 rgb(255 255 255 / 0.34) inset;
}

.user-stat-label,
.user-stat-value {
  display: block;
}

.user-stat-label {
  margin-bottom: 0.25rem;
  color: rgb(71 85 105);
  font-size: 0.74rem;
  font-weight: 700;
  line-height: 1.2;
}

.dark .user-stat-label {
  color: rgb(203 213 225);
}

.user-stat-value {
  color: var(--seed-author-text);
  font-family: var(--font-ui);
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1;
}

.user-hn-link {
  display: inline-flex;
  min-height: 2.35rem;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 1px solid var(--seed-border);
  border-radius: 0.45rem;
  color: var(--seed-author-text);
  font-size: 0.84rem;
  font-weight: 700;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    color 160ms ease;
}

.user-hn-link:hover {
  border-color: var(--seed-accent);
  background: var(--seed-accent-soft);
  color: var(--seed-accent-strong);
}

.activity-toolbar {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 1.35rem;
}

.activity-tabs {
  display: inline-flex;
  max-width: 100%;
  gap: 0.25rem;
  overflow-x: auto;
  border: 1px solid color-mix(in oklch, var(--seed-border) 82%, transparent);
  border-radius: 0.5rem;
  background:
    linear-gradient(135deg, var(--seed-highlight), transparent 36%),
    rgb(255 255 255 / 0.68);
  padding: 0.25rem;
  box-shadow: 0 12px 30px var(--seed-shadow);
  scrollbar-width: none;
}

.activity-tabs::-webkit-scrollbar {
  display: none;
}

.dark .activity-tabs {
  background:
    linear-gradient(135deg, var(--seed-highlight), transparent 36%),
    rgb(15 23 42 / 0.62);
}

.activity-tab {
  display: inline-flex;
  min-height: 2.2rem;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.42rem;
  border-radius: 0.38rem;
  padding: 0.45rem 0.7rem;
  color: rgb(71 85 105);
  font-size: 0.83rem;
  font-weight: 700;
  line-height: 1;
  transition:
    background-color 160ms ease,
    color 160ms ease;
}

.dark .activity-tab {
  color: rgb(203 213 225);
}

.activity-tab:hover {
  color: var(--seed-accent-strong);
}

.activity-tab-active,
.dark .activity-tab-active {
  background:
    linear-gradient(180deg, var(--seed-highlight), transparent 46%),
    var(--seed-metric-bg-hover);
  color: var(--seed-accent-strong);
}

.activity-tab-count {
  min-width: 1.35rem;
  border-radius: 999px;
  background: rgb(15 23 42 / 0.08);
  padding: 0.14rem 0.38rem;
  text-align: center;
  font-size: 0.72rem;
}

.dark .activity-tab-count {
  background: rgb(255 255 255 / 0.1);
}

.user-post-skeleton,
.user-comment-skeleton {
  overflow: hidden;
  border: 1px solid color-mix(in oklch, var(--seed-border) 82%, transparent);
  border-radius: 0.5rem;
  background:
    linear-gradient(135deg, var(--seed-highlight), transparent 36%),
    linear-gradient(180deg, var(--seed-surface-raised), var(--seed-surface)),
    rgb(255 255 255 / 0.72);
  box-shadow: 0 14px 34px var(--seed-shadow);
}

.dark .user-post-skeleton,
.dark .user-comment-skeleton {
  background:
    linear-gradient(135deg, var(--seed-highlight), transparent 36%),
    linear-gradient(180deg, var(--seed-surface-raised), var(--seed-surface)),
    rgb(15 23 42 / 0.62);
}

.user-post-skeleton-shot {
  aspect-ratio: 1;
  background:
    radial-gradient(circle at 24% 22%, var(--seed-accent-soft), transparent 28%),
    linear-gradient(180deg, var(--seed-surface) 0%, var(--seed-surface-strong) 100%);
}

.user-post-skeleton-body,
.user-comment-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 1rem;
}

.skeleton-line {
  display: block;
  height: 0.7rem;
  border-radius: 999px;
  background:
    linear-gradient(180deg, var(--seed-highlight), transparent 48%),
    var(--seed-metric-bg);
  border: 1px solid var(--seed-metric-border);
}

@media (min-width: 900px) {
  .user-hero {
    grid-template-columns: minmax(0, 1fr) minmax(17rem, 20rem);
    align-items: start;
  }
}
</style>
