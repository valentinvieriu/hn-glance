<template>
  <ReaderComment
    class="focused-comment-reader seed-palette-surface"
    :style="paletteStyle"
    :author-comment-count="authorCommentCount"
    :is-new="isNew"
    :node="node"
    :parent-author="parentAuthor"
    presentation="focused"
    :scope-id="scopeId"
    :story-author="storyAuthor"
    @select="emit('select', $event)"
  >
    <ReaderActions
      class="focused-comment-reader-footer"
      :descendant-count="descendantCount"
      :node="node"
      @select="emit('select', $event)"
    />
  </ReaderComment>
</template>

<script setup lang="ts">
import type { CommentNavigationNode } from '#shared/utils/comments'
import type { SeedPaletteStyle } from '~/composables/useSeedPalette'
import ReaderActions from './ReaderActions.vue'
import ReaderComment from './ReaderComment.vue'

defineProps<{
  authorCommentCount: number
  descendantCount: number
  isNew: boolean
  node: CommentNavigationNode
  paletteStyle: SeedPaletteStyle
  parentAuthor?: string
  scopeId: string
  storyAuthor?: string
}>()

const emit = defineEmits<{
  select: [commentId: number]
}>()
</script>

<style scoped>
.focused-comment-reader-footer {
  margin: 0 var(--comment-reader-gutter);
}
</style>
