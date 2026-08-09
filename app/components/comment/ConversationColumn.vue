<template>
  <section
    class="conversation-column"
    :data-column-index="columnIndex"
    :aria-labelledby="headingId"
  >
    <header class="conversation-column-header">
      <div class="min-w-0">
        <h2 :id="headingId" class="conversation-column-title">{{ title }}</h2>
        <p class="conversation-column-subtitle">{{ subtitle }}</p>
      </div>
      <span class="conversation-column-depth">{{ columnIndex + 1 }}</span>
    </header>
    <div
      ref="scrollElement"
      class="conversation-column-scroll"
      @scroll.passive="handleScroll"
    >
      <ConversationList
        class="conversation-column-list"
        :author-comment-counts="authorCommentCounts"
        :comments="comments"
        :current-comment-id="currentCommentId"
        :descendant-counts="descendantCounts"
        :get-palette-style="getPaletteStyle"
        :selected-id="selectedId"
        :story-author="storyAuthor"
        @select="emit('select', $event, columnIndex)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import type { Comment } from '#shared/types'
import type { SeedPaletteStyle } from '~/composables/useSeedPalette'
import ConversationList from './ConversationList.vue'

const props = defineProps<{
  authorCommentCounts: ReadonlyMap<string, number>
  columnIndex: number
  comments: Comment[]
  currentCommentId: number | null
  descendantCounts: ReadonlyMap<number, number>
  getPaletteStyle: (commentId: number, author: string) => SeedPaletteStyle
  headingId: string
  initialScrollTop: number
  selectedId: number | null
  storyAuthor?: string
  subtitle: string
  title: string
}>()

const emit = defineEmits<{
  scroll: [scrollTop: number]
  select: [commentId: number, columnIndex: number]
}>()

const scrollElement = ref<HTMLElement | null>(null)

const restoreScrollPosition = async () => {
  await nextTick()

  if (scrollElement.value) {
    scrollElement.value.scrollTop = props.initialScrollTop
  }
}

const handleScroll = () => {
  emit('scroll', scrollElement.value?.scrollTop ?? 0)
}

const revealSelectedRow = async () => {
  await nextTick()

  if (!scrollElement.value || !props.selectedId) {
    return
  }

  const selectedRow = scrollElement.value.querySelector<HTMLElement>(
    `[data-comment-id="${props.selectedId}"]`,
  )
  const selectedItem = selectedRow?.closest<HTMLElement>('li')

  if (!selectedItem) {
    return
  }

  const scrollBounds = scrollElement.value.getBoundingClientRect()
  const itemBounds = selectedItem.getBoundingClientRect()
  const inset = 10

  if (itemBounds.top < scrollBounds.top + inset) {
    scrollElement.value.scrollTop += itemBounds.top - scrollBounds.top - inset
  } else if (itemBounds.bottom > scrollBounds.bottom - inset) {
    scrollElement.value.scrollTop += itemBounds.bottom - scrollBounds.bottom + inset
  }
}

onMounted(async () => {
  await restoreScrollPosition()
  await revealSelectedRow()
})
watch(() => props.initialScrollTop, restoreScrollPosition)
watch(() => props.selectedId, revealSelectedRow)
</script>

<style scoped>
.conversation-column {
  display: flex;
  width: clamp(17rem, 23vw, 21rem);
  min-width: clamp(17rem, 23vw, 21rem);
  min-height: 0;
  flex-direction: column;
  border-right: 1px solid rgb(148 163 184 / 0.24);
  background: rgb(248 250 252 / 0.92);
}

.conversation-column-header {
  display: flex;
  min-height: 4.2rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.72rem 0.85rem;
  border-bottom: 1px solid rgb(148 163 184 / 0.22);
  background: rgb(255 255 255 / 0.9);
}

.conversation-column-title {
  overflow: hidden;
  margin: 0;
  color: rgb(30 41 59);
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-column-subtitle {
  overflow: hidden;
  margin: 0.18rem 0 0;
  color: rgb(100 116 139);
  font-size: 0.74rem;
  font-weight: 600;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-column-depth {
  display: inline-grid;
  width: 1.6rem;
  height: 1.6rem;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid rgb(148 163 184 / 0.28);
  border-radius: 999px;
  color: rgb(100 116 139);
  font-size: 0.7rem;
  font-weight: 700;
}

.conversation-column-scroll {
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.conversation-column-list {
  display: grid;
  gap: 0.55rem;
  padding: 0.7rem;
}

.dark .conversation-column {
  border-color: rgb(71 85 105 / 0.42);
  background: rgb(15 23 42 / 0.9);
}

.dark .conversation-column-header {
  border-color: rgb(71 85 105 / 0.38);
  background: rgb(17 24 39 / 0.96);
}

.dark .conversation-column-title {
  color: rgb(241 245 249);
}

.dark .conversation-column-subtitle,
.dark .conversation-column-depth {
  color: rgb(148 163 184);
}

.dark .conversation-column-depth {
  border-color: rgb(100 116 139 / 0.4);
}
</style>
