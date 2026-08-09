<template>
  <section
    class="conversation-browser story-context-palette"
    :style="storyPaletteStyle"
    role="dialog"
    aria-modal="true"
    aria-label="Full-size discussion"
    @keydown.esc="emit('exit')"
    @keydown.tab="trapFocus"
  >
    <header class="conversation-browser-story-bar">
      <button
        ref="overviewButton"
        type="button"
        class="conversation-browser-overview"
        @click="emit('exit')"
      >
        <LucideArrowLeft class="h-4 w-4" aria-hidden="true" />
        <span>Overview</span>
      </button>
      <div class="conversation-browser-story-identity">
        <h1 class="conversation-browser-story-title">{{ storyTitle }}</h1>
        <div class="conversation-browser-story-meta">
          <a
            v-if="sourceUrl"
            :href="sourceUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="conversation-browser-source"
            :aria-label="`Open source on ${storyDomain}`"
          >
            <span class="truncate">{{ storyDomain }}</span>
            <LucideExternalLink class="h-3.5 w-3.5" aria-hidden="true" />
          </a>
          <span class="conversation-browser-count">
            <LucideMessageSquare class="h-3.5 w-3.5" aria-hidden="true" />
            {{ commentCount }} comments
          </span>
        </div>
      </div>
      <button
        type="button"
        class="conversation-browser-close"
        aria-label="Exit full-size discussion"
        title="Exit full size"
        @click="emit('exit')"
      >
        <LucideMinimize2 class="h-4.5 w-4.5" aria-hidden="true" />
      </button>
    </header>

    <nav class="conversation-browser-path" aria-label="Selected comment path">
      <button
        type="button"
        class="conversation-browser-path-root"
        title="Return to the top-level conversations"
        @click="openConversationIndex"
      >
        <LucidePanelLeft class="h-3.5 w-3.5" aria-hidden="true" />
        <span>All conversations</span>
      </button>
      <div ref="pathBar" class="conversation-browser-path-trail">
        <template v-for="commentId in pathIds" :key="commentId">
          <LucideChevronRight class="conversation-browser-path-separator" aria-hidden="true" />
          <button
            type="button"
            class="conversation-browser-path-segment"
            :aria-current="commentId === selectedCommentId ? 'page' : undefined"
            @click="selectComment(commentId)"
          >
            {{ navigationNodes.get(commentId)?.comment.author ?? 'Unknown' }}
          </button>
        </template>
      </div>
    </nav>

    <div
      ref="desktopBody"
      class="conversation-browser-desktop-body"
      @keydown="handleColumnKeydown"
    >
      <div
        ref="columnStrip"
        class="conversation-browser-column-strip"
        @wheel="handleColumnWheel"
      >
        <ConversationColumn
          v-for="(column, columnIndex) in columns"
          :key="column.key"
          :author-comment-counts="authorCommentCounts"
          :column-index="columnIndex"
          :comments="column.comments"
          :current-comment-id="selectedCommentId"
          :descendant-counts="descendantCounts"
          :get-palette-style="getPaletteStyle"
          :heading-id="`conversation-column-${columnIndex}`"
          :initial-scroll-top="columnScrollPositions.get(column.key) ?? 0"
          :selected-id="column.selectedId"
          :story-author="storyAuthor"
          :subtitle="column.subtitle"
          :title="column.title"
          @scroll="columnScrollPositions.set(column.key, $event)"
          @select="selectComment"
        />
      </div>

      <div
        ref="readerScroll"
        class="conversation-browser-reader-scroll"
        @scroll.passive="recordReaderScroll"
      >
        <ReaderPane
          v-if="selectedNode"
          :author-comment-counts="authorCommentCounts"
          :descendant-counts="descendantCounts"
          :get-palette-style="getPaletteStyle"
          :mode="readerMode"
          :node="selectedNode"
          :path-nodes="pathNodes"
          scope-prefix="conversation-desktop"
          :selected-comment-id="selectedCommentId"
          :story-author="storyAuthor"
          @jump="scrollReadingPathTo"
          @mode="emit('readerMode', $event)"
          @select="selectComment"
        />
        <div v-else class="conversation-browser-empty-reader">
          {{ rootComments.length ? 'Select a conversation to read it.' : 'No comments yet.' }}
        </div>
      </div>
    </div>

    <div
      ref="mobileScroll"
      class="conversation-browser-mobile-scroll"
      :class="{
        'conversation-browser-mobile-scroll-path': !showMobileRootIndex && readerMode === 'path',
      }"
    >
      <div v-if="showMobileRootIndex" class="conversation-browser-mobile-index">
        <header class="conversation-browser-mobile-section-header">
          <div>
            <h2>Conversations</h2>
            <p>{{ rootComments.length }} top-level threads</p>
          </div>
        </header>
        <ConversationList
          class="conversation-browser-mobile-list"
          :author-comment-counts="authorCommentCounts"
          :comments="rootComments"
          :current-comment-id="selectedCommentId"
          :descendant-counts="descendantCounts"
          :get-palette-style="getPaletteStyle"
          :selected-id="selectedCommentId"
          :story-author="storyAuthor"
          @select="selectMobileComment"
        />
      </div>

      <template v-else-if="selectedNode">
        <ReaderPane
          :author-comment-counts="authorCommentCounts"
          :descendant-counts="descendantCounts"
          :get-palette-style="getPaletteStyle"
          :mode="readerMode"
          :node="selectedNode"
          :path-nodes="pathNodes"
          scope-prefix="conversation-mobile"
          :selected-comment-id="selectedCommentId"
          :story-author="storyAuthor"
          @jump="scrollReadingPathTo"
          @mode="emit('readerMode', $event)"
          @select="selectMobileComment"
        >
          <template #before-content>
            <button
              v-if="readerMode === 'comment'"
              type="button"
              class="conversation-browser-mobile-back"
              @click="navigateMobileBack"
            >
              <LucideArrowLeft class="h-4 w-4" aria-hidden="true" />
              <span>{{ selectedNode.parentId ? `Back to ${parentAuthor}` : 'All conversations' }}</span>
            </button>
          </template>
        </ReaderPane>

        <section
          v-if="readerMode === 'comment'"
          class="conversation-browser-mobile-replies"
          :aria-labelledby="mobileRepliesHeadingId"
        >
          <header class="conversation-browser-mobile-section-header">
            <div>
              <h2 :id="mobileRepliesHeadingId">Replies</h2>
              <p>{{ selectedNode.comment.children?.length ?? 0 }} direct</p>
            </div>
          </header>
          <ConversationList
            v-if="selectedChildren.length"
            class="conversation-browser-mobile-list"
            :author-comment-counts="authorCommentCounts"
            :comments="selectedChildren"
            :current-comment-id="null"
            :descendant-counts="descendantCounts"
            :get-palette-style="getPaletteStyle"
            :selected-id="null"
            :story-author="storyAuthor"
            @select="selectMobileComment"
          />
          <p v-else class="conversation-browser-terminal">End of this branch.</p>
        </section>
      </template>
      <p v-else class="conversation-browser-mobile-empty">
        No comments yet.
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  LucideArrowLeft,
  LucideChevronRight,
  LucideExternalLink,
  LucideMessageSquare,
  LucideMinimize2,
  LucidePanelLeft,
} from '@lucide/vue'
import type { Comment } from '#shared/types'
import {
  getCommentPathFromIndex,
  type CommentNavigationNode,
} from '#shared/utils/comments'
import type {
  CommentThreadAuthorPalette,
  SeedPaletteStyle,
} from '~/composables/useSeedPalette'
import {
  getSeedPaletteStyle,
  getStoryContextPaletteStyle,
} from '~/composables/useSeedPalette'
import ConversationColumn from './ConversationColumn.vue'
import ConversationList from './ConversationList.vue'
import ReaderPane from './ReaderPane.vue'
import type { CommentReaderMode, CommentReaderPosition } from './reader'

