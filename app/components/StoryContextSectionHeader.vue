<template>
  <div class="story-context-section-header">
    <div class="story-context-section-heading">
      <span class="story-context-section-icon" aria-hidden="true">
        <slot name="icon"></slot>
      </span>
      <h2
        :id="id"
        class="section-title mb-0 text-xl font-semibold text-gray-900 dark:text-gray-100"
      >
        {{ title }}
      </h2>
    </div>
    <span
      v-if="count > 0"
      class="story-context-section-count"
      :aria-label="countLabel"
    >
      {{ count }}
    </span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  count: number
  countLabel: string
  id: string
  title: string
}>()
</script>
