<template>
  <section
    class="error-shell feed-theme-surface min-h-full text-slate-900 dark:text-slate-100"
    :style="getFeedThemeStyle('top')"
  >
    <div class="layout-frame py-8 sm:py-10 lg:py-14">
      <div class="error-card">
        <div class="error-copy">
          <p class="error-kicker meta-text">
            <span class="error-kicker-dot" aria-hidden="true"></span>
            {{ statusCode }} · {{ errorKind }}
          </p>

          <h1 class="error-title">{{ title }}</h1>
          <p class="error-description">{{ description }}</p>

          <div class="error-actions">
            <a href="/top" class="error-primary-action">
              <span>Browse top stories</span>
              <LucideArrowRight class="h-4 w-4" aria-hidden="true" />
            </a>
            <button
              v-if="!isNotFound"
              type="button"
              class="error-secondary-action"
              @click="reloadPage"
            >
              <LucideRefreshCw class="h-4 w-4" aria-hidden="true" />
              <span>Try again</span>
            </button>
          </div>
        </div>

        <div class="missing-preview" aria-hidden="true">
          <div class="missing-preview-window">
            <div class="missing-preview-bar">
              <span class="missing-preview-domain">hnglance.com</span>
              <span class="missing-preview-state">not found</span>
            </div>
            <div class="missing-preview-canvas">
              <span class="missing-preview-code">{{ statusCode }}</span>
              <div class="missing-preview-lines">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div class="missing-preview-grid">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="feed-recovery">
        <div class="feed-recovery-heading">
          <div>
            <p class="feed-recovery-kicker meta-text">Keep browsing</p>
            <h2 class="mb-0 text-xl font-semibold sm:text-2xl">Pick up with a live HN feed</h2>
          </div>
          <p class="feed-recovery-note">Choose the view that matches what you want to read next.</p>
        </div>

        <nav class="feed-recovery-grid" aria-label="Hacker News feeds">
          <a
            v-for="feed in feedThemeList"
            :key="feed.key"
            :href="feed.path"
            class="feed-recovery-link feed-theme-surface"
            :style="getFeedThemeStyle(feed.key)"
          >
            <span class="feed-recovery-swatch" aria-hidden="true"></span>
            <span class="min-w-0 flex-1">
              <span class="feed-recovery-label">{{ feed.title }}</span>
              <span class="feed-recovery-description">{{ feed.description }}</span>
            </span>
            <LucideArrowUpRight class="feed-recovery-arrow" aria-hidden="true" />
          </a>
        </nav>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { LucideArrowRight, LucideArrowUpRight, LucideRefreshCw } from '@lucide/vue'
import { feedThemeList, getFeedThemeStyle } from '~/composables/useFeedTheme'

const props = withDefaults(defineProps<{
  statusCode?: number
  statusMessage?: string
}>(), {
  statusCode: 404,
  statusMessage: 'Page not found',
})

const isNotFound = computed(() => props.statusCode === 404)
const normalizedStatusMessage = computed(() => props.statusMessage.toLowerCase())
const missingResource = computed<'page' | 'story' | 'user'>(() => {
  if (normalizedStatusMessage.value.includes('story')) {
    return 'story'
  }

  if (normalizedStatusMessage.value.includes('user')) {
    return 'user'
  }

  return 'page'
})

const errorKind = computed(() => {
  if (!isNotFound.value) {
    return 'Page unavailable'
  }

  return missingResource.value === 'story'
    ? 'Story not found'
    : missingResource.value === 'user'
      ? 'User not found'
      : 'Page not found'
})

const title = computed(() => {
  if (!isNotFound.value) {
    return 'The page could not be loaded.'
  }

  return missingResource.value === 'story'
    ? 'This story is not available.'
    : missingResource.value === 'user'
      ? 'This user is not on HN.'
      : 'This page is not in the feed.'
})

const description = computed(() => {
  if (!isNotFound.value) {
    return 'HN Glance ran into an upstream problem while loading this page. Try again, or continue with one of the feeds below.'
  }

  return missingResource.value === 'story'
    ? 'The HN item may have been removed, or the story number in the address may be incorrect. The current feeds are still available below.'
    : missingResource.value === 'user'
      ? 'That username does not resolve to a Hacker News profile. Check the spelling, or continue browsing the current stories.'
      : 'The address may be mistyped or the destination may have moved. Choose a feed below to continue exploring Hacker News.'
})

const reloadPage = () => {
  if (import.meta.client) {
    window.location.reload()
  }
}
</script>

<style scoped>
.error-shell {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background:
    radial-gradient(circle at 8% -8%, var(--feed-glow-a) 0, transparent 30rem),
    radial-gradient(circle at 90% 4%, var(--feed-glow-b) 0, transparent 34rem),
    radial-gradient(circle at 52% 58%, var(--feed-glow-c) 0, transparent 30rem),
    linear-gradient(135deg, var(--feed-bg-start) 0%, var(--feed-bg-mid) 48%, var(--feed-bg-end) 100%);
}

