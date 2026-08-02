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
          :aria-expanded="!isCollapsed"
          :aria-controls="hasChildren ? childrenElementId : undefined"
          :aria-label="collapseActionLabel"
          @click="toggleCollapsed(comment.id)"
        >
          <LucideChevronDown v-if="!isCollapsed" class="w-3.5 h-3.5" aria-hidden="true" />
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
        <span class="comment-time">{{ timeAgo }}</span>
        <span
          v-if="replyTarget"
          class="comment-reply-target"
          :aria-label="`Replying to ${replyTarget}`"
          :title="`Replying to ${replyTarget}`"
        >
          <LucideCornerDownRight class="w-3.5 h-3.5" aria-hidden="true" />
          <span class="comment-reply-target-label">to</span>
          <span class="comment-reply-target-author">{{ replyTarget }}</span>
        </span>
        <span
          v-if="hasChildren"
          class="comment-thread-stat"
          :aria-label="replyCountLabel"
          :title="replyCountLabel"
        >
          {{ threadSizeLabel }}
        </span>
        <template v-if="isCollapsed">
          <span v-if="preview" class="comment-collapsed-preview">{{ preview }}</span>
        </template>
        <a
          v-else
          :href="replyHref"
          target="_blank"
          rel="noopener noreferrer"
          class="comment-reply-link"
        >
          Reply
        </a>
      </div>
      <div
        v-if="!isCollapsed"
        class="comment-text reading-text rich-text break-words"
        v-html="sanitizedText"
      ></div>
    </div>
    <div v-if="hasChildren && !isCollapsed" :id="childrenElementId" class="comment-children">
      <!-- Pointer-only shortcut for the header toggle, which stays the single
           accessible control; a focusable twin would double the tab stops. -->
      <div class="comment-spine" aria-hidden="true" @click="toggleCollapsed(comment.id)"></div>
      <div class="comment-children-list">
        <CommentThread
          v-for="child in comment.children"
          :key="child.id"
          :comment="child"
          :current-depth="currentDepth + 1"
          :replying-to-author="comment.author"
          :story-author="storyAuthor"
          :author-comment-counts="authorCommentCounts"
          :descendant-comment-counts="descendantCommentCounts"
          :collapsed-ids="collapsedIds"
          :toggle-collapsed="toggleCollapsed"
        />
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  LucideChevronDown,
  LucideChevronRight,
  LucideCornerDownRight,
  LucideMessageSquare,
} from '@lucide/vue'
import type { Comment } from '#shared/types'
import { getCommentPreview } from '#shared/utils/comments'
import { formatTimeAgo } from '#shared/utils/date'
import { getHnUserPath } from '#shared/utils/hn'
import { useSanitizer } from '~/composables/useSanitizer'
import { getSeedPaletteStyle } from '~/composables/useSeedPalette'

const props = defineProps<{
  comment: Comment
  currentDepth?: number
  /** Parent author, surfaced as an explicit reply cue in nested discussions. */
  replyingToAuthor?: string
  storyAuthor?: string
  authorCommentCounts: ReadonlyMap<string, number>
  descendantCommentCounts: ReadonlyMap<number, number>
  collapsedIds: ReadonlySet<number>
  toggleCollapsed: (commentId: number) => void
}>()

const { sanitize } = useSanitizer()
const sanitizedText = computed(() => sanitize(props.comment.text || '', `comment-${props.comment.id}`))

const currentDepth = computed(() => props.currentDepth ?? 1)
const authorCommentCount = computed(() => props.authorCommentCounts.get(props.comment.author) ?? 1)
const commentPaletteStyle = computed(() => getSeedPaletteStyle(props.comment.author))
const timeAgo = computed(() => formatTimeAgo(props.comment.created_at))

const isCollapsed = computed(() => props.collapsedIds.has(props.comment.id))
const childReplies = computed(() => props.comment.children ?? [])
const hasChildren = computed(() => childReplies.value.length > 0)
const subtreeCount = computed(() => props.descendantCommentCounts.get(props.comment.id) ?? 0)
const childrenElementId = computed(() => `comment-children-${props.comment.id}`)

