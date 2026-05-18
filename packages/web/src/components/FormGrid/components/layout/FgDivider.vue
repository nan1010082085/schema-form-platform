<script setup lang="ts">
/** FgDivider — 水平分割线 */
</script>

<template>
  <hr class="fg-divider" :style="{ '--fg-divider-color': '#e8e8e8', '--fg-divider-margin': '16px 0' }" />
</template>

<style lang="scss" scoped>
.fg-divider {
  border: none;
  border-top: 1px solid var(--fg-divider-color, #e8e8e8);
  margin: var(--fg-divider-margin, 16px 0);
}
</style>
