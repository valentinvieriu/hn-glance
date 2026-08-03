<template>
  <article
    :id="`comment-${comment.id}`"
    class="comment-container seed-palette-surface"
    :class="commentContainerClasses"
    :style="commentPaletteStyle"
    :data-author="comment.author"
    :data-comment-id="comment.id"
    tabindex="-1"
  >
    <div class="comment-body">
      <div class="comment-header">
        <div class="comment-header-primary">
          <span class="author-chip">
            <span class="author-dot" aria-hidden="true"></span>
            <NuxtLink :to="getHnUserPath(comment.author)" class="author-name">
              {{ comment.author }}
            </NuxtLink>
          </span>
          <span v-if="isOriginalPoster" class="comment-badge" title="Submitted this story">OP</span>
          <span
            v-if="authorCommentCount > 1"
            class="author-activity-stat"
            :class="{ 'author-activity-stat-strong': authorCommentCount >= 5 }"
            :aria-label="`${comment.author} has made ${authorCommentCount} comments on this story`"
            :title="`${comment.author} has made ${authorCommentCount} comments on this story`"
          >
            <LucideMessageSquare class="w-3.5 h-3.5" aria-hidden="true" />
            <span>{{ authorCommentCount }}</span>
          </span>
          <a
            :href="commentPermalink"
            class="comment-time"
            :aria-label="`Permalink to ${comment.author}'s comment from ${timeAgo}`"
            title="Comment permalink"
            @click.prevent="jumpToComment(comment.id)"
          >
            {{ timeAgo }}
          </a>
          <nav
            v-if="showAncestryNavigation"
            class="comment-ancestry-navigation"
            :aria-label="`Ancestry for ${comment.author}'s comment`"
          >
            <a
              v-if="showParentLink"
              :href="parentPermalink"
              class="comment-ancestry-link comment-ancestry-link-parent"
              :aria-label="`Jump to parent comment by ${parentAuthor}`"
              :title="`Parent comment by ${parentAuthor}`"
              @click.prevent="jumpToParent"
            >
              <LucideCornerDownRight class="comment-ancestry-icon" aria-hidden="true" />
              <span class="comment-ancestry-author">{{ parentAuthor }}</span>
            </a>
            <a
              v-if="showRootLink"
              :href="rootPermalink"
              class="comment-ancestry-link comment-ancestry-link-root"
              :aria-label="`Jump to thread start by ${rootAuthor}`"
              :title="`Thread start by ${rootAuthor}`"
              @click.prevent="jumpToRoot"
            >
              <LucideArrowUpToLine class="comment-ancestry-icon" aria-hidden="true" />
              <span class="comment-ancestry-author">{{ rootAuthor }}</span>
            </a>
          </nav>
        </div>
      </div>
      <div class="comment-expanded-content">
        <div
          class="comment-text reading-text rich-text break-words"
          v-html="sanitizedText"
        ></div>
        <div class="comment-actions">
          <button
            v-if="hasChildren"
            type="button"
            class="comment-replies-toggle"
            :aria-expanded="!areRepliesHidden"
            :aria-controls="childrenElementId"
            :aria-label="replyDisclosureLabel"
            :title="replyDisclosureLabel"
            @click="toggleRepliesHidden(comment.id)"
          >
            <LucidePlus v-if="areRepliesHidden" class="w-3 h-3" aria-hidden="true" />
            <LucideMinus v-else class="w-3 h-3" aria-hidden="true" />
            <span class="comment-reply-summary">
              {{ areRepliesHidden ? 'Show' : 'Hide' }} {{ replyCountLabel }}
            </span>
          </button>
          <a
            :href="replyHref"
            target="_blank"
            rel="noopener noreferrer"
            class="comment-reply-link"
            :aria-label="`Reply to ${comment.author} on Hacker News (opens in a new tab)`"
          >
            <span>Reply on HN</span>
            <LucideExternalLink class="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
    <div
      v-if="hasChildren && !areRepliesHidden"
      :id="childrenElementId"
      class="comment-children"
    >
      <!-- Pointer-only shortcut for reply disclosure. The footer button is
           the keyboard and assistive-technology equivalent. -->
      <div class="comment-spine" aria-hidden="true" @click="toggleRepliesHidden(comment.id)"></div>
      <div class="comment-children-list">
        <div
          v-for="(child, childIndex) in comment.children"
          :key="child.id"
          class="comment-child-branch"
        >
          <CommentThread
            :comment="child"
            :current-depth="currentDepth + 1"
            :sibling-index="childIndex"
            :story-author="storyAuthor"
            :author-comment-counts="authorCommentCounts"
            :author-palette="authorPalette"
            :comment-authors="commentAuthors"
            :descendant-comment-counts="descendantCommentCounts"
            :parent-comment-ids="parentCommentIds"
            :root-comment-ids="rootCommentIds"
            :hidden-reply-ids="hiddenReplyIds"
            :jump-target-comment-id="jumpTargetCommentId"
            :toggle-replies-hidden="toggleRepliesHidden"
            :jump-to-comment="jumpToComment"
          />
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  LucideArrowUpToLine,
  LucideCornerDownRight,
  LucideExternalLink,
  LucideMessageSquare,
  LucideMinus,
  LucidePlus,
} from '@lucide/vue'
import type { Comment } from '#shared/types'
import { getCommentReplyCountLabel } from '#shared/utils/comments'
import { formatTimeAgo } from '#shared/utils/date'
import { getHnUserPath } from '#shared/utils/hn'
import { useSanitizer } from '~/composables/useSanitizer'
import {
  getSeedPaletteStyle,
  type CommentThreadAuthorPalette,
} from '~/composables/useSeedPalette'

