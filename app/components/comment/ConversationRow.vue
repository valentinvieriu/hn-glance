<template>
  <button
    type="button"
    class="conversation-row seed-palette-surface"
    :class="{
      'conversation-row-selected': selected,
      'conversation-row-current': current,
      'conversation-row-new': isNew,
      'seed-palette-quiet': authorCommentCount <= 1,
    }"
    :style="paletteStyle"
    :aria-current="current ? 'true' : undefined"
    :data-current-comment="current ? 'true' : undefined"
    :data-path-active="selected ? 'true' : undefined"
    :aria-label="rowLabel"
    @click="emit('select', comment.id)"
  >
    <span class="conversation-row-heading">
      <span class="conversation-row-author">
        <span class="conversation-row-author-dot" aria-hidden="true"></span>
        <span class="truncate">{{ comment.author }}</span>
      </span>
      <span v-if="isOriginalPoster" class="conversation-row-badge">
        {{ discussionLanguage.states.originalPoster }}
      </span>
      <span
        v-if="isNew"
        class="conversation-row-new-badge discussion-new-indicator"
        :title="discussionLanguage.accessibility.newComment"
      >
        {{ discussionLanguage.states.new }}
      </span>
      <span v-if="selected" class="conversation-row-path-badge">
        {{ current ? discussionLanguage.states.current : discussionLanguage.states.readingPath }}
      </span>
      <span class="conversation-row-age">{{ timeAgo }}</span>
    </span>
    <span class="conversation-row-excerpt">
      {{ preview || discussionLanguage.messages.commentHasNoText }}
    </span>
    <span class="conversation-row-footer">
      <span v-if="replyLabel" class="conversation-row-count">{{ replyLabel }}</span>
      <span v-else class="conversation-row-count">
        {{ discussionLanguage.messages.endOfBranch }}
      </span>
      <span
        v-if="newDescendantCount > 0"
        class="conversation-row-new-replies discussion-new-indicator"
      >
        {{ discussionLanguage.format.newReplyCount(newDescendantCount) }}
      </span>
      <span v-if="contentMarkers.length" class="conversation-row-markers" aria-hidden="true">
        <component
          :is="marker"
          v-for="(marker, index) in contentMarkers"
          :key="index"
          class="h-3.5 w-3.5"
        />
      </span>
      <LucideChevronRight v-if="directReplyCount > 0" class="conversation-row-continuation" aria-hidden="true" />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  LucideChevronRight,
  LucideCode2,
  LucideLink2,
  LucideQuote,
} from '@lucide/vue'
import type { Comment } from '#shared/types'
import { getCommentPreview } from '#shared/utils/comments'
import { formatTimeAgo } from '#shared/utils/date'
import {
  discussionLanguage,
  type DiscussionRowState,
} from '#shared/utils/productLanguage'
import type { SeedPaletteStyle } from '~/composables/useSeedPalette'

const props = defineProps<{
  authorCommentCount: number
  comment: Comment
  current: boolean
  descendantCount: number
  isNew: boolean
  newDescendantCount: number
  paletteStyle: SeedPaletteStyle
  selected: boolean
  storyAuthor?: string
}>()

const emit = defineEmits<{
  select: [commentId: number]
}>()

const directReplyCount = computed(() => props.comment.children?.length ?? 0)
const isOriginalPoster = computed(() => {
  return Boolean(props.storyAuthor) && props.comment.author === props.storyAuthor
})
const preview = computed(() => getCommentPreview(props.comment.text))
const replyLabel = computed(() => directReplyCount.value > 0
  ? discussionLanguage.format.replySummary(directReplyCount.value, props.descendantCount)
  : '')
