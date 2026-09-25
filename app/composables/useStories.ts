import { computed, shallowRef, watch } from 'vue';
import type { Story } from '#shared/types';
import type { FeedEndpoint } from './useFeedTheme';
import { readBrowserStorage, removeBrowserStorage, writeBrowserStorage } from '~/utils/browserStorage';

const FEED_CACHE_PREFIX = 'hn:stories:';
const FEED_CACHE_MAX_AGE = 30 * 60 * 1000;

type FeedCachePayload = {
  savedAt: number;
  stories: Story[];
};

const memoryCache = new Map<FeedEndpoint, Story[]>();
const pendingStoragePayloads = new Map<FeedEndpoint, FeedCachePayload>();
const scheduledStorageWrites = new Set<FeedEndpoint>();

type IdleCapableWindow = Window & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number },
  ) => number;
};

const getFeedCacheKey = (endpoint: FeedEndpoint) => `${FEED_CACHE_PREFIX}${endpoint}`;

const removeCachedStories = (endpoint: FeedEndpoint) => {
  removeBrowserStorage(getFeedCacheKey(endpoint), 'session');
};

const readCachedStories = (endpoint: FeedEndpoint): Story[] => {
  if (!import.meta.client) {
    return [];
  }

  const memoryStories = memoryCache.get(endpoint);
  if (memoryStories?.length) {
    return memoryStories;
  }

  const rawPayload = readBrowserStorage(getFeedCacheKey(endpoint), 'session');
  if (!rawPayload) {
    return [];
  }

  try {
    const payload = JSON.parse(rawPayload) as FeedCachePayload;
    if (
      !Array.isArray(payload.stories)
      || typeof payload.savedAt !== 'number'
      || Date.now() - payload.savedAt > FEED_CACHE_MAX_AGE
    ) {
      removeCachedStories(endpoint);
      return [];
    }

    memoryCache.set(endpoint, payload.stories);
    return payload.stories;
  } catch {
    removeCachedStories(endpoint);
    return [];
  }
};

const flushStoredStories = (endpoint: FeedEndpoint) => {
  scheduledStorageWrites.delete(endpoint);
  const payload = pendingStoragePayloads.get(endpoint);
  pendingStoragePayloads.delete(endpoint);

  if (!payload) {
    return;
  }

  writeBrowserStorage(getFeedCacheKey(endpoint), JSON.stringify(payload), 'session');
};

const scheduleStoredStories = (endpoint: FeedEndpoint, stories: Story[]) => {
  pendingStoragePayloads.set(endpoint, {
    savedAt: Date.now(),
    stories,
  });

  if (scheduledStorageWrites.has(endpoint)) {
    return;
  }

  scheduledStorageWrites.add(endpoint);
  const flush = () => flushStoredStories(endpoint);
  const idleWindow = window as IdleCapableWindow;

  if (typeof idleWindow.requestIdleCallback === 'function') {
    idleWindow.requestIdleCallback(flush, { timeout: 2000 });
    return;
  }

  window.setTimeout(flush, 0);
};

const rememberStories = (
  endpoint: FeedEndpoint,
  stories: Story[],
  persist = true,
) => {
  if (!import.meta.client || stories.length === 0) {
    return;
  }

  memoryCache.set(endpoint, stories);

  if (persist) {
    scheduleStoredStories(endpoint, stories);
  }
};

export const useStories = (endpoint: FeedEndpoint) => {
  const nuxtApp = useNuxtApp();
  const cachedStories = shallowRef<Story[]>(
    import.meta.client && !nuxtApp.isHydrating ? readCachedStories(endpoint) : [],
  );

  if (import.meta.client && nuxtApp.isHydrating) {
    onNuxtReady(() => {
      const currentStories = memoryCache.get(endpoint);

      if (currentStories?.length) {
        scheduleStoredStories(endpoint, currentStories);
      }
    });
  }

  const { data, error, pending } = useFetch<Story[]>(`/api/${endpoint}`, {
    key: `stories:${endpoint}`,
    lazy: true,
    default: () => cachedStories.value,
  });

  watch(
    data,
    (currentStories) => {
      if (currentStories?.length) {
        cachedStories.value = currentStories;
        rememberStories(endpoint, currentStories, !nuxtApp.isHydrating);
      }
    },
    { immediate: true },
  );

  const stories = computed(() => data.value ?? cachedStories.value);
  const hasStories = computed(() => stories.value.length > 0);
  const isLoading = computed(() => pending.value && !hasStories.value);
  const isRefreshing = computed(() => pending.value && hasStories.value);
  const fetchError = computed(() => (!hasStories.value ? error.value?.message || null : null));
  
  return {
    stories,
    isLoading,
    isRefreshing,
    error: fetchError,
  };
};
