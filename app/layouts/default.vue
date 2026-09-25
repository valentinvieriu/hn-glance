<template>
  <div class="safe-area-container flex min-h-screen flex-col bg-white font-sans text-gray-900 dark:bg-gray-900 dark:text-gray-100">
    <NuxtLoadingIndicator />
    <Header />
    <main class="flex-grow">
      <slot />
    </main>
    <Footer />
  </div>
</template>

<style>
.safe-area-container {
  /* Handle bottom safe area */
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
