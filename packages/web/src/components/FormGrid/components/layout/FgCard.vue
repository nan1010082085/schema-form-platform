<script setup lang="ts">
/** FgCard — 卡片容器，通过 CSS 变量向子组件传递样式，避免 scoped 穿透 */
</script>

<template>
  <div
    class="fg-card"
    :style="{
      '--fg-card-padding': '16px',
      '--fg-card-bg': '#fff',
      '--fg-card-radius': '10px',
    }"
  >
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.fg-card {
  background: var(--fg-card-bg, #fff);
  margin: 20px;
  border-radius: var(--fg-card-radius, 10px);
  padding: var(--fg-card-padding, 16px);
  min-height: calc(100vh - 107px);
}
</style>