type ConversationColumnModel = {
  comments: Comment[]
  key: string
  selectedId: number | null
  subtitle: string
  title: string
}

const props = defineProps<{
  authorCommentCounts: ReadonlyMap<string, number>
  commentCount: number
  descendantCounts: ReadonlyMap<number, number>
  navigationNodes: ReadonlyMap<number, CommentNavigationNode>
  readerMode: CommentReaderMode
  rootComments: Comment[]
  selectedCommentId: number | null
  sourceUrl: string
  storyAuthor: string
  storyDomain: string
  storyId: string
  storyTitle: string
  threadAuthorPalettes: ReadonlyMap<number, CommentThreadAuthorPalette>
}>()

const emit = defineEmits<{
  exit: []
  readerMode: [mode: CommentReaderMode]
  select: [commentId: number]
}>()

const columnScrollPositions = new Map<string, number>()
const readerScrollPositions = new Map<number, number>()
const columnStrip = ref<HTMLElement | null>(null)
const desktopBody = ref<HTMLElement | null>(null)
const mobileScroll = ref<HTMLElement | null>(null)
const overviewButton = ref<HTMLButtonElement | null>(null)
const pathBar = ref<HTMLElement | null>(null)
const readerScroll = ref<HTMLElement | null>(null)
const showMobileRootIndex = ref(false)

