<template>
  <div class="min-h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
    <NuxtLoadingIndicator />
    <div class="flex min-h-screen flex-col">
      <Header />
      <main class="flex-grow">
        <SiteErrorPage
          :status-code="statusCode"
          :status-message="error.statusMessage || error.message"
        />
      </main>
      <Footer />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  error: {
    message?: string
    statusCode?: number
    statusMessage?: string
  }
}>()

const statusCode = computed(() => props.error.statusCode ?? 500)

useSeoMeta({
  title: () => statusCode.value === 404
    ? 'Page not found — HN Glance'
    : 'Page unavailable — HN Glance',
  description: 'Return to the current Hacker News feeds on HN Glance.',
  robots: 'noindex, nofollow',
})
</script>
