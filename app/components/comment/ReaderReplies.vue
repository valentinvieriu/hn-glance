<template>
  <section class="comment-reader-replies" :aria-labelledby="headingId">
    <header class="comment-reader-replies-header">
      <h2 :id="headingId">
        {{ discussionLanguage.format.repliesTo(node.comment.author) }}
      </h2>
      <p>{{ summary || discussionLanguage.messages.endOfBranch }}</p>
    </header>
    <ConversationList
      v-if="replies.length"
      class="comment-reader-replies-list"
      :author-comment-counts="authorCommentCounts"
      :comments="replies"
      :current-comment-id="null"
      :descendant-counts="descendantCounts"
      :get-palette-style="getPaletteStyle"
      :new-comment-ids="newCommentIds"
      :new-descendant-counts="newDescendantCounts"
      :selected-id="null"
      :story-author="storyAuthor"
      @select="emit('select', $event)"
    />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CommentNavigationNode } from '#shared/utils/comments'
import { discussionLanguage } from '#shared/utils/productLanguage'
import type { SeedPaletteStyle } from '~/composables/useSeedPalette'
import ConversationList from './ConversationList.vue'

// The current comment's direct replies, shown under the reader wherever the
// reply columns are not: on narrow screens and when the columns are hidden.
const props = defineProps<{
  authorCommentCounts: ReadonlyMap<string, number>
  descendantCounts: ReadonlyMap<number, number>
  getPaletteStyle: (commentId: number, author: string) => SeedPaletteStyle
  newCommentIds: ReadonlySet<number>
  newDescendantCounts: ReadonlyMap<number, number>
  node: CommentNavigationNode
  scopeId: string
  storyAuthor: string
}>()

const emit = defineEmits<{
  select: [commentId: number]
}>()

const headingId = computed(() => `${props.scopeId}-replies`)
const replies = computed(() => props.node.comment.children ?? [])
const summary = computed(() => discussionLanguage.format.replySummaryIfAny(
  replies.value.length,
  props.descendantCounts.get(props.node.comment.id) ?? 0,
))
</script>

<style scoped>
.comment-reader-replies {
  width: 100%;
  max-width: var(--comment-reader-max-width, 42rem);
  margin: 0 auto;
  padding: 1.4rem var(--comment-reader-replies-gutter, clamp(1.15rem, 3vw, 2.5rem)) 2.5rem;
}

.comment-reader-replies-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.2rem 0.75rem;
  margin-bottom: 0.7rem;
}

.comment-reader-replies-header h2 {
  margin: 0;
  color: rgb(30 41 59);
  font-size: 0.95rem;
  font-weight: 720;
}

.comment-reader-replies-header p {
  margin: 0;
  color: rgb(100 116 139);
  font-size: 0.76rem;
  font-weight: 650;
}

.comment-reader-replies-list {
  display: grid;
  gap: 0.58rem;
}

.dark .comment-reader-replies-header h2 {
  color: rgb(241 245 249);
}

.dark .comment-reader-replies-header p {
  color: rgb(148 163 184);
}

@media (max-width: 640px) {
  .comment-reader-replies {
    --comment-reader-replies-gutter: 0.85rem;
  }
}
</style>
