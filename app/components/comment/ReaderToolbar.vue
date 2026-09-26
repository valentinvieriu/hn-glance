<template>
  <div
    class="comment-reader-toolbar"
    :class="`comment-reader-toolbar-${placement}`"
  >
    <div
      class="comment-reader-mode-control"
      role="group"
      :aria-label="discussionLanguage.terms.readingMode"
    >
      <span class="comment-reader-mode-label" aria-hidden="true">
        {{ discussionLanguage.terms.readingMode }}
      </span>
      <div class="comment-reader-mode-toggle">
        <button
          type="button"
          :aria-pressed="mode === 'comment'"
          @click="emit('mode', 'comment')"
        >
          {{ discussionLanguage.terms.currentComment }}
        </button>
        <button
          type="button"
          :aria-pressed="mode === 'path'"
          @click="emit('mode', 'path')"
        >
          {{ discussionLanguage.terms.readingPath }}
        </button>
      </div>
    </div>

    <div v-if="mode === 'path'" class="comment-reader-jumps">
      <button
        type="button"
        :aria-label="discussionLanguage.actions.goToRootComment"
        :title="discussionLanguage.actions.goToRootComment"
        @click="emit('start')"
      >
        <LucideArrowUpToLine class="h-3.5 w-3.5" aria-hidden="true" />
        <span class="comment-reader-jump-label">{{ discussionLanguage.actions.goToRootComment }}</span>
      </button>
      <button
        type="button"
        :aria-label="discussionLanguage.actions.goToCurrentComment"
        :title="discussionLanguage.actions.goToCurrentComment"
        @click="emit('current')"
      >
        <LucideLocateFixed class="h-3.5 w-3.5" aria-hidden="true" />
        <span class="comment-reader-jump-label">{{ discussionLanguage.actions.goToCurrentComment }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  LucideArrowUpToLine,
  LucideLocateFixed,
} from '@lucide/vue'
import { discussionLanguage } from '#shared/utils/productLanguage'
import type { CommentReaderMode } from '~/types/commentReader'

defineProps<{
  mode: CommentReaderMode
  // `bar` sits in the discussion-focus path bar; `reader` heads a reader that
  // has no path bar beside it, such as the narrow-screen one.
  placement: 'bar' | 'reader'
}>()

const emit = defineEmits<{
  current: []
  mode: [mode: CommentReaderMode]
  start: []
}>()
</script>

<style scoped>
.comment-reader-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem 0.55rem;
}

.comment-reader-toolbar-bar {
  flex: 0 0 auto;
  flex-wrap: nowrap;
  padding-left: 0.5rem;
  border-left: 1px solid rgb(148 163 184 / 0.3);
}

.comment-reader-toolbar-bar .comment-reader-jump-label {
  display: none;
}

.comment-reader-toolbar-reader {
  position: sticky;
  z-index: 5;
  top: 0;
  min-height: 2.9rem;
  padding: 0.42rem 0.7rem;
  border-bottom: 1px solid rgb(148 163 184 / 0.26);
  background: color-mix(in oklch, rgb(248 250 252) 97%, var(--story-context-accent-soft));
  box-shadow: 0 8px 18px -20px rgb(15 23 42 / 0.6);
}

.comment-reader-mode-control,
.comment-reader-mode-toggle,
.comment-reader-jumps {
  display: inline-flex;
  align-items: center;
}

.comment-reader-mode-control {
  gap: 0.42rem;
}

.comment-reader-mode-label {
  flex: 0 0 auto;
  color: rgb(100 116 139);
  font-size: 0.67rem;
  font-weight: 720;
  white-space: nowrap;
}

.comment-reader-mode-toggle {
  padding: 0.14rem;
  border: 1px solid rgb(148 163 184 / 0.28);
  border-radius: 999px;
  background: rgb(148 163 184 / 0.09);
}

.comment-reader-mode-toggle button,
.comment-reader-jumps button {
  display: inline-flex;
  min-height: 1.7rem;
  align-items: center;
  justify-content: center;
  gap: 0.26rem;
  padding: 0.22rem 0.48rem;
  border-radius: 999px;
  color: rgb(71 85 105);
  font-size: 0.71rem;
  font-weight: 720;
  line-height: 1;
  white-space: nowrap;
}

.comment-reader-mode-toggle button[aria-pressed="true"] {
  background: var(--story-context-surface-raised);
  color: var(--story-context-accent-strong);
  box-shadow: 0 1px 3px rgb(15 23 42 / 0.14);
}

.comment-reader-jumps {
  gap: 0.08rem;
}

.comment-reader-toolbar-bar .comment-reader-jumps button {
  width: 1.8rem;
  padding: 0;
}

.comment-reader-jumps button {
  color: var(--story-context-accent-strong);
}

.comment-reader-mode-toggle button:hover,
.comment-reader-mode-toggle button:focus-visible,
.comment-reader-jumps button:hover,
.comment-reader-jumps button:focus-visible {
  background: var(--story-context-accent-soft);
}

.comment-reader-mode-toggle button:focus-visible,
.comment-reader-jumps button:focus-visible {
  outline: 2px solid var(--story-context-focus);
  outline-offset: 1px;
}

.dark .comment-reader-toolbar-bar {
  border-color: rgb(148 163 184 / 0.3);
}

.dark .comment-reader-toolbar-reader {
  border-color: rgb(71 85 105 / 0.42);
  background: color-mix(in oklch, rgb(13 20 33) 98%, var(--story-context-accent-soft));
}

.dark .comment-reader-mode-label,
.dark .comment-reader-mode-toggle button {
  color: rgb(148 163 184);
}

.dark .comment-reader-mode-toggle {
  border-color: rgb(100 116 139 / 0.34);
  background: rgb(15 23 42 / 0.56);
}

.dark .comment-reader-mode-toggle button[aria-pressed="true"],
.dark .comment-reader-jumps button {
  color: var(--story-context-accent-strong);
}

@media (max-width: 640px) {
  .comment-reader-toolbar-reader .comment-reader-jumps {
    width: 100%;
  }
}
</style>
