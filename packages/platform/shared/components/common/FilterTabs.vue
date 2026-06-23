<script setup lang="ts">
/**
 * FilterTabs — 通用筛选标签栏
 *
 * 按钮组样式的筛选 tabs，用于实例管理、模板库等页面。
 */
defineProps<{
  /** 选项列表 */
  options: { label: string; value: string }[]
  /** 当前选中值 */
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div :class="$style.tabs">
    <button
      v-for="tab in options"
      :key="tab.value"
      :class="[$style.tab, { [$style.tabActive]: modelValue === tab.value }]"
      @click="emit('update:modelValue', tab.value)"
    >{{ tab.label }}</button>
  </div>
</template>

<style module>
.tabs {
  display: flex;
  gap: 2px;
  background: #e8eaed;
  border-radius: 8px;
  padding: 3px;
}

.tab {
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 500;
  color: #606266;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  line-height: 1.4;
}

.tab:hover {
  color: #303133;
  background: rgba(255, 255, 255, 0.6);
}

.tabActive {
  color: #303133;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
</style>
