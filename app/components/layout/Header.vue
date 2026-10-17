<template>
  <nav
    class="site-header feed-theme-surface sticky top-0 z-50 border-b"
    :style="headerThemeStyle"
  >
    <div class="layout-frame flex h-14 items-center justify-between gap-3 sm:h-16 sm:gap-5">
      <NuxtLink to="/top" class="flex shrink-0 items-center space-x-2" aria-label="HN Glance home">
        <h1 class="mb-0 text-[1.3rem] font-display font-semibold leading-none sm:text-2xl">
          <span class="text-slate-900 dark:text-slate-100">HN</span>
          <span class="text-orange-500">Glance</span>
        </h1>
      </NuxtLink>
      <div class="flex min-w-0 flex-1 items-center justify-end">
        <div
          ref="feedNavRef"
          class="feed-nav-scroll flex w-full min-w-0 items-center justify-end gap-3 overflow-x-auto sm:w-auto sm:gap-6"
          aria-label="Story feeds"
        >
          <NuxtLink
            v-for="link in feedThemeList"
            :key="link.key"
            :to="link.path"
            class="feed-nav-link feed-theme-surface inline-flex shrink-0 items-center py-1 font-medium transition-colors duration-200"
            :class="{ 'feed-nav-link-active': currentFeed === link.key }"
            :style="getFeedThemeStyle(link.key)"
            :aria-current="currentFeed === link.key ? 'page' : undefined"
          >
            <span>{{ link.label }}</span>
          </NuxtLink>
        </div>
      </div>
      <form
        v-if="!isSearchPage"
        class="header-search hidden md:flex"
        role="search"
        :action="SEARCH_PATH"
        method="get"
        @submit.prevent="submitSearch"
      >
        <label for="header-search-input" class="sr-only">Search Hacker News stories</label>
        <LucideSearch class="header-search-icon" aria-hidden="true" />
        <input
          id="header-search-input"
          ref="searchInputRef"
          v-model="searchDraft"
          type="search"
          name="q"
          class="header-search-input"
          placeholder="Search"
          autocomplete="off"
          enterkeyhint="search"
          :maxlength="SEARCH_QUERY_MAX_LENGTH"
          data-search-input
          @keydown.esc="searchInputRef?.blur()"
        >
        <kbd class="header-search-kbd" aria-hidden="true">/</kbd>
      </form>
      <NuxtLink
        :to="SEARCH_PATH"
        class="header-icon-button shrink-0"
        :class="isSearchPage ? 'header-icon-button-active' : 'header-search-compact'"
        aria-label="Search"
        title="Search (/)"
        :aria-current="isSearchPage ? 'page' : undefined"
      >
        <LucideSearch class="header-icon" aria-hidden="true" />
      </NuxtLink>
      <button
        type="button"
        class="header-icon-button ml-1 shrink-0 sm:ml-2"
        aria-label="Toggle color theme"
        title="Toggle color theme"
        @click="toggleColorMode"
      >
        <LucideSun class="header-icon theme-toggle-icon-sun" aria-hidden="true" />
        <LucideMoon class="header-icon theme-toggle-icon-moon" aria-hidden="true" />
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { LucideMoon, LucideSearch, LucideSun } from '@lucide/vue'
import { isHnFeed } from '#shared/utils/hn';
import { getSearchPath, normalizeSearchQuery, SEARCH_PATH, SEARCH_QUERY_MAX_LENGTH } from '#shared/utils/search';
import { feedThemeList, getFeedThemeStyle, getSearchThemeStyle } from '~/composables/useFeedTheme';
import { handleSearchShortcut } from '~/utils/searchShortcut';

const colorMode = useColorMode();
const route = useRoute();
const feedNavRef = ref<HTMLElement | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);
const searchDraft = ref('');
const isSearchPage = computed(() => route.path === SEARCH_PATH);

const currentFeed = computed(() => {
  if (route.path === '/') {
    return 'top';
  }

  const feedCandidate = route.path.split('/')[1];
  return isHnFeed(feedCandidate) ? feedCandidate : null;
});

const headerThemeStyle = computed(() => {
  if (currentFeed.value) return getFeedThemeStyle(currentFeed.value);
  return isSearchPage.value ? getSearchThemeStyle() : undefined;
});

const submitSearch = async () => {
  const query = normalizeSearchQuery(searchDraft.value);

  if (!query) return;

  searchInputRef.value?.blur();
  searchDraft.value = '';
  await navigateTo(getSearchPath({ query }));
};

onMounted(() => document.addEventListener('keydown', handleSearchShortcut));
onBeforeUnmount(() => document.removeEventListener('keydown', handleSearchShortcut));

const toggleColorMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark';
};

watch(
  currentFeed,
  () => {
    nextTick(() => {
      const activeLink = feedNavRef.value?.querySelector<HTMLElement>('[aria-current="page"]');
      activeLink?.scrollIntoView({ block: 'nearest', inline: 'center' });
    });
  },
  { immediate: true },
);
</script>

<style scoped>
.site-header {
  border-color: var(--feed-border, rgb(226 232 240 / 1));
  background:
    radial-gradient(circle at 18% -70%, var(--feed-glow-a, transparent) 0, transparent 19rem),
    radial-gradient(circle at 78% -90%, var(--feed-glow-b, transparent) 0, transparent 21rem),
    rgb(255 255 255 / 0.9);
}

