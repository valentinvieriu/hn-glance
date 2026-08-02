<template>
  <article
    :id="`comment-${comment.id}`"
    class="comment-container seed-palette-surface"
    :class="commentContainerClasses"
    :style="commentPaletteStyle"
    :data-author="comment.author"
    :data-comment-id="comment.id"
    tabindex="-1"
  >
    <div class="comment-body">
      <div class="comment-header">
        <button
          type="button"
          class="comment-collapse-toggle"
          :aria-expanded="!isCompacted"
          :aria-controls="commentContentElementId"
          :aria-label="compactionActionLabel"
          :title="compactionActionLabel"
          @click="toggleCompacted(comment.id)"
        >
          <LucideChevronDown v-if="!isCompacted" class="w-3.5 h-3.5" aria-hidden="true" />
          <LucideChevronRight v-else class="w-3.5 h-3.5" aria-hidden="true" />
        </button>
        <span class="author-chip">
          <span class="author-dot" aria-hidden="true"></span>
          <NuxtLink :to="getHnUserPath(comment.author)" class="author-name">
            {{ comment.author }}
          </NuxtLink>
        </span>
        <span v-if="isOriginalPoster" class="comment-badge" title="Submitted this story">OP</span>
        <span
          v-if="authorCommentCount > 1"
          class="author-activity-stat"
          :class="{ 'author-activity-stat-strong': authorCommentCount >= 5 }"
          :aria-label="`${comment.author} has made ${authorCommentCount} comments on this story`"
          :title="`${comment.author} has made ${authorCommentCount} comments on this story`"
        >
          <LucideMessageSquare class="w-3.5 h-3.5" aria-hidden="true" />
          <span>{{ authorCommentCount }}</span>
        </span>
        <a
          :href="commentPermalink"
          class="comment-time"
          :aria-label="`Permalink to ${comment.author}'s comment from ${timeAgo}`"
          title="Comment permalink"
          @click.prevent="jumpToComment(comment.id)"
        >
          {{ timeAgo }}
        </a>
        <span
          v-if="isCompacted && hasChildren"
          class="comment-thread-stat"
          :aria-label="replyCountLabel"
          :title="replyCountLabel"
        >
          {{ threadSizeLabel }}
        </span>
        <template v-if="isCompacted">
          <span v-if="preview" class="comment-collapsed-preview">{{ preview }}</span>
        </template>
      </div>
      <nav
        v-if="!isCompacted && parentCommentId && parentAuthor"
        class="comment-ancestry-navigation"
        :aria-label="`Ancestry for ${comment.author}'s comment`"
      >
        <a
          :href="parentPermalink"
          class="comment-ancestry-link"
          :aria-label="`Jump to parent comment by ${parentAuthor}`"
          :title="`Jump to parent comment by ${parentAuthor}`"
          @click.prevent="jumpToParent"
        >
          <LucideCornerDownRight class="comment-ancestry-icon" aria-hidden="true" />
          <span class="comment-ancestry-label">Parent comment:</span>
          <span class="comment-ancestry-author">{{ parentAuthor }}</span>
        </a>
        <a
          v-if="showRootLink && rootAuthor"
          :href="rootPermalink"
          class="comment-ancestry-link"
          :aria-label="`Jump to thread start by ${rootAuthor}`"
          :title="`Jump to thread start by ${rootAuthor}`"
          @click.prevent="jumpToRoot"
        >
          <LucideArrowUpToLine class="comment-ancestry-icon" aria-hidden="true" />
          <span class="comment-ancestry-label">Thread start:</span>
          <span class="comment-ancestry-author">{{ rootAuthor }}</span>
        </a>
      </nav>
    </div>
    <div v-if="!isCompacted" :id="commentContentElementId" class="comment-expanded-content">
      <div
        class="comment-text reading-text rich-text break-words"
        v-html="sanitizedText"
      ></div>
      <div class="comment-actions">
        <div v-if="hasChildren" class="comment-reply-actions">
          <LucideGitFork v-if="isFork" class="comment-fork-icon" aria-hidden="true" />
          <span class="comment-reply-summary">{{ replyCountLabel }}</span>
          <button
            type="button"
            class="comment-replies-toggle"
            :aria-expanded="!areRepliesHidden"
            :aria-controls="childrenElementId"
            :aria-label="replyDisclosureLabel"
            @click="toggleRepliesHidden(comment.id)"
          >
            <LucideChevronRight v-if="areRepliesHidden" class="w-3.5 h-3.5" aria-hidden="true" />
            <LucideChevronDown v-else class="w-3.5 h-3.5" aria-hidden="true" />
            <span>{{ areRepliesHidden ? 'Show replies' : 'Hide replies' }}</span>
          </button>
        </div>
        <a
          :href="replyHref"
          target="_blank"
          rel="noopener noreferrer"
          class="comment-reply-link"
          :aria-label="`Reply to ${comment.author} on Hacker News (opens in a new tab)`"
        >
          <span>Reply on HN</span>
          <LucideExternalLink class="w-3.5 h-3.5" aria-hidden="true" />
        </a>
      </div>
      <div
        v-if="hasChildren && !areRepliesHidden"
        :id="childrenElementId"
        class="comment-children"
        :class="{ 'comment-children-forked': isFork }"
      >
        <!-- Pointer-only shortcut for reply disclosure. The footer button is
             the keyboard and assistive-technology equivalent. -->
        <div class="comment-spine" aria-hidden="true" @click="toggleRepliesHidden(comment.id)"></div>
        <div class="comment-children-list">
          <CommentThread
            v-for="child in comment.children"
            :key="child.id"
            :comment="child"
            :current-depth="currentDepth + 1"
            :story-author="storyAuthor"
            :author-comment-counts="authorCommentCounts"
            :author-palette="authorPalette"
            :comment-authors="commentAuthors"
            :descendant-comment-counts="descendantCommentCounts"
            :parent-comment-ids="parentCommentIds"
            :root-comment-ids="rootCommentIds"
            :compacted-ids="compactedIds"
            :hidden-reply-ids="hiddenReplyIds"
            :toggle-compacted="toggleCompacted"
            :toggle-replies-hidden="toggleRepliesHidden"
            :jump-to-comment="jumpToComment"
          />
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  LucideArrowUpToLine,
  LucideChevronDown,
  LucideChevronRight,
  LucideCornerDownRight,
  LucideExternalLink,
  LucideGitFork,
  LucideMessageSquare,
} from '@lucide/vue'
import type { Comment } from '#shared/types'
import { getCommentPreview, getCommentReplyCountLabel } from '#shared/utils/comments'
import { formatTimeAgo } from '#shared/utils/date'
import { getHnUserPath } from '#shared/utils/hn'
import { useSanitizer } from '~/composables/useSanitizer'
import {
  getSeedPaletteStyle,
  type CommentThreadAuthorPalette,
} from '~/composables/useSeedPalette'

