<script setup lang="ts">
/**
 * EditorLeftPanel — 编辑器左侧面板
 *
 * 部件库标签页 + 结构树标签页 + 模板标签页
 */
import { ref } from 'vue'
import ComponentPanel from './ComponentPanel.vue'
import WidgetTree from './WidgetTree.vue'
import WidgetTemplatePanel from '@/components/WidgetTemplatePanel.vue'
import { useWidgetStore } from '@/stores/widget'
import { useEditorStore } from '@/stores/editor'
import type { Widget } from '@/widgets/base/types'

defineProps<{
  schemaStatus: 'draft' | 'published'
  schemaType: 'form' | 'search-list'
  schemaId: string | null
}>()

const widgetStore = useWidgetStore()
const editorStore = useEditorStore()

const activeTab = ref<'components' | 'structure' | 'templates'>('components')

function handleApplyTemplate(widgets: Record<string, unknown>[]) {
  // Append template widgets to existing canvas
  for (const w of widgets) {
    widgetStore.addWidget(w as unknown as Widget)
  }
  // Push a single history snapshot for the entire template application
  editorStore.pushHistory(widgetStore.widgets)
}
</script>

<template>
  <aside class="left-panel">
    <!-- Tabs -->
    <div class="left-panel__tabs">
      <button
        class="left-panel__tab"
        :class="{ 'left-panel__tab--active': activeTab === 'components' }"
        @click="activeTab = 'components'"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
          <rect x="1" y="1" width="6" height="6" rx="1"/>
          <rect x="9" y="1" width="6" height="6" rx="1"/>
          <rect x="1" y="9" width="6" height="6" rx="1"/>
          <rect x="9" y="9" width="6" height="6" rx="1"/>
        </svg>
        <span>部件库</span>
      </button>
      <button
        class="left-panel__tab"
        :class="{ 'left-panel__tab--active': activeTab === 'structure' }"
        @click="activeTab = 'structure'"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
          <line x1="1" y1="4" x2="6" y2="4"/>
          <line x1="1" y1="8" x2="10" y2="8"/>
          <line x1="1" y1="12" x2="8" y2="12"/>
          <circle cx="12" cy="4" r="2"/>
          <circle cx="14" cy="8" r="2"/>
          <circle cx="10" cy="12" r="2"/>
        </svg>
        <span>结构</span>
      </button>
      <button
        class="left-panel__tab"
        :class="{ 'left-panel__tab--active': activeTab === 'templates' }"
        @click="activeTab = 'templates'"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="2" width="12" height="12" rx="2"/>
          <line x1="2" y1="6" x2="14" y2="6"/>
          <line x1="6" y1="6" x2="6" y2="14"/>
        </svg>
        <span>模板</span>
      </button>
    </div>

    <!-- Content -->
    <div class="left-panel__content">
      <ComponentPanel v-show="activeTab === 'components'" />
      <WidgetTree v-show="activeTab === 'structure'" />
      <WidgetTemplatePanel
        v-show="activeTab === 'templates'"
        :current-widgets="widgetStore.widgets"
        @apply-template="handleApplyTemplate"
      />
    </div>

    <!-- Status bar -->
    <div v-if="schemaId" class="left-panel__status">
      <span class="left-panel__status-tag" :class="`left-panel__status-tag--${schemaStatus}`">
        {{ schemaStatus === 'published' ? '已发布' : '草稿' }}
      </span>
      <span class="left-panel__status-tag" :class="`left-panel__status-tag--${schemaType}`">
        {{ schemaType === 'form' ? '表单' : '搜索列表' }}
      </span>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.left-panel {
  width: 100%;
  flex: 1;
  min-height: 0;
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-lighter);
  display: flex;
  flex-direction: column;
  z-index: 2;

  &__tabs {
    display: flex;
    border-bottom: 1px solid var(--el-border-color-lighter);
    flex-shrink: 0;
  }

  &__tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 8px 4px;
    font-size: var(--el-font-size-small);
    font-weight: 500;
    color: var(--el-text-color-regular);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s;

    &:hover { color: var(--el-color-primary); background: var(--el-fill-color-lighter); }
    &--active {
      color: var(--el-color-primary);
      border-bottom-color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
    }
  }

  &__content {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  &__status {
    display: flex;
    gap: 6px;
    padding: 8px 12px;
    border-top: 1px solid var(--el-border-color-lighter);
    flex-shrink: 0;
  }

  &__status-tag {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 3px;
    white-space: nowrap;

    &--draft { background: var(--el-fill-color-light); color: var(--el-text-color-secondary); }
    &--published { background: var(--el-color-success-light-9); color: var(--el-color-success); }
    &--form { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
    &--search-list { background: var(--el-color-primary-light-9); color: var(--el-color-primary); }
  }
}
</style>
