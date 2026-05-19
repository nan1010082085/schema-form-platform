<script setup lang="ts">
/**
 * ComponentPanel — 左侧组件面板
 *
 * 搜索 + 分类标签页 + 可拖拽组件列表
 * 拖拽 dataTransfer 中携带 SchemaType 字符串
 */
import { ref, computed } from 'vue'
import { Search } from '@element-plus/icons-vue'
import type { SchemaType } from '@/components/FormGrid/types'

const TYPE_ZH: Record<string, string> = {
  'grid-row': '行容器', 'grid-col': '列容器', 'page': '页面', 'card': '卡片',
  'toolbar': '工具栏', 'title': '标题', 'divider': '分割线', 'spacer': '间距',
  'steps': '步骤条', 'tabs': '标签页',
  'input': '输入框', 'number': '数字', 'select': '下拉选择', 'radio': '单选',
  'checkbox': '多选', 'date': '日期', 'date-range': '日期范围',
  'textarea': '多行文本', 'richtext': '富文本',
  'button-list': '按钮列表', 'toolbar-buttons': '工具栏按钮', 'upload': '上传',
  'table': '表格', 'pagination': '分页', 'file-list': '文件列表',
  'person-select': '人员选择', 'dept-select': '部门选择', 'transfer': '穿梭框',
  'detail-form': '详情表单', 'banner': '横幅', 'tree-layout': '树形布局',
  'date-time-slot': '日期时间段', 'dialog': '对话框', 'search-list': '搜索列表',
}

interface ComponentItem {
  type: SchemaType
  label: string
  category: string
}

const allItems: ComponentItem[] = [
  // 布局
  { type: 'grid-row', label: '行容器', category: '布局' },
  { type: 'grid-col', label: '列容器', category: '布局' },
  { type: 'page', label: '页面', category: '布局' },
  { type: 'card', label: '卡片', category: '布局' },
  { type: 'toolbar', label: '工具栏', category: '布局' },
  { type: 'title', label: '标题', category: '布局' },
  { type: 'divider', label: '分割线', category: '布局' },
  { type: 'spacer', label: '间距', category: '布局' },
  { type: 'steps', label: '步骤条', category: '布局' },
  { type: 'tabs', label: '标签页', category: '布局' },
  // 基础表单
  { type: 'input', label: '输入框', category: '基础表单' },
  { type: 'number', label: '数字', category: '基础表单' },
  { type: 'select', label: '下拉选择', category: '基础表单' },
  { type: 'radio', label: '单选', category: '基础表单' },
  { type: 'checkbox', label: '多选', category: '基础表单' },
  { type: 'date', label: '日期', category: '基础表单' },
  { type: 'date-range', label: '日期范围', category: '基础表单' },
  { type: 'textarea', label: '多行文本', category: '基础表单' },
  { type: 'richtext', label: '富文本', category: '基础表单' },
  // 业务组件
  { type: 'button-list', label: '按钮列表', category: '业务组件' },
  { type: 'toolbar-buttons', label: '工具栏按钮', category: '业务组件' },
  { type: 'upload', label: '上传', category: '业务组件' },
  { type: 'table', label: '表格', category: '业务组件' },
  { type: 'pagination', label: '分页', category: '业务组件' },
  { type: 'file-list', label: '文件列表', category: '业务组件' },
  { type: 'person-select', label: '人员选择', category: '业务组件' },
  { type: 'dept-select', label: '部门选择', category: '业务组件' },
  { type: 'transfer', label: '穿梭框', category: '业务组件' },
  { type: 'detail-form', label: '详情表单', category: '业务组件' },
  { type: 'banner', label: '横幅', category: '业务组件' },
  { type: 'tree-layout', label: '树形布局', category: '业务组件' },
  { type: 'date-time-slot', label: '日期时间段', category: '业务组件' },
  { type: 'dialog', label: '对话框', category: '业务组件' },
  { type: 'search-list', label: '搜索列表', category: '业务组件' },
]

const categories = ['全部', '布局', '基础表单', '业务组件']

const searchQuery = ref('')
const selectedCategory = ref('全部')

const filteredItems = computed(() => {
  return allItems.filter((item) => {
    const matchesCategory = selectedCategory.value === '全部' || item.category === selectedCategory.value
    const matchesSearch = !searchQuery.value ||
      TYPE_ZH[item.type]?.includes(searchQuery.value) ||
      item.type.includes(searchQuery.value.toLowerCase())
    return matchesCategory && matchesSearch
  })
})

function handleDragStart(event: DragEvent, type: SchemaType) {
  event.dataTransfer?.setData('schema-type', type)
  event.dataTransfer?.setData('application/schema-drag', JSON.stringify({ source: 'panel', type }))
  event.dataTransfer!.effectAllowed = 'copy'
}
</script>

<template>
  <div class="component-panel">
    <!-- Search -->
    <div class="component-panel__search">
      <el-input
        v-model="searchQuery"
        size="small"
        placeholder="搜索组件..."
        clearable
      >
        <template #prefix>
          <el-icon :size="12"><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <!-- Category tabs -->
    <div class="component-panel__categories">
      <button
        v-for="cat in categories"
        :key="cat"
        class="component-panel__cat-btn"
        :class="{ 'component-panel__cat-btn--active': selectedCategory === cat }"
        @click="selectedCategory = cat"
      >
        {{ cat }}
      </button>
    </div>

    <!-- Component list -->
    <el-scrollbar class="component-panel__scroll">
      <div class="component-panel__list">
        <div
          v-for="item in filteredItems"
          :key="item.type"
          class="component-panel__item"
          draggable="true"
          @dragstart="handleDragStart($event, item.type)"
        >
          <span class="component-panel__item-label">{{ TYPE_ZH[item.type] ?? item.label }}</span>
        </div>
      </div>
      <div v-if="filteredItems.length === 0" class="component-panel__empty">
        无匹配组件
      </div>
    </el-scrollbar>
  </div>
</template>

<style scoped lang="scss">
.component-panel {
  display: flex;
  flex-direction: column;
  height: 100%;

  &__search {
    padding: 8px 10px;
    flex-shrink: 0;
  }

  &__categories {
    display: flex;
    gap: 0;
    padding: 0 10px;
    border-bottom: 1px solid #f0f2f5;
    flex-shrink: 0;
    overflow-x: auto;

    &::-webkit-scrollbar { display: none; }
  }

  &__cat-btn {
    padding: 6px 10px;
    font-size: 12px;
    color: #606266;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s;

    &:hover { color: #409eff; }

    &--active {
      color: #409eff;
      border-bottom-color: #409eff;
    }
  }

  &__scroll {
    flex: 1;
    min-height: 0;
  }

  &__list {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    padding: 10px;
  }

  &__item {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 4px;
    border: 1px solid #e4e7ed;
    border-radius: 4px;
    cursor: grab;
    transition: all 0.15s;
    background: #fafbfc;

    &:hover {
      border-color: #409eff;
      background: #ecf5ff;
    }

    &:active {
      cursor: grabbing;
      opacity: 0.7;
    }
  }

  &__item-label {
    font-size: 12px;
    color: #303133;
    font-weight: 500;
    text-align: center;
  }

  &__empty {
    padding: 24px;
    text-align: center;
    color: #c0c4cc;
    font-size: 12px;
  }
}
</style>
