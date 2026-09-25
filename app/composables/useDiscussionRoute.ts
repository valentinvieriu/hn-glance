import type { MaybeRefOrGetter } from 'vue'
import { computed, onMounted, ref, toValue, watch } from 'vue'
import type { Comment } from '#shared/types'
import { sortCommentThreads, type CommentTreeSummary } from '#shared/utils/comments'
import {
  DEFAULT_COMMENT_READER_MODE,
  DEFAULT_ROOT_COMMENT_ORDER,
  parseCommentReaderMode,
  parseRootCommentOrder,
  type CommentReaderMode,
  type RootCommentOrder,
} from '#shared/utils/appPreferences'
import { getCommentIdFromHash, getFirstQueryValue, normalizeHnItemId } from '#shared/utils/hn'
import { useAppPreferences } from '~/composables/useAppPreferences'

/**
 * Story-detail discussion state owned by the URL: root-comment order
 * (`sort`), discussion focus (`view=discussion`), reader mode (`reader`), and
 * the current comment (`comment`, falling back to the `#comment-<id>` hash).
 * Explicit query values win; missing ones are filled from the durable
 * preferences once they hydrate, and only user actions change preferences.
 */
export const useDiscussionRoute = ({ rootComments, summary }: {
  rootComments: MaybeRefOrGetter<Comment[]>
  summary: MaybeRefOrGetter<CommentTreeSummary>
}) => {
  const route = useRoute()
  const router = useRouter()
  const isClientReady = ref(false)
  const {
    discussionReaderMode: preferredDiscussionReaderMode,
    isHydrated: arePreferencesHydrated,
    rootCommentOrder: preferredRootCommentOrder,
    setDiscussionReaderMode: setPreferredDiscussionReaderMode,
    setRootCommentOrder: setPreferredRootCommentOrder,
  } = useAppPreferences()

  onMounted(() => {
    isClientReady.value = true
  })

  const navigationNodes = computed(() => toValue(summary).navigationNodes)
  const isDiscussionFocus = computed(() => {
    return getFirstQueryValue(route.query.view) === 'discussion'
  })
  const explicitDiscussionReaderMode = computed(() => {
    return parseCommentReaderMode(route.query.reader)
  })
  const discussionReaderMode = computed<CommentReaderMode>(() => {
    if (isDiscussionFocus.value && explicitDiscussionReaderMode.value) {
      return explicitDiscussionReaderMode.value
    }

    return DEFAULT_COMMENT_READER_MODE
  })
  // Focus renders only after mount and once the reader mode is explicit, so
  // SSR and hydration always produce the overview.
  const isDiscussionFocusActive = computed(() => {
    return isDiscussionFocus.value
      && isClientReady.value
      && explicitDiscussionReaderMode.value !== null
  })

  const explicitRootCommentOrder = computed(() => parseRootCommentOrder(route.query.sort))
  const commentSort = computed<RootCommentOrder>({
    get: () => explicitRootCommentOrder.value ?? DEFAULT_ROOT_COMMENT_ORDER,
    set: (sort) => {
      setPreferredRootCommentOrder(sort)

      const query = { ...route.query, sort }
      void router.replace({ query, hash: route.hash })
    },
  })
  const sortedComments = computed(() => sortCommentThreads(
    toValue(rootComments),
    commentSort.value,
    toValue(summary),
  ))

  const focusedCommentId = computed(() => {
    const queryComment = normalizeHnItemId(route.query.comment)
    const queryCommentId = queryComment ? Number(queryComment) : null
    const hashCommentId = getCommentIdFromHash(route.hash)

    if (queryCommentId && navigationNodes.value.has(queryCommentId)) {
      return queryCommentId
    }

    if (hashCommentId && navigationNodes.value.has(hashCommentId)) {
      return hashCommentId
    }

    return sortedComments.value[0]?.id ?? null
  })

  const enterDiscussionFocus = () => {
    const windowHashCommentId = import.meta.client
      ? getCommentIdFromHash(window.location.hash)
      : null
    const commentId = windowHashCommentId && navigationNodes.value.has(windowHashCommentId)
      ? windowHashCommentId
      : focusedCommentId.value
    const query = {
      ...route.query,
      view: 'discussion',
      ...(commentId ? { comment: String(commentId) } : {}),
      reader: preferredDiscussionReaderMode.value,
    }

    void router.push({ query, hash: '' })
  }

  /** Drops focus-only query state and returns to the overview at the current comment. */
  const exitDiscussionFocus = async () => {
    const commentId = focusedCommentId.value
    const query = { ...route.query }
    delete query.view
    delete query.comment
    delete query.reader

    const hash = commentId
      ? `#comment-${commentId}`
      : route.hash

    await router.replace({ query, hash })
  }

  const selectFocusedComment = (commentId: number) => {
    if (!navigationNodes.value.has(commentId)) {
      return
    }

    const query = { ...route.query, comment: String(commentId) }

    void router.replace({ query, hash: '' })
  }

  const setDiscussionReaderMode = (mode: CommentReaderMode) => {
    setPreferredDiscussionReaderMode(mode)

    if (!isDiscussionFocus.value) {
      return
    }

    const query = { ...route.query, reader: mode }

    void router.replace({ query, hash: '' })
  }

  watch(
    [
      arePreferencesHydrated,
      isDiscussionFocus,
      () => route.query.reader,
      () => route.query.sort,
    ],
    ([preferencesHydrated, isFocused, queryReader, querySort]) => {
      if (import.meta.server || !preferencesHydrated) {
        return
      }

      const query = { ...route.query }
      let shouldReplace = false

      if (!parseRootCommentOrder(querySort)) {
        query.sort = preferredRootCommentOrder.value
        shouldReplace = true
      }

      if (isFocused && !parseCommentReaderMode(queryReader)) {
        query.reader = preferredDiscussionReaderMode.value
        shouldReplace = true
      }

      if (!shouldReplace) {
        return
      }

      void router.replace({ query, hash: route.hash })
    },
    { immediate: true },
  )

  watch([isDiscussionFocus, focusedCommentId], ([isFocused, commentId]) => {
    const queryComment = getFirstQueryValue(route.query.comment)

    if (import.meta.server || !isFocused || !commentId || queryComment === String(commentId)) {
      return
    }

    const query = { ...route.query, comment: String(commentId) }

    void router.replace({
      query,
      hash: '',
    })
  }, { immediate: true })

  return {
    commentSort,
    discussionReaderMode,
    enterDiscussionFocus,
    exitDiscussionFocus,
    focusedCommentId,
    isDiscussionFocus,
    isDiscussionFocusActive,
    selectFocusedComment,
    setDiscussionReaderMode,
    sortedComments,
  }
}