.error-shell::before {
  position: absolute;
  z-index: -1;
  inset: 0;
  background-image:
    linear-gradient(rgb(15 23 42 / 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgb(15 23 42 / 0.04) 1px, transparent 1px);
  background-size: 48px 48px;
  content: '';
  pointer-events: none;
  -webkit-mask-image: linear-gradient(180deg, rgb(0 0 0 / 0.55), transparent 78%);
  mask-image: linear-gradient(180deg, rgb(0 0 0 / 0.55), transparent 78%);
}

.dark .error-shell::before {
  background-image:
    linear-gradient(rgb(255 255 255 / 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgb(255 255 255 / 0.04) 1px, transparent 1px);
}

.error-card {
  display: grid;
  overflow: hidden;
  border: 1px solid var(--feed-border);
  border-radius: 1.25rem;
  background:
    linear-gradient(145deg, rgb(255 255 255 / 0.88), rgb(255 255 255 / 0.64)),
    var(--feed-accent-soft);
  box-shadow:
    0 28px 70px rgb(51 65 85 / 0.13),
    inset 0 1px 0 rgb(255 255 255 / 0.72);
}

.dark .error-card {
  background:
    linear-gradient(145deg, rgb(30 41 59 / 0.9), rgb(15 23 42 / 0.78)),
    var(--feed-accent-soft);
  box-shadow:
    0 32px 76px rgb(0 0 0 / 0.34),
    inset 0 1px 0 rgb(255 255 255 / 0.07);
}

.error-copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(1.5rem, 4vw, 4.25rem);
}

.error-kicker {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0 0 1rem;
  color: var(--feed-accent-strong);
  font-weight: 750;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.error-kicker-dot {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 999px;
  background: var(--feed-swatch);
  box-shadow: 0 0 0 5px var(--feed-accent-soft);
}

.error-title {
  max-width: 13ch;
  margin: 0;
  font-size: clamp(2.25rem, 7vw, 4.65rem);
  font-weight: 720;
  letter-spacing: -0.045em;
  line-height: 0.98;
  text-wrap: balance;
}

.error-description {
  max-width: 40rem;
  margin: 1.35rem 0 0;
  color: rgb(71 85 105);
  font-size: 1.03rem;
  line-height: 1.7;
}

.dark .error-description {
  color: rgb(203 213 225);
}

.error-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.75rem;
}

.error-primary-action,
.error-secondary-action {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  border-radius: 0.75rem;
  padding: 0.7rem 1rem;
  font-weight: 700;
  transition: transform 160ms ease, background-color 160ms ease, box-shadow 160ms ease;
}

.error-primary-action {
  background: var(--feed-accent-strong);
  color: white;
  box-shadow: 0 12px 26px var(--feed-glow-a);
}

.dark .error-primary-action {
  color: rgb(15 23 42);
}

.error-secondary-action {
  border: 1px solid var(--feed-border);
  background: rgb(255 255 255 / 0.56);
  color: rgb(51 65 85);
}

.dark .error-secondary-action {
  background: rgb(15 23 42 / 0.42);
  color: rgb(226 232 240);
}

.error-primary-action:hover,
.error-secondary-action:hover {
  transform: translateY(-1px);
}

.error-primary-action:focus-visible,
.error-secondary-action:focus-visible,
.feed-recovery-link:focus-visible {
  outline: 3px solid var(--feed-accent-strong);
  outline-offset: 3px;
}

.missing-preview {
  min-height: 20rem;
  padding: clamp(1.2rem, 3vw, 2.5rem);
  background:
    radial-gradient(circle at 72% 22%, var(--feed-glow-b), transparent 45%),
    linear-gradient(150deg, var(--feed-accent-soft), transparent 72%);
}

.missing-preview-window {
  height: 100%;
  min-height: 18rem;
  overflow: hidden;
  transform: rotate(1.5deg);
  border: 1px solid var(--feed-border);
  border-radius: 1rem;
  background: rgb(255 255 255 / 0.82);
  box-shadow:
    0 26px 56px rgb(71 85 105 / 0.2),
    inset 0 1px 0 rgb(255 255 255 / 0.82);
}

.dark .missing-preview-window {
  background: rgb(15 23 42 / 0.76);
  box-shadow:
    0 28px 60px rgb(0 0 0 / 0.38),
    inset 0 1px 0 rgb(255 255 255 / 0.08);
}

.missing-preview-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid var(--feed-border);
  padding: 0.8rem 0.95rem;
  color: rgb(100 116 139);
  font-size: 0.75rem;
  font-weight: 650;
}

.dark .missing-preview-bar {
  color: rgb(148 163 184);
}

