<template>
  <section role="tabpanel" :aria-label="label">
    <slot v-if="isInitialLoading" name="loading" />

    <div v-else-if="isEmpty" class="activity-empty">
      {{ emptyText }}
    </div>

    <slot v-else />

    <div ref="sentinelRef" class="load-sentinel" aria-hidden="true"></div>

    <div v-if="errorMessage" class="activity-error">
      {{ errorMessage }}
    </div>

    <div v-if="isLoadingMore" class="activity-loading" aria-live="polite">
      <LucideRefreshCw class="h-4 w-4 animate-spin" aria-hidden="true" />
      <span>{{ loadingText }}</span>
    </div>

    <div v-else-if="hasMore && !isEmpty" class="activity-load-more">
      <button type="button" class="activity-load-button" @click="emit('loadMore')">
        Load more
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { LucideRefreshCw } from '@lucide/vue'

const props = defineProps<{
  active: boolean
  emptyText: string
  errorMessage: string | null
  hasMore: boolean
  isEmpty: boolean
  isInitialLoading: boolean
  isLoadingMore: boolean
  label: string
  loadingText: string
}>()

const emit = defineEmits<{
  loadMore: []
}>()

const sentinelRef = ref<HTMLElement | null>(null)
let sentinelObserver: IntersectionObserver | null = null

onMounted(() => {
  if (!sentinelRef.value || !('IntersectionObserver' in window)) {
    return
  }

  sentinelObserver = new IntersectionObserver((entries) => {
    if (props.active && entries.some(entry => entry.isIntersecting)) {
      emit('loadMore')
    }
  }, { rootMargin: '720px 0px' })
  sentinelObserver.observe(sentinelRef.value)
})

onBeforeUnmount(() => {
  sentinelObserver?.disconnect()
})
</script>

<style scoped>
.activity-empty,
.activity-error,
.activity-loading,
.activity-load-more {
  display: flex;
  justify-content: center;
  margin-top: 1.25rem;
  color: rgb(71 85 105);
  font-size: 0.9rem;
  font-weight: 600;
}

.dark .activity-empty,
.dark .activity-error,
.dark .activity-loading,
.dark .activity-load-more {
  color: rgb(203 213 225);
}

.activity-error {
  color: rgb(185 28 28);
}

.dark .activity-error {
  color: rgb(252 165 165);
}

.activity-loading {
  align-items: center;
  gap: 0.45rem;
}

.activity-load-button {
  min-height: 2.35rem;
  border: 1px solid var(--seed-metric-border);
  border-radius: 0.45rem;
  background:
    linear-gradient(180deg, var(--seed-highlight), transparent 46%),
    var(--seed-metric-bg);
  padding: 0.55rem 0.95rem;
  color: var(--seed-author-text);
  font-size: 0.84rem;
  font-weight: 700;
  box-shadow:
    0 1px 0 rgb(255 255 255 / 0.34) inset,
    0 10px 24px var(--seed-shadow);
}

.activity-load-button:hover {
  border-color: var(--seed-border-strong);
  background:
    linear-gradient(180deg, var(--seed-highlight), transparent 42%),
    var(--seed-metric-bg-hover);
  color: var(--seed-accent-strong);
}

.dark .activity-load-button {
  background: rgb(15 23 42 / 0.66);
}

.load-sentinel {
  height: 1px;
}
</style>
