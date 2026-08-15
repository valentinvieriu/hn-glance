<template>
  <div class="min-h-screen font-sans bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 safe-area-container">
    <NuxtLoadingIndicator />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import {
  OPEN_GRAPH_LOCALE,
  SITE_NAME,
  SITE_SOCIAL_IMAGE_ALT,
  SITE_SOCIAL_IMAGE_HEIGHT,
  SITE_SOCIAL_IMAGE_TYPE,
  SITE_SOCIAL_IMAGE_URL,
  SITE_SOCIAL_IMAGE_WIDTH,
} from '#shared/utils/siteMetadata'
import { createWebsiteStructuredData } from '#shared/utils/structuredData'

useSeoMeta({
  ogType: 'website',
  ogSiteName: SITE_NAME,
  ogLocale: OPEN_GRAPH_LOCALE,
  ogImage: SITE_SOCIAL_IMAGE_URL,
  ogImageType: SITE_SOCIAL_IMAGE_TYPE,
  ogImageWidth: SITE_SOCIAL_IMAGE_WIDTH,
  ogImageHeight: SITE_SOCIAL_IMAGE_HEIGHT,
  ogImageAlt: SITE_SOCIAL_IMAGE_ALT,
  twitterCard: 'summary_large_image',
  twitterImage: SITE_SOCIAL_IMAGE_URL,
  twitterImageAlt: SITE_SOCIAL_IMAGE_ALT,
})

useStructuredData('website', createWebsiteStructuredData())
</script>

<style>
.safe-area-container {
  /* Handle bottom safe area */
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
