<template>
  <section
    v-if="totalLinks > 0 && presentation === 'section'"
    class="comment-links mt-10"
    aria-labelledby="comment-links-title"
    data-testid="comment-links"
  >
    <div class="story-context-section-header">
      <div class="story-context-section-heading">
        <span class="story-context-section-icon" aria-hidden="true">
          <LucideMessagesSquare class="h-4 w-4" />
        </span>
        <h2
          id="comment-links-title"
          class="section-title mb-0 text-xl font-semibold text-gray-900 dark:text-gray-100"
        >
          From the Discussion
        </h2>
      </div>
      <span
        class="story-context-section-count"
        :aria-label="`${totalLinks} ${totalLinks === 1 ? 'link' : 'links'} shared in comments`"
      >
        {{ totalLinks }}
      </span>
    </div>

    <div class="comment-link-sections">
      <section
        v-for="section in sections"
        :key="section.category"
        class="comment-link-section"
        :aria-labelledby="`comment-links-${section.category}`"
      >
        <div
          class="comment-link-group-header"
          :style="getCategoryStyle(section.category)"
        >
          <span :id="`comment-links-${section.category}`" class="comment-link-group-title">
            {{ getCategoryMeta(section.category).label }}
          </span>
          <span class="comment-link-group-count">{{ section.links.length }}</span>
        </div>
        <ul class="comment-link-list">
          <li
            v-for="link in section.links"
            :key="link.url"
            class="comment-link-row story-context-interactive-row"
          >
            <CommentLinkSource :link="link">
              <div class="comment-link-meta meta-text">
                <span>shared by</span>
                <span
                  class="comment-link-author-chip seed-palette-surface"
                  :class="getAuthorSeedClass(link)"
                  :style="getAuthorSeedStyle(link)"
                >
                  <span class="comment-link-author-dot" aria-hidden="true"></span>
                  <NuxtLink
                    :to="getHnUserPath(getActiveMention(link).author)"
                    class="comment-link-author story-context-secondary-link"
                  >
                    {{ getActiveMention(link).author }}
                  </NuxtLink>
                </span>
                <span aria-hidden="true">·</span>
                <a
                  :href="`#comment-${getActiveMention(link).commentId}`"
                  class="comment-link-jump story-context-secondary-link seed-palette-surface"
                  :class="getAuthorSeedClass(link)"
                  :style="getAuthorSeedStyle(link)"
                  :aria-label="getJumpAriaLabel(link)"
                  :title="getActiveMention(link).excerpt || undefined"
                  @click.prevent="handleJump(link)"
                >
                  <LucideCornerDownRight class="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {{ link.mentions.length > 1 ? `In ${link.mentions.length} comments` : 'View comment' }}
                  </span>
                </a>
              </div>
            </CommentLinkSource>
          </li>
        </ul>
      </section>
    </div>
  </section>

  <aside
    v-else-if="totalLinks > 0"
    class="comment-links-reader"
    aria-label="Links in this comment"
  >
    <p class="comment-links-reader-label">Links in this comment</p>
    <ul class="comment-links-reader-list">
      <li v-for="link in links" :key="link.url" class="comment-links-reader-row">
        <CommentLinkSource :link="link" presentation="reader" />
      </li>
    </ul>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  LucideCornerDownRight,
  LucideMessagesSquare,
} from '@lucide/vue'
import type { Comment } from '#shared/types'
import {
  extractCommentLinks,
  groupCommentLinks,
  type CommentLink,
  type CommentLinkCategory,
  type CommentLinkMention,
} from '#shared/utils/commentLinks'
import { getHnUserPath } from '#shared/utils/hn'
import {
  getSeedPaletteStyle,
  type CommentThreadAuthorPalette,
} from '~/composables/useSeedPalette'
import CommentLinkSource from './CommentLinkSource.vue'

const props = defineProps<{
  comments: Comment[]
  storyUrl?: string
  authorCommentCounts?: ReadonlyMap<string, number>
  threadAuthorPalettes?: ReadonlyMap<number, CommentThreadAuthorPalette>
  rootCommentIds?: ReadonlyMap<number, number>
  presentation?: 'section' | 'reader'
}>()

const presentation = computed(() => props.presentation ?? 'section')

const emit = defineEmits<{
  jumpToComment: [commentId: number]
}>()

const CATEGORY_META = {
  wikipedia: {
    hue: 205,
    label: 'Reference',
  },
  video: {
    hue: 28,
    label: 'Video',
  },
  code: {
    hue: 268,
    label: 'Code',
  },
  papers: {
    hue: 48,
    label: 'Papers',
  },
  documentation: {
    hue: 158,
    label: 'Documentation',
  },
  news: {
    hue: 338,
    label: 'News',
  },
  social: {
    hue: 18,
    label: 'Social',
  },
  discussion: {
    hue: 228,
    label: 'Discussion',
  },
  other: {
    hue: 88,
    label: 'Other Links',
  },
} as const

const links = computed(() => extractCommentLinks(props.comments, {
  excludedUrls: [props.storyUrl],
  includeDescendants: presentation.value === 'section',
}))
const totalLinks = computed(() => links.value.length)
const sections = computed(() => groupCommentLinks(links.value))

const activeMentionIndexes = ref(new Map<string, number>())

watch(links, () => {
  activeMentionIndexes.value = new Map()
})

const getCategoryMeta = (category: CommentLinkCategory) => {
  return CATEGORY_META[category]
}

const getCategoryStyle = (category: CommentLinkCategory) => {
  return {
    '--comment-link-hue': String(getCategoryMeta(category).hue),
  }
}

