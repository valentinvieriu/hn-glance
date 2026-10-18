<template>
  <StoryGridLayout
    kicker="Search"
    :title="heading"
    :description="description"
    :theme-style="themeStyle"
    :stories="stories"
    :is-loading="isLoading"
    :error="errorMessage"
    skeleton-key="search"
    :story-note="storyNote"
  >
    <template #controls>
      <form
        class="search-form"
        role="search"
        :action="SEARCH_PATH"
        method="get"
        @submit.prevent="submitSearch"
      >
        <label for="search-page-input" class="sr-only">Search Hacker News stories</label>
        <div class="search-field">
          <LucideSearch class="search-field-icon" aria-hidden="true" />
          <input
            id="search-page-input"
            ref="inputRef"
            v-model="draft"
            type="search"
            name="q"
            class="search-field-input"
            placeholder="Search stories or paste a link"
            autocomplete="off"
            enterkeyhint="search"
            :maxlength="SEARCH_QUERY_MAX_LENGTH"
            data-search-input
            @keydown.esc="inputRef?.blur()"
          >
          <kbd class="search-field-kbd" aria-hidden="true" title="Press / to search">/</kbd>
          <button type="submit" class="search-field-submit">Search</button>
        </div>
        <!-- Without JavaScript the GET form still keeps the selected options. -->
        <input v-if="state.range !== DEFAULT_SEARCH_RANGE" type="hidden" name="range" :value="state.range">
        <input v-if="state.sort !== DEFAULT_SEARCH_SORT" type="hidden" name="sort" :value="state.sort">
      </form>

      <div v-if="activeFilters.length" class="search-filters" aria-label="Active search filters">
        <NuxtLink
          v-for="filter in activeFilters"
          :key="filter.source"
          :to="filter.to"
          class="search-filter meta-text"
          :aria-label="`Remove filter: ${filter.label} ${filter.value}`"
        >
          <span class="search-filter-kind">{{ filter.label }}</span>
          <span>{{ filter.kind === 'phrase' ? `“${filter.value}”` : filter.value }}</span>
          <LucideX class="h-3.5 w-3.5" aria-hidden="true" />
        </NuxtLink>
      </div>

      <div v-if="state.query" class="search-options">
        <div
          v-if="mode === 'text'"
          class="search-option-group"
          role="group"
          aria-labelledby="search-range-label"
        >
          <span id="search-range-label" class="search-option-label meta-text">Time range</span>
          <NuxtLink
            v-for="option in rangeOptions"
            :key="option.value"
            :to="getSearchPath({ ...state, range: option.value })"
            class="search-option meta-text"
            :aria-current="state.range === option.value ? 'true' : undefined"
          >
            {{ option.label }}
          </NuxtLink>
        </div>
        <div class="search-option-group" role="group" aria-labelledby="search-sort-label">
          <span id="search-sort-label" class="search-option-label meta-text">Order</span>
          <NuxtLink
            v-for="option in sortOptions"
            :key="option.value"
            :to="getSearchPath({ ...state, sort: option.value })"
            class="search-option meta-text"
            :aria-current="state.sort === option.value ? 'true' : undefined"
          >
            {{ option.label }}
          </NuxtLink>
        </div>
      </div>
      <p v-if="currentResponse?.partial" class="search-partial meta-text" role="status">
        Part of search is unavailable right now, so some results may be missing.
      </p>
    </template>

    <template #empty>
      <div class="search-empty reading-measure">
        <template v-if="state.query">
          <p class="mb-2 font-semibold">
            No link stories matched {{ mode === 'url' ? 'this link' : `“${state.query}”` }}{{ mode === 'text' ? ` ${rangePhrase}` : '' }}.
          </p>
          <p class="mb-0">
            <NuxtLink
              v-if="mode === 'text' && state.range !== 'all'"
              :to="getSearchPath({ ...state, range: 'all' })"
              class="search-empty-link"
            >
              Search all time
            </NuxtLink>
            <span v-else>Try fewer or different words.</span>
          </p>
        </template>
        <ul v-else class="search-tips">
          <li>Search link stories by title, source, or what their discussions mention.</li>
          <li>Paste a link to see its HN submissions and where the discussion is.</li>
          <li>
            Narrow with <code>"exact phrase"</code>, <code>-word</code>,
            <code>by:username</code>, or <code>show hn</code>.
          </li>
          <li>Press <kbd class="search-field-kbd">/</kbd> anywhere to search.</li>
        </ul>
      </div>
    </template>
  </StoryGridLayout>
</template>

<script setup lang="ts">
import { LucideSearch, LucideX } from '@lucide/vue'
import type { SearchStory, StorySearchResponse } from '#shared/types'
import {
  DEFAULT_SEARCH_RANGE,
  DEFAULT_SEARCH_SORT,
  getSearchMode,
  getSearchPath,
  getSearchRouteQuery,
  normalizeSearchQuery,
  parseSearchQuery,
  parseSearchRoute,
  removeSearchFilter,
  SEARCH_PATH,
  SEARCH_QUERY_MAX_LENGTH,
  type SearchFilterKind,
  type SearchRange,
  type SearchSort,
} from '#shared/utils/search'
import type { StoryCardNote } from '~/types/storyCard'
import { getUrlDomain } from '#shared/utils/url'
import { getSearchThemeStyle } from '~/composables/useFeedTheme'

