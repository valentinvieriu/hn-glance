<template>
  <article
    class="comment-reader-comment"
    :class="[
      `comment-reader-comment-${presentation}`,
      {
        'comment-reader-comment-new': isNew,
        'seed-palette-quiet': authorCommentCount <= 1,
      },
    ]"
    :aria-labelledby="headingId"
  >
    <header class="comment-reader-comment-header">
      <div class="comment-reader-comment-identity">
        <span
          v-if="presentation === 'focused'"
          class="comment-reader-comment-dot"
          aria-hidden="true"
        ></span>
        <h2 :id="headingId" class="comment-reader-comment-author">
          <NuxtLink :to="getHnUserPath(node.comment.author)">
            {{ node.comment.author }}
          </NuxtLink>
        </h2>
        <span v-if="isOriginalPoster" class="comment-reader-comment-badge">
          {{ discussionLanguage.states.originalPoster }}
        </span>
        <span
          v-if="isNew"
          class="comment-reader-comment-new-badge discussion-new-indicator"
          :title="discussionLanguage.accessibility.newComment"
        >
          {{ discussionLanguage.states.new }}
        </span>
        <span
          v-if="authorCommentCount > 1"
          class="comment-reader-comment-activity"
          :aria-label="discussionLanguage.format.authorActivity(node.comment.author, authorCommentCount)"
        >
          <LucideMessageSquare class="h-3.5 w-3.5" aria-hidden="true" />
          {{ authorCommentCount }}
        </span>
      </div>
      <div class="comment-reader-comment-meta">
        <slot name="meta"></slot>
        <a
          v-if="presentation === 'focused'"
          :href="permalink"
          class="comment-reader-comment-time"
          :aria-label="discussionLanguage.format.commentPermalink(node.comment.author, timeAgo)"
          :title="discussionLanguage.accessibility.commentPermalink"
          @click.prevent="emit('select', node.comment.id)"
        >
          {{ timeAgo }}
        </a>
        <span v-else class="comment-reader-comment-time">{{ timeAgo }}</span>
      </div>
    </header>

    <p v-if="parentAuthor" class="comment-reader-comment-context">
      {{ discussionLanguage.context.replyingTo }}
      <button type="button" @click="emitParent">
        {{ parentAuthor }}
      </button>
    </p>

    <CommentRichContent
      class="comment-reader-comment-body reading-text rich-text"
      :comment="node.comment"
      :scope-id="scopeId"
    />

    <div class="comment-reader-comment-links">
      <CommentLinks :comments="[node.comment]" presentation="reader" />
    </div>

    <slot></slot>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { LucideMessageSquare } from '@lucide/vue'
import type { CommentNavigationNode } from '#shared/utils/comments'
import { formatTimeAgo } from '#shared/utils/date'
import { getHnUserPath } from '#shared/utils/hn'
import { discussionLanguage } from '#shared/utils/productLanguage'
import CommentLinks from '~/components/CommentLinks.vue'
import CommentRichContent from './RichContent.vue'

const props = defineProps<{
  authorCommentCount: number
  isNew: boolean
  node: CommentNavigationNode
  parentAuthor?: string
  presentation: 'focused' | 'path'
  scopeId: string
  storyAuthor?: string
}>()

const emit = defineEmits<{
  select: [commentId: number]
}>()

const headingId = computed(() => `${props.scopeId}-author`)
const isOriginalPoster = computed(() => {
  return Boolean(props.storyAuthor) && props.node.comment.author === props.storyAuthor
})
const permalink = computed(() => `#comment-${props.node.comment.id}`)
const timeAgo = computed(() => formatTimeAgo(props.node.comment.created_at))

const emitParent = () => {
  if (props.node.parentId) {
    emit('select', props.node.parentId)
  }
}
</script>

<style scoped>
.comment-reader-comment {
  min-width: 0;
  background: transparent;
}

.comment-reader-comment-focused {
  --comment-reader-gutter: clamp(1.15rem, 3vw, 2.5rem);
  width: 100%;
  max-width: 42rem;
  margin-inline: auto;
}

