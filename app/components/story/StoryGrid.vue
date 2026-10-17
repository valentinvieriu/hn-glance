<template>
  <StoryGridLayout
    :kicker="feedTheme.label"
    :title="feedTheme.title"
    :description="feedTheme.description"
    :theme-style="feedThemeStyle"
    :stories="stories"
    :is-loading="isLoading"
    :is-refreshing="isRefreshing"
    :error="error"
    :skeleton-key="endpoint"
  />
</template>

<script setup lang="ts">
import { useStories } from '~/composables/useStories';
import { getFeedTheme, getFeedThemeStyle } from '~/composables/useFeedTheme';
import type { FeedEndpoint } from '~/composables/useFeedTheme';
import { getScreenshotPath } from '#shared/utils/screenshot';
import { createFeedStructuredData } from '#shared/utils/structuredData';

const props = defineProps<{ endpoint: FeedEndpoint }>();
const { stories, isLoading, isRefreshing, error } = useStories(props.endpoint);
const priorityScreenshotHref = computed(() => {
  const firstStory = stories.value[0];
  return firstStory ? getScreenshotPath(firstStory.objectID) : null;
});
const feedTheme = computed(() => getFeedTheme(props.endpoint));
const feedThemeStyle = computed(() => getFeedThemeStyle(props.endpoint));

useHead(() => ({
  link: priorityScreenshotHref.value
    ? [{
        key: `feed-screenshot-${props.endpoint}`,
        rel: 'preload',
        as: 'image',
        href: priorityScreenshotHref.value,
        fetchpriority: 'high',
      }]
    : [],
}));

useStructuredData('feed-item-list', () => stories.value.length
  ? createFeedStructuredData(feedTheme.value.title, feedTheme.value.path, stories.value)
  : null);

usePageSeo({
  title: () => `${feedTheme.value.title} — HN Glance`,
  description: () => feedTheme.value.description,
  path: () => feedTheme.value.path,
});
</script>
