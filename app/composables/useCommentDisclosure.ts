import type { MaybeRefOrGetter, Ref } from 'vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toValue, watch } from 'vue'
import {
  getCommentPathFromIndex,
  getExpandedCommentDisclosure,
  getSmartCommentDisclosure,
  revealCommentPath,
  toggleCommentReplies,
  type CommentTreeSummary,
} from '#shared/utils/comments'
import { getCommentIdFromHash } from '#shared/utils/hn'

const COMMENT_HIGHLIGHT_MS = 1600

/**
 * Reply disclosure for the overview comment tree plus jump-to-comment. A jump
 * opens only the target's ancestor replies, scrolls to and focuses it, and
 * briefly highlights it. Outside discussion focus, `#comment-<id>` hashes on
 * load, on hash changes, and on leaving focus jump the same way.
 */
export const useCommentDisclosure = ({ summary, isDiscussionFocus }: {
  summary: MaybeRefOrGetter<CommentTreeSummary>
  isDiscussionFocus: Readonly<Ref<boolean>>
}) => {
  const route = useRoute()
  // The override stays null until the reader acts, so smart reply gates derive
  // from the SSR summary during hydration.
  const hiddenReplyOverride = ref<ReadonlySet<number> | null>(null)
  const jumpTargetCommentId = ref<number | null>(null)
  let commentHighlightTimer: ReturnType<typeof setTimeout> | undefined
  let highlightedComment: HTMLElement | null = null

  const defaultHiddenReplyIds = computed(() => toValue(summary).defaultHiddenReplyIds)
  const hiddenReplyIds = computed<ReadonlySet<number>>(() => {
    return hiddenReplyOverride.value ?? defaultHiddenReplyIds.value
  })
  const areAllCommentsExpanded = computed(() => hiddenReplyIds.value.size === 0)
  const canToggleAllComments = computed(() => {
    return defaultHiddenReplyIds.value.size > 0
      || hiddenReplyIds.value.size > 0
  })

  const toggleExpandAllComments = () => {
    hiddenReplyOverride.value = areAllCommentsExpanded.value
      ? getSmartCommentDisclosure(defaultHiddenReplyIds.value)
      : getExpandedCommentDisclosure()
  }

  const toggleRepliesHidden = (commentId: number) => {
    hiddenReplyOverride.value = toggleCommentReplies(hiddenReplyIds.value, commentId)
  }

  /**
   * Opens only what is required to render the comment; its own reply
   * visibility and every unrelated branch keep their state. Resolves after the
   * DOM update when anything was revealed.
   */
  const revealComment = async (commentId: number) => {
    const pathIds = getCommentPathFromIndex(toValue(summary).navigationNodes, commentId)

    if (!pathIds) {
      return false
    }

    hiddenReplyOverride.value = revealCommentPath(hiddenReplyIds.value, pathIds)
    await nextTick()

    return true
  }

  const clearCommentHighlight = () => {
    if (commentHighlightTimer) {
      clearTimeout(commentHighlightTimer)
      commentHighlightTimer = undefined
    }

    highlightedComment?.classList.remove('comment-jump-highlight')
    highlightedComment = null
  }

  const highlightComment = (target: HTMLElement) => {
    clearCommentHighlight()
    highlightedComment = target
    target.classList.add('comment-jump-highlight')
    commentHighlightTimer = setTimeout(clearCommentHighlight, COMMENT_HIGHLIGHT_MS)
  }

  const jumpToComment = async (commentId: number, updateHash = true) => {
    if (!Number.isSafeInteger(commentId) || commentId <= 0) {
      return
    }

    if (!await revealComment(commentId)) {
      await nextTick()
    }

    let target = document.getElementById(`comment-${commentId}`)

    if (!target) {
      // Safety net: open the whole tree if targeted expansion missed.
      hiddenReplyOverride.value = getExpandedCommentDisclosure()
      await nextTick()
      target = document.getElementById(`comment-${commentId}`)
    }

    if (!target) {
      return
    }

    jumpTargetCommentId.value = commentId

    if (updateHash && window.location.hash !== `#comment-${commentId}`) {
      window.history.pushState(
        window.history.state,
        '',
        `${window.location.pathname}${window.location.search}#comment-${commentId}`,
      )
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    })
    target.focus({ preventScroll: true })
    highlightComment(target)
  }

  const jumpToHashedComment = (hash: string) => {
    const commentId = getCommentIdFromHash(hash)

    if (commentId && !isDiscussionFocus.value) {
      void jumpToComment(commentId, false)
    }
  }

  onMounted(() => jumpToHashedComment(route.hash))
  onBeforeUnmount(clearCommentHighlight)

  watch(() => route.hash, jumpToHashedComment)

  // Leaving focus lands on the current comment's overview anchor.
  watch(isDiscussionFocus, (isFocused, wasFocused) => {
    if (!isFocused && wasFocused) {
      jumpToHashedComment(route.hash)
    }
  })

  return {
    areAllCommentsExpanded,
    canToggleAllComments,
    hiddenReplyIds,
    jumpTargetCommentId,
    jumpToComment,
    revealComment,
    toggleExpandAllComments,
    toggleRepliesHidden,
  }
}