const props = defineProps<{
  comment: Comment
  currentDepth?: number
  storyAuthor?: string
  authorCommentCounts: ReadonlyMap<string, number>
  authorPalette: CommentThreadAuthorPalette
  commentAuthors: ReadonlyMap<number, string>
  descendantCommentCounts: ReadonlyMap<number, number>
  parentCommentIds: ReadonlyMap<number, number | null>
  rootCommentIds: ReadonlyMap<number, number>
  compactedIds: ReadonlySet<number>
  hiddenReplyIds: ReadonlySet<number>
  toggleCompacted: (commentId: number) => void
  toggleRepliesHidden: (commentId: number) => void
  jumpToComment: (commentId: number) => void | Promise<void>
}>()

const { sanitize } = useSanitizer()
const sanitizedText = computed(() => sanitize(props.comment.text || '', `comment-${props.comment.id}`))

const currentDepth = computed(() => props.currentDepth ?? 1)
const authorCommentCount = computed(() => props.authorCommentCounts.get(props.comment.author) ?? 1)
const commentPaletteStyle = computed(() => {
  return props.authorPalette.authorStyles.get(props.comment.author)
    ?? getSeedPaletteStyle(props.comment.author)
})
const timeAgo = computed(() => formatTimeAgo(props.comment.created_at))

const isCompacted = computed(() => props.compactedIds.has(props.comment.id))
const areRepliesHidden = computed(() => props.hiddenReplyIds.has(props.comment.id))
const childReplies = computed(() => props.comment.children ?? [])
const hasChildren = computed(() => childReplies.value.length > 0)
const isFork = computed(() => childReplies.value.length > 1)
const subtreeCount = computed(() => props.descendantCommentCounts.get(props.comment.id) ?? 0)
const parentCommentId = computed(() => props.parentCommentIds.get(props.comment.id) ?? null)
const rootCommentId = computed(() => props.rootCommentIds.get(props.comment.id) ?? props.comment.id)
const commentContentElementId = computed(() => `comment-content-${props.comment.id}`)
const childrenElementId = computed(() => `comment-children-${props.comment.id}`)

