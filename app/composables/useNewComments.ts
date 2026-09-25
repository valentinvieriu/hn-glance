import type { MaybeRefOrGetter, Ref } from 'vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toValue, watch } from 'vue'
import type { Comment } from '#shared/types'
import type { CommentNavigationNode } from '#shared/utils/comments'
import {
  countMatchingDescendants,
  getCommentIdsInTreeOrder,
} from '#shared/utils/discussionVisits'
import { useDiscussionVisits } from '~/composables/useDiscussionVisits'

const ENGAGEMENT_VISIBLE_RATIO = 0.6
const ENGAGEMENT_DWELL_MS = 1_200

/**
 * New-comment markers for one story page visit. The set of comments added
 * since the previous visit is frozen when the visit begins. Reading the
 * discussion toolbar for a moment, entering discussion focus, or navigating
 * between new comments acknowledges the current IDs for the next visit while
 * the markers stay; only `markAllNewCommentsSeen` clears them immediately.
 */
export const useNewComments = ({
  engagementTarget,
  storyId,
  comments,
  sortedComments,
  navigationNodes,
  isLoading,
  isDiscussionFocus,
  focusedCommentId,
  jumpTargetCommentId,
  selectFocusedComment,
  jumpToComment,
}: {
  /** The discussion toolbar; keeping it in view for a moment counts as reading. */
  engagementTarget: Readonly<Ref<HTMLElement | null>>
  storyId: MaybeRefOrGetter<string | null>
  comments: MaybeRefOrGetter<Comment[] | undefined>
  sortedComments: MaybeRefOrGetter<Comment[]>
  navigationNodes: MaybeRefOrGetter<ReadonlyMap<number, CommentNavigationNode>>
  isLoading: MaybeRefOrGetter<boolean>
  isDiscussionFocus: Readonly<Ref<boolean>>
  focusedCommentId: Readonly<Ref<number | null>>
  jumpTargetCommentId: Readonly<Ref<number | null>>
  selectFocusedComment: (commentId: number) => void
  jumpToComment: (commentId: number) => Promise<void>
}) => {
  const {
    acknowledgeVisit: acknowledgeDiscussionVisit,
    beginVisit: beginDiscussionVisit,
  } = useDiscussionVisits()
  const isClientReady = ref(false)
  const newCommentIds = ref<ReadonlySet<number>>(new Set())
  const initializedStoryId = ref<string | null>(null)
  const hasAcknowledgedNewComments = ref(false)
  let engagementObserver: IntersectionObserver | null = null
  let engagementTimer: ReturnType<typeof setTimeout> | undefined

  const currentCommentIds = computed(() => {
    return getCommentIdsInTreeOrder(toValue(comments) ?? [])
  })
  const newCommentIdsInDisplayOrder = computed(() => {
    return getCommentIdsInTreeOrder(toValue(sortedComments))
      .filter(commentId => newCommentIds.value.has(commentId))
  })
  const newCommentCount = computed(() => newCommentIdsInDisplayOrder.value.length)
  const newDescendantCounts = computed(() => {
    return countMatchingDescendants(toValue(navigationNodes), newCommentIds.value)
  })
  const activeNewCommentId = computed(() => {
    return isDiscussionFocus.value
      ? focusedCommentId.value
      : jumpTargetCommentId.value
  })
  const newCommentPosition = computed(() => {
    if (!activeNewCommentId.value) {
      return 0
    }

    const index = newCommentIdsInDisplayOrder.value.indexOf(activeNewCommentId.value)

    return index >= 0 ? index + 1 : 0
  })

  const clearEngagementTimer = () => {
    if (engagementTimer) {
      clearTimeout(engagementTimer)
      engagementTimer = undefined
    }
  }

  const stopObservingEngagement = () => {
    clearEngagementTimer()
    engagementObserver?.disconnect()
    engagementObserver = null
  }

  const acknowledgeNewComments = (dismissImmediately = false) => {
    const id = toValue(storyId)

    if (!id || newCommentIds.value.size === 0) {
      return
    }

    if (!hasAcknowledgedNewComments.value) {
      acknowledgeDiscussionVisit(id, currentCommentIds.value)
      hasAcknowledgedNewComments.value = true
      stopObservingEngagement()
    }

    if (dismissImmediately) {
      newCommentIds.value = new Set()
    }
  }

  const observeMeaningfulDiscussionReading = async () => {
    stopObservingEngagement()

    if (
      !import.meta.client
      || newCommentIds.value.size === 0
      || !('IntersectionObserver' in window)
    ) {
      return
    }

    await nextTick()

    if (!engagementTarget.value) {
      return
    }

    engagementObserver = new IntersectionObserver((entries) => {
      const isReadingDiscussion = entries.some((entry) => {
        return entry.isIntersecting && entry.intersectionRatio >= ENGAGEMENT_VISIBLE_RATIO
      })

      if (!isReadingDiscussion) {
        clearEngagementTimer()
        return
      }

      if (engagementTimer || hasAcknowledgedNewComments.value) {
        return
      }

      engagementTimer = setTimeout(() => {
        engagementTimer = undefined
        acknowledgeNewComments()
        stopObservingEngagement()
      }, ENGAGEMENT_DWELL_MS)
    }, { threshold: [ENGAGEMENT_VISIBLE_RATIO] })
    engagementObserver.observe(engagementTarget.value)
  }

  const beginVisit = () => {
    const id = toValue(storyId)

    if (
      !import.meta.client
      || !isClientReady.value
      || !id
      || !toValue(comments)
      || toValue(isLoading)
      || initializedStoryId.value === id
    ) {
      return
    }

    const visit = beginDiscussionVisit(id, currentCommentIds.value)

    initializedStoryId.value = id
    hasAcknowledgedNewComments.value = false
    newCommentIds.value = visit.isTracked
      ? visit.newCommentIds
      : new Set()

    if (isDiscussionFocus.value) {
      acknowledgeNewComments()
    } else {
      void observeMeaningfulDiscussionReading()
    }
  }

  const navigateToNewComment = (direction: 1 | -1) => {
    const ids = newCommentIdsInDisplayOrder.value

    if (ids.length === 0) {
      return
    }

    const currentIndex = activeNewCommentId.value
      ? ids.indexOf(activeNewCommentId.value)
      : -1
    const nextIndex = currentIndex < 0
      ? (direction > 0 ? 0 : ids.length - 1)
      : (currentIndex + direction + ids.length) % ids.length
    const nextCommentId = ids[nextIndex]

    if (!nextCommentId) {
      return
    }

    acknowledgeNewComments()

    if (isDiscussionFocus.value) {
      selectFocusedComment(nextCommentId)
    } else {
      void jumpToComment(nextCommentId)
    }
  }

  onMounted(() => {
    isClientReady.value = true
  })
  onBeforeUnmount(stopObservingEngagement)

  watch(
    [isClientReady, () => toValue(storyId), () => toValue(comments), () => toValue(isLoading)],
    beginVisit,
    { flush: 'post', immediate: true },
  )

  // Entering discussion focus counts as reading the discussion.
  watch(isDiscussionFocus, (isFocused) => {
    if (isFocused) {
      stopObservingEngagement()
      acknowledgeNewComments()
    }
  })

  return {
    markAllNewCommentsSeen: () => acknowledgeNewComments(true),
    navigateToNextNewComment: () => navigateToNewComment(1),
    navigateToPreviousNewComment: () => navigateToNewComment(-1),
    newCommentCount,
    newCommentIds,
    newCommentPosition,
    newDescendantCounts,
  }
}
