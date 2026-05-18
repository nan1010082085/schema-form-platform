<script setup lang="ts">
/** FgToolbar — 固定顶部工具栏，通过 CSS 变量向子组件传递样式 */
</script>

<template>
  <div
    class="fg-toolbar"
    :style="{
      '--fg-toolbar-gap': '12px',
      '--fg-toolbar-align': 'center',
      '--fg-toolbar-height': '60px',
      '--fg-toolbar-bg': 'rgba(255, 255, 255, 0.9)',
    }"
  >
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.fg-toolbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--fg-toolbar-height, 60px);
  z-index: 100;
  background: var(--fg-toolbar-bg, rgba(255, 255, 255, 0.9));
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: var(--fg-toolbar-align, center);
  justify-content: center;
  gap: var(--fg-toolbar-gap, 12px);
  padding: 0 16px;
  box-sizing: border-box;
}
</style>
