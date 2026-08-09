<template>
  <header class="comment-reader-toolbar">
    <div class="comment-reader-toolbar-title">
      <LucideBookOpenText class="h-3.5 w-3.5" aria-hidden="true" />
      <span>Comment reader</span>
    </div>

    <div class="comment-reader-mode-toggle" role="group" aria-label="Comment reader mode">
      <button
        type="button"
        :aria-pressed="mode === 'comment'"
        @click="emit('mode', 'comment')"
      >
        Comment
      </button>
      <button
        type="button"
        :aria-pressed="mode === 'path'"
        @click="emit('mode', 'path')"
      >
        Reading path
        <span>{{ pathLength }}</span>
      </button>
    </div>

    <div v-if="mode === 'path'" class="comment-reader-jumps">
      <button type="button" @click="emit('start')">
        <LucideArrowUpToLine class="h-3.5 w-3.5" aria-hidden="true" />
        Start
      </button>
      <button type="button" @click="emit('current')">
        <LucideLocateFixed class="h-3.5 w-3.5" aria-hidden="true" />
        Current
      </button>
    </div>

    <span class="comment-reader-depth">Depth {{ depth }}</span>
  </header>
</template>

<script setup lang="ts">
import {
  LucideArrowUpToLine,
  LucideBookOpenText,
  LucideLocateFixed,
} from '@lucide/vue'
import type { CommentReaderMode } from './reader'

defineProps<{
  depth: number
  mode: CommentReaderMode
  pathLength: number
}>()

const emit = defineEmits<{
  current: []
  mode: [mode: CommentReaderMode]
  start: []
}>()
</script>

<style scoped>
.comment-reader-toolbar {
  position: sticky;
  z-index: 5;
  top: 0;
  display: flex;
  min-height: 3.2rem;
  align-items: center;
  gap: 0.55rem;
  padding: 0.48rem clamp(0.75rem, 2vw, 1.25rem);
  border-bottom: 1px solid rgb(148 163 184 / 0.26);
  background: color-mix(in oklch, rgb(248 250 252) 97%, var(--story-context-accent-soft));
  box-shadow: 0 8px 18px -20px rgb(15 23 42 / 0.6);
}

.comment-reader-toolbar-title {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.32rem;
  color: rgb(100 116 139);
  font-size: 0.69rem;
  font-weight: 760;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.comment-reader-mode-toggle,
.comment-reader-jumps {
  display: inline-flex;
  align-items: center;
}

.comment-reader-mode-toggle {
  padding: 0.16rem;
  border: 1px solid rgb(148 163 184 / 0.28);
  border-radius: 999px;
  background: rgb(148 163 184 / 0.09);
}

.comment-reader-mode-toggle button,
.comment-reader-jumps button {
  display: inline-flex;
  min-height: 1.8rem;
  align-items: center;
  justify-content: center;
  gap: 0.26rem;
  padding: 0.25rem 0.48rem;
  border-radius: 999px;
  color: rgb(71 85 105);
  font-size: 0.71rem;
  font-weight: 720;
  line-height: 1;
}

.comment-reader-mode-toggle button[aria-pressed="true"] {
  background: var(--story-context-surface-raised);
  color: var(--story-context-accent-strong);
  box-shadow: 0 1px 3px rgb(15 23 42 / 0.14);
}

.comment-reader-mode-toggle button span {
  display: inline-grid;
  min-width: 1.15rem;
  height: 1.15rem;
  place-items: center;
  border-radius: 999px;
  background: var(--story-context-accent-soft);
  font-size: 0.65rem;
}

.comment-reader-jumps {
  gap: 0.08rem;
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

.comment-reader-depth {
  flex: 0 0 auto;
  margin-left: auto;
  color: rgb(100 116 139);
  font-size: 0.67rem;
  font-weight: 760;
  letter-spacing: 0.055em;
  text-transform: uppercase;
}

.dark .comment-reader-toolbar {
  border-color: rgb(71 85 105 / 0.42);
  background: color-mix(in oklch, rgb(13 20 33) 98%, var(--story-context-accent-soft));
}

.dark .comment-reader-toolbar-title,
.dark .comment-reader-depth,
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
  .comment-reader-toolbar {
    flex-wrap: wrap;
    padding-inline: 0.7rem;
  }

  .comment-reader-toolbar-title {
    display: none;
  }

  .comment-reader-mode-toggle {
    order: 1;
  }

  .comment-reader-jumps {
    order: 3;
    width: 100%;
  }

  .comment-reader-depth {
    order: 2;
  }
}
</style>