const isOriginalPoster = computed(() => {
  return Boolean(props.storyAuthor) && props.comment.author === props.storyAuthor
})

const parentAuthor = computed(() => {
  return parentCommentId.value ? props.commentAuthors.get(parentCommentId.value) ?? '' : ''
})
const rootAuthor = computed(() => props.commentAuthors.get(rootCommentId.value) ?? '')
const showRootLink = computed(() => {
  return Boolean(parentCommentId.value) && rootCommentId.value !== parentCommentId.value
})

// One-off voices keep a quieter version of their thread-assigned hue; repeat
// participants receive the full accent so their later turns are easy to find.
const isRecurringAuthor = computed(() => authorCommentCount.value > 1)

const commentContainerClasses = computed(() => {
  return {
    'comment-top-level': currentDepth.value === 1,
    'comment-indent-capped': currentDepth.value >= 4,
    'comment-compacted': isCompacted.value,
    'comment-replies-hidden': areRepliesHidden.value,
    'seed-palette-quiet': !isRecurringAuthor.value,
  }
})

const replyCountLabel = computed(() => {
  return getCommentReplyCountLabel(childReplies.value.length, subtreeCount.value)
})

const threadSizeLabel = computed(() => {
  const count = subtreeCount.value

  return `${count} ${count === 1 ? 'reply' : 'replies'}`
})

const compactionActionLabel = computed(() => {
  return isCompacted.value
    ? `Expand ${props.comment.author}'s compacted comment`
    : `Compact ${props.comment.author}'s comment and its replies`
})

const replyDisclosureLabel = computed(() => {
  return areRepliesHidden.value
    ? `Show ${replyCountLabel.value} from ${props.comment.author}`
    : `Hide ${replyCountLabel.value} from ${props.comment.author}`
})

const preview = computed(() => getCommentPreview(props.comment.text))
const commentPermalink = computed(() => `#comment-${props.comment.id}`)
const parentPermalink = computed(() => `#comment-${parentCommentId.value}`)
const rootPermalink = computed(() => `#comment-${rootCommentId.value}`)

const jumpToParent = () => {
  if (parentCommentId.value) {
    void props.jumpToComment(parentCommentId.value)
  }
}

const jumpToRoot = () => {
  void props.jumpToComment(rootCommentId.value)
}

const replyHref = computed(() => {
  return `https://news.ycombinator.com/reply?id=${props.comment.id}&goto=item%3Fid%3D${props.comment.parent_id}%23${props.comment.id}`
})
</script>

<style scoped>
.comment-container {
  --comment-indent: 0.85rem;
  /* Roughly 60-68 characters in the reading face: wide enough to reduce scroll
     while staying below the 75-80 character readability ceiling. Held in rem
     so the smaller metadata row shares the body's visual edge. */
  --comment-measure: 33rem;
  position: relative;
  scroll-margin-top: 6rem;
}

.comment-container:focus {
  outline: none;
}

.comment-container:focus-visible > .comment-body {
  outline: 2px solid var(--seed-accent);
  outline-offset: 4px;
  border-radius: 0.35rem;
}

/* Added imperatively by the story page after a jump; must live in this scoped
   block so the rule matches the component root's scope attribute. */
.comment-container.comment-jump-highlight > .comment-body {
  border-radius: 0.35rem;
  animation: comment-jump-pulse 1.5s ease-out;
}

@keyframes comment-jump-pulse {
  from {
    background-color: color-mix(in oklch, var(--seed-accent) 18%, transparent);
  }

  to {
    background-color: transparent;
  }
}

@media (prefers-reduced-motion: reduce) {
  .comment-container.comment-jump-highlight > .comment-body {
    animation: none;
  }
}

.comment-top-level {
  content-visibility: auto;
  contain-intrinsic-size: auto 20rem;
}

.comment-body {
  position: relative;
  z-index: 1;
  padding: 0.1rem 0 0;
}

/* The speaker strip is the boundary between voices. A one-off author receives
   a quieter version of their thread hue, while recurring voices keep the full
   accent. Capped to the reading measure so it aligns with the body. */
.comment-header {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.32rem 0.42rem;
  flex-wrap: nowrap;
  max-width: var(--comment-measure);
  min-height: 2rem;
  padding: 0.22rem 0.55rem 0.22rem 0.25rem;
  border: 1px solid color-mix(in oklch, var(--seed-border-strong) 46%, transparent);
  border-left-width: 3px;
  border-radius: 0.4rem;
  background: var(--seed-accent-soft);
  font-size: 0.8125rem;
  font-weight: 550;
  line-height: 1.3;
  color: rgb(71 85 105);
}