const RANGE_LABELS: Record<SearchRange, { label: string, phrase: string }> = {
  week: { label: 'Week', phrase: 'from the past week' },
  month: { label: 'Month', phrase: 'from the past month' },
  year: { label: 'Year', phrase: 'from the past year' },
  all: { label: 'All time', phrase: 'from all time' },
}

const route = useRoute()
const inputRef = ref<HTMLInputElement | null>(null)
const state = computed(() => parseSearchRoute(route.query))
const mode = computed(() => getSearchMode(state.value.query))
const draft = ref(state.value.query)
const themeStyle = getSearchThemeStyle()

const rangeOptions = (Object.keys(RANGE_LABELS) as SearchRange[]).map(value => ({
  value,
  label: RANGE_LABELS[value].label,
}))
const sortOptions = computed<Array<{ value: SearchSort, label: string }>>(() => [
  { value: 'relevance', label: mode.value === 'url' ? 'Most discussed' : 'Relevance' },
  { value: 'newest', label: 'Newest' },
])

// A server render without a human session leaves the search to the browser,
// which can verify and retry.
const VERIFICATION_PENDING = 'verification-pending'
const humanFetch = useHumanFetch()
const { data, status } = useAsyncData(
  () => `search:${getSearchPath(state.value)}`,
  async () => {
    if (!state.value.query) return null

    try {
      return await humanFetch<StorySearchResponse>('/api/search', { query: getSearchRouteQuery(state.value) })
    } catch (error) {
      if (import.meta.server && isHumanVerificationError(error)) return VERIFICATION_PENDING
      throw error
    }
  },
  {
    lazy: true,
    getCachedData: (key, nuxtApp) => {
      const cached = nuxtApp.isHydrating ? nuxtApp.payload.data[key] : nuxtApp.static.data[key]
      return cached === VERIFICATION_PENDING ? undefined : cached
    },
  },
)

// Nuxt keeps the previous key's data while a new search loads, so only a
// response for the current query, range, and order may render.
const currentResponse = computed(() => {
  const response = data.value

  return response
    && response !== VERIFICATION_PENDING
    && response.query === state.value.query
    && response.range === state.value.range
    && response.sort === state.value.sort
    ? response
    : null
})
const stories = computed<SearchStory[]>(() => currentResponse.value?.stories ?? [])
const isLoading = computed(() => Boolean(state.value.query)
  && !currentResponse.value
  && status.value !== 'error')
const errorMessage = computed(() => state.value.query && status.value === 'error'
  ? 'Search is unavailable right now. Try again in a moment.'
  : null)
const rangePhrase = computed(() => RANGE_LABELS[state.value.range].phrase)

const heading = computed(() => {
  if (!state.value.query) return 'Search Hacker News'
  return mode.value === 'url' ? 'HN submissions of this link' : `“${state.value.query}”`
})

const description = computed(() => {
  if (!state.value.query) {
    return 'Find link stories by title, source, or discussion.'
  }

  if (mode.value === 'url') {
    return `${getUrlDomain(state.value.query, 'This source')} on HN, ${state.value.sort === 'newest' ? 'newest first' : 'largest discussion first'}.`
  }

  const count = currentResponse.value ? `${stories.value.length} ${stories.value.length === 1 ? 'story' : 'stories'} ` : 'Link stories '

  return `${count}${rangePhrase.value}, ${state.value.sort === 'newest' ? 'newest first' : 'most relevant first'}.`
})

const storyNote = (story: SearchStory): StoryCardNote | undefined => {
  if (story.match !== 'discussion') return undefined

  return {
    label: 'Mentioned in discussion',
    quote: story.comment?.snippet,
    to: story.comment ? `/item/${story.objectID}#comment-${story.comment.id}` : undefined,
  }
}

const FILTER_LABELS: Record<SearchFilterKind, string> = {
  phrase: 'Phrase',
  exclude: 'Without',
  author: 'By',
  show: 'Only',
}

const activeFilters = computed(() => mode.value === 'text'
  ? parseSearchQuery(state.value.query).filters.map(filter => ({
    ...filter,
    label: FILTER_LABELS[filter.kind],
    to: getSearchPath({ ...state.value, query: removeSearchFilter(state.value.query, filter) }),
  }))
  : [])

watch(() => state.value.query, (query) => {
  draft.value = query
})

const submitSearch = async () => {
  const query = normalizeSearchQuery(draft.value)

  if (!query) {
    inputRef.value?.focus()
    return
  }

  inputRef.value?.blur()
  await navigateTo(getSearchPath({ ...state.value, query }))
}

