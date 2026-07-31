<template>
  <section
    v-if="submissions.length > 0"
    aria-labelledby="submission-history-title"
    class="submission-history mt-10"
    data-testid="submission-history"
  >
    <div class="submission-history-header">
      <div class="submission-history-heading">
        <span class="submission-history-heading-icon" aria-hidden="true">
          <LucideHistory class="h-4 w-4" />
        </span>
        <h2
          id="submission-history-title"
          class="section-title mb-0 text-xl font-semibold text-gray-900 dark:text-gray-100"
        >
          HN History
        </h2>
      </div>
      <span
        class="submission-history-count"
        :aria-label="`${submissions.length} ${submissions.length === 1 ? 'submission' : 'submissions'}`"
      >
        {{ submissions.length }}
      </span>
    </div>
    <ol class="submission-history-list">
      <li
        v-for="submission in submissions"
        :key="submission.objectID"
        class="submission-history-item"
        :class="{ 'is-current': submission.objectID === currentStoryId }"
      >
        <NuxtLink
          :to="`/item/${submission.objectID}`"
          class="submission-history-row"
          :class="{ 'is-current': submission.objectID === currentStoryId }"
          :aria-current="submission.objectID === currentStoryId ? 'page' : undefined"
        >
          <div class="submission-history-lead meta-text">
            <span
              v-if="submission.objectID === currentStoryId"
              class="submission-history-current"
            >
              This submission
            </span>
            <time
              v-else
              :datetime="submission.created_at"
              :title="formatCalendarDate(submission.created_at)"
              class="submission-history-age"
            >
              {{ formatCompactTimeRelativeTo(submission.created_at, currentCreatedAt) }}
            </time>
            <span class="submission-history-author">by {{ submission.author }}</span>
          </div>
          <div class="submission-history-stats meta-text">
            <span>{{ submission.points }} {{ submission.points === 1 ? 'point' : 'points' }}</span>
            <span aria-hidden="true">/</span>
            <span>
              {{ submission.num_comments }}
              {{ submission.num_comments === 1 ? 'comment' : 'comments' }}
            </span>
          </div>
          <h3 class="submission-history-entry-title">{{ submission.title }}</h3>
        </NuxtLink>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import { LucideHistory } from '@lucide/vue'
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
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.65rem;
}

.submission-history-heading {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.55rem;
}

.submission-history-heading-icon {
  display: inline-flex;
  width: 1.75rem;
  height: 1.75rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  background: rgb(249 115 22 / 0.1);
  color: rgb(194 65 12);
}

.submission-history-count {
  display: inline-flex;
  min-width: 1.9rem;
  height: 1.9rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 0.55rem;
  background: rgb(148 163 184 / 0.12);
  color: rgb(100 116 139);
  font-size: 0.78rem;
  font-weight: 750;
}

.submission-history-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.submission-history-item {
  position: relative;
  padding-left: 2rem;
}

.submission-history-item::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0.5rem;
  width: 1px;
  content: "";
  background: rgb(249 115 22 / 0.34);
}

.submission-history-item:first-child::before {
  top: 1.28rem;
}

.submission-history-item:last-child::before {
  bottom: calc(100% - 1.28rem);
}

.submission-history-item::after {
  position: absolute;
  top: 0.82rem;
  left: 0;
  width: 1.05rem;
  height: 1.05rem;
  border: 2px solid rgb(251 146 60);
  border-radius: 999px;
  content: "";
  background: white;
  box-shadow: 0 0 0 3px white;
}

.submission-history-item.is-current::after {
  border-color: rgb(5 150 105);
  background: rgb(5 150 105);
}

.submission-history-row {
  display: block;
  padding: 0.7rem 0.7rem 0.9rem;
  border-radius: 0.65rem;
  transition:
    background-color 160ms ease,
    transform 160ms ease;
}

.submission-history-row:hover,
.submission-history-row:focus-visible {
  background: rgb(255 247 237 / 0.78);
  transform: translateX(2px);
}

.submission-history-row:focus-visible {
  outline: 2px solid rgb(249 115 22 / 0.72);
  outline-offset: 2px;
}

.submission-history-row.is-current {
  background: rgb(5 150 105 / 0.06);
}

.submission-history-row.is-current:hover,
.submission-history-row.is-current:focus-visible {
  transform: none;
}

.submission-history-entry-title {
  margin-top: 0.3rem;
  color: rgb(30 41 59);
  font-family: var(--font-display);
  font-size: 0.96rem;
  font-weight: 650;
  line-height: 1.35;
}

.submission-history-lead {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.32rem 0.55rem;
  color: rgb(100 116 139);
}

.submission-history-age,
.submission-history-current {
  color: rgb(194 65 12);
  font-weight: 700;
}

.submission-history-current {
  color: rgb(4 120 87);
}

.submission-history-author {
  min-width: 0;
  overflow: hidden;
  color: rgb(71 85 105);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.submission-history-stats {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin-top: 0.22rem;
  color: rgb(100 116 139);
  font-weight: 600;
}

.dark .submission-history-count {
  color: rgb(148 163 184);
}

.dark .submission-history-heading-icon {
  background: rgb(249 115 22 / 0.14);
  color: rgb(251 146 60);
}

.dark .submission-history-item::before {
  background: rgb(251 146 60 / 0.36);
}

.dark .submission-history-item::after {
  border-color: rgb(251 146 60);
  background: rgb(17 24 39);
  box-shadow: 0 0 0 3px rgb(17 24 39);
}

.dark .submission-history-item.is-current::after {
  border-color: rgb(52 211 153);
  background: rgb(52 211 153);
}

.dark .submission-history-row:hover,
.dark .submission-history-row:focus-visible {
  background: rgb(67 42 28 / 0.46);
}

.dark .submission-history-row.is-current {
  background: rgb(16 185 129 / 0.08);
}

.dark .submission-history-entry-title {
  color: rgb(241 245 249);
}

.dark .submission-history-lead,
.dark .submission-history-stats,
.dark .submission-history-author {
  color: rgb(203 213 225 / 0.78);
}

.dark .submission-history-age,
.dark .submission-history-current {
  color: rgb(251 146 60);
}

.dark .submission-history-current {
  color: rgb(52 211 153);
}

@media (max-width: 480px) {
  .submission-history-item {
    padding-left: 1.7rem;
  }

  .submission-history-row {
    padding-right: 0.25rem;
  }
}
</style>
