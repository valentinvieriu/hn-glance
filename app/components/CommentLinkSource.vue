<template>
  <SourceIdentity
    :url="link.url"
    :label="link.title"
    :size="presentation === 'reader' ? 'compact' : 'default'"
  />
  <div
    class="comment-link-source-content"
    :class="`comment-link-source-content-${presentation}`"
  >
    <h3 v-if="presentation === 'section'">
      <a
        :href="link.url"
        target="_blank"
        rel="nofollow noopener noreferrer"
        class="comment-link-source-title comment-link-source-title-section story-context-primary-link"
      >
        {{ link.title }}
      </a>
    </h3>
    <a
      v-else
      :href="link.url"
      target="_blank"
      rel="nofollow noopener noreferrer"
      class="comment-link-source-title comment-link-source-title-reader"
    >
      <span>{{ link.title }}</span>
      <LucideExternalLink class="h-3 w-3" aria-hidden="true" />
    </a>

    <div v-if="presentation === 'section'" class="comment-link-source-line meta-text">
      <span v-if="link.domain !== link.title" class="comment-link-source-domain">
        {{ link.domain }}
      </span>
    </div>
    <span v-else-if="link.domain !== link.title" class="comment-link-source-domain-reader">
      {{ link.domain }}
    </span>

    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { LucideExternalLink } from '@lucide/vue'
import type { CommentLink } from '#shared/utils/commentLinks'
import SourceIdentity from './SourceIdentity.vue'

const props = defineProps<{
  link: CommentLink
  presentation?: 'section' | 'reader'
}>()

const presentation = computed(() => props.presentation ?? 'section')
</script>

<style scoped>
.comment-link-source-content {
  min-width: 0;
}

.comment-link-source-content-reader {
  display: grid;
  gap: 0.08rem;
}

.comment-link-source-title {
  color: rgb(15 23 42);
  font-family: var(--font-ui);
  font-weight: 650;
}

.comment-link-source-title-section {
  display: inline;
  font-size: 0.98rem;
  line-height: 1.32;
  overflow-wrap: anywhere;
  text-decoration-color: transparent;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.2em;
  transition: color 160ms ease, text-decoration-color 160ms ease;
}

.comment-link-source-title-reader {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.28rem;
  color: var(--seed-accent-strong);
  font-size: 0.82rem;
  font-weight: 690;
  line-height: 1.25;
}

.comment-link-source-title-reader span,
.comment-link-source-domain,
.comment-link-source-domain-reader {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comment-link-source-title-reader svg {
  flex: 0 0 auto;
}

.comment-link-source-title:hover,
.comment-link-source-title:focus-visible {
  text-decoration-line: underline;
}

.comment-link-source-title-section:hover,
.comment-link-source-title-section:focus-visible {
  color: var(--story-context-accent-strong);
  text-decoration-color: var(--story-context-accent);
}

.comment-link-source-title-reader:hover,
.comment-link-source-title-reader:focus-visible {
  text-underline-offset: 0.16em;
}

.comment-link-source-title-reader:focus-visible {
  border-radius: 0.2rem;
  outline: 2px solid var(--seed-accent);
  outline-offset: 2px;
}

.comment-link-source-line {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.4rem;
  margin-top: 0.3rem;
  color: var(--story-context-muted);
}

.comment-link-source-domain {
  min-width: 0;
  font-weight: 650;
}

.comment-link-source-domain-reader {
  color: rgb(100 116 139);
  font-family: var(--font-ui);
  font-size: 0.7rem;
  font-weight: 620;
}

.dark .comment-link-source-title-section {
  color: rgb(241 245 249);
}

.dark .comment-link-source-title-section:hover,
.dark .comment-link-source-title-section:focus-visible {
  color: var(--story-context-accent);
}

.dark .comment-link-source-line,
.dark .comment-link-source-domain-reader {
  color: rgb(203 213 225 / 0.78);
}
</style>