const isOriginalPoster = computed(() => {
  return Boolean(props.storyAuthor) && props.comment.author === props.storyAuthor
})

// A follow-up to your own comment needs no "replying to" pointer.
const replyTarget = computed(() => {
  return props.replyingToAuthor === props.comment.author ? '' : props.replyingToAuthor
})

// Colour is spent only on authors the reader will meet again in this thread.
const isRecurringAuthor = computed(() => authorCommentCount.value > 1)

const commentContainerClasses = computed(() => {
  return {
    'comment-top-level': currentDepth.value === 1,
    'comment-deep': currentDepth.value >= 4,
    'comment-collapsed': isCollapsed.value,
    'seed-palette-neutral': !isRecurringAuthor.value,
  }
})

const replyCountLabel = computed(() => {
  const direct = childReplies.value.length
  const label = `${direct} ${direct === 1 ? 'reply' : 'replies'}`

  return subtreeCount.value > direct ? `${label} · ${subtreeCount.value} in thread` : label
})

const threadSizeLabel = computed(() => {
  const count = subtreeCount.value

  return `${count} ${count === 1 ? 'reply' : 'replies'}`
})

const collapseActionLabel = computed(() => {
  const subject = hasChildren.value
    ? `${props.comment.author} and ${replyCountLabel.value}`
    : `${props.comment.author}'s comment`

  return isCollapsed.value ? `Expand ${subject}` : `Collapse ${subject}`
})

const preview = computed(() => getCommentPreview(props.comment.text))

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

/* Taper the gutter once a chain is deep so width loss stops compounding. */
.comment-deep {
  --comment-indent: 0.45rem;
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
  padding: 0.1rem 0 0;
}

/* The speaker strip is the boundary between voices. It is tinted with the
   author's seed colour, so a one-off author (chroma 0) still gets the break
   without the colour. Capped to the reading measure so it aligns with the body
   instead of reading as a full-width card header. */
.comment-header {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.32rem 0.42rem;
  flex-wrap: wrap;
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

/* Collapsed rows are the summary, so let the preview use the full column. */
.comment-collapsed .comment-header {
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

/* Collapsed rows behave like the story-context rows: the toggle owns the whole
   line and the author link lifts above the overlay. */
.comment-collapsed .comment-collapse-toggle::after {
  content: '';
  position: absolute;
  inset: 0;
}

.author-chip {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  max-width: 100%;
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

.comment-reply-target {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  min-width: 0;
  max-width: 11rem;
  padding-left: 0.05rem;
  opacity: 0.78;
}

.comment-reply-target-label {
  font-size: 0.74rem;
  opacity: 0.8;
}

.comment-reply-target-author {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.comment-time {
  flex: 0 0 auto;
  white-space: nowrap;
  opacity: 0.85;
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
  position: relative;
  flex: 0 0 auto;
  margin-left: auto;
  min-height: 1.5rem;
  padding: 0 0.18rem;
  color: inherit;
  font-weight: 600;
  opacity: 0.72;
  transition: opacity 0.15s ease;
}

.comment-reply-link:hover {
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

.comment-children {
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

/* Widens the pointer target without widening the indent gutter. */
.comment-spine::before {
  content: '';
  position: absolute;
  inset: 0 -0.45rem;
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

/* Must clearly exceed the 1.05rem gap between paragraphs inside one comment,
   otherwise a change of speaker reads as weaker than a change of paragraph. */
.comment-children-list > .comment-container + .comment-container {
  margin-top: 1.6rem;
}

@media (max-width: 640px) {
  .comment-container {
    --comment-indent: 0.6rem;
  }

  .comment-deep {
    --comment-indent: 0.3rem;
  }

  .comment-text {
    font-size: 1.0625rem;
    line-height: 1.65;
  }

  .comment-reply-target {
    max-width: 9rem;
  }
}
</style>
