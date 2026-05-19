<script setup lang="ts">
/** FgPage — 页面容器，提供背景和最小高度 */
</script>

<template>
  <div :class="$style.page" :style="{ '--fg-page-bg': '#f5f7fa' }">
    <slot />
  </div>
</template>

<style module lang="scss">
.page {
  min-height: 100vh;
  background: var(--fg-page-bg, #f5f7fa);
}
</style>
