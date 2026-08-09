<template>
  <ul class="conversation-list">
    <li v-for="comment in comments" :key="comment.id">
      <ConversationRow
        data-conversation-row
        :data-comment-id="comment.id"
        :author-comment-count="authorCommentCounts.get(comment.author) ?? 1"
        :comment="comment"
        :current="currentCommentId === comment.id"
        :descendant-count="descendantCounts.get(comment.id) ?? 0"
        :is-new="newCommentIds.has(comment.id)"
        :new-descendant-count="newDescendantCounts.get(comment.id) ?? 0"
        :palette-style="getPaletteStyle(comment.id, comment.author)"
        :selected="selectedId === comment.id"
        :story-author="storyAuthor"
        @select="emit('select', $event)"
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { Comment } from '#shared/types'
import type { SeedPaletteStyle } from '~/composables/useSeedPalette'
import ConversationRow from './ConversationRow.vue'

defineProps<{
  authorCommentCounts: ReadonlyMap<string, number>
  comments: Comment[]
  currentCommentId: number | null
  descendantCounts: ReadonlyMap<number, number>
  newCommentIds: ReadonlySet<number>
  newDescendantCounts: ReadonlyMap<number, number>
  getPaletteStyle: (commentId: number, author: string) => SeedPaletteStyle
  selectedId: number | null
  storyAuthor?: string
}>()

const emit = defineEmits<{
  select: [commentId: number]
}>()
</script>

<style scoped>
.conversation-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
