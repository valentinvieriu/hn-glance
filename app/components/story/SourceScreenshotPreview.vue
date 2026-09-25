<template>
  <div
    class="source-screenshot-preview seed-palette-surface mb-6 lg:mb-8"
    :data-screenshot-attempt="screenshotRequestAttempt + 1"
    :data-screenshot-state="screenshotPreviewState"
    :style="screenshotPreviewStyle"
    data-testid="source-screenshot-preview"
  >
    <StoryPlaceholderVisual
      :domain="domain"
      :seed="storyId"
      :state="screenshotPreviewState"
      presentation="detail"
    />
    <img
      :key="`${screenshotSrc}:${screenshotRequestAttempt}`"
      ref="screenshotImage"
      :alt="`Preview of ${title}`"
      width="1440"
      height="11111"
      :src="screenshotSrc"
      loading="eager"
      fetchpriority="high"
      decoding="async"
      class="source-screenshot-preview-image"
      :aria-hidden="screenshotPreviewState === 'failed'"
      @load="handleScreenshotPreviewLoad"
      @error="handleScreenshotPreviewError"
    />
    <button
      v-if="screenshotPreviewState === 'loaded'"
      type="button"
      class="source-preview-open-button"
      aria-label="Open source preview at full size"
      @click="openScreenshotPreview"
    ></button>
    <a
      v-if="externalUrl"
      :href="externalUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="source-preview-source-link"
      :aria-label="`Open ${domain} externally`"
      data-testid="compact-source-preview"
    >
      <span class="source-preview-domain-chip meta-text">
        <span>{{ domain }}</span>
        <LucideExternalLink class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      </span>
    </a>
    <span
      v-if="screenshotPreviewState === 'loaded'"
      class="source-preview-expand-label"
      aria-hidden="true"
    >
      <LucideMaximize2 class="h-4 w-4" />
      <span>Full size</span>
    </span>
  </div>
  <dialog
    ref="screenshotDialog"
    class="source-preview-dialog"
    aria-labelledby="source-preview-dialog-title"
    @click.self="closeScreenshotPreview"
    @close="handleScreenshotDialogClose"
  >
    <div class="source-preview-dialog-shell">
      <div class="source-preview-dialog-header">
        <div class="min-w-0">
          <p id="source-preview-dialog-title" class="font-display font-semibold">Source preview</p>
          <p class="meta-text truncate text-gray-500 dark:text-gray-400">{{ domain }}</p>
        </div>
        <button
          type="button"
          class="source-preview-dialog-close"
          aria-label="Close source preview"
          @click="closeScreenshotPreview"
        >
          <LucideX class="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div class="source-preview-dialog-scroll">
        <img
          v-if="isScreenshotDialogOpen"
          :alt="`Expanded preview of ${title}`"
          width="1440"
          :src="screenshotSrc"
          decoding="async"
          class="source-preview-dialog-image"
        />
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { LucideExternalLink, LucideMaximize2, LucideX } from '@lucide/vue'
import { getScreenshotPath } from '#shared/utils/screenshot'
import { getSeedPaletteStyle } from '~/composables/useSeedPalette'

const props = defineProps<{
  domain: string
  externalUrl: string
  storyId: string
  title: string
}>()

type ScreenshotPreviewState = 'loading' | 'loaded' | 'failed'

// Background capture may still be running on first view; retry twice.
const SCREENSHOT_RETRY_DELAYS_MS = [16_000, 45_000] as const

const screenshotSrc = computed(() => getScreenshotPath(props.storyId))
const screenshotPreviewState = ref<ScreenshotPreviewState>('loading')
const screenshotRequestAttempt = ref(0)
const screenshotImage = ref<HTMLImageElement | null>(null)
const screenshotDialog = ref<HTMLDialogElement | null>(null)
const isScreenshotDialogOpen = ref(false)
let screenshotRetryTimer: ReturnType<typeof setTimeout> | undefined

const screenshotPreviewStyle = computed(() => {
  return getSeedPaletteStyle(props.storyId, props.domain)
})