const pathIds = computed(() => {
  if (!props.selectedCommentId) {
    return []
  }

  return getCommentPathFromIndex(props.navigationNodes, props.selectedCommentId) ?? []
})
const selectedNode = computed<CommentNavigationNode | null>(() => {
  if (!props.selectedCommentId) {
    return null
  }

  const node = props.navigationNodes.get(props.selectedCommentId)

  if (!node) {
    return null
  }

  const siblingIds = node.parentId
    ? (props.navigationNodes.get(node.parentId)?.comment.children ?? []).map(comment => comment.id)
    : props.rootComments.map(comment => comment.id)
  const siblingIndex = siblingIds.indexOf(node.comment.id)

  if (siblingIndex < 0) {
    return node
  }

  return {
    ...node,
    nextSiblingId: siblingIds[siblingIndex + 1] ?? null,
    previousSiblingId: siblingIds[siblingIndex - 1] ?? null,
    siblingCount: siblingIds.length,
    siblingIndex,
  }
})
const selectedChildren = computed(() => selectedNode.value?.comment.children ?? [])
const pathNodes = computed<CommentNavigationNode[]>(() => pathIds.value
  .map((commentId) => {
    return commentId === props.selectedCommentId
      ? selectedNode.value
      : props.navigationNodes.get(commentId)
  })
  .filter((node): node is CommentNavigationNode => Boolean(node)))
const parentAuthor = computed(() => selectedNode.value?.parentId
  ? pathNodes.value.at(-2)?.comment.author ?? 'parent'
  : '')
const storyPaletteStyle = computed(() => getStoryContextPaletteStyle(props.storyId, props.storyDomain))
const mobileRepliesHeadingId = computed(() => {
  return `focused-comment-${selectedNode.value?.comment.id ?? 'none'}-replies`
})
const columns = computed<ConversationColumnModel[]>(() => {
  const result: ConversationColumnModel[] = [{
    comments: props.rootComments,
    key: 'roots',
    selectedId: pathIds.value[0] ?? null,
    subtitle: `${props.rootComments.length} top-level threads`,
    title: 'Conversations',
  }]

  pathIds.value.forEach((commentId, pathIndex) => {
    const node = props.navigationNodes.get(commentId)

    const comments = node?.comment.children ?? []

    if (!node || comments.length === 0) {
      return
    }

    result.push({
      comments,
      key: `children:${commentId}`,
      selectedId: pathIds.value[pathIndex + 1] ?? null,
      subtitle: `${comments.length} direct ${comments.length === 1 ? 'reply' : 'replies'}`,
      title: `Replies to ${node.comment.author}`,
    })
  })

  return result
})

const getPaletteStyle = (commentId: number, author: string): SeedPaletteStyle => {
  const rootId = props.navigationNodes.get(commentId)?.rootId ?? commentId

  return props.threadAuthorPalettes.get(rootId)?.authorStyles.get(author)
    ?? getSeedPaletteStyle(author, rootId)
}

const selectComment = (commentId: number) => {
  showMobileRootIndex.value = false
  emit('select', commentId)
}

const selectMobileComment = (commentId: number) => {
  selectComment(commentId)

  if (props.readerMode === 'comment') {
    nextTick(() => {
      mobileScroll.value?.scrollTo({ top: 0, behavior: 'auto' })
    })
  }
}

