<script setup lang="ts">
</script>

<template>
  <div class="portal-root">
    <router-view />
  </div>
</template>

<style>
/* Portal 根布局重置 — 仅影响 portal 自身文档 */
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
  font-family: var(--font-family-base);
  color: var(--text-color-primary);
  background: var(--bg-color-page);
  -webkit-font-smoothing: antialiased;
}

#app {
  height: 100%;
}

.portal-root {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
