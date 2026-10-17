<template>
  <div
    class="feed-shell grid-paper-backdrop feed-theme-surface min-h-full text-slate-900 dark:text-slate-100"
    :style="themeStyle"
  >
    <div class="layout-frame py-8 md:py-10">
      <header class="feed-page-header mb-7 md:mb-8">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="feed-kicker meta-text mb-2 inline-flex items-center gap-2 font-semibold uppercase">
              <span class="feed-kicker-dot h-2.5 w-2.5 rounded-full" aria-hidden="true"></span>
              {{ kicker }}
            </p>
            <h1 class="mb-0 text-3xl font-display font-semibold leading-tight md:text-4xl">
              {{ title }}
            </h1>
          </div>
          <p class="feed-description mb-0 max-w-sm text-sm leading-6 sm:text-right">
            {{ description }}
          </p>
        </div>
        <slot name="controls" />
      </header>

      <div v-if="error" class="text-center mt-20">
        <h1 class="text-3xl font-display font-semibold mb-4">Error</h1>
        <p class="mb-6 leading-7">{{ error }}</p>
        <NuxtLink
          to="/"
          class="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded"
        >
          Back to Home
        </NuxtLink>
      </div>

      <div v-else>
        <div
          v-if="isLoading"
          class="story-grid"
          aria-busy="true"
          aria-live="polite"
        >
          <span class="sr-only">Loading stories</span>
          <div
            v-for="index in 9"
            :key="`story-skeleton-${skeletonKey}-${index}`"
            class="story-card-skeleton seed-palette-surface flex flex-col rounded-2xl overflow-hidden bg-white shadow-lg dark:bg-gray-900"
            :style="skeletonPaletteStyle(index)"
            aria-hidden="true"
          >
            <div class="relative aspect-[4/4] shrink-0 overflow-hidden skeleton-shot">
              <div class="story-card-skeleton-topbar meta-text">
                <div class="h-3 w-24 rounded-full skeleton-line"></div>
                <div class="h-3 w-12 rounded-full skeleton-line skeleton-line-muted"></div>
              </div>
              <div class="absolute inset-x-[14%] top-[16%] h-[10%] rounded-full skeleton-line"></div>
              <div class="absolute inset-x-[10%] top-[31%] h-[7%] rounded-full skeleton-line skeleton-line-muted"></div>
              <div class="absolute inset-x-[18%] top-[43%] h-[7%] rounded-full skeleton-line skeleton-line-muted"></div>
              <div class="absolute left-[11%] right-[26%] top-[62%] h-[20%] rounded-lg skeleton-block"></div>
            </div>
            <div class="story-card-skeleton-body flex flex-1 flex-col p-4">
              <div class="space-y-2.5 mb-4">
                <div class="h-4 rounded-full skeleton-line" :style="{ width: skeletonTitleWidths[(index - 1) % skeletonTitleWidths.length] }"></div>
                <div class="h-4 w-2/3 rounded-full skeleton-line skeleton-line-muted"></div>
                <div class="h-4 w-5/6 rounded-full skeleton-line skeleton-line-muted"></div>
              </div>
              <div class="mt-auto flex items-center justify-between gap-3">
                <div class="h-3 w-20 rounded-full skeleton-line skeleton-line-muted"></div>
                <div class="h-3 w-24 rounded-full skeleton-line skeleton-line-muted"></div>
              </div>
            </div>
          </div>
        </div>

        <slot v-else-if="stories.length === 0" name="empty" />

        <div v-else>
          <div
            v-if="isRefreshing"
            class="feed-refresh-indicator meta-text inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 font-medium text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300"
            aria-live="polite"
          >
            <LucideRefreshCw class="h-3.5 w-3.5 animate-spin text-orange-500" aria-hidden="true" />
            <span>Updating</span>
          </div>

          <div class="story-grid">
            <!-- Cards hydrate as they approach the viewport, so first load
                 does not hydrate the whole feed in one main-thread task. -->
            <LazyStoryCard
              v-for="(story, index) in stories"
              :key="story.objectID"
              :story="story"
              :priority="index === 0"
              :note="storyNote?.(story)"
              :hydrate-on-visible="STORY_CARD_HYDRATION"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="TStory extends Story">
import type { Story } from '#shared/types';
import type { StoryCardNote } from '~/types/storyCard';
import { getSeedPaletteStyle } from '~/composables/useSeedPalette';
import { LucideRefreshCw } from '@lucide/vue';

const STORY_CARD_HYDRATION: IntersectionObserverInit = { rootMargin: '600px 0px' };

const props = defineProps<{
  kicker: string;
  title: string;
  description: string;
  themeStyle?: Record<string, string>;
  stories: TStory[];
  isLoading: boolean;
  isRefreshing?: boolean;
  error?: string | null;
  skeletonKey: string;
  storyNote?: (story: TStory) => StoryCardNote | undefined;
}>();