const openConversationIndex = () => {
  if (window.matchMedia('(max-width: 1023px)').matches) {
    showMobileRootIndex.value = true
    nextTick(() => {
      mobileScroll.value?.scrollTo({ top: 0, behavior: 'auto' })
    })
    return
  }

  columnStrip.value?.scrollTo({ left: 0, behavior: 'auto' })
  pathBar.value?.scrollTo({ left: 0, behavior: 'auto' })
  revealPathRow(0)
}

const revealPathRow = (columnIndex: number) => {
  window.requestAnimationFrame(() => {
    const column = desktopBody.value?.querySelector<HTMLElement>(
      `.conversation-column[data-column-index="${columnIndex}"]`,
    )
    const scrollElement = column?.querySelector<HTMLElement>('.conversation-column-scroll')
    const selectedItem = column
      ?.querySelector<HTMLElement>('[data-path-active="true"]')
      ?.closest<HTMLElement>('li')

    if (!scrollElement || !selectedItem) {
      return
    }

    const scrollBounds = scrollElement.getBoundingClientRect()
    const itemBounds = selectedItem.getBoundingClientRect()

    scrollElement.scrollTop += itemBounds.top - scrollBounds.top - 10
  })
}

const handleColumnWheel = (event: WheelEvent) => {
  const strip = columnStrip.value

  if (!strip) {
    return
  }

  const horizontalDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY)
    ? event.deltaX
    : event.shiftKey
      ? event.deltaY
      : 0

  if (horizontalDelta === 0) {
    return
  }

  const maximumScrollLeft = strip.scrollWidth - strip.clientWidth
  const nextScrollLeft = Math.min(
    Math.max(strip.scrollLeft + horizontalDelta, 0),
    maximumScrollLeft,
  )

  if (nextScrollLeft === strip.scrollLeft) {
    return
  }

  event.preventDefault()
  strip.scrollLeft = nextScrollLeft
}

const navigateMobileBack = () => {
  if (selectedNode.value?.parentId) {
    selectMobileComment(selectedNode.value.parentId)
  } else {
    openConversationIndex()
  }
}

const trapFocus = (event: KeyboardEvent) => {
  const container = event.currentTarget as HTMLElement
  const focusableElements = [...container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter(element => element.offsetParent !== null)
  const firstElement = focusableElements[0]
  const lastElement = focusableElements.at(-1)

  if (!firstElement || !lastElement) {
    event.preventDefault()
    return
  }

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault()
    lastElement.focus()
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault()
    firstElement.focus()
  }
}

const recordReaderScroll = () => {
  if (props.readerMode === 'comment' && props.selectedCommentId && readerScroll.value) {
    readerScrollPositions.set(props.selectedCommentId, readerScroll.value.scrollTop)
  }
}

const restoreReaderScroll = async () => {
  await nextTick()

  if (readerScroll.value && props.selectedCommentId) {
    readerScroll.value.scrollTop = readerScrollPositions.get(props.selectedCommentId) ?? 0
  }
}

const revealReadingPathTarget = async (
  position: CommentReaderPosition,
  behavior: ScrollBehavior,
) => {
  await nextTick()

  window.requestAnimationFrame(() => {
    const scrollElement = window.matchMedia('(max-width: 1023px)').matches
      ? mobileScroll.value
      : readerScroll.value
    const selector = position === 'start'
      ? '[data-reading-path-entry]'
      : '[data-reading-path-current="true"]'
    const target = scrollElement?.querySelector<HTMLElement>(selector)
    const toolbar = scrollElement?.querySelector<HTMLElement>('.comment-reader-toolbar')

    if (!scrollElement || !target) {
      return
    }

    const scrollBounds = scrollElement.getBoundingClientRect()
    const targetBounds = target.getBoundingClientRect()
    const toolbarOffset = toolbar?.offsetHeight ?? 0

    scrollElement.scrollTo({
      top: Math.max(0, scrollElement.scrollTop + targetBounds.top - scrollBounds.top - toolbarOffset - 10),
      behavior,
    })
  })
}

const scrollReadingPathTo = (position: CommentReaderPosition) => {
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth'

  void revealReadingPathTarget(position, behavior)
}