const getPreviewStateFromImage = (image: HTMLImageElement): ScreenshotPreviewState => {
  return image.naturalWidth > 1 && image.naturalHeight > 1 ? 'loaded' : 'failed'
}

const scheduleScreenshotRetry = () => {
  const retryDelay = SCREENSHOT_RETRY_DELAYS_MS[screenshotRequestAttempt.value]

  if (retryDelay === undefined || screenshotRetryTimer) {
    return
  }

  screenshotRetryTimer = setTimeout(() => {
    screenshotRetryTimer = undefined
    screenshotPreviewState.value = 'loading'
    screenshotRequestAttempt.value += 1
  }, retryDelay)
}

const updateScreenshotPreviewState = (image: HTMLImageElement) => {
  screenshotPreviewState.value = getPreviewStateFromImage(image)

  if (screenshotPreviewState.value === 'failed') {
    scheduleScreenshotRetry()
  }
}

const handleScreenshotPreviewLoad = (event: Event) => {
  updateScreenshotPreviewState(event.target as HTMLImageElement)
}

const handleScreenshotPreviewError = () => {
  screenshotPreviewState.value = 'failed'
  scheduleScreenshotRetry()
}

const openScreenshotPreview = () => {
  if (
    screenshotPreviewState.value !== 'loaded'
    || !screenshotDialog.value
    || screenshotDialog.value.open
  ) {
    return
  }

  screenshotDialog.value.showModal()
  isScreenshotDialogOpen.value = true
}

const closeScreenshotPreview = () => {
  screenshotDialog.value?.close()
}

const handleScreenshotDialogClose = () => {
  isScreenshotDialogOpen.value = false
}

onMounted(() => {
  if (screenshotImage.value?.complete) {
    updateScreenshotPreviewState(screenshotImage.value)
  }
})

onBeforeUnmount(() => {
  if (screenshotRetryTimer) {
    clearTimeout(screenshotRetryTimer)
  }

  screenshotDialog.value?.close()
})
</script>

<style scoped>
.source-screenshot-preview {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 10;
  border: 1px solid color-mix(in oklch, var(--seed-border) 72%, rgb(148 163 184 / 0.26));
  border-radius: 0.75rem;
  background:
    linear-gradient(145deg, color-mix(in oklch, var(--seed-highlight) 54%, transparent), transparent 32%),
    linear-gradient(180deg, var(--seed-surface-raised), var(--seed-surface));
  box-shadow: 0 18px 40px -32px var(--seed-shadow-strong);
}

.source-screenshot-preview::after {
  position: absolute;
  z-index: 2;
  inset: auto 0 0;
  height: 42%;
  content: "";
  background: linear-gradient(to top, rgb(15 23 42 / 0.36), transparent);
  pointer-events: none;
}

.source-screenshot-preview-image {
  position: absolute;
  z-index: 1;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
}

.source-screenshot-preview[data-screenshot-state="failed"] .source-screenshot-preview-image {
  visibility: hidden;
}

.source-preview-open-button {
  position: absolute;
  z-index: 3;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  border-radius: inherit;
  background: transparent;
  cursor: zoom-in;
}

.source-preview-open-button:focus-visible {
  outline: 3px solid var(--seed-accent);
  outline-offset: -3px;
}

.source-preview-source-link {
  position: absolute;
  z-index: 4;
  right: auto;
  bottom: 0.75rem;
  left: 0.75rem;
  display: block;
  width: max-content;
  max-width: calc(100% - 1.5rem);
  border-radius: 999px;
}

.source-preview-source-link:focus-visible {
  outline: 3px solid var(--seed-accent);
  outline-offset: 2px;
}

.source-preview-domain-chip {
  display: inline-flex;
  width: max-content;
  max-width: 100%;
  align-items: center;
  gap: 0.35rem;
  padding: 0.42rem 0.58rem;
  border: 1px solid rgb(255 255 255 / 0.68);
  border-radius: 999px;
  background: rgb(255 255 255 / 0.88);
  color: rgb(31 41 55);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 8px 22px -16px rgb(15 23 42 / 0.75);
  backdrop-filter: blur(12px);
}