const COMMENT_INDENT_CAP_DEPTH = 8

const props = defineProps<{
  comment: Comment
  currentDepth?: number
  siblingIndex?: number
  storyAuthor?: string
  authorCommentCounts: ReadonlyMap<string, number>
  authorPalette: CommentThreadAuthorPalette
  commentAuthors: ReadonlyMap<number, string>
  descendantCommentCounts: ReadonlyMap<number, number>
  parentCommentIds: ReadonlyMap<number, number | null>
  rootCommentIds: ReadonlyMap<number, number>
  hiddenReplyIds: ReadonlySet<number>
  jumpTargetCommentId?: number | null
  toggleRepliesHidden: (commentId: number) => void
  jumpToComment: (commentId: number) => void | Promise<void>
}>()

const { sanitize } = useSanitizer()
const sanitizedText = computed(() => sanitize(props.comment.text || '', `comment-${props.comment.id}`))

const currentDepth = computed(() => props.currentDepth ?? 1)
const siblingIndex = computed(() => props.siblingIndex ?? 0)
const authorCommentCount = computed(() => props.authorCommentCounts.get(props.comment.author) ?? 1)
const commentPaletteStyle = computed(() => {
  return props.authorPalette.authorStyles.get(props.comment.author)
    ?? getSeedPaletteStyle(props.comment.author)
})
const timeAgo = computed(() => formatTimeAgo(props.comment.created_at))

const areRepliesHidden = computed(() => props.hiddenReplyIds.has(props.comment.id))
const childReplies = computed(() => props.comment.children ?? [])
const hasChildren = computed(() => childReplies.value.length > 0)
const subtreeCount = computed(() => props.descendantCommentCounts.get(props.comment.id) ?? 0)
const parentCommentId = computed(() => props.parentCommentIds.get(props.comment.id) ?? null)
const rootCommentId = computed(() => props.rootCommentIds.get(props.comment.id) ?? props.comment.id)
const childrenElementId = computed(() => `comment-children-${props.comment.id}`)

const isOriginalPoster = computed(() => {
  return Boolean(props.storyAuthor) && props.comment.author === props.storyAuthor
})

const parentAuthor = computed(() => {
  return parentCommentId.value ? props.commentAuthors.get(parentCommentId.value) ?? '' : ''
})
const rootAuthor = computed(() => props.commentAuthors.get(rootCommentId.value) ?? '')
const isJumpTarget = computed(() => props.jumpTargetCommentId === props.comment.id)
const showParentLink = computed(() => {
  return Boolean(parentCommentId.value)
    && (siblingIndex.value > 0
      || currentDepth.value >= COMMENT_INDENT_CAP_DEPTH
      || isJumpTarget.value)
})
const showRootLink = computed(() => {
  return Boolean(parentCommentId.value)
    && rootCommentId.value !== parentCommentId.value
    && Boolean(rootAuthor.value)
    && (currentDepth.value >= 4 || isJumpTarget.value)
})
const showAncestryNavigation = computed(() => {
  return (showParentLink.value && Boolean(parentAuthor.value)) || showRootLink.value
})

// One-off voices keep a quieter version of their thread-assigned hue; repeat
// participants receive the full accent so their later turns are easy to find.
const isRecurringAuthor = computed(() => authorCommentCount.value > 1)

