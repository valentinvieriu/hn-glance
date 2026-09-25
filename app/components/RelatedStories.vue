<template>
  <section class="related-stories mt-10" aria-labelledby="similar-stories-title">
    <StoryContextSectionHeader
      id="similar-stories-title"
      title="Similar Stories"
      :count="stories.length"
      :count-label="`${stories.length} similar ${stories.length === 1 ? 'story' : 'stories'}`"
    >
      <template #icon>
        <LucideWaypoints class="h-4 w-4" />
      </template>
    </StoryContextSectionHeader>
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
    <ol
      v-else
      id="similar-stories-list"
      class="related-story-list story-context-source-list"
      :class="{ 'is-expanded': isExpanded }"
    >
      <li
        v-for="(story, index) in stories"
        :key="story.objectID"
        class="related-story-row story-context-source-row story-context-interactive-row story-context-palette"
        :class="{ 'is-mobile-extra': index >= MOBILE_VISIBLE_STORIES }"
        :style="relatedPaletteStyle(story)"
      >
        <SourceIdentity
          :url="story.url || getHnItemUrl(story.objectID)"
          :label="story.title"
          :preview-url="story.url ? getScreenshotPath(story.objectID) : undefined"
        />
        <div class="related-story-content">
          <h3>
            <NuxtLink
              :to="`/item/${story.objectID}`"
              class="story-context-source-title story-context-primary-link"
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
              class="related-story-source story-context-secondary-link"
              :aria-label="`Open source on ${getStoryDomain(story)}`"
            >
              <span class="truncate">{{ getStoryDomain(story) }}</span>
            </a>
            <span v-else class="related-story-source-fallback">HN discussion</span>
            <span class="related-story-author truncate">
              by
              <NuxtLink
                :to="getHnUserPath(story.author)"
                class="related-story-author-link story-context-secondary-link"
              >
                {{ story.author }}
              </NuxtLink>
            </span>
          </div>
          <div class="related-story-meta meta-text">
            <span>{{ story.points }} {{ story.points === 1 ? 'point' : 'points' }}</span>
            <span aria-hidden="true">·</span>
            <span>
              {{ story.num_comments }}
              {{ story.num_comments === 1 ? 'comment' : 'comments' }}
            </span>
            <span v-if="story.created_at" aria-hidden="true">·</span>
            <time
              v-if="story.created_at"
              :datetime="story.created_at"
            >
              {{ formatCompactTimeAgo(story.created_at) }}
            </time>
          </div>
        </div>
      </li>
    </ol>
    <button
      v-if="stories.length > MOBILE_VISIBLE_STORIES"
      type="button"
      class="related-stories-toggle"
      :aria-expanded="isExpanded"
      aria-controls="similar-stories-list"
      @click="isExpanded = !isExpanded"
    >
      {{ isExpanded ? 'Show fewer similar stories' : `Show all ${stories.length} similar stories` }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { LucideWaypoints } from '@lucide/vue'
import type { RelatedStory } from '#shared/types'
import { formatCompactTimeAgo } from '#shared/utils/date'
import { getHnItemUrl, getHnUserPath } from '#shared/utils/hn'
import { getScreenshotPath } from '#shared/utils/screenshot'
import { getUrlDomain } from '#shared/utils/url'
import { getStoryContextPaletteStyle } from '~/composables/useSeedPalette'
import StoryContextSectionHeader from './StoryContextSectionHeader.vue'

const MOBILE_VISIBLE_STORIES = 4
const isExpanded = ref(false)

defineProps<{
  failed: boolean
  status: 'idle' | 'pending' | 'success' | 'error'
  stories: RelatedStory[]
}>()

const getStoryDomain = (story: RelatedStory) => getUrlDomain(story.url, 'Hacker News')

const relatedPaletteStyle = (story: RelatedStory) => {
  return getStoryContextPaletteStyle(story.objectID, getStoryDomain(story))
}

</script>

<style scoped>
.related-stories {
  min-width: 0;
}

.related-stories-state {
  padding: 0.75rem 0;
  color: var(--story-context-muted);
}

.related-story-list {
  margin-block: 0;
  padding: 0;
  list-style: none;
}

.related-story-row:has(.story-context-primary-link:focus-visible) {
  background: var(--story-context-accent-soft);
}

.related-story-content {
  min-width: 0;
}

.related-story-source-line {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.55rem;
  margin-top: 0.3rem;
  color: var(--story-context-muted);
}

.related-story-source {
  display: inline-flex;
  min-width: 0;
  max-width: 100%;
  align-items: center;
  gap: 0.25rem;
  color: var(--story-context-accent-strong);
  font-weight: 700;
}

.related-story-source:hover,
.related-story-source:focus-visible {
  text-decoration: underline;
  text-underline-offset: 0.18em;
}

.related-story-source:focus-visible,
.related-story-author-link:focus-visible {
  border-radius: 0.15rem;
  outline: 2px solid var(--story-context-focus);
  outline-offset: 2px;
}

.related-story-source-fallback {
  font-weight: 650;
}

.related-story-author {
  min-width: 0;
}

.related-story-author-link {
  color: inherit;
  font-weight: 650;
}

.related-story-author-link:hover,
.related-story-author-link:focus-visible {
  color: var(--story-context-accent-strong);
  text-decoration: underline;
  text-underline-offset: 0.18em;
}

.related-story-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.28rem;
  margin-top: 0.4rem;
  color: var(--story-context-muted);
  font-weight: 650;
}

.dark .related-story-source {
  color: var(--story-context-accent);
}

.dark .related-story-source-line,
.dark .related-story-meta {
  color: rgb(203 213 225 / 0.78);
}

.related-stories-toggle {
  display: none;
  min-height: 2.25rem;
  align-items: center;
  margin-top: 0.75rem;
  padding: 0.4rem 0.7rem;
  border: 1px solid var(--story-context-border);
  border-radius: 999px;
  background: var(--story-context-accent-soft);
  color: var(--story-context-accent-strong);
  font-size: 0.8rem;
  font-weight: 700;
}

.related-stories-toggle:hover,
.related-stories-toggle:focus-visible {
  background: var(--story-context-surface-raised);
}

.related-stories-toggle:focus-visible {
  outline: 2px solid var(--story-context-focus);
  outline-offset: 2px;
}

@media (max-width: 1023px) {
  .related-story-list:not(.is-expanded) .related-story-row.is-mobile-extra {
    display: none;
  }

  .related-stories-toggle {
    display: inline-flex;
  }
}
</style>
