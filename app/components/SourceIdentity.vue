<template>
  <span
    class="source-identity"
    :class="[
      { 'has-preview': previewLoaded },
      `source-identity-${size}`,
    ]"
    aria-hidden="true"
  >
    <span class="source-identity-fallback">{{ initial }}</span>
    <img
      v-if="previewUrl && !previewFailed"
      :src="previewUrl"
      alt=""
      class="source-identity-preview"
      loading="lazy"
      decoding="async"
      @load="handlePreviewLoad"
      @error="previewFailed = true"
    >
    <span v-if="faviconUrl && !faviconFailed" class="source-identity-favicon-frame">
      <img
        :src="faviconUrl"
        alt=""
        class="source-identity-favicon"
        loading="lazy"
        decoding="async"
        referrerpolicy="no-referrer"
        @error="faviconFailed = true"
      >
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getSourceFaviconUrl } from '~/utils/sourceFavicon'

const props = defineProps<{
  label: string
  previewUrl?: string
  size?: 'default' | 'compact'
  url: string
}>()

const size = computed(() => props.size ?? 'default')

const faviconFailed = ref(false)
const previewFailed = ref(false)
const previewLoaded = ref(false)

const initial = computed(() => {
  return props.label.trim().charAt(0).toLocaleUpperCase() || '•'
})

const faviconUrl = computed(() => getSourceFaviconUrl(props.url))

watch(faviconUrl, () => {
  faviconFailed.value = false
})

watch(() => props.previewUrl, () => {
  previewFailed.value = false
  previewLoaded.value = false
})

const handlePreviewLoad = (event: Event) => {
  const image = event.currentTarget as HTMLImageElement | null

  if (!image || (image.naturalWidth <= 1 && image.naturalHeight <= 1)) {
    previewFailed.value = true
    previewLoaded.value = false
    return
  }

  previewLoaded.value = true
}
</script>

<style scoped>
.source-identity {
  position: relative;
  display: grid;
  width: 2.85rem;
  height: 2.85rem;
  flex: 0 0 auto;
  overflow: hidden;
  place-items: center;
  border: 1px solid var(--source-identity-border, rgb(148 163 184 / 0.28));
  border-radius: 0.62rem;
  background: var(--source-identity-surface, rgb(241 245 249));
  color: var(--source-identity-accent, rgb(71 85 105));
}

.source-identity-fallback,
.source-identity-preview {
  grid-area: 1 / 1;
}

.source-identity-fallback {
  font-family: var(--font-ui);
  font-size: 0.95rem;
  font-weight: 760;
  line-height: 1;
}

.source-identity-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 160ms ease;
}

.source-identity.has-preview .source-identity-preview {
  opacity: 1;
}

.source-identity-favicon-frame {
  position: absolute;
  display: grid;
  width: 1.45rem;
  height: 1.45rem;
  place-items: center;
  border-radius: 0.36rem;
  background: rgb(255 255 255 / 0.94);
  transition: width 160ms ease, height 160ms ease, inset 160ms ease;
}

.source-identity.has-preview .source-identity-favicon-frame {
  right: 0.16rem;
  bottom: 0.16rem;
  width: 1.2rem;
  height: 1.2rem;
  border: 1px solid rgb(255 255 255 / 0.72);
  box-shadow: 0 2px 7px rgb(15 23 42 / 0.2);
}

.source-identity-favicon {
  width: 1rem;
  height: 1rem;
  object-fit: contain;
}

.source-identity.has-preview .source-identity-favicon {
  width: 0.82rem;
  height: 0.82rem;
}

.source-identity-compact {
  width: 2.15rem;
  height: 2.15rem;
  border-radius: 0.5rem;
}

.source-identity-compact .source-identity-fallback {
  font-size: 0.8rem;
}

.source-identity-compact .source-identity-favicon-frame {
  width: 1.2rem;
  height: 1.2rem;
  border-radius: 0.3rem;
}

.source-identity-compact .source-identity-favicon {
  width: 0.82rem;
  height: 0.82rem;
}

.dark .source-identity {
  background: var(--source-identity-surface-dark, rgb(30 41 59 / 0.72));
}
</style>
