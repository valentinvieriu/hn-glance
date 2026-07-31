<template>
  <section
    v-if="totalLinks > 0"
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

    <div id="comment-links-list" class="comment-link-sections">
      <section
        v-for="section in sections"
        :key="section.key"
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
            <SourceIdentity :url="link.url" :label="link.title" />
            <div class="comment-link-content">
              <h3>
                <a
                  :href="link.url"
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  class="comment-link-title story-context-primary-link"
                >
                  {{ link.title }}
                </a>
              </h3>
              <div class="comment-link-source-line meta-text">
                <span v-if="link.domain !== link.title" class="comment-link-domain">{{ link.domain }}</span>
              </div>
              <div class="comment-link-meta meta-text">
                <span class="comment-link-shared-by">shared by</span>
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
            </div>
          </li>
        </ul>
      </section>
    </div>
  </section>
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
import { getSeedPaletteStyle } from '~/composables/useSeedPalette'

const props = defineProps<{
  comments: Comment[]
  storyUrl?: string
  authorCommentCounts?: ReadonlyMap<string, number>
}>()

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

type LinkSection = {
  category: CommentLinkCategory
  key: string
  links: CommentLink[]
}

const links = computed(() => extractCommentLinks(props.comments, {
  excludedUrls: [props.storyUrl],
}))
const totalLinks = computed(() => links.value.length)
const sections = computed<LinkSection[]>(() => groupCommentLinks(links.value).map(group => ({
  category: group.category,
  key: group.category,
  links: group.links,
})))

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
    depth: 1,
    excerpt: '',
  }
}

const getAuthorSeedStyle = (link: CommentLink) => {
  return getSeedPaletteStyle(getActiveMention(link).author)
}

// Matches CommentThread: one-off authors stay neutral so a colour always means
// the same thing on both sides of a jump.
const getAuthorSeedClass = (link: CommentLink) => {
  const author = getActiveMention(link).author

  return {
    'seed-palette-neutral': (props.authorCommentCounts?.get(author) ?? 1) < 2,
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

.comment-link-row:has(.story-context-primary-link:hover),
.comment-link-row:has(.story-context-primary-link:focus-visible) {
  background: var(--story-context-accent-soft);
}

.comment-link-content {
  min-width: 0;
}

.comment-link-title {
  display: inline;
  color: rgb(15 23 42);
  font-family: var(--font-display);
  font-size: 0.98rem;
  font-weight: 650;
  line-height: 1.32;
  overflow-wrap: anywhere;
  text-decoration-color: transparent;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.2em;
  transition: color 160ms ease, text-decoration-color 160ms ease;
}

.comment-link-title:hover,
.comment-link-title:focus-visible {
  color: var(--story-context-accent-strong);
  text-decoration-line: underline;
  text-decoration-color: var(--story-context-accent);
}

.comment-link-source-line {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.4rem;
  margin-top: 0.3rem;
  color: var(--story-context-muted);
}

.comment-link-domain {
  min-width: 0;
  overflow: hidden;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.dark .comment-link-title {
  color: rgb(241 245 249);
}

.dark .comment-link-title:hover,
.dark .comment-link-title:focus-visible {
  color: var(--story-context-accent);
}

.dark .comment-link-source-line,
.dark .comment-link-meta {
  color: rgb(203 213 225 / 0.78);
}

.dark .comment-link-group-title,
.dark .comment-link-category {
  color: oklch(76% 0.06 var(--comment-link-hue, 245));
}

@media (max-width: 480px) {
  .comment-link-row {
    gap: 0.65rem;
  }
}
</style>