const timeAgo = computed(() => formatTimeAgo(props.comment.created_at))
const contentMarkers = computed(() => {
  const text = props.comment.text || ''
  const markers = []

  if (/<(?:pre|code)\b/i.test(text) || /`[^`]+`/.test(text)) {
    markers.push(LucideCode2)
  }
  if (/<a\b/i.test(text) || /https?:\/\//i.test(text)) {
    markers.push(LucideLink2)
  }
  if (/<blockquote\b/i.test(text) || /(?:^|<p>)\s*(?:&gt;|>)/i.test(text)) {
    markers.push(LucideQuote)
  }

  return markers
})
const rowLabel = computed(() => {
  const state: DiscussionRowState = props.current
    ? 'current'
    : props.selected
      ? 'reading-path'
      : null
  const continuation = replyLabel.value || discussionLanguage.accessibility.endOfBranch

  return discussionLanguage.format.rowLabel(
    props.comment.author,
    timeAgo.value,
    state,
    continuation,
    props.isNew,
  )
})
</script>

<style scoped>
.conversation-row {
  display: grid;
  width: 100%;
  min-width: 0;
  gap: 0.48rem;
  padding: 0.72rem 0.75rem 0.68rem;
  border: 1px solid color-mix(in oklch, var(--seed-border) 72%, rgb(148 163 184 / 0.2));
  border-left: 3px solid var(--seed-rail);
  border-radius: 0.65rem;
  background: color-mix(in oklch, var(--seed-surface) 88%, white);
  color: rgb(30 41 59);
  text-align: left;
  box-shadow: 0 10px 24px -24px var(--seed-shadow-strong);
  transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
}

.conversation-row:hover {
  border-color: var(--seed-border-strong);
  background: var(--seed-surface-raised);
  box-shadow: 0 14px 28px -22px var(--seed-shadow-strong);
}

.conversation-row:focus-visible {
  outline: 2px solid var(--seed-accent);
  outline-offset: 2px;
}

.conversation-row-selected {
  border-color: var(--seed-border-strong);
  background: var(--seed-surface-strong);
  box-shadow: 0 0 0 2px var(--seed-accent), 0 14px 30px -22px var(--seed-shadow-strong);
}

.conversation-row-current {
  box-shadow: 0 0 0 2px var(--seed-accent), 0 18px 36px -18px var(--seed-shadow-strong);
}

.conversation-row-new:not(.conversation-row-selected) {
  box-shadow: inset 0 0 0 1px rgb(14 165 233 / 0.3), 0 10px 24px -24px var(--seed-shadow-strong);
}

.conversation-row-heading,
.conversation-row-footer {
  display: flex;
  min-width: 0;
  align-items: center;
}

.conversation-row-heading {
  gap: 0.38rem;
  font-size: 0.76rem;
  line-height: 1.2;
}

.conversation-row-author {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.36rem;
  color: var(--seed-author-text);
  font-weight: 700;
}

.conversation-row-author-dot {
  width: 0.48rem;
  height: 0.48rem;
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--seed-accent);
  box-shadow: 0 0 0 2px var(--seed-ring);
}

.conversation-row-badge {
  flex: 0 0 auto;
  padding: 0.02rem 0.28rem;
  border: 1px solid var(--seed-border-strong);
  border-radius: 0.24rem;
  color: var(--seed-accent-strong);
  font-size: 0.64rem;
  font-weight: 750;
  letter-spacing: 0.03em;
}

.conversation-row-path-badge {
  flex: 0 0 auto;
  padding: 0.04rem 0.3rem;
  border-radius: 999px;
  background: var(--seed-metric-bg);
  color: var(--seed-accent-strong);
  font-size: 0.61rem;
  font-weight: 780;
  letter-spacing: 0.025em;
  line-height: 1.25;
  text-transform: uppercase;
}

.conversation-row-new-badge,
.conversation-row-new-replies {
  font-size: 0.61rem;
}

.conversation-row-new-badge {
  padding: 0.04rem 0.3rem;
  letter-spacing: 0.035em;
  text-transform: uppercase;
}

.conversation-row-new-replies {
  padding: 0.1rem 0.34rem;
}

.conversation-row-current .conversation-row-path-badge {
  background: var(--seed-accent);
  color: rgb(255 255 255);
}

.conversation-row-age {
  flex: 0 0 auto;
  margin-left: auto;
  color: rgb(100 116 139);
  white-space: nowrap;
}

.conversation-row-excerpt {
  display: -webkit-box;
  overflow: hidden;
  color: rgb(51 65 85);
  font-family: var(--font-reading);
  font-size: 0.94rem;
  line-height: 1.4;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.conversation-row-footer {
  gap: 0.45rem;
  color: rgb(100 116 139);
  font-size: 0.72rem;
  font-weight: 650;
  line-height: 1.25;
}

.conversation-row-count {
  min-width: 0;
}

.conversation-row-markers {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.22rem;
  color: var(--seed-accent-strong);
  opacity: 0.72;
}

.conversation-row-continuation {
  width: 1rem;
  height: 1rem;
  flex: 0 0 auto;
  margin-left: auto;
  color: var(--seed-accent-strong);
}

.dark .conversation-row {
  background: color-mix(in oklch, var(--seed-surface) 88%, rgb(15 23 42));
  color: rgb(226 232 240);
}

.dark .conversation-row:hover,
.dark .conversation-row-selected {
  background: var(--seed-surface-strong);
}

.dark .conversation-row-excerpt {
  color: rgb(203 213 225);
}

.dark .conversation-row-age,
.dark .conversation-row-footer {
  color: rgb(148 163 184);
}

.dark .conversation-row-current .conversation-row-path-badge {
  color: rgb(15 23 42);
}

@media (prefers-reduced-motion: reduce) {
  .conversation-row {
    transition: none;
  }
}
</style>