const commentContainerClasses = computed(() => {
  return {
    'comment-top-level': currentDepth.value === 1,
    'comment-indent-capped': currentDepth.value >= COMMENT_INDENT_CAP_DEPTH,
    'comment-replies-hidden': areRepliesHidden.value,
    'seed-palette-quiet': !isRecurringAuthor.value,
  }
})

const replyCountLabel = computed(() => {
  return getCommentReplyCountLabel(childReplies.value.length, subtreeCount.value)
})

const replyDisclosureLabel = computed(() => {
  return areRepliesHidden.value
    ? `Show ${replyCountLabel.value} from ${props.comment.author}`
    : `Hide ${replyCountLabel.value} from ${props.comment.author}`
})

const commentPermalink = computed(() => `#comment-${props.comment.id}`)
const parentPermalink = computed(() => `#comment-${parentCommentId.value}`)
const rootPermalink = computed(() => `#comment-${rootCommentId.value}`)

const jumpToParent = () => {
  if (parentCommentId.value) {
    void props.jumpToComment(parentCommentId.value)
  }
}

const jumpToRoot = () => {
  void props.jumpToComment(rootCommentId.value)
}

const replyHref = computed(() => {
  return `https://news.ycombinator.com/reply?id=${props.comment.id}&goto=item%3Fid%3D${props.comment.parent_id}%23${props.comment.id}`
})
</script>

<style scoped>
.comment-container {
  --comment-indent: 0.85rem;
  --comment-incoming-rail-center: calc(-1 * var(--comment-indent) - 0.5px);
  --comment-outgoing-rail-left: 0px;
  --comment-rail-opacity: 0.7;
  --comment-children-top-gap: 0.75rem;
  --comment-junction-y: 1.1rem;
  --comment-sibling-gap: 0.85rem;
  /* Roughly 60-68 characters in the reading face: wide enough to reduce scroll
     while staying below the 75-80 character readability ceiling. Held in rem
     so the smaller metadata row shares the body's visual edge. */
  --comment-measure: 33rem;
  position: relative;
  scroll-margin-top: 6rem;
}

.comment-container:focus {
  outline: none;
}

.comment-container:focus-visible > .comment-body {
  outline: 2px solid var(--seed-accent);
  outline-offset: 4px;
  border-radius: 0.55rem;
}

/* Added imperatively by the story page after a jump; must live in this scoped
   block so the rule matches the component root's scope attribute. */
.comment-container.comment-jump-highlight > .comment-body {
  border-radius: 0.55rem;
  animation: comment-jump-pulse 1.5s ease-out;
}

@keyframes comment-jump-pulse {
  from {
    background-color: color-mix(in oklch, var(--seed-accent) 18%, transparent);
  }

  to {
    background-color: transparent;
  }
}

@media (prefers-reduced-motion: reduce) {
  .comment-container.comment-jump-highlight > .comment-body {
    animation: none;
  }
}

.comment-top-level {
  box-sizing: border-box;
  padding-left: 0.25rem;
  content-visibility: auto;
  contain-intrinsic-size: auto 20rem;
}

.comment-body {
  position: relative;
  z-index: 1;
  max-width: var(--comment-measure);
  overflow: hidden;
  border-left: 3px solid var(--seed-rail);
  border-radius: 0.55rem;
  background: var(--seed-surface);
}

/* The complete comment is one quiet object. The existing seed palette stays
   concentrated in the speaker edge and metadata while the reading surface
   remains calm. */
.comment-header {
  position: relative;
  font-size: 0.8125rem;
  font-weight: 550;
  line-height: 1.3;
  color: rgb(71 85 105);
}

.comment-header-primary {
  display: flex;
  align-items: center;
  gap: 0.32rem 0.42rem;
  flex-wrap: wrap;
  min-height: 2.65rem;
  padding: 0.35rem 0.75rem 0.12rem;
}

.dark .comment-header {
  color: rgb(148 163 184);
}

.author-chip {
  display: inline-flex;
  align-items: center;
  flex: 0 1 auto;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  gap: 0.35rem;
  color: var(--seed-author-text);
  font-size: 0.875rem;
  font-weight: 650;
}

.author-dot {
  flex: 0 0 auto;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  background: var(--seed-accent);
  box-shadow: 0 0 0 2.5px var(--seed-ring);
}

