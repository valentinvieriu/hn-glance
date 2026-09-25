<template>
  <StoryGrid endpoint="top" />
</template>

<script setup lang="ts">
// `/` renders the top feed directly rather than redirecting to `/top`.
definePageMeta({ alias: '/' })
</script>
