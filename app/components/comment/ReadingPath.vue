<template>
  <ol class="reading-path" :aria-label="discussionLanguage.accessibility.completeReadingPath">
    <li
      v-for="(node, index) in nodes"
      :key="node.comment.id"
      class="reading-path-entry seed-palette-surface"
      :class="{
        'reading-path-entry-current': node.comment.id === selectedCommentId,
        'seed-palette-quiet': (authorCommentCounts.get(node.comment.author) ?? 1) <= 1,
      }"
      :style="getPaletteStyle(node.comment.id, node.comment.author)"
      data-reading-path-entry
      :data-reading-path-current="node.comment.id === selectedCommentId ? 'true' : undefined"
    >
      <div class="reading-path-rail" aria-hidden="true">
        <span class="reading-path-dot"></span>
        <span v-if="index < nodes.length - 1" class="reading-path-line"></span>
      </div>

      <ReaderComment
        :author-comment-count="authorCommentCounts.get(node.comment.author) ?? 1"
        :node="node"
        :parent-author="node.parentId ? nodes[index - 1]?.comment.author ?? 'parent' : undefined"
        presentation="path"
        :scope-id="`${scopePrefix}-reading-path-comment-${node.comment.id}`"
        :story-author="storyAuthor"
        @select="emit('select', $event)"
      >
        <template #meta>
          <span class="reading-path-step">
            {{ getStepLabel(index, node.comment.id) }}
          </span>
        </template>
        <ReaderActions
          v-if="node.comment.id === selectedCommentId"
          class="reading-path-actions"
          :descendant-count="descendantCounts.get(node.comment.id) ?? 0"
          :node="node"
          @select="emit('select', $event)"
        />
      </ReaderComment>
    </li>
  </ol>
</template>

<script setup lang="ts">
import type { CommentNavigationNode } from '#shared/utils/comments'
import { discussionLanguage } from '#shared/utils/productLanguage'
import type { SeedPaletteStyle } from '~/composables/useSeedPalette'
import ReaderActions from './ReaderActions.vue'
import ReaderComment from './ReaderComment.vue'

const props = defineProps<{
  authorCommentCounts: ReadonlyMap<string, number>
  descendantCounts: ReadonlyMap<number, number>
  getPaletteStyle: (commentId: number, author: string) => SeedPaletteStyle
  nodes: CommentNavigationNode[]
  scopePrefix: string
  selectedCommentId: number | null
  storyAuthor: string
}>()

const emit = defineEmits<{
  select: [commentId: number]
}>()

const getStepLabel = (index: number, commentId: number) => {
  return discussionLanguage.format.pathStep(
    index,
    commentId === props.selectedCommentId,
  )
}
</script>

<style scoped>
.reading-path {
  --reading-path-gutter: clamp(1.15rem, 3vw, 2.5rem);
  width: 100%;
  max-width: 42rem;
  margin: 0 auto;
  padding: 0;
  list-style: none;
}

.reading-path-entry {
  position: relative;
  display: grid;
  grid-template-columns: 1.4rem minmax(0, 1fr);
  gap: 0.75rem;
  padding: 1.65rem var(--reading-path-gutter) 0;
}

.reading-path-entry + .reading-path-entry {
  border-top: 1px solid rgb(148 163 184 / 0.2);
}

.reading-path-entry-current {
  background: linear-gradient(
    90deg,
    color-mix(in oklch, var(--seed-accent-soft) 76%, transparent),
    transparent 42%
  );
}

.reading-path-rail {
  position: relative;
  display: flex;
  justify-content: center;
}

.reading-path-dot {
  position: relative;
  z-index: 1;
  width: 0.62rem;
  height: 0.62rem;
  margin-top: 0.26rem;
  border-radius: 999px;
  background: var(--seed-accent);
  box-shadow: 0 0 0 4px var(--seed-ring);
}

.reading-path-line {
  position: absolute;
  top: 1rem;
  bottom: -1.66rem;
  left: 50%;
  width: 1px;
  background: linear-gradient(var(--seed-border-strong), rgb(148 163 184 / 0.24));
  transform: translateX(-50%);
}

.reading-path-step {
  padding: 0.12rem 0.34rem;
  border-radius: 999px;
  background: var(--seed-metric-bg);
  color: var(--seed-accent-strong);
  font-weight: 750;
  text-transform: uppercase;
}

.reading-path-actions {
  margin-bottom: 0.25rem;
}

.dark .reading-path-entry + .reading-path-entry {
  border-color: rgb(71 85 105 / 0.36);
}

@media (max-width: 640px) {
  .reading-path {
    --reading-path-gutter: 0.85rem;
  }

  .reading-path-entry {
    grid-template-columns: 1rem minmax(0, 1fr);
    gap: 0.55rem;
  }
}
</style>