const getActiveMentionIndex = (link: CommentLink) => {
  return (activeMentionIndexes.value.get(link.url) ?? 0) % link.mentions.length
}

const getActiveMention = (link: CommentLink): CommentLinkMention => {
  return link.mentions[getActiveMentionIndex(link)] ?? {
    author: 'commenter',
    commentId: 0,
    excerpt: '',
  }
}

const getAuthorSeedStyle = (link: CommentLink) => {
  const mention = getActiveMention(link)
  const rootCommentId = props.rootCommentIds?.get(mention.commentId)

  return props.threadAuthorPalettes
    ?.get(rootCommentId ?? 0)
    ?.authorStyles.get(mention.author)
    ?? getSeedPaletteStyle(mention.author)
}

// Matches CommentThread: a jump keeps both the thread-local hue and the quieter
// treatment reserved for voices that appear only once in the discussion.
const getAuthorSeedClass = (link: CommentLink) => {
  const mention = getActiveMention(link)

  return {
    'seed-palette-quiet': (props.authorCommentCounts?.get(mention.author) ?? 1) < 2,
  }
}

const getJumpAriaLabel = (link: CommentLink) => {
  const mention = getActiveMention(link)

  if (link.mentions.length === 1) {
    return `View ${mention.author}'s comment sharing ${link.title}`
  }

  return `View comment ${getActiveMentionIndex(link) + 1} of ${link.mentions.length} by ${mention.author}`
}

const handleJump = (link: CommentLink) => {
  emit('jumpToComment', getActiveMention(link).commentId)

  if (link.mentions.length > 1) {
    activeMentionIndexes.value.set(link.url, getActiveMentionIndex(link) + 1)
  }
}
</script>

<style scoped>
.comment-links {
  min-width: 0;
}

.comment-links-reader {
  margin: -0.55rem 0 1.55rem;
}

.comment-links-reader-label {
  margin: 0 0 0.48rem;
  color: rgb(100 116 139);
  font-family: var(--font-ui);
  font-size: 0.68rem;
  font-weight: 760;
  letter-spacing: 0.055em;
  text-transform: uppercase;
}

.comment-links-reader-list {
  display: grid;
  gap: 0.42rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.comment-links-reader-row {
  --source-identity-accent: var(--seed-accent-strong);
  --source-identity-border: var(--seed-border-strong);
  --source-identity-surface: var(--seed-metric-bg);
  --source-identity-surface-dark: var(--seed-metric-bg);
  display: grid;
  grid-template-columns: 2.15rem minmax(0, 1fr);
  align-items: center;
  gap: 0.58rem;
  padding: 0.42rem 0.52rem;
  border: 1px solid rgb(148 163 184 / 0.2);
  border-radius: 0.62rem;
  background: rgb(255 255 255 / 0.36);
}

.comment-links-reader-row:hover,
.comment-links-reader-row:focus-within {
  border-color: var(--seed-border-strong);
  background: var(--seed-metric-bg);
}

.comment-link-sections {
  margin-inline: -0.4rem;
  border-top: 1px solid var(--story-context-border);
}

.comment-link-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.7rem 0.4rem 0.24rem;
}

.comment-link-group-title {
  min-width: 0;
  color: oklch(46% 0.075 var(--comment-link-hue, 245));
  font-size: 0.72rem;
  font-weight: 760;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.comment-link-group-count {
  color: var(--story-context-muted);
  font-size: 0.72rem;
  font-weight: 750;
}

.comment-link-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.comment-link-row {
  --source-identity-accent: var(--story-context-accent-strong);
  --source-identity-border: var(--story-context-border);
  --source-identity-surface: var(--story-context-accent-soft);
  --source-identity-surface-dark: var(--story-context-accent-soft);
  display: grid;
  min-width: 0;
  grid-template-columns: 2.85rem minmax(0, 1fr);
  gap: 0.72rem;
  padding: 0.78rem 0.4rem;
  border-bottom: 1px solid var(--story-context-border);
  background: transparent;
}

.comment-link-row:hover,
.comment-link-row:focus-within {
  background: var(--story-context-accent-soft);
}

.comment-link-meta {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.4rem;
  margin-top: 0.34rem;
  color: var(--story-context-muted);
}

.comment-link-author-chip {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.32rem;
}

.comment-link-author-dot {
  flex: 0 0 auto;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
  background: var(--seed-accent);
  box-shadow: 0 0 0 3px var(--seed-ring);
}

.comment-link-author {
  min-width: 0;
  overflow: hidden;
  color: var(--seed-author-text);
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comment-link-author:hover,
.comment-link-author:focus-visible {
  text-decoration: underline;
  text-underline-offset: 0.18em;
}

.comment-link-jump {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.28rem;
  color: var(--seed-accent-strong);
  font-weight: 700;
}

.comment-link-jump:hover,
.comment-link-jump:focus-visible {
  text-decoration: underline;
  text-underline-offset: 0.18em;
}

.comment-link-author:focus-visible,
.comment-link-jump:focus-visible {
  border-radius: 0.2rem;
  outline: 2px solid var(--story-context-focus);
  outline-offset: 2px;
}

.dark .comment-links-reader-row {
  border-color: rgb(71 85 105 / 0.36);
  background: rgb(15 23 42 / 0.22);
}

.dark .comment-links-reader-label {
  color: rgb(148 163 184);
}
.dark .comment-link-meta {
  color: rgb(203 213 225 / 0.78);
}

.dark .comment-link-group-title {
  color: oklch(76% 0.06 var(--comment-link-hue, 245));
}

@media (max-width: 480px) {
  .comment-link-row {
    gap: 0.65rem;
  }
}
</style>
