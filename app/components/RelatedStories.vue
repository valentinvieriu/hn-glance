<template>
  <section class="related-stories mt-10" aria-labelledby="similar-stories-title">
    <div class="related-stories-header">
      <div class="related-stories-heading">
        <span class="related-stories-heading-icon" aria-hidden="true">
          <LucideWaypoints class="h-4 w-4" />
        </span>
        <h2
          id="similar-stories-title"
          class="section-title mb-0 text-xl font-semibold text-gray-900 dark:text-gray-100"
        >
          Similar Stories
        </h2>
      </div>
      <span
        v-if="stories.length > 0"
        class="related-stories-count"
        :aria-label="`${stories.length} similar ${stories.length === 1 ? 'story' : 'stories'}`"
      >
        {{ stories.length }}
      </span>
    </div>
    <div
      v-if="status === 'idle' || status === 'pending'"
      class="related-stories-state meta-text"
    >
      Loading similar stories...
    </div>
    <div v-else-if="failed" class="related-stories-state meta-text">
      Failed to load similar stories.
    </div>
    <div v-else-if="stories.length === 0" class="related-stories-state meta-text">
      No similar stories found.
    </div>
    <ol v-else class="related-story-list">
      <li
        v-for="story in stories"
        :key="story.objectID"
        class="related-story-row seed-palette-surface"
        :style="relatedPaletteStyle(story)"
      >
        <span class="related-story-mark" aria-hidden="true">
          {{ getStoryInitial(story) }}
        </span>
        <div class="related-story-content">
          <h3>
            <NuxtLink
              :to="`/item/${story.objectID}`"
              class="related-story-title"
            >
              {{ story.title }}
            </NuxtLink>
          </h3>
          <div class="related-story-source-line meta-text">
            <a
              v-if="story.url"
              :href="story.url"
              target="_blank"
              rel="noopener noreferrer"
              class="related-story-source"
              :aria-label="`Open source on ${getStoryDomain(story)}`"
            >
              <span>{{ getStoryDomain(story) }}</span>
              <LucideExternalLink class="h-3.5 w-3.5" aria-hidden="true" />
            </a>
            <span v-else class="related-story-source-fallback">HN discussion</span>
            <span class="related-story-author">by {{ story.author }}</span>
          </div>
          <div class="related-story-meta meta-text">
            <span class="related-story-metric">
              <LucideTrendingUp class="h-3.5 w-3.5" aria-hidden="true" />
              {{ story.points }}
            </span>
            <span class="related-story-metric">
              <LucideMessageSquare class="h-3.5 w-3.5" aria-hidden="true" />
              {{ story.num_comments }}
            </span>
            <time
              v-if="story.created_at"
              class="related-story-metric"
              :datetime="story.created_at"
            >
              <LucideClock class="h-3.5 w-3.5" aria-hidden="true" />
              {{ formatCompactTimeAgo(story.created_at) }}
            </time>
          </div>
        </div>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import {
  LucideClock,
  LucideExternalLink,
  LucideMessageSquare,
  LucideTrendingUp,
  LucideWaypoints,
} from '@lucide/vue'
import type { RelatedStory } from '#shared/types'
import { formatCompactTimeAgo } from '#shared/utils/date'
import { getSeedPaletteStyle } from '~/composables/useSeedPalette'

defineProps<{
  failed: boolean
  status: 'idle' | 'pending' | 'success' | 'error'
  stories: RelatedStory[]
}>()

const getStoryDomain = (story: RelatedStory) => {
  if (!story.url) return 'Hacker News'

  try {
    return new URL(story.url).hostname.replace(/^www\./, '')
  } catch {
    return 'Hacker News'
  }
}

const getStoryInitial = (story: RelatedStory) => {
  return story.title.trim().charAt(0).toLocaleUpperCase() || 'H'
}

const relatedPaletteStyle = (story: RelatedStory) => {
  return getSeedPaletteStyle(story.objectID, getStoryDomain(story))
}
</script>

<style scoped>
.related-stories {
  min-width: 0;
}

.related-stories-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.related-stories-heading {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.55rem;
}

.related-stories-heading-icon {
  display: inline-flex;
  width: 1.75rem;
  height: 1.75rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  background: rgb(37 99 235 / 0.09);
  color: rgb(37 99 235);
}

.related-stories-count {
  display: inline-flex;
  min-width: 1.9rem;
  height: 1.9rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 0.55rem;
  background: rgb(148 163 184 / 0.12);
  color: rgb(100 116 139);
  font-size: 0.78rem;
  font-weight: 750;
}

