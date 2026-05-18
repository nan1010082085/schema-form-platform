<script setup lang="ts">
/**
 * ComponentPanel — 左侧组件面板
 *
 * 按分类展示可拖拽的 SchemaType 组件列表。
 * 拖拽 dataTransfer 中携带 SchemaType 字符串。
 * 使用 el-scrollbar 替代原生滚动条。
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
    name: '布局',
    items: [
      { type: 'grid-row', label: '行容器' },
      { type: 'grid-col', label: '列容器' },
      { type: 'page', label: '页面' },
      { type: 'card', label: '卡片' },
      { type: 'toolbar', label: '工具栏' },
      { type: 'title', label: '标题' },
      { type: 'divider', label: '分割线' },
      { type: 'spacer', label: '间距' },
      { type: 'steps', label: '步骤条' },
      { type: 'tabs', label: '标签页' },
    ],
  },
  {
    name: '基础表单',
    items: [
      { type: 'input', label: '输入框' },
      { type: 'number', label: '数字' },
      { type: 'select', label: '下拉选择' },
      { type: 'radio', label: '单选' },
      { type: 'checkbox', label: '多选' },
      { type: 'date', label: '日期' },
      { type: 'date-range', label: '日期范围' },
      { type: 'textarea', label: '多行文本' },
      { type: 'richtext', label: '富文本' },
    ],
  },
  {
    name: '业务组件',
    items: [
      { type: 'button-list', label: '按钮列表' },
      { type: 'toolbar-buttons', label: '工具栏按钮' },
      { type: 'upload', label: '上传' },
      { type: 'table', label: '表格' },
      { type: 'pagination', label: '分页' },
      { type: 'file-list', label: '文件列表' },
      { type: 'person-select', label: '人员选择' },
      { type: 'dept-select', label: '部门选择' },
      { type: 'transfer', label: '穿梭框' },
      { type: 'detail-form', label: '详情表单' },
      { type: 'banner', label: '横幅' },
      { type: 'tree-layout', label: '树形布局' },
      { type: 'date-time-slot', label: '日期时间段' },
      { type: 'dialog', label: '对话框' },
      { type: 'search-list', label: '搜索列表' },
    ],
  },
]

function handleDragStart(event: DragEvent, type: SchemaType) {
  event.dataTransfer?.setData('schema-type', type)
  event.dataTransfer!.effectAllowed = 'copy'
}
</script>

<template>
  <el-scrollbar class="component-panel">
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
  </el-scrollbar>
</template>

<style scoped lang="scss">
.component-panel {
  height: 100%;

  &__body {
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
    margin-bottom: 8px;
    padding-left: 4px;
  }

  &__list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  &__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: calc(50% - 3px);
    padding: 10px 4px;
    border: 1px solid #e4e7ed;
    border-radius: 6px;
    cursor: grab;
    transition: all 0.2s;
    background: #fafbfc;

    &:hover {
      border-color: #409eff;
      background: #ecf5ff;
      box-shadow: 0 1px 4px rgba(64, 158, 255, 0.15);
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
    margin-top: 3px;
  }
}
</style>
