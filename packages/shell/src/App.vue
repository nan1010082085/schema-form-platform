<script setup lang="ts">
/**
 * App.vue -- shell root component
 *
 * Minimal root that just renders the router view.
 * Global styles and resets are applied here.
 */
</script>

<template>
  <div class="shell-root">
    <router-view />
  </div>
</template>

<style>
/* Shell global base reset */
*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: var(--font-family-base, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif);
  color: var(--text-color-primary, #303133);
  background: var(--bg-color-page, #f5f7fa);
  -webkit-font-smoothing: antialiased;
}

#app {
  height: 100%;
}

.shell-root {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

</style>
