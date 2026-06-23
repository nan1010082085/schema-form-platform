<script setup lang="ts">
/**
 * EditorRightPanel — 编辑器右侧属性面板
 *
 * 包含面板头部 + PropertyPanel + 全局配置提示
 */
import PropertyPanel from './PropertyPanel.vue'
import type { PartialWidget } from '@/components/WidgetRenderer/types'
import AppIcon from '@schema-form/shared-components/common/AppIcon.vue'

defineProps<{
  selectedSchema: PartialWidget | null
  allSchema: PartialWidget[]
  drawerVisible: boolean
}>()

const emit = defineEmits<{
  'update:schema': [schema: PartialWidget]
  'close': []
}>()

function getDisplayLabel(item: PartialWidget): string {
  return (item as any).label || item.type || '组件'
}
</script>

<template>
  <aside class="right-panel">
    <!-- Header -->
    <div class="right-panel__header">
      <AppIcon name="setting" :size="14" />
      <span v-if="selectedSchema">{{ getDisplayLabel(selectedSchema) }} 配置</span>
      <span v-else>编辑器配置</span>
      <button class="right-panel__close" @click="emit('close')">
        <AppIcon name="close" :size="12" />
      </button>
    </div>

    <!-- Property panel -->
    <PropertyPanel
      v-if="selectedSchema"
      :schema="selectedSchema"
      :all-schema="allSchema"
      @update:schema="emit('update:schema', $event)"
    />

    <!-- Global config hint -->
    <div v-else class="right-panel__hint">
      <p>选择画布中的组件查看和编辑属性</p>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.right-panel {
  width: 280px;
  flex-shrink: 0;
  background: #fff;
  border-left: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  z-index: 2;
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 12px;
    font-size: 13px;
    font-weight: 600;
    color: #303133;
    border-bottom: 1px solid #f0f2f5;
    flex-shrink: 0;
  }

  &__close {
    margin-left: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: none;
    background: transparent;
    color: #909399;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.15s;

    &:hover {
      background: #f0f2f5;
      color: #606266;
    }
  }

  &__hint {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
    color: #c0c4cc;
    font-size: 13px;
    line-height: 1.6;
  }
}
</style>