const revealActiveColumn = async () => {
  await nextTick()
  const strip = columnStrip.value
  const activeColumn = columnStrip.value?.querySelector<HTMLElement>(
    `.conversation-column[data-column-index="${columns.value.length - 1}"]`,
  )
  const activePathSegment = pathBar.value?.querySelector<HTMLElement>(
    '.conversation-browser-path-segment[aria-current="page"]',
  )
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

  if (strip && activeColumn) {
    strip.scrollTo({
      left: Math.max(0, activeColumn.offsetLeft + activeColumn.offsetWidth - strip.clientWidth),
      behavior,
    })
  }

  if (pathBar.value && activePathSegment) {
    pathBar.value.scrollTo({
      left: Math.max(0, activePathSegment.offsetLeft + activePathSegment.offsetWidth - pathBar.value.clientWidth),
      behavior,
    })
  }
}

const focusColumnRow = (columnIndex: number, position: 'first' | 'selected') => {
  window.requestAnimationFrame(() => {
    const column = desktopBody.value?.querySelector<HTMLElement>(
      `.conversation-column[data-column-index="${columnIndex}"]`,
    )
    const selector = position === 'selected'
      ? '[data-conversation-row][data-path-active="true"]'
      : '[data-conversation-row]'

    column?.querySelector<HTMLElement>(selector)?.focus()
  })
}

const handleColumnKeydown = (event: KeyboardEvent) => {
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    return
  }

  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-conversation-row]')
  const column = target?.closest<HTMLElement>('.conversation-column')

  if (!target || !column) {
    return
  }

  const rows = [...column.querySelectorAll<HTMLElement>('[data-conversation-row]')]
  const rowIndex = rows.indexOf(target)
  const columnIndex = Number(column.dataset.columnIndex)
  const commentId = Number(target.dataset.commentId)

  if (!Number.isSafeInteger(columnIndex) || !Number.isSafeInteger(commentId)) {
    return
  }

  if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'Home' || event.key === 'End') {
    event.preventDefault()
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? rows.length - 1
        : Math.min(Math.max(rowIndex + (event.key === 'ArrowDown' ? 1 : -1), 0), rows.length - 1)
    rows[nextIndex]?.focus()
    return
  }

  if (event.key === 'ArrowRight') {
    const node = props.navigationNodes.get(commentId)

    if (node?.comment.children?.length) {
      event.preventDefault()
      selectComment(commentId)
      focusColumnRow(columnIndex + 1, 'first')
    }
    return
  }

  if (event.key === 'ArrowLeft' && columnIndex > 0) {
    const parentId = props.navigationNodes.get(commentId)?.parentId

    if (parentId) {
      event.preventDefault()
      selectComment(parentId)
      focusColumnRow(columnIndex - 1, 'selected')
    }
  }
}

watch(() => props.selectedCommentId, () => {
  if (props.readerMode === 'path') {
    void revealReadingPathTarget('current', 'auto')
  } else {
    void restoreReaderScroll()
  }

  void revealActiveColumn()
})

watch(() => props.readerMode, (mode) => {
  showMobileRootIndex.value = false

  if (mode === 'path') {
    void revealReadingPathTarget('current', 'auto')
  } else {
    void restoreReaderScroll()
  }
})

onMounted(() => {
  overviewButton.value?.focus({ preventScroll: true })

  if (props.readerMode === 'path') {
    void revealReadingPathTarget('current', 'auto')
  }

  void revealActiveColumn()
})

onBeforeUnmount(recordReaderScroll)
</script>

<style scoped>
.conversation-browser {
  position: fixed;
  z-index: 70;
  inset: 0;
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-rows: auto auto minmax(0, 1fr);
  background: rgb(248 250 252);
  color: rgb(15 23 42);
}

.conversation-browser-story-bar {
  display: grid;
  min-width: 0;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.8rem;
  padding: 0.65rem clamp(0.75rem, 2vw, 1.5rem);
  border-bottom: 1px solid var(--story-context-border);
  background: rgb(255 255 255 / 0.96);
}

.conversation-browser-overview,
.conversation-browser-close {
  display: inline-flex;
  min-height: 2.25rem;
  align-items: center;
  justify-content: center;
  gap: 0.38rem;
  border: 1px solid var(--story-context-border);
  border-radius: 999px;
  background: var(--story-context-accent-soft);
  color: var(--story-context-accent-strong);
  font-size: 0.82rem;
  font-weight: 700;
}