.dark .site-header {
  border-color: var(--feed-border, rgb(30 41 59 / 1));
  background:
    radial-gradient(circle at 18% -70%, var(--feed-glow-a, transparent) 0, transparent 19rem),
    radial-gradient(circle at 78% -90%, var(--feed-glow-b, transparent) 0, transparent 21rem),
    rgb(15 23 42 / 0.9);
}

.feed-nav-scroll {
  scrollbar-width: none;
  max-width: 100%;
}

.feed-nav-scroll::-webkit-scrollbar {
  display: none;
}

.feed-nav-link {
  font-family: var(--font-ui);
  font-size: 0.8125rem;
  line-height: 1.2;
  color: rgb(71 85 105);
}

.dark .feed-nav-link {
  color: rgb(203 213 225);
}

.feed-nav-link:hover {
  color: var(--feed-accent-strong);
}

.feed-nav-link-active,
.dark .feed-nav-link-active {
  font-weight: 700;
  color: var(--feed-accent-strong);
}

.feed-nav-link-active:hover,
.dark .feed-nav-link-active:hover {
  color: var(--feed-accent-strong);
}

.header-search {
  position: relative;
  flex-shrink: 0;
  align-items: center;
  margin-left: 0.25rem;
}

.header-search-icon {
  position: absolute;
  left: 0.65rem;
  width: 0.95rem;
  height: 0.95rem;
  color: rgb(100 116 139);
  pointer-events: none;
}

.header-search-input {
  width: 10rem;
  min-height: 2rem;
  border: 1px solid rgb(226 232 240 / 0.8);
  border-radius: 999px;
  background: rgb(255 255 255 / 0.5);
  padding: 0.25rem 2rem 0.25rem 2rem;
  font-family: var(--font-ui);
  font-size: 0.875rem;
  color: rgb(15 23 42);
  outline: none;
  transition:
    width 180ms ease,
    background-color 180ms ease,
    border-color 180ms ease;
}

.header-search-input::placeholder {
  color: rgb(100 116 139);
}

.header-search-input:focus {
  width: 15rem;
  border-color: var(--feed-accent-strong, rgb(100 116 139));
  background: rgb(255 255 255 / 0.9);
}

.dark .header-search-input {
  border-color: rgb(71 85 105 / 0.6);
  background: rgb(15 23 42 / 0.4);
  color: rgb(248 250 252);
}

.dark .header-search-input:focus {
  border-color: var(--feed-accent-strong, rgb(148 163 184));
  background: rgb(15 23 42 / 0.8);
}

.header-search-kbd {
  position: absolute;
  right: 0.55rem;
  border: 1px solid rgb(203 213 225 / 0.9);
  border-radius: 0.3rem;
  padding: 0 0.3rem;
  font-family: var(--font-ui);
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1.35;
  color: rgb(100 116 139);
  pointer-events: none;
}

.dark .header-search-kbd {
  border-color: rgb(71 85 105 / 0.8);
  color: rgb(148 163 184);
}

.header-search-input:focus + .header-search-kbd {
  display: none;
}

.header-search-input::-webkit-search-cancel-button {
  display: none;
}

.header-icon-button {
  display: inline-grid;
  min-height: 1.875rem;
  min-width: 1.875rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(226 232 240 / 0.56);
  border-radius: 999px;
  background: rgb(255 255 255 / 0.22);
  color: rgb(71 85 105 / 0.76);
  opacity: 0.72;
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    color 180ms ease,
    opacity 180ms ease;
}

.header-icon {
  width: 1rem;
  height: 1rem;
  grid-area: 1 / 1;
}

.theme-toggle-icon-sun {
  display: none;
}

.dark .theme-toggle-icon-sun {
  display: block;
}

.dark .theme-toggle-icon-moon {
  display: none;
}

.header-icon-button:hover,
.header-icon-button:focus-visible {
  border-color: rgb(203 213 225 / 0.76);
  background: rgb(255 255 255 / 0.46);
  color: rgb(15 23 42);
  opacity: 0.96;
}

.header-icon-button:focus-visible {
  outline: 2px solid rgb(100 116 139);
  outline-offset: 2px;
}

.dark .header-icon-button {
  border-color: rgb(71 85 105 / 0.5);
  background: rgb(15 23 42 / 0.22);
  color: rgb(203 213 225 / 0.74);
}

.dark .header-icon-button:hover,
.dark .header-icon-button:focus-visible {
  border-color: rgb(100 116 139 / 0.72);
  background: rgb(15 23 42 / 0.42);
  color: rgb(248 250 252);
}

.header-icon-button-active,
.dark .header-icon-button-active {
  border-color: var(--feed-border);
  color: var(--feed-accent-strong);
  opacity: 1;
}

/* The inline field replaces the icon link where it fits. */
@media (min-width: 768px) {
  .header-search-compact {
    display: none;
  }
}

@media (min-width: 640px) {
  .feed-nav-link {
    font-size: 0.875rem;
  }

  .header-icon-button {
    min-height: 2rem;
    min-width: 2rem;
  }
}
</style>
