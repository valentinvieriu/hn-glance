<template>
  <ReaderToolbar
    :depth="node.depth"
    :mode="mode"
    @current="emit('jump', 'current')"
    @mode="emit('mode', $event)"
    @start="emit('jump', 'start')"
  />
  <slot name="before-content"></slot>
  <ReadingPath
    v-if="mode === 'path'"
    :author-comment-counts="authorCommentCounts"
    :descendant-counts="descendantCounts"
    :get-palette-style="getPaletteStyle"
    :nodes="pathNodes"
    :scope-prefix="scopePrefix"
    :selected-comment-id="selectedCommentId"
    :story-author="storyAuthor"
    @select="emit('select', $event)"
  />
  <FocusedReader
    v-else
    :author-comment-count="authorCommentCounts.get(node.comment.author) ?? 1"
    :descendant-count="descendantCounts.get(node.comment.id) ?? 0"
    :node="node"
    :palette-style="getPaletteStyle(node.comment.id, node.comment.author)"
    :parent-author="parentAuthor"
    :scope-id="`${scopePrefix}-comment-${node.comment.id}`"
    :story-author="storyAuthor"
    @select="emit('select', $event)"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CommentNavigationNode } from '#shared/utils/comments'
import type { SeedPaletteStyle } from '~/composables/useSeedPalette'
import FocusedReader from './FocusedReader.vue'
import ReaderToolbar from './ReaderToolbar.vue'
import ReadingPath from './ReadingPath.vue'
import type { CommentReaderMode, CommentReaderPosition } from './reader'

const props = defineProps<{
  authorCommentCounts: ReadonlyMap<string, number>
  descendantCounts: ReadonlyMap<number, number>
  getPaletteStyle: (commentId: number, author: string) => SeedPaletteStyle
  mode: CommentReaderMode
  node: CommentNavigationNode
  pathNodes: CommentNavigationNode[]
  scopePrefix: string
  selectedCommentId: number | null
  storyAuthor: string
}>()

const emit = defineEmits<{
  jump: [position: CommentReaderPosition]
  mode: [mode: CommentReaderMode]
  select: [commentId: number]
}>()

const parentAuthor = computed(() => props.node.parentId
  ? props.pathNodes.at(-2)?.comment.author ?? 'parent'
  : undefined)
</script>