.missing-preview-domain {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.missing-preview-state {
  color: var(--feed-accent-strong);
}

.missing-preview-canvas {
  position: relative;
  display: flex;
  min-height: 15rem;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 42%, var(--feed-glow-a), transparent 34%),
    linear-gradient(145deg, rgb(248 250 252 / 0.74), rgb(241 245 249 / 0.4));
}

.dark .missing-preview-canvas {
  background:
    radial-gradient(circle at 50% 42%, var(--feed-glow-a), transparent 34%),
    linear-gradient(145deg, rgb(30 41 59 / 0.7), rgb(15 23 42 / 0.5));
}

.missing-preview-code {
  position: relative;
  z-index: 2;
  color: var(--feed-accent-strong);
  font-size: clamp(4.5rem, 13vw, 8.5rem);
  font-weight: 780;
  letter-spacing: -0.08em;
  line-height: 1;
  text-shadow: 0 14px 34px var(--feed-glow-a);
}

.missing-preview-lines,
.missing-preview-grid {
  position: absolute;
  inset: 1.25rem;
}

.missing-preview-lines span {
  position: absolute;
  left: 4%;
  height: 0.5rem;
  border-radius: 999px;
  background: var(--feed-border);
}

.missing-preview-lines span:nth-child(1) {
  top: 10%;
  width: 34%;
}

.missing-preview-lines span:nth-child(2) {
  top: 18%;
  width: 22%;
  opacity: 0.7;
}

.missing-preview-lines span:nth-child(3) {
  right: 4%;
  bottom: 9%;
  left: auto;
  width: 27%;
  opacity: 0.72;
}

.missing-preview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: end;
  gap: 0.65rem;
  padding-top: 58%;
}

.missing-preview-grid span {
  height: 2.6rem;
  border: 1px solid var(--feed-border);
  border-radius: 0.55rem;
  background: var(--feed-accent-soft);
}

.feed-recovery {
  margin-top: clamp(2rem, 4vw, 3.5rem);
}

.feed-recovery-heading {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.feed-recovery-kicker {
  margin: 0 0 0.35rem;
  color: var(--feed-accent-strong);
  font-weight: 750;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.feed-recovery-note {
  max-width: 25rem;
  margin: 0;
  color: rgb(100 116 139);
  font-size: 0.875rem;
  line-height: 1.55;
}

.dark .feed-recovery-note {
  color: rgb(148 163 184);
}

.feed-recovery-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.75rem;
}

.feed-recovery-link {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 0.8rem;
  border: 1px solid var(--feed-border);
  border-radius: 0.9rem;
  background: rgb(255 255 255 / 0.7);
  padding: 0.95rem;
  box-shadow: 0 12px 30px var(--feed-glow-a);
  transition: transform 160ms ease, border-color 160ms ease, background-color 160ms ease;
}

.dark .feed-recovery-link {
  background: rgb(15 23 42 / 0.58);
}

.feed-recovery-link:hover {
  transform: translateY(-2px);
  border-color: var(--feed-accent-strong);
  background: rgb(255 255 255 / 0.88);
}

.dark .feed-recovery-link:hover {
  background: rgb(30 41 59 / 0.82);
}

.feed-recovery-swatch {
  width: 0.72rem;
  height: 0.72rem;
  flex: 0 0 auto;
  margin-top: 0.28rem;
  border-radius: 999px;
  background: var(--feed-swatch);
  box-shadow: 0 0 0 4px var(--feed-accent-soft);
}

.feed-recovery-label,
.feed-recovery-description {
  display: block;
}

.feed-recovery-label {
  color: rgb(15 23 42);
  font-weight: 720;
}

.dark .feed-recovery-label {
  color: rgb(248 250 252);
}

.feed-recovery-description {
  margin-top: 0.18rem;
  color: rgb(100 116 139);
  font-size: 0.8rem;
  line-height: 1.45;
}

.dark .feed-recovery-description {
  color: rgb(148 163 184);
}

.feed-recovery-arrow {
  width: 1rem;
  height: 1rem;
  flex: 0 0 auto;
  margin-top: 0.18rem;
  color: var(--feed-accent-strong);
}

@media (min-width: 640px) {
  .feed-recovery-heading {
    flex-direction: row;
    align-items: end;
    justify-content: space-between;
  }

  .feed-recovery-note {
    text-align: right;
  }

  .feed-recovery-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 960px) {
  .error-card {
    grid-template-columns: minmax(0, 1.08fr) minmax(22rem, 0.92fr);
  }

  .missing-preview {
    min-height: 31rem;
  }

  .missing-preview-window {
    min-height: 26rem;
  }

  .missing-preview-canvas {
    min-height: 23rem;
  }

  .feed-recovery-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .error-primary-action,
  .error-secondary-action,
  .feed-recovery-link {
    transition: none;
  }
}
</style>
