<template>
  <section
    v-if="submissions.length > 0"
    aria-labelledby="submission-history-title"
    class="submission-history mt-10"
    data-testid="submission-history"
  >
    <div class="submission-history-header">
      <h2
        id="submission-history-title"
        class="section-title mb-0 text-xl font-semibold text-gray-900 dark:text-gray-100"
      >
        HN History
      </h2>
      <span class="submission-history-count meta-text">
        {{ submissions.length }}
        {{ submissions.length === 1 ? 'submission' : 'submissions' }}
      </span>
    </div>
    <ul class="submission-history-list">
      <li v-for="submission in submissions" :key="submission.objectID">
        <NuxtLink
          :to="`/item/${submission.objectID}`"
          class="submission-history-row"
          :class="{ 'is-current': submission.objectID === currentStoryId }"
          :aria-current="submission.objectID === currentStoryId ? 'page' : undefined"
        >
          <h3 class="submission-history-entry-title">{{ submission.title }}</h3>
          <div class="submission-history-meta meta-text">
            <span
              v-if="submission.objectID === currentStoryId"
              class="submission-history-current"
            >
              <LucideHistory class="h-3.5 w-3.5" aria-hidden="true" />
              This submission
            </span>
            <time
              v-else
              :datetime="submission.created_at"
              :title="formatCalendarDate(submission.created_at)"
              class="submission-history-metric submission-history-age"
            >
              <LucideHistory class="h-3.5 w-3.5" aria-hidden="true" />
              {{ formatCompactTimeRelativeTo(submission.created_at, currentCreatedAt) }}
            </time>
            <span class="submission-history-author">by {{ submission.author }}</span>
            <span class="submission-history-metric">
              <LucideTrendingUp class="h-3.5 w-3.5" aria-hidden="true" />
              {{ submission.points }}
            </span>
            <span class="submission-history-metric">
              <LucideMessageSquare class="h-3.5 w-3.5" aria-hidden="true" />
              {{ submission.num_comments }}
            </span>
          </div>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { LucideHistory, LucideMessageSquare, LucideTrendingUp } from '@lucide/vue'
import type { SubmissionHistoryEntry } from '#shared/types'
import { formatCalendarDate, formatCompactTimeRelativeTo } from '#shared/utils/date'

defineProps<{
  currentCreatedAt: string
  currentStoryId: string
  submissions: SubmissionHistoryEntry[]
}>()
</script>

<style scoped>
.submission-history {
  min-width: 0;
}

.submission-history-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.submission-history-count {
  flex: 0 0 auto;
  color: rgb(100 116 139);
}

.submission-history-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.submission-history-row {
  position: relative;
  display: block;
  overflow: hidden;
  padding: 0.8rem 0.9rem 0.8rem 1rem;
  border: 1px solid rgb(148 163 184 / 0.28);
  border-radius: 0.5rem;
  background: rgb(248 250 252 / 0.78);
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    transform 160ms ease;
}

.submission-history-row::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 0.2rem;
  content: "";
  background: rgb(249 115 22 / 0.82);
}

.submission-history-row:hover,
.submission-history-row:focus-visible {
  border-color: rgb(249 115 22 / 0.48);
  background: rgb(255 247 237 / 0.72);
  transform: translateY(-1px);
}

.submission-history-row:focus-visible {
  outline: 2px solid rgb(249 115 22 / 0.72);
  outline-offset: 2px;
}

.submission-history-row.is-current {
  border-color: rgb(249 115 22 / 0.52);
  background: rgb(255 247 237 / 0.82);
}

.submission-history-row.is-current:hover,
.submission-history-row.is-current:focus-visible {
  transform: none;
}

.submission-history-entry-title {
  margin-bottom: 0.5rem;
  color: rgb(30 41 59);
  font-family: var(--font-display);
  font-size: 0.94rem;
  font-weight: 650;
  line-height: 1.35;
}

.submission-history-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.38rem 0.68rem;
  color: rgb(100 116 139);
}

.submission-history-metric,
.submission-history-current {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.submission-history-age,
.submission-history-current {
  color: rgb(194 65 12);
  font-weight: 700;
}

.submission-history-current {
  padding: 0.12rem 0.42rem;
  border-radius: 9999px;
  background: rgb(249 115 22 / 0.1);
}

.submission-history-author {
  min-width: 0;
  overflow: hidden;
  color: rgb(71 85 105);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark .submission-history-count {
  color: rgb(148 163 184);
}

.dark .submission-history-row {
  border-color: rgb(148 163 184 / 0.2);
  background: rgb(30 41 59 / 0.54);
}

.dark .submission-history-row:hover,
.dark .submission-history-row:focus-visible,
.dark .submission-history-row.is-current {
  border-color: rgb(251 146 60 / 0.5);
  background: rgb(67 42 28 / 0.46);
}

.dark .submission-history-entry-title {
  color: rgb(241 245 249);
}

.dark .submission-history-meta,
.dark .submission-history-author {
  color: rgb(203 213 225 / 0.78);
}

.dark .submission-history-age,
.dark .submission-history-current {
  color: rgb(251 146 60);
}

.dark .submission-history-current {
  background: rgb(249 115 22 / 0.14);
}

@media (max-width: 480px) {
  .submission-history-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.25rem;
  }
}
</style>