.author-name {
  position: relative;
  z-index: 1;
  color: inherit;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.author-name:hover {
  text-decoration: underline;
}

.comment-badge {
  flex: 0 0 auto;
  padding: 0.02rem 0.3rem;
  border: 1px solid var(--seed-border-strong);
  border-radius: 0.25rem;
  color: var(--seed-accent-strong);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  line-height: 1.5;
}

.author-activity-stat {
  display: inline-flex;
  align-items: center;
  gap: 0.24rem;
  color: var(--seed-author-text);
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  opacity: 0.75;
}

.author-activity-stat-strong {
  color: var(--seed-accent-strong);
  opacity: 1;
}

.comment-ancestry-navigation {
  display: inline-flex;
  align-items: center;
  flex: 0 1 auto;
  gap: 0.22rem;
  min-width: 0;
  max-width: min(100%, 17rem);
  color: rgb(71 85 105);
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1;
}

.dark .comment-ancestry-navigation {
  color: rgb(148 163 184);
}

.comment-ancestry-link {
  display: inline-flex;
  align-items: center;
  flex: 0 1 auto;
  gap: 0.18rem;
  min-width: 0;
  max-width: 8.25rem;
  min-height: 1.45rem;
  padding: 0.08rem 0.34rem;
  border: 1px solid color-mix(in oklch, var(--seed-border-strong) 34%, transparent);
  border-radius: 999px;
  background: color-mix(in oklch, var(--seed-metric-bg) 54%, transparent);
  opacity: 0.74;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, opacity 0.15s ease;
}

.comment-ancestry-link:hover,
.comment-ancestry-link:focus-visible {
  border-color: color-mix(in oklch, var(--seed-border-strong) 68%, transparent);
  background: var(--seed-metric-bg-hover);
  color: var(--seed-accent-strong);
  opacity: 1;
}

.comment-ancestry-icon {
  flex: 0 0 auto;
  width: 0.75rem;
  height: 0.75rem;
}

.comment-ancestry-author {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--seed-accent-strong);
  font-weight: 600;
}

.comment-time {
  position: relative;
  flex: 0 0 auto;
  white-space: nowrap;
  opacity: 0.85;
  transition: opacity 0.15s ease;
}

.comment-time:hover,
.comment-time:focus-visible {
  text-decoration: underline;
  opacity: 1;
}

.comment-reply-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  flex: 0 0 auto;
  min-height: 1.5rem;
  padding: 0 0.15rem;
  color: rgb(71 85 105);
  font-size: 0.8125rem;
  font-weight: 650;
  opacity: 0.8;
  transition: color 0.15s ease, opacity 0.15s ease;
}

.dark .comment-reply-link {
  color: rgb(148 163 184);
}

.comment-reply-link:hover,
.comment-reply-link:focus-visible {
  color: var(--seed-accent-strong);
  opacity: 1;
  text-decoration: underline;
}

.comment-text {
  margin: 0;
  padding: 0.55rem 0.8rem 0;
  font-size: 1.0625rem;
  font-weight: 400;
  line-height: 1.65;
  color: rgb(30 41 59);
  overflow-wrap: anywhere;
}

.dark .comment-text {
  color: rgb(226 232 240);
}

.comment-text :deep(blockquote) {
  margin-top: 0.85rem;
  padding: 0.08rem 0 0.08rem 0.9rem;
  border-left-width: 1px;
  border-left-color: color-mix(in oklch, var(--seed-accent) 44%, transparent);
  border-radius: 0;
  background: transparent;
  opacity: 0.8;
}

.comment-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.3rem 0.65rem;
  min-height: 2rem;
  margin-top: 0.45rem;
  padding: 0.05rem 0.65rem 0.6rem 0.55rem;
}

.comment-reply-summary {
  color: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.35;
}

.comment-replies-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  gap: 0.38rem;
  min-height: 2rem;
  padding: 0.2rem 0.45rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--seed-accent-strong);
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.comment-replies-toggle:hover,
.comment-replies-toggle:focus-visible {
  border-color: color-mix(in oklch, var(--seed-border-strong) 52%, transparent);
  background: var(--seed-metric-bg-hover);
  color: var(--seed-accent);
}

.comment-replies-toggle:focus-visible {
  outline: 2px solid var(--seed-accent);
  outline-offset: 2px;
}

.comment-children {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  column-gap: var(--comment-indent);
}

.comment-spine {
  position: relative;
  z-index: 0;
  width: 1px;
  border-radius: 999px;
  cursor: pointer;
}

