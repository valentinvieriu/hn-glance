<template>
  <footer class="comment-reader-actions">
    <div
      class="comment-reader-actions-navigation"
      :aria-label="discussionLanguage.accessibility.commentNavigation"
    >
      <button
        v-if="node.parentId"
        type="button"
        class="comment-reader-action"
        @click="emitParent"
      >
        <LucideCornerDownRight class="h-3.5 w-3.5" aria-hidden="true" />
        {{ discussionLanguage.terms.parentComment }}
      </button>
      <button
        v-if="node.rootId !== node.comment.id"
        type="button"
        class="comment-reader-action"
        @click="emit('select', node.rootId)"
      >
        <LucideArrowUpToLine class="h-3.5 w-3.5" aria-hidden="true" />
        {{ discussionLanguage.terms.rootComment }}
      </button>
      <button
        v-if="node.previousSiblingId"
        type="button"
        class="comment-reader-action"
        @click="emit('select', node.previousSiblingId)"
      >
        <LucideArrowLeft class="h-3.5 w-3.5" aria-hidden="true" />
        {{ previousLabel }}
      </button>
      <span v-if="node.siblingCount > 1" class="comment-reader-position">
        {{ positionLabel }}
      </span>
      <button
        v-if="node.nextSiblingId"
        type="button"
        class="comment-reader-action"
        @click="emit('select', node.nextSiblingId)"
      >
        {{ nextLabel }}
        <LucideArrowRight class="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
    <div class="comment-reader-destinations">
      <span v-if="replyCountLabel" class="comment-reader-replies">
        {{ replyCountLabel }}
      </span>
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
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  LucideArrowLeft,
  LucideArrowRight,
  LucideArrowUpToLine,
  LucideCornerDownRight,
  LucideExternalLink,
} from '@lucide/vue'
import type { CommentNavigationNode } from '#shared/utils/comments'
import {
  discussionLanguage,
  type DiscussionSiblingKind,
} from '#shared/utils/productLanguage'

const props = defineProps<{
  descendantCount: number
  node: CommentNavigationNode
}>()

const emit = defineEmits<{
  select: [commentId: number]
}>()

const replyCountLabel = computed(() => {
  const directReplyCount = props.node.comment.children?.length ?? 0

  return directReplyCount > 0
    ? discussionLanguage.format.replySummary(directReplyCount, props.descendantCount)
    : ''
})
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
const replyHref = computed(() => {
  const comment = props.node.comment

  return `https://news.ycombinator.com/reply?id=${comment.id}&goto=item%3Fid%3D${comment.parent_id}%23${comment.id}`
})

const emitParent = () => {
  if (props.node.parentId) {
    emit('select', props.node.parentId)
  }
}
</script>

<style scoped>
.comment-reader-actions {
  display: grid;
  gap: 0.6rem;
  padding: 0.8rem 0 2rem;
  border-top: 1px solid rgb(148 163 184 / 0.22);
}

.comment-reader-actions-navigation,
.comment-reader-destinations {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem 0.55rem;
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

.comment-reader-position,
.comment-reader-replies {
  color: rgb(100 116 139);
  font-size: 0.76rem;
  font-weight: 650;
}

.comment-reader-destinations {
  justify-content: space-between;
  padding-top: 0.15rem;
}

.dark .comment-reader-actions {
  border-color: rgb(71 85 105 / 0.42);
}

.dark .comment-reader-position,
.dark .comment-reader-replies {
  color: rgb(148 163 184);
}
</style>
