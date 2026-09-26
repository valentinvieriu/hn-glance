<template>
  <ReaderToolbar
    v-if="showToolbar"
    :mode="mode"
    placement="reader"
    @current="emit('jump', 'current')"
    @mode="emit('mode', $event)"
    @start="emit('jump', 'start')"
  />
  <slot name="before-content"></slot>
  <ReadingPath
    v-if="mode === 'path'"
    :author-comment-counts="authorCommentCounts"
    :get-palette-style="getPaletteStyle"
    :new-comment-ids="newCommentIds"
    :nodes="pathNodes"
    :scope-prefix="scopePrefix"
    :selected-comment-id="selectedCommentId"
    :story-author="storyAuthor"
    @select="emit('select', $event)"
  />
  <FocusedReader
    v-else
    :author-comment-count="authorCommentCounts.get(node.comment.author) ?? 1"
    :is-new="newCommentIds.has(node.comment.id)"
    :node="node"
    :palette-style="getPaletteStyle(node.comment.id, node.comment.author)"
    :parent-author="parentAuthor"
    :scope-id="`${scopePrefix}-comment-${node.comment.id}`"
    :story-author="storyAuthor"
    @select="emit('select', $event)"
  />
  <ReaderReplies
    v-if="showReplies"
    :author-comment-counts="authorCommentCounts"
    :descendant-counts="descendantCounts"
    :get-palette-style="getPaletteStyle"
    :new-comment-ids="newCommentIds"
    :new-descendant-counts="newDescendantCounts"
    :node="node"
    :scope-id="`${scopePrefix}-comment-${node.comment.id}`"
    :story-author="storyAuthor"
    @select="emit('select', $event)"
  />
</template>

<script setup lang="ts">
import type { CommentNavigationNode } from '#shared/utils/comments'
import type { SeedPaletteStyle } from '~/composables/useSeedPalette'
import type { CommentReaderMode, CommentReaderPosition } from '~/types/commentReader'
import FocusedReader from './FocusedReader.vue'
import ReaderReplies from './ReaderReplies.vue'
import ReaderToolbar from './ReaderToolbar.vue'
import ReadingPath from './ReadingPath.vue'

defineProps<{
  authorCommentCounts: ReadonlyMap<string, number>
  descendantCounts: ReadonlyMap<number, number>
  getPaletteStyle: (commentId: number, author: string) => SeedPaletteStyle
  mode: CommentReaderMode
  newCommentIds: ReadonlySet<number>
  newDescendantCounts: ReadonlyMap<number, number>
  node: CommentNavigationNode
  parentAuthor?: string
  pathNodes: CommentNavigationNode[]
  scopePrefix: string
  selectedCommentId: number | null
  // The reply list stands in for the reply column when that column is absent.
  showReplies: boolean
  // Off when the discussion-focus path bar already carries the reader controls.
  showToolbar: boolean
  storyAuthor: string
}>()

const emit = defineEmits<{
  jump: [position: CommentReaderPosition]
  mode: [mode: CommentReaderMode]
  select: [commentId: number]
}>()
</script>