defineSlots<{
  controls?: () => unknown;
  empty?: () => unknown;
}>();

const skeletonTitleWidths = ['82%', '68%', '76%', '58%', '88%'];
const skeletonPaletteStyle = (index: number) => {
  return getSeedPaletteStyle(`loading-${props.skeletonKey}-${index}`);
};
</script>

<style scoped>
.feed-shell {
  background:
    radial-gradient(circle at 8% -7%, var(--feed-glow-a) 0, transparent 30rem),
    radial-gradient(circle at 84% 0%, var(--feed-glow-b) 0, transparent 34rem),
    radial-gradient(circle at 52% 28%, var(--feed-glow-c) 0, transparent 28rem),
    linear-gradient(135deg, var(--feed-bg-start) 0%, var(--feed-bg-mid) 48%, var(--feed-bg-end) 100%);
}

.feed-page-header {
  border-bottom: 1px solid var(--feed-border);
  padding-bottom: 1.25rem;
}

.feed-kicker {
  color: var(--feed-accent-strong);
}

.feed-kicker-dot {
  background: var(--feed-swatch);
  box-shadow:
    0 0 0 4px var(--feed-accent-soft),
    0 8px 22px var(--feed-glow-a);
}

.feed-description {
  color: rgb(71 85 105);
}

.dark .feed-description {
  color: rgb(203 213 225);
}

.feed-refresh-indicator {
  position: fixed;
  top: 4.25rem;
  right: 1rem;
  z-index: 40;
  pointer-events: none;
}

@media (min-width: 640px) {
  .feed-refresh-indicator {
    top: 4.75rem;
    right: max(var(--layout-gutter), calc((100vw - var(--layout-wide-max)) / 2));
  }
}

.story-card-skeleton {
  position: relative;
  border: 1px solid color-mix(in oklch, var(--seed-border) 72%, rgb(203 213 225 / 0.5));
  background:
    linear-gradient(145deg, var(--seed-highlight), transparent 32%),
    linear-gradient(180deg, var(--seed-surface-raised), var(--seed-surface));
  box-shadow:
    0 20px 48px var(--seed-shadow),
    inset 0 1px 0 rgb(255 255 255 / 0.36);
}

.story-card-skeleton-topbar {
  position: absolute;
  inset: 0 0 auto;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-bottom: 1px solid color-mix(in oklch, var(--seed-border) 46%, transparent);
  background:
    linear-gradient(135deg, var(--seed-highlight), transparent 34%),
    color-mix(in oklch, var(--seed-surface-raised) 58%, white 18%);
  padding: 0.7rem 0.95rem 0.62rem;
}

.story-card-skeleton-body {
  min-height: 9.65rem;
  border-top: 1px solid color-mix(in oklch, var(--seed-border) 54%, transparent);
  background:
    radial-gradient(circle at 100% 0%, color-mix(in oklch, var(--seed-ring) 68%, transparent) 0, transparent 48%),
    linear-gradient(
      180deg,
      color-mix(in oklch, white 82%, var(--seed-surface-raised) 9%),
      color-mix(in oklch, rgb(248 250 252) 76%, var(--seed-surface-strong) 14%)
    );
}

.dark .story-card-skeleton-body {
  background:
    radial-gradient(circle at 100% 0%, color-mix(in oklch, var(--seed-ring) 72%, transparent) 0, transparent 48%),
    linear-gradient(
      180deg,
      color-mix(in oklch, var(--seed-surface-raised) 68%, black 14%),
      color-mix(in oklch, var(--seed-surface-strong) 66%, black 18%)
    );
}

.skeleton-shot {
  background:
    radial-gradient(circle at 25% 20%, var(--seed-accent-soft), transparent 28%),
    linear-gradient(180deg, var(--seed-surface) 0%, var(--seed-surface-strong) 58%, var(--seed-overlay-edge) 100%);
}

.skeleton-shot::after,
.story-card-skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(110deg, transparent 20%, rgb(255 255 255 / 0.22) 45%, transparent 70%);
  animation: skeleton-shimmer 1.9s ease-in-out infinite;
  pointer-events: none;
}

.story-card-skeleton::after {
  animation-delay: 0.35s;
}

.skeleton-line,
.skeleton-block {
  border: 1px solid var(--seed-metric-border);
  background:
    linear-gradient(180deg, var(--seed-highlight), transparent 48%),
    var(--seed-metric-bg);
  box-shadow: 0 1px 0 rgb(255 255 255 / 0.36) inset;
}

.skeleton-line-muted {
  opacity: 0.72;
}

.skeleton-block {
  background: var(--seed-surface-strong);
}

@keyframes skeleton-shimmer {
  100% {
    transform: translateX(100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-shot::after,
  .story-card-skeleton::after {
    animation: none;
  }
}
</style>
