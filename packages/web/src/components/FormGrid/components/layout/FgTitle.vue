<script setup lang="ts">
/** FgTitle — 标题栏，带底部边框。默认红色，支持 color prop 自定义颜色 */

defineProps<{
  label?: string
  color?: string
}>()
</script>

<template>
  <div class="fg-title" :style="{ '--fg-title-font-size': '30px', '--fg-title-color': 'var(--el-color-danger)' }">
    <p :style="color ? { color, borderBottomColor: color } : undefined">{{ label }}</p>
  </div>
</template>

<style lang="scss" scoped>
.fg-title {
  p {
    font-size: var(--fg-title-font-size, 30px);
    color: var(--fg-title-color, var(--el-color-danger));
    padding: 20px 0;
    text-align: center;
    border-bottom: 4px solid var(--el-color-danger);
    margin: 0;
  }
}
</style>
