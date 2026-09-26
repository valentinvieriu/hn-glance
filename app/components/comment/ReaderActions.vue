<template>
  <footer class="comment-reader-actions">
    <div
      class="comment-reader-actions-navigation"
      :aria-label="discussionLanguage.accessibility.commentNavigation"
    >
      <button
        v-if="node.previousSiblingId"
        type="button"
        class="comment-reader-action"
        :aria-label="previousLabel"
        :title="previousLabel"
        @click="emit('select', node.previousSiblingId)"
      >
        <LucideArrowUp class="h-3.5 w-3.5" aria-hidden="true" />
        <span class="comment-reader-action-label">{{ previousLabel }}</span>
      </button>
      <span v-if="node.siblingCount > 1" class="comment-reader-position">
        {{ positionLabel }}
      </span>
      <button
        v-if="node.nextSiblingId"
        type="button"
        class="comment-reader-action"
        :aria-label="nextLabel"
        :title="nextLabel"
        @click="emit('select', node.nextSiblingId)"
      >
        <LucideArrowDown class="h-3.5 w-3.5" aria-hidden="true" />
        <span class="comment-reader-action-label">{{ nextLabel }}</span>
      </button>
    </div>
    <a
      :href="replyHref"
      target="_blank"
      rel="noopener noreferrer"
      class="comment-reader-reply-link"
      :aria-label="discussionLanguage.format.replyOnHackerNews(node.comment.author)"
    >
      {{ discussionLanguage.actions.replyOnHackerNews }}
      <LucideExternalLink class="h-3.5 w-3.5" aria-hidden="true" />
    </a>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  LucideArrowDown,
  LucideArrowUp,
  LucideExternalLink,
} from '@lucide/vue'
import type { CommentNavigationNode } from '#shared/utils/comments'
import { getHnReplyUrl } from '#shared/utils/hn'
import {
  discussionLanguage,
  type DiscussionSiblingKind,
} from '#shared/utils/productLanguage'

// Parent and root comments stay reachable through the breadcrumb, the
// "Replying to" link, and the Left arrow, so the footer carries only the
// sibling step that has no other visible control once the columns are hidden.
const props = defineProps<{
  node: CommentNavigationNode
}>()

const emit = defineEmits<{
  select: [commentId: number]
}>()

const siblingKind = computed<DiscussionSiblingKind>(() => {
  return props.node.parentId ? 'reply' : 'root-comment'
})
const previousLabel = computed(() => {
  return discussionLanguage.format.previousSibling(siblingKind.value)
})
const nextLabel = computed(() => {
  return discussionLanguage.format.nextSibling(siblingKind.value)
})
const positionLabel = computed(() => {
  return discussionLanguage.format.replyPosition(
    props.node.siblingIndex + 1,
    props.node.siblingCount,
    siblingKind.value,
  )
})
const replyHref = computed(() => getHnReplyUrl(props.node.comment))
</script>

<style scoped>
.comment-reader-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.35rem 0.75rem;
  padding: 0.6rem 0 1.6rem;
  border-top: 1px solid rgb(148 163 184 / 0.22);
}

.comment-reader-actions-navigation {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem 0.45rem;
}

.comment-reader-action,
.comment-reader-reply-link {
  display: inline-flex;
  min-height: 1.9rem;
  align-items: center;
  gap: 0.28rem;
  padding: 0.24rem 0.45rem;
  border-radius: 999px;
  color: var(--seed-accent-strong);
  font-size: 0.78rem;
  font-weight: 700;
}

.comment-reader-action:hover,
.comment-reader-action:focus-visible,
.comment-reader-reply-link:hover,
.comment-reader-reply-link:focus-visible {
  background: var(--seed-metric-bg-hover);
}

.comment-reader-action:focus-visible,
.comment-reader-reply-link:focus-visible {
  outline: 2px solid var(--seed-accent);
  outline-offset: 2px;
}

.comment-reader-position {
  color: rgb(100 116 139);
  font-size: 0.76rem;
  font-weight: 650;
}

.dark .comment-reader-actions {
  border-color: rgb(71 85 105 / 0.42);
}

.dark .comment-reader-position {
  color: rgb(148 163 184);
}

@media (max-width: 520px) {
  .comment-reader-action-label {
    display: none;
  }
}
</style>
