<script setup lang="ts">
/**
 * EditorRightPanel — 编辑器右侧属性面板
 *
 * 包含面板头部 + PropertyPanel + 全局配置提示
 */
import PropertyPanel from './PropertyPanel.vue'
import type { FormSchemaItem } from '@/components/FormGrid/types'

defineProps<{
  selectedSchema: FormSchemaItem | null
  allSchema: FormSchemaItem[]
  drawerVisible: boolean
}>()

const emit = defineEmits<{
  'update:schema': [schema: FormSchemaItem]
  'close': []
}>()

function getDisplayLabel(item: FormSchemaItem): string {
  return (item as any).label || item.type || '组件'
}
</script>

<template>
  <aside class="right-panel">
    <!-- Header -->
    <div class="right-panel__header">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="8" cy="8" r="6"/>
        <path d="M8 5v3l2 1"/>
      </svg>
      <span v-if="selectedSchema">{{ getDisplayLabel(selectedSchema) }} 配置</span>
      <span v-else>编辑器配置</span>
      <button class="right-panel__close" @click="emit('close')">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <line x1="4" y1="4" x2="12" y2="12"/>
          <line x1="12" y1="4" x2="4" y2="12"/>
        </svg>
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
