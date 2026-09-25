<template>
  <NuxtLayout>
    <SiteErrorPage
      :status-code="error.statusCode"
      :status-message="error.statusMessage || error.message"
    />
  </NuxtLayout>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{ error: NuxtError }>()
</script>
