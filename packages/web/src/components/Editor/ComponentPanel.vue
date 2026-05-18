<script setup lang="ts">
/**
 * ComponentPanel — 左侧组件面板
 *
 * 按分类展示可拖拽的 SchemaType 组件列表。
 * 拖拽 dataTransfer 中携带 SchemaType 字符串。
 */
import type { SchemaType } from '@/components/FormGrid/types'

interface ComponentItem {
  type: SchemaType
  label: string
}

interface ComponentCategory {
  name: string
  items: ComponentItem[]
}

const categories: ComponentCategory[] = [
  {
    name: 'Layout',
    items: [
      { type: 'grid-row', label: 'Row' },
      { type: 'grid-col', label: 'Column' },
      { type: 'page', label: 'Page' },
      { type: 'card', label: 'Card' },
      { type: 'toolbar', label: 'Toolbar' },
      { type: 'title', label: 'Title' },
      { type: 'divider', label: 'Divider' },
      { type: 'spacer', label: 'Spacer' },
      { type: 'steps', label: 'Steps' },
      { type: 'tabs', label: 'Tabs' },
    ],
  },
  {
    name: 'Basic Form',
    items: [
      { type: 'input', label: 'Input' },
      { type: 'number', label: 'Number' },
      { type: 'select', label: 'Select' },
      { type: 'radio', label: 'Radio' },
      { type: 'checkbox', label: 'Checkbox' },
      { type: 'date', label: 'Date' },
      { type: 'date-range', label: 'Date Range' },
      { type: 'textarea', label: 'Textarea' },
      { type: 'richtext', label: 'Rich Text' },
    ],
  },
  {
    name: 'Business',
    items: [
      { type: 'button-list', label: 'Button List' },
      { type: 'toolbar-buttons', label: 'Toolbar Buttons' },
      { type: 'upload', label: 'Upload' },
      { type: 'table', label: 'Table' },
      { type: 'pagination', label: 'Pagination' },
      { type: 'file-list', label: 'File List' },
      { type: 'person-select', label: 'Person Select' },
      { type: 'dept-select', label: 'Dept Select' },
      { type: 'transfer', label: 'Transfer' },
      { type: 'detail-form', label: 'Detail Form' },
      { type: 'banner', label: 'Banner' },
      { type: 'tree-layout', label: 'Tree Layout' },
      { type: 'date-time-slot', label: 'DateTime Slot' },
      { type: 'dialog', label: 'Dialog' },
      { type: 'search-list', label: 'Search List' },
    ],
  },
]

function handleDragStart(event: DragEvent, type: SchemaType) {
  event.dataTransfer?.setData('schema-type', type)
  event.dataTransfer!.effectAllowed = 'copy'
}
</script>

<template>
  <div class="component-panel">
    <div class="component-panel__body">
      <div
        v-for="category in categories"
        :key="category.name"
        class="component-panel__category"
      >
        <div class="component-panel__category-title">{{ category.name }}</div>
        <div class="component-panel__list">
          <div
            v-for="item in category.items"
            :key="item.type"
            class="component-panel__item"
            draggable="true"
            @dragstart="handleDragStart($event, item.type)"
          >
            <span class="component-panel__item-type">{{ item.type }}</span>
            <span class="component-panel__item-label">{{ item.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.component-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;

  &__body {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
  }

  &__category {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__category-title {
    font-size: 12px;
    font-weight: 600;
    color: #909399;
    text-transform: uppercase;
    margin-bottom: 8px;
    padding-left: 4px;
  }

  &__list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: calc(50% - 4px);
    padding: 8px 4px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    cursor: grab;
    transition: all 0.2s;
    background: #fafafa;

    &:hover {
      border-color: #409eff;
      background: #ecf5ff;
    }

    &:active {
      cursor: grabbing;
      opacity: 0.7;
    }
  }

  &__item-type {
    font-size: 11px;
    color: #409eff;
    font-weight: 500;
    line-height: 1.2;
    word-break: break-all;
    text-align: center;
  }

  &__item-label {
    font-size: 12px;
    color: #606266;
    margin-top: 2px;
  }
}
</style>