.related-stories-state {
  padding: 0.75rem 0;
  color: rgb(100 116 139);
}

.related-story-list {
  margin: 0;
  padding: 0;
  border: 1px solid rgb(148 163 184 / 0.24);
  border-radius: 0.75rem;
  background: rgb(248 250 252 / 0.54);
  list-style: none;
}

.related-story-row {
  display: grid;
  min-width: 0;
  grid-template-columns: 3.15rem minmax(0, 1fr);
  gap: 0.85rem;
  padding: 0.85rem;
  transition: background-color 160ms ease;
}

.related-story-row + .related-story-row {
  border-top: 1px solid rgb(148 163 184 / 0.2);
}

.related-story-row:hover {
  background: var(--seed-accent-soft);
}

.related-story-mark {
  position: relative;
  display: flex;
  width: 3.15rem;
  height: 3.15rem;
  align-items: center;
  justify-content: center;
  align-self: start;
  border: 1px solid color-mix(in oklch, var(--seed-border) 78%, transparent);
  border-radius: 0.75rem;
  background:
    radial-gradient(circle at 24% 20%, var(--seed-highlight), transparent 52%),
    var(--seed-surface-raised);
  color: var(--seed-accent-strong);
  font-family: var(--font-display);
  font-size: 1.08rem;
  font-weight: 750;
  line-height: 1;
  box-shadow: 0 8px 20px -16px var(--seed-shadow-strong);
}

.related-story-mark::after {
  position: absolute;
  right: -0.2rem;
  bottom: -0.2rem;
  width: 1.15rem;
  height: 1.15rem;
  border: 2px solid white;
  border-radius: 0.38rem;
  content: "↗";
  background: var(--seed-accent);
  color: white;
  font-family: var(--font-body);
  font-size: 0.68rem;
  font-weight: 800;
  line-height: 0.95rem;
  text-align: center;
}

.related-story-content {
  min-width: 0;
}

.related-story-title {
  display: inline;
  color: rgb(15 23 42);
  font-family: var(--font-display);
  font-size: 0.98rem;
  font-weight: 650;
  line-height: 1.32;
  text-decoration-color: transparent;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.2em;
  transition: color 160ms ease, text-decoration-color 160ms ease;
}

.related-story-title:hover,
.related-story-title:focus-visible {
  color: var(--seed-accent-strong);
  text-decoration-line: underline;
  text-decoration-color: var(--seed-accent);
}

.related-story-title:focus-visible {
  outline: 2px solid var(--seed-accent);
  outline-offset: 2px;
}

.related-story-source-line {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.55rem;
  margin-top: 0.3rem;
  color: rgb(100 116 139);
}

.related-story-source {
  display: inline-flex;
  min-width: 0;
  max-width: 100%;
  align-items: center;
  gap: 0.25rem;
  color: var(--seed-accent-strong);
  font-weight: 700;
}

.related-story-source span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.related-story-source:hover,
.related-story-source:focus-visible {
  text-decoration: underline;
  text-underline-offset: 0.18em;
}

.related-story-source-fallback {
  font-weight: 650;
}

.related-story-author {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.related-story-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.7rem;
  margin-top: 0.48rem;
  color: rgb(100 116 139);
}

.related-story-metric {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: 650;
}

.dark .related-stories-heading-icon {
  background: rgb(59 130 246 / 0.14);
  color: rgb(96 165 250);
}

.dark .related-stories-count,
.dark .related-stories-state {
  color: rgb(148 163 184);
}

.dark .related-story-list {
  border-color: rgb(148 163 184 / 0.2);
  background: rgb(30 41 59 / 0.3);
}

.dark .related-story-row + .related-story-row {
  border-color: rgb(148 163 184 / 0.16);
}

.dark .related-story-mark::after {
  border-color: rgb(17 24 39);
  color: rgb(15 23 42);
}

.dark .related-story-title {
  color: rgb(241 245 249);
}

.dark .related-story-title:hover,
.dark .related-story-title:focus-visible,
.dark .related-story-source {
  color: var(--seed-accent);
}

.dark .related-story-source-line,
.dark .related-story-meta {
  color: rgb(203 213 225 / 0.78);
}

@media (max-width: 480px) {
  .related-story-row {
    grid-template-columns: 2.75rem minmax(0, 1fr);
    gap: 0.75rem;
    padding: 0.75rem;
  }

  .related-story-mark {
    width: 2.75rem;
    height: 2.75rem;
  }
}
</style>
