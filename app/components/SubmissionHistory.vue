<template>
  <section
    v-if="submissions.length > 1"
    aria-labelledby="submission-history-title"
    class="submission-history mt-10"
    data-testid="submission-history"
  >
    <div class="story-context-section-header">
      <div class="story-context-section-heading">
        <span class="story-context-section-icon" aria-hidden="true">
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
        class="story-context-section-count"
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
        <div
          class="submission-history-row story-context-interactive-row"
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
            <span class="submission-history-author">
              by
              <NuxtLink
                :to="getHnUserPath(submission.author)"
                class="submission-history-author-link story-context-secondary-link"
              >
                {{ submission.author }}
              </NuxtLink>
            </span>
          </div>
          <div class="submission-history-stats meta-text">
            <span>{{ submission.points }} {{ submission.points === 1 ? 'point' : 'points' }}</span>
            <span aria-hidden="true">/</span>
            <span>
              {{ submission.num_comments }}
              {{ submission.num_comments === 1 ? 'comment' : 'comments' }}
            </span>
          </div>
          <h3 class="submission-history-entry-title">
            <span v-if="submission.objectID === currentStoryId">{{ submission.title }}</span>
            <NuxtLink
              v-else
              :to="`/item/${submission.objectID}`"
              class="submission-history-entry-link story-context-primary-link"
            >
              {{ submission.title }}
            </NuxtLink>
          </h3>
        </div>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import { LucideHistory } from '@lucide/vue'
import type { SubmissionHistoryEntry } from '#shared/types'
import { formatCalendarDate, formatCompactTimeRelativeTo } from '#shared/utils/date'
import { getHnUserPath } from '#shared/utils/hn'

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
  background: var(--story-context-border);
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
  border: 2px solid var(--story-context-accent);
  border-radius: 999px;
  content: "";
  background: white;
  box-shadow: 0 0 0 3px white;
}

.submission-history-item.is-current::after {
  border-color: var(--story-context-accent);
  background: var(--story-context-accent);
}

.submission-history-row {
  display: block;
  padding: 0.7rem 0.7rem 0.9rem;
  border-radius: 0.65rem;
  border: 1px solid transparent;
}

.submission-history-row.is-current {
  border-color: var(--story-context-border);
  background: var(--story-context-accent-soft);
}

.submission-history-entry-title {
  margin-top: 0.3rem;
  color: rgb(30 41 59);
  font-family: var(--font-ui);
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
  color: var(--story-context-accent-strong);
  font-weight: 700;
}

.submission-history-entry-link:hover,
.submission-history-entry-link:focus-visible {
  color: var(--story-context-accent-strong);
  text-decoration: underline;
  text-decoration-color: var(--story-context-accent);
  text-underline-offset: 0.18em;
}

.submission-history-author {
  min-width: 0;
  overflow: hidden;
  color: rgb(71 85 105);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.submission-history-author-link {
  color: inherit;
  font-weight: 650;
}

.submission-history-author-link:hover,
.submission-history-author-link:focus-visible {
  color: var(--story-context-accent-strong);
  text-decoration: underline;
  text-underline-offset: 0.18em;
}

.submission-history-author-link:focus-visible {
  border-radius: 0.15rem;
  outline: 2px solid var(--story-context-focus);
  outline-offset: 2px;
}

.submission-history-stats {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin-top: 0.22rem;
  color: rgb(100 116 139);
  font-weight: 600;
}

.dark .submission-history-item::before {
  background: var(--story-context-border);
}

.dark .submission-history-item::after {
  border-color: var(--story-context-accent);
  background: rgb(17 24 39);
  box-shadow: 0 0 0 3px rgb(17 24 39);
}

.dark .submission-history-item.is-current::after {
  border-color: var(--story-context-accent);
  background: var(--story-context-accent);
}

.dark .submission-history-row.is-current {
  background: var(--story-context-accent-soft);
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
  color: var(--story-context-accent-strong);
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
