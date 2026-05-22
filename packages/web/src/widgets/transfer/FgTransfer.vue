<script setup lang="ts">
import { inject, computed } from 'vue'
import { widgetDataKey, widgetStyleKey } from '../base/types'
const widgetData = inject(widgetDataKey)!
const widgetStyle = inject(widgetStyleKey)!
const dynamicStyle = computed(() => ({
  fontSize: widgetStyle.value?.fontSize as string,
  color: widgetStyle.value?.color as string,
}))
</script>
<template>
  <el-transfer
    :data="[]"
    :titles="(widgetData.props?.titles as string[]) || ['待选', '已选']"
    :filterable="widgetData.props?.filterable !== false"
    :style="dynamicStyle"
  />
</template>

<style scoped>
:deep(.el-transfer) {
  display: flex;
  width: 100%;
}
:deep(.el-transfer__buttons) {
  padding: 0 12px;
  flex-shrink: 0;
}
:deep(.el-transfer-panel) {
  flex: 1;
  min-width: 0;
}
</style>