/* The visible rail stays quiet while the hit area is comfortably pointer-sized. */
.comment-spine::before {
  content: '';
  position: absolute;
  inset: 0 -0.65rem;
}

.comment-spine::after {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: calc(var(--comment-children-top-gap) + var(--comment-junction-y));
  border-radius: 999px;
  background: var(--seed-rail);
  opacity: var(--comment-rail-opacity);
  transition: background-color 0.15s ease, opacity 0.15s ease;
}

.comment-spine:hover::after,
.comment-spine:active::after {
  background: var(--seed-accent);
  opacity: 1;
}

.comment-children:has(> .comment-spine:hover) > .comment-children-list {
  background: var(--seed-accent-soft);
  box-shadow: 0 0 0 0.4rem var(--seed-accent-soft);
  border-radius: 0.2rem;
}

.comment-children-list {
  position: relative;
  z-index: 1;
  min-width: 0;
  overflow: visible;
  padding-top: var(--comment-children-top-gap);
  color: var(--seed-rail);
  transition: background-color 0.15s ease;
}

.comment-child-branch {
  position: relative;
  min-width: 0;
}

/* A parent's rail is made from only the segments its direct replies need.
   Each non-final branch reaches the next sibling's junction; the final branch
   has no segment, so the rail ends instead of following that reply's subtree. */
.comment-child-branch:not(:last-child)::before {
  content: '';
  position: absolute;
  z-index: 0;
  top: var(--comment-junction-y);
  left: calc(var(--comment-incoming-rail-center) - 0.5px);
  width: 1px;
  height: calc(100% + var(--comment-sibling-gap));
  background: currentColor;
  opacity: var(--comment-rail-opacity);
  pointer-events: none;
}

/* Every direct reply gets the same branch-coloured arm and node. Multiple
   nodes on one rail already make a fork visible, so the footer and junction do
   not need a second topology vocabulary. The arm inherits the resolved parent
   rail colour instead of recalculating it from the child's author palette. */
.comment-child-branch > .comment-container::before {
  content: '';
  position: absolute;
  z-index: 0;
  top: var(--comment-junction-y);
  left: var(--comment-incoming-rail-center);
  width: calc(var(--comment-indent) + 0.5px);
  height: 1px;
  background: currentColor;
  opacity: var(--comment-rail-opacity);
  pointer-events: none;
}

.comment-child-branch > .comment-container::after {
  content: '';
  position: absolute;
  z-index: 2;
  top: calc(var(--comment-junction-y) - 0.16rem);
  left: calc(var(--comment-incoming-rail-center) - 0.16rem);
  width: 0.32rem;
  height: 0.32rem;
  border-radius: 999px;
  background: currentColor;
  box-shadow: 0 0 0 1.5px rgb(255 255 255 / 0.86);
  opacity: 0.9;
  pointer-events: none;
}

.dark .comment-child-branch > .comment-container::after {
  box-shadow: 0 0 0 1.5px rgb(17 24 39 / 0.9);
}

/* Depth eight is the final horizontal step. Deeper reply lists keep the same
   text edge, while a rail just outside that edge retains ancestry and the
   pointer shortcut without covering selectable comment text. */
.comment-indent-capped > .comment-children {
  position: relative;
  display: block;
}

.comment-indent-capped {
  /* Reuse the incoming rail after deeper comments stop moving their text to
     the right. The rail keeps its visual centre on that guide. */
  --comment-outgoing-rail-left: calc(var(--comment-incoming-rail-center) - 0.5px);
}

.comment-indent-capped > .comment-children > .comment-spine {
  position: absolute;
  inset: 0 auto 0 var(--comment-outgoing-rail-left);
}

/* Card boundaries now carry the change of speaker, so sibling turns can stay
   close enough for dense HN discussions without reading as one paragraph. */
.comment-child-branch + .comment-child-branch {
  margin-top: var(--comment-sibling-gap);
}

@media (max-width: 640px) {
  .comment-container {
    --comment-indent: 0.8125rem;
  }

  .comment-header-primary {
    padding-left: 0.65rem;
  }

  .comment-text {
    font-size: 1.0625rem;
    line-height: 1.65;
    padding-inline: 0.7rem;
  }

  .comment-actions {
    padding-inline: 0.45rem 0.55rem;
  }

  .comment-ancestry-navigation {
    gap: 0.18rem;
  }

  .comment-ancestry-link {
    max-width: min(7.5rem, 38vw);
  }
}
</style>