.comment-reader-comment-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.comment-reader-comment-focused .comment-reader-comment-header {
  align-items: center;
  padding: 1.65rem var(--comment-reader-gutter) 0.45rem;
}

.comment-reader-comment-identity,
.comment-reader-comment-meta,
.comment-reader-comment-activity {
  display: flex;
  align-items: center;
}

.comment-reader-comment-identity {
  min-width: 0;
  gap: 0.4rem;
}

.comment-reader-comment-dot {
  width: 0.55rem;
  height: 0.55rem;
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--seed-accent);
  box-shadow: 0 0 0 3px var(--seed-ring);
}

.comment-reader-comment-author {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--seed-author-text);
  font-size: 0.95rem;
  font-weight: 720;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comment-reader-comment-author a:hover,
.comment-reader-comment-author a:focus-visible,
.comment-reader-comment-context button:hover,
.comment-reader-comment-context button:focus-visible {
  text-decoration: underline;
}

.comment-reader-comment-badge {
  padding: 0.02rem 0.28rem;
  border: 1px solid var(--seed-border-strong);
  border-radius: 0.25rem;
  color: var(--seed-accent-strong);
  font-size: 0.64rem;
  font-weight: 750;
  letter-spacing: 0.03em;
}

.comment-reader-comment-new-badge {
  padding: 0.08rem 0.34rem;
  font-size: 0.64rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.comment-reader-comment-new.comment-reader-comment-focused {
  box-shadow: inset 3px 0 0 rgb(14 165 233 / 0.68);
}

.comment-reader-comment-activity {
  gap: 0.2rem;
  color: rgb(100 116 139);
  font-size: 0.72rem;
  font-weight: 650;
}

.comment-reader-comment-meta {
  flex: 0 0 auto;
  gap: 0.45rem;
  color: rgb(100 116 139);
  font-size: 0.71rem;
  font-weight: 620;
}

.comment-reader-comment-focused .comment-reader-comment-meta {
  font-size: 0.75rem;
  font-weight: 600;
}

.comment-reader-comment-time {
  flex: 0 0 auto;
}

a.comment-reader-comment-time:hover,
a.comment-reader-comment-time:focus-visible {
  color: var(--seed-accent-strong);
  text-decoration: underline;
}

.comment-reader-comment-context {
  margin: 0.35rem 0 0;
  color: rgb(100 116 139);
  font-size: 0.75rem;
  line-height: 1.35;
}

.comment-reader-comment-focused .comment-reader-comment-context {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.28rem;
  margin: 0;
  padding: 0 var(--comment-reader-gutter) 0.35rem;
  font-size: 0.76rem;
}

.comment-reader-comment-context button {
  color: var(--seed-accent-strong);
  font-weight: 700;
}

.comment-reader-comment-body {
  padding: 0.85rem 0 1.8rem;
  color: rgb(30 41 59);
  font-size: 1.06rem;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.comment-reader-comment-focused .comment-reader-comment-body {
  padding: 1.05rem var(--comment-reader-gutter) 1.25rem;
  font-size: 1.1rem;
  line-height: 1.72;
}

.comment-reader-comment-body :deep(blockquote) {
  border-left-color: color-mix(in oklch, var(--seed-accent) 44%, transparent);
}

.comment-reader-comment-focused .comment-reader-comment-links {
  margin: 0 var(--comment-reader-gutter);
}

.dark .comment-reader-comment-body {
  color: rgb(226 232 240);
}

.dark .comment-reader-comment-activity,
.dark .comment-reader-comment-meta,
.dark .comment-reader-comment-context {
  color: rgb(148 163 184);
}

@media (max-width: 640px) {
  .comment-reader-comment-focused {
    --comment-reader-gutter: 0.85rem;
  }

  .comment-reader-comment-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.35rem;
  }

  .comment-reader-comment-focused .comment-reader-comment-header {
    align-items: center;
    flex-direction: row;
  }

  .comment-reader-comment-body {
    font-size: 1.02rem;
  }

  .comment-reader-comment-focused .comment-reader-comment-body {
    font-size: 1.05rem;
  }
}
</style>