.dark .comment-header {
  color: rgb(148 163 184);
}

/* Compacted rows are the summary, so let the preview use the full column. */
.comment-compacted .comment-header {
  flex-wrap: wrap;
  max-width: none;
}

.comment-collapse-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 1.65rem;
  height: 1.65rem;
  border-radius: 0.35rem;
  color: inherit;
  opacity: 0.72;
  transition: background-color 0.15s ease, opacity 0.15s ease;
}

.comment-collapse-toggle:hover,
.comment-collapse-toggle:focus-visible {
  background: var(--seed-metric-bg-hover);
  opacity: 1;
}

/* Compacted rows behave like the story-context rows: the toggle owns the whole
   line and the author link lifts above the overlay. */
.comment-compacted .comment-collapse-toggle::after {
  content: '';
  position: absolute;
  inset: 0;
}

.author-chip {
  display: inline-flex;
  align-items: center;
  flex: 0 1 auto;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  gap: 0.35rem;
  color: var(--seed-author-text);
  font-size: 0.875rem;
  font-weight: 650;
}

.author-dot {
  flex: 0 0 auto;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  background: var(--seed-accent);
  box-shadow: 0 0 0 2.5px var(--seed-ring);
}

.author-name {
  position: relative;
  z-index: 1;
  color: inherit;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.author-name:hover {
  text-decoration: underline;
}

.comment-badge {
  flex: 0 0 auto;
  padding: 0.02rem 0.3rem;
  border: 1px solid var(--seed-border-strong);
  border-radius: 0.25rem;
  color: var(--seed-accent-strong);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  line-height: 1.5;
}

.author-activity-stat {
  display: inline-flex;
  align-items: center;
  gap: 0.24rem;
  color: var(--seed-author-text);
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  opacity: 0.75;
}

.author-activity-stat-strong {
  color: var(--seed-accent-strong);
  opacity: 1;
}

.comment-ancestry-navigation {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.12rem 0.8rem;
  max-width: var(--comment-measure);
  min-width: 0;
  padding: 0.28rem 0.3rem 0;
  color: rgb(71 85 105);
  font-size: 0.75rem;
  font-weight: 550;
  line-height: 1.35;
}

.dark .comment-ancestry-navigation {
  color: rgb(148 163 184);
}

.comment-ancestry-link {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  min-width: 0;
  max-width: min(100%, 18rem);
  min-height: 1.75rem;
  opacity: 0.82;
  transition: color 0.15s ease, opacity 0.15s ease;
}

.comment-ancestry-link:hover,
.comment-ancestry-link:focus-visible {
  color: var(--seed-accent-strong);
  opacity: 1;
}

.comment-ancestry-icon {
  flex: 0 0 auto;
  width: 0.875rem;
  height: 0.875rem;
}

.comment-ancestry-label {
  flex: 0 0 auto;
  opacity: 0.76;
}

.comment-ancestry-author {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--seed-accent-strong);
  font-weight: 600;
}

.comment-time {
  position: relative;
  flex: 0 0 auto;
  white-space: nowrap;
  opacity: 0.85;
  transition: opacity 0.15s ease;
}

.comment-time:hover,
.comment-time:focus-visible {
  text-decoration: underline;
  opacity: 1;
}

.comment-compacted .comment-time {
  z-index: 1;
}

.comment-thread-stat {
  flex: 0 0 auto;
  padding-left: 0.42rem;
  border-left: 1px solid color-mix(in oklch, var(--seed-border-strong) 60%, transparent);
  color: var(--seed-accent-strong);
  font-weight: 600;
  white-space: nowrap;
}

.comment-collapsed-preview {
  flex: 1 1 12rem;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.72;
}

.comment-reply-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  flex: 0 0 auto;
  margin-left: auto;
  min-height: 2rem;
  padding: 0 0.35rem;
  color: rgb(71 85 105);
  font-size: 0.8125rem;
  font-weight: 650;
  opacity: 0.8;
  transition: color 0.15s ease, opacity 0.15s ease;
}

.dark .comment-reply-link {
  color: rgb(148 163 184);
}

.comment-reply-link:hover,
.comment-reply-link:focus-visible {
  color: var(--seed-accent-strong);
  opacity: 1;
  text-decoration: underline;
}

.comment-text {
  margin: 0.55rem 0 0;
  padding-left: 0.3rem;
  max-width: var(--comment-measure);
  font-size: 1.0625rem;
  font-weight: 400;
  line-height: 1.65;
  color: rgb(30 41 59);
  overflow-wrap: anywhere;
}

