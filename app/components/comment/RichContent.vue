<template>
  <div
    v-html="sanitizedText"
  ></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Comment } from '#shared/types'
import { useSanitizer } from '~/composables/useSanitizer'

const props = defineProps<{
  comment: Comment
  scopeId: string
}>()

const { sanitize } = useSanitizer()
const sanitizedText = computed(() => sanitize(props.comment.text || '', props.scopeId))
</script>