onMounted(() => {
  if (!state.value.query) {
    inputRef.value?.focus()
  }
})

usePageSeo({
  title: () => state.value.query ? `${state.value.query} — Search — HN Glance` : 'Search — HN Glance',
  description: 'Search Hacker News link stories with visual source previews.',
  path: SEARCH_PATH,
  robots: 'noindex, follow',
})
</script>

<style scoped>
.search-form {
  margin-top: 1.25rem;
}

.search-field {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-height: 3rem;
  border: 1px solid var(--feed-border);
  border-radius: 0.875rem;
  background: rgb(255 255 255 / 0.82);
  padding: 0.3rem 0.3rem 0.3rem 0.9rem;
  box-shadow: 0 10px 30px var(--feed-glow-a);
  transition: border-color 180ms ease, box-shadow 180ms ease;
}

.dark .search-field {
  background: rgb(15 23 42 / 0.72);
}

.search-field:focus-within {
  border-color: var(--feed-accent-strong);
  box-shadow:
    0 0 0 3px var(--feed-accent-soft),
    0 10px 30px var(--feed-glow-a);
}

.search-field-icon {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
  color: var(--feed-accent-strong);
}

.search-field-input {
  min-width: 0;
  flex: 1 1 auto;
  border: 0;
  background: transparent;
  font-family: var(--font-ui);
  font-size: 1rem;
  color: inherit;
  outline: none;
}

.search-field-input::placeholder {
  color: rgb(100 116 139);
}

.search-field-input::-webkit-search-cancel-button {
  cursor: pointer;
}

.search-field-kbd {
  display: inline-grid;
  min-width: 1.4rem;
  place-items: center;
  border: 1px solid var(--feed-border);
  border-radius: 0.375rem;
  padding: 0.05rem 0.35rem;
  font-family: var(--font-ui);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.3;
  color: rgb(100 116 139);
}

.search-field .search-field-kbd {
  display: none;
}

.search-field-submit {
  flex-shrink: 0;
  border-radius: 0.625rem;
  background: var(--feed-accent-strong);
  padding: 0.5rem 0.95rem;
  font-family: var(--font-ui);
  font-size: 0.875rem;
  font-weight: 650;
  color: white;
  transition: opacity 180ms ease;
}

.dark .search-field-submit {
  color: rgb(15 23 42);
}

.search-field-submit:hover {
  opacity: 0.9;
}

.search-field-submit:focus-visible {
  outline: 2px solid var(--feed-accent-strong);
  outline-offset: 2px;
}

.search-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.5rem;
  margin-top: 0.875rem;
}

.search-option-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
}

.search-option-label {
  margin-right: 0.25rem;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--feed-accent-strong);
}

.search-option {
  border: 1px solid var(--feed-border);
  border-radius: 999px;
  background: rgb(255 255 255 / 0.6);
  padding: 0.25rem 0.7rem;
  font-weight: 600;
  color: rgb(51 65 85);
  transition: background-color 180ms ease, border-color 180ms ease, color 180ms ease;
}

.dark .search-option {
  background: rgb(15 23 42 / 0.5);
  color: rgb(203 213 225);
}

.search-option:hover {
  border-color: var(--feed-accent-strong);
  color: var(--feed-accent-strong);
}

.search-option[aria-current='true'],
.dark .search-option[aria-current='true'] {
  border-color: var(--feed-accent-strong);
  background: var(--feed-accent-strong);
  color: white;
}

.dark .search-option[aria-current='true'] {
  color: rgb(15 23 42);
}

.search-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.75rem;
}

.search-filter {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--feed-accent-strong);
  border-radius: 999px;
  background: var(--feed-accent-soft);
  padding: 0.2rem 0.55rem 0.2rem 0.7rem;
  font-weight: 600;
  color: var(--feed-accent-strong);
}

.search-filter:hover,
.search-filter:focus-visible {
  background: var(--feed-accent-strong);
  color: white;
}

.dark .search-filter:hover,
.dark .search-filter:focus-visible {
  color: rgb(15 23 42);
}

.search-filter-kind {
  font-weight: 500;
  opacity: 0.8;
}

.search-tips code {
  border-radius: 0.3rem;
  background: var(--feed-accent-soft);
  padding: 0.05rem 0.3rem;
  font-size: 0.85em;
}

.search-partial {
  margin: 0.75rem 0 0;
  color: rgb(146 64 14);
}

.dark .search-partial {
  color: rgb(253 230 138);
}

.search-empty {
  /* Keeps the themed surface below a short idle or empty state. */
  min-height: 45vh;
  margin-top: 1rem;
  color: rgb(51 65 85);
}

.dark .search-empty {
  color: rgb(203 213 225);
}

.search-empty-link {
  font-weight: 650;
  color: var(--feed-accent-strong);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.search-tips {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding-left: 1.1rem;
  list-style: disc;
}

@media (min-width: 768px) {
  .search-field .search-field-kbd {
    display: inline-grid;
  }
}
</style>
