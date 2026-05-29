<script setup lang="ts">
</script>

<template>
  <router-view />
</template>

<style>
*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --el-component-size-large: 44px;
  --el-component-size: 44px;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, "Noto Sans SC", sans-serif;
  color: #1a1a2e;
  background: #f0f2f5;
  min-height: 100vh;
}
</style>