.source-preview-domain-chip span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-preview-expand-label {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 4;
  display: inline-flex;
  min-height: 2.25rem;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.7rem;
  border: 1px solid rgb(255 255 255 / 0.68);
  border-radius: 999px;
  background: rgb(255 255 255 / 0.9);
  color: rgb(31 41 55);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 8px 22px -14px rgb(15 23 42 / 0.75);
  backdrop-filter: blur(12px);
  pointer-events: none;
}

@media (min-width: 1024px) {
  .source-screenshot-preview {
    order: 2;
    aspect-ratio: 4 / 3;
  }

  .source-screenshot-preview[data-screenshot-state="loaded"] {
    aspect-ratio: auto;
  }

  .source-screenshot-preview[data-screenshot-state="loaded"] .source-screenshot-preview-image {
    position: relative;
    inset: auto;
    height: auto;
    object-fit: contain;
  }
}

.source-preview-dialog {
  width: min(calc(100vw - 2rem), 90rem);
  height: min(calc(100vh - 2rem), 56rem);
  max-width: none;
  max-height: none;
  padding: 0;
  overflow: hidden;
  border: 1px solid rgb(148 163 184 / 0.32);
  border-radius: 1rem;
  background: white;
  color: rgb(17 24 39);
  box-shadow: 0 36px 90px rgb(15 23 42 / 0.32);
}

.source-preview-dialog::backdrop {
  background: rgb(15 23 42 / 0.72);
  backdrop-filter: blur(5px);
}

.source-preview-dialog-shell {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
}

.source-preview-dialog-header {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0.9rem;
  border-bottom: 1px solid rgb(148 163 184 / 0.24);
  background: rgb(255 255 255 / 0.96);
}

.source-preview-dialog-close {
  display: inline-flex;
  width: 2.25rem;
  height: 2.25rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(148 163 184 / 0.3);
  border-radius: 999px;
  background: rgb(148 163 184 / 0.08);
  color: rgb(55 65 81);
}

.source-preview-dialog-close:hover,
.source-preview-dialog-close:focus-visible {
  background: rgb(148 163 184 / 0.16);
  color: rgb(17 24 39);
}

.source-preview-dialog-scroll {
  min-height: 0;
  flex: 1 1 auto;
  overflow: auto;
  background: rgb(241 245 249);
}

.source-preview-dialog-image {
  display: block;
  width: min(100%, 90rem);
  height: auto;
  margin: 0 auto;
  background: white;
}

.dark .source-screenshot-preview {
  border-color: color-mix(in oklch, var(--seed-border) 82%, rgb(148 163 184 / 0.28));
  background:
    linear-gradient(145deg, color-mix(in oklch, var(--seed-highlight) 50%, transparent), transparent 34%),
    linear-gradient(180deg, var(--seed-surface-raised), var(--seed-surface));
}

.dark .source-preview-expand-label {
  border-color: rgb(255 255 255 / 0.16);
  background: rgb(15 23 42 / 0.82);
  color: rgb(226 232 240);
}

.dark .source-preview-dialog {
  border-color: rgb(148 163 184 / 0.28);
  background: rgb(17 24 39);
  color: rgb(243 244 246);
}

.dark .source-preview-dialog-header {
  border-color: rgb(148 163 184 / 0.18);
  background: rgb(17 24 39 / 0.97);
}

.dark .source-preview-dialog-close {
  border-color: rgb(148 163 184 / 0.22);
  background: rgb(148 163 184 / 0.1);
  color: rgb(209 213 219);
}

.dark .source-preview-dialog-close:hover,
.dark .source-preview-dialog-close:focus-visible {
  background: rgb(148 163 184 / 0.18);
  color: white;
}

.dark .source-preview-dialog-scroll {
  background: rgb(15 23 42);
}

.dark .source-preview-domain-chip {
  border-color: rgb(255 255 255 / 0.16);
  background: rgb(15 23 42 / 0.78);
  color: rgb(226 232 240);
}
</style>
