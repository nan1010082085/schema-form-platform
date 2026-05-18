<script setup lang="ts">
/** FgSpacer — 垂直间距 */

defineProps<{
  height?: string
}>()
</script>

<template>
  <div class="fg-spacer" :style="{ height: height || '20px', '--fg-spacer-height': height || '20px' }" />
</template>

<style lang="scss" scoped>
.fg-spacer {
  flex-shrink: 0;
}
</style>