.conversation-browser-overview {
  padding: 0.38rem 0.72rem;
}

.conversation-browser-close {
  width: 2.25rem;
  padding: 0;
}

.conversation-browser-overview:hover,
.conversation-browser-overview:focus-visible,
.conversation-browser-close:hover,
.conversation-browser-close:focus-visible {
  border-color: var(--story-context-accent);
}

.conversation-browser-overview:focus-visible,
.conversation-browser-close:focus-visible,
.conversation-browser-source:focus-visible,
.conversation-browser-path button:focus-visible,
.conversation-browser-mobile-back:focus-visible {
  outline: 2px solid var(--story-context-focus);
  outline-offset: 2px;
}

.conversation-browser-story-identity {
  min-width: 0;
}

.conversation-browser-story-title {
  overflow: hidden;
  margin: 0;
  color: rgb(15 23 42);
  font-size: clamp(0.98rem, 1.4vw, 1.2rem);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.015em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-browser-story-meta {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.72rem;
  margin-top: 0.2rem;
  color: rgb(100 116 139);
  font-size: 0.75rem;
  font-weight: 600;
}

.conversation-browser-source,
.conversation-browser-count {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.28rem;
}

.conversation-browser-source {
  max-width: 15rem;
  color: var(--story-context-accent-strong);
}

.conversation-browser-source:hover,
.conversation-browser-source:focus-visible {
  text-decoration: underline;
}

.conversation-browser-path {
  display: flex;
  min-width: 0;
  min-height: 2.6rem;
  align-items: center;
  gap: 0.38rem;
  overflow: hidden;
  padding: 0.42rem clamp(0.75rem, 2vw, 1.5rem);
  border-bottom: 1px solid rgb(148 163 184 / 0.24);
  background: rgb(248 250 252 / 0.96);
  scrollbar-width: thin;
}

.conversation-browser-path-trail {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  align-items: center;
  gap: 0.25rem;
  overflow-x: auto;
  scrollbar-width: thin;
}

.conversation-browser-path-root,
.conversation-browser-path-segment {
  flex: 0 0 auto;
  padding: 0.2rem 0.3rem;
  border-radius: 0.3rem;
  color: rgb(71 85 105);
  font-size: 0.78rem;
  font-weight: 650;
  line-height: 1.2;
}

.conversation-browser-path-root {
  display: inline-flex;
  min-height: 1.8rem;
  align-items: center;
  gap: 0.32rem;
  padding-inline: 0.52rem;
  border: 1px solid var(--story-context-border);
  border-radius: 999px;
  background: var(--story-context-accent-soft);
  color: var(--story-context-accent-strong);
}

.conversation-browser-path-segment[aria-current="page"] {
  background: var(--story-context-accent-soft);
  color: var(--story-context-accent-strong);
}

.conversation-browser-path-root:hover,
.conversation-browser-path-root:focus-visible,
.conversation-browser-path-segment:hover,
.conversation-browser-path-segment:focus-visible {
  color: var(--story-context-accent-strong);
}

.conversation-browser-path-separator {
  width: 0.9rem;
  height: 0.9rem;
  flex: 0 0 auto;
  color: rgb(148 163 184);
}

.conversation-browser-desktop-body {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-columns: minmax(0, 1fr) minmax(31rem, 40rem);
}

.conversation-browser-column-strip {
  display: flex;
  min-width: 0;
  min-height: 0;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior: contain;
  background: rgb(241 245 249);
  scrollbar-gutter: stable;
}

.conversation-browser-reader-scroll {
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 0;
  border-left: 2px solid var(--story-context-border);
  background: color-mix(in oklch, rgb(248 250 252) 96%, var(--story-context-accent-soft));
  box-shadow: inset 1px 0 rgb(255 255 255 / 0.5);
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.conversation-browser-empty-reader {
  display: grid;
  min-height: 16rem;
  place-items: center;
  color: rgb(100 116 139);
}

.conversation-browser-mobile-scroll {
  display: none;
}

.dark .conversation-browser {
  background: rgb(15 23 42);
  color: rgb(241 245 249);
}

.dark .conversation-browser-story-bar {
  background: rgb(17 24 39 / 0.97);
}

.dark .conversation-browser-story-title {
  color: rgb(248 250 252);
}

.dark .conversation-browser-story-meta {
  color: rgb(148 163 184);
}

.dark .conversation-browser-path {
  border-color: rgb(71 85 105 / 0.42);
  background: rgb(15 23 42 / 0.96);
}

.dark .conversation-browser-path-root,
.dark .conversation-browser-path-segment {
  color: rgb(203 213 225);
}

.dark .conversation-browser-path-segment[aria-current="page"] {
  color: var(--story-context-accent-strong);
}

.dark .conversation-browser-column-strip {
  background: rgb(15 23 42);
}

.dark .conversation-browser-reader-scroll {
  border-color: rgb(71 85 105 / 0.42);
  background: color-mix(in oklch, rgb(13 20 33) 97%, var(--story-context-accent-soft));
  box-shadow: inset 1px 0 rgb(255 255 255 / 0.025);
}

@media (max-width: 1023px) {
  .conversation-browser-story-bar {
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 0.55rem;
  }

  .conversation-browser-overview span {
    display: none;
  }

  .conversation-browser-overview {
    width: 2.25rem;
    padding: 0;
  }

  .conversation-browser-story-meta {
    gap: 0.55rem;
  }

  .conversation-browser-path {
    min-height: 2.45rem;
    padding-block: 0.35rem;
  }

  .conversation-browser-desktop-body {
    display: none;
  }

  .conversation-browser-mobile-scroll {
    display: block;
    min-height: 0;
    overflow-y: auto;
    padding: 0.8rem clamp(0.7rem, 3vw, 1.25rem) 2rem;
    background: rgb(248 250 252);
    overscroll-behavior: contain;
  }

  .conversation-browser-mobile-scroll-path {
    padding: 0 0 2rem;
  }

  .conversation-browser-mobile-index,
  .conversation-browser-mobile-replies {
    width: min(100%, 44rem);
    margin-inline: auto;
  }

  .conversation-browser-mobile-back {
    display: inline-flex;
    min-height: 2.2rem;
    align-items: center;
    gap: 0.35rem;
    margin: 0 auto 0.7rem;
    padding: 0.3rem 0.52rem;
    border-radius: 999px;
    color: var(--story-context-accent-strong);
    font-size: 0.8rem;
    font-weight: 700;
  }

  .conversation-browser-mobile-back:hover,
  .conversation-browser-mobile-back:focus-visible {
    background: var(--story-context-accent-soft);
  }

  .conversation-browser-mobile-section-header {
    display: flex;
    align-items: end;
    justify-content: space-between;
    margin-bottom: 0.65rem;
  }

  .conversation-browser-mobile-section-header h2 {
    margin: 0;
    color: rgb(30 41 59);
    font-size: 1rem;
    font-weight: 700;
  }

  .conversation-browser-mobile-section-header p {
    margin: 0.15rem 0 0;
    color: rgb(100 116 139);
    font-size: 0.76rem;
    font-weight: 600;
  }

  .conversation-browser-mobile-list {
    display: grid;
    gap: 0.58rem;
  }

  .conversation-browser-mobile-replies {
    margin-top: 1.1rem;
  }

  .conversation-browser-terminal {
    margin: 0;
    padding: 1rem 0;
    color: rgb(100 116 139);
    font-size: 0.9rem;
  }

  .conversation-browser-mobile-empty {
    width: min(100%, 44rem);
    margin: 0 auto;
    padding: 2rem 0;
    color: rgb(100 116 139);
    text-align: center;
  }

  .dark .conversation-browser-mobile-scroll {
    background: rgb(15 23 42);
  }

  .dark .conversation-browser-mobile-section-header h2 {
    color: rgb(241 245 249);
  }

  .dark .conversation-browser-mobile-section-header p,
  .dark .conversation-browser-terminal,
  .dark .conversation-browser-mobile-empty {
    color: rgb(148 163 184);
  }
}

@media (max-width: 520px) {
  .conversation-browser-count {
    display: none;
  }

  .conversation-browser-source {
    max-width: 9rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .conversation-browser-column-strip {
    scroll-behavior: auto;
  }
}
</style>
