<template>
  <nav
    v-if="count > 0"
    class="new-comments-navigation"
    :aria-label="discussionLanguage.accessibility.newCommentsNavigation"
  >
    <span class="new-comments-count">
      <span class="new-comments-dot" aria-hidden="true"></span>
      <span aria-hidden="true">
        {{ position > 0
          ? discussionLanguage.format.newCommentCompactPosition(position, count)
          : discussionLanguage.format.newCommentCompactCount(count) }}
      </span>
      <span class="sr-only" aria-live="polite">
        {{ position > 0
          ? discussionLanguage.format.newCommentPosition(position, count)
          : discussionLanguage.format.newCommentCount(count) }}
      </span>
    </span>
    <span class="new-comments-controls">
      <button
        type="button"
        class="new-comments-button new-comments-step"
        :aria-label="discussionLanguage.actions.previousNewComment"
        :title="discussionLanguage.actions.previousNewComment"
        @click="emit('previous')"
      >
        <LucideChevronLeft class="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="new-comments-button new-comments-step"
        :aria-label="discussionLanguage.actions.nextNewComment"
        :title="discussionLanguage.actions.nextNewComment"
        @click="emit('next')"
      >
        <LucideChevronRight class="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="new-comments-button new-comments-mark-seen"
        :aria-label="discussionLanguage.actions.markAllSeen"
        :title="discussionLanguage.actions.markAllSeen"
        @click="emit('markSeen')"
      >
        <LucideCheck class="h-3.5 w-3.5" aria-hidden="true" />
        <span>{{ discussionLanguage.actions.markAllSeen }}</span>
      </button>
    </span>
  </nav>
</template>

<script setup lang="ts">
import { LucideCheck, LucideChevronLeft, LucideChevronRight } from '@lucide/vue'
import { discussionLanguage } from '#shared/utils/productLanguage'

defineProps<{
  count: number
  position: number
}>()

const emit = defineEmits<{
  markSeen: []
  next: []
  previous: []
}>()
</script>

<style scoped>
.new-comments-navigation,
.new-comments-count,
.new-comments-controls,
.new-comments-button {
  display: inline-flex;
  align-items: center;
}

.new-comments-navigation {
  min-height: 2rem;
  overflow: hidden;
  border: 1px solid rgb(14 165 233 / 0.3);
  border-radius: 999px;
  background: rgb(14 165 233 / 0.08);
  color: rgb(3 105 161);
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
}

.new-comments-count {
  gap: 0.36rem;
  padding: 0.4rem 0.58rem;
  white-space: nowrap;
}

.new-comments-dot {
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 999px;
  background: rgb(14 165 233);
  box-shadow: 0 0 0 3px rgb(14 165 233 / 0.14);
}

.new-comments-controls {
  align-self: stretch;
  border-left: 1px solid rgb(14 165 233 / 0.2);
}

.new-comments-button {
  justify-content: center;
  gap: 0.28rem;
  min-height: 100%;
  padding: 0.3rem 0.4rem;
  transition: background-color 150ms ease, color 150ms ease;
}

.new-comments-button + .new-comments-button {
  border-left: 1px solid rgb(14 165 233 / 0.18);
}

.new-comments-button:hover,
.new-comments-button:focus-visible {
  background: rgb(14 165 233 / 0.13);
  color: rgb(2 132 199);
}

.new-comments-button:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: -2px;
}

.new-comments-mark-seen {
  padding-inline: 0.55rem 0.65rem;
}

.dark .new-comments-navigation {
  border-color: rgb(56 189 248 / 0.3);
  background: rgb(14 165 233 / 0.1);
  color: rgb(125 211 252);
}

.dark .new-comments-controls,
.dark .new-comments-button + .new-comments-button {
  border-color: rgb(56 189 248 / 0.2);
}

@media (max-width: 520px) {
  .new-comments-mark-seen span {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }
}
</style>
