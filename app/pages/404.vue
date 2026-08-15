<template>
  <SiteErrorPage status-message="Page not found" />
</template>

<script setup lang="ts">
if (import.meta.server) {
  const requestEvent = useRequestEvent()

  if (requestEvent) {
    setResponseStatus(requestEvent, 404, 'Page not found')
  }
}

useSeoMeta({
  title: 'Page not found — HN Glance',
  description: 'Return to the current Hacker News feeds on HN Glance.',
  robots: 'noindex, nofollow',
})
</script>