.dark .comment-text {
  color: rgb(226 232 240);
}

.comment-text :deep(blockquote) {
  border-left-color: var(--seed-accent);
  background: color-mix(in oklch, var(--seed-accent-soft) 72%, transparent);
  opacity: 0.92;
}

.comment-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem 0.7rem;
  max-width: var(--comment-measure);
  min-height: 2rem;
  margin-top: 0.7rem;
  padding-left: 0.3rem;
}

.comment-reply-actions {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem 0.55rem;
  min-width: 0;
}

.comment-fork-icon {
  flex: 0 0 auto;
  width: 0.9rem;
  height: 0.9rem;
  color: var(--seed-accent-strong);
  opacity: 0.78;
}

.comment-reply-summary {
  color: rgb(71 85 105);
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.35;
}

.dark .comment-reply-summary {
  color: rgb(148 163 184);
}

.comment-replies-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.28rem;
  min-height: 2rem;
  padding: 0 0.55rem;
  border: 1px solid color-mix(in oklch, var(--seed-border-strong) 48%, transparent);
  border-radius: 999px;
  background: var(--seed-metric-bg);
  color: var(--seed-accent-strong);
  font-size: 0.8125rem;
  font-weight: 650;
  line-height: 1;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.comment-replies-toggle:hover,
.comment-replies-toggle:focus-visible {
  border-color: var(--seed-border-strong);
  background: var(--seed-metric-bg-hover);
}

.comment-children {
  --comment-branch-width: var(--comment-indent);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  column-gap: var(--comment-indent);
  margin-top: 0.7rem;
}

.comment-spine {
  position: relative;
  width: 2px;
  border-radius: 999px;
  background: var(--seed-child-guide);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

/* The visible rail stays quiet while the hit area is comfortably pointer-sized. */
.comment-spine::before {
  content: '';
  position: absolute;
  inset: 0 -0.65rem;
}

.comment-spine:hover,
.comment-spine:active {
  background: var(--seed-accent);
}

.comment-children:has(> .comment-spine:hover) > .comment-children-list {
  background: var(--seed-accent-soft);
  box-shadow: 0 0 0 0.4rem var(--seed-accent-soft);
  border-radius: 0.2rem;
}

.comment-children-list {
  min-width: 0;
  transition: background-color 0.15s ease;
}

/* Each direct reply gets a short destination-coloured arm. At a true fork,
   diamonds mark the junctions without turning the rail into another control. */
.comment-children-list > .comment-container::before {
  content: '';
  position: absolute;
  z-index: 0;
  top: 1.1rem;
  left: calc(-1 * var(--comment-branch-width));
  width: var(--comment-branch-width);
  height: 1.5px;
  background: var(--seed-child-guide);
  pointer-events: none;
}

.comment-children-forked > .comment-children-list > .comment-container::after {
  content: '';
  position: absolute;
  z-index: 2;
  top: 0.94rem;
  left: calc(-1 * var(--comment-branch-width) - 0.14rem);
  width: 0.34rem;
  height: 0.34rem;
  border-radius: 0.06rem;
  background: var(--seed-accent);
  box-shadow: 0 0 0 2px rgb(255 255 255 / 0.86);
  transform: rotate(45deg);
  pointer-events: none;
}

.dark .comment-children-forked > .comment-children-list > .comment-container::after {
  box-shadow: 0 0 0 2px rgb(17 24 39 / 0.9);
}

/* Depth four is the final horizontal step. Deeper reply lists keep the same
   text edge, while a rail just outside that edge retains ancestry and the
   pointer shortcut without covering selectable comment text. */
.comment-indent-capped > .comment-expanded-content > .comment-children {
  --comment-branch-width: 0.65rem;
  position: relative;
  display: block;
}

.comment-indent-capped > .comment-expanded-content > .comment-children > .comment-spine {
  position: absolute;
  inset: 0 auto 0 -0.65rem;
}

/* Must clearly exceed the 1.05rem gap between paragraphs inside one comment,
   otherwise a change of speaker reads as weaker than a change of paragraph. */
.comment-children-list > .comment-container + .comment-container {
  margin-top: 1.6rem;
}

@media (max-width: 640px) {
  .comment-container {
    --comment-indent: 0.6rem;
  }

  .comment-text {
    font-size: 1.0625rem;
    line-height: 1.65;
  }

  .comment-ancestry-navigation {
    gap: 0.08rem 0.55rem;
  }

  .comment-ancestry-link {
    max-width: 100%;
  }
}
</style>
