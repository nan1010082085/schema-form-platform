<script setup lang="ts">
/**
 * EditorLeftPanel — 编辑器左侧面板
 *
 * 部件库标签页 + 结构树标签页 + 模板标签页
 */
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import ComponentPanel from './ComponentPanel.vue'
import AppIcon from '@schema-form/shared-components/common/AppIcon.vue'
import WidgetTree from './WidgetTree.vue'
import TemplatePanel from './TemplatePanel.vue'
import { useWidgetStore } from '@/stores/widget'
import { useEditorStore } from '@/stores/editor'
import { applyTemplate } from '@/utils/apiClient'
import type { TemplateItem } from '@/utils/apiClient'
import type { Widget } from '@/widgets/base/types'

defineProps<{
  schemaStatus: 'draft' | 'published'
  schemaType: 'form'
  schemaId: string | null
}>()

const widgetStore = useWidgetStore()
const editorStore = useEditorStore()

const activeTab = ref<'components' | 'structure' | 'templates'>('components')
const templatePanelRef = ref<InstanceType<typeof TemplatePanel>>()

async function handleApplyTemplate(template: TemplateItem) {
  try {
    const result = await applyTemplate(template.id)
    for (const w of result.widgets) {
      widgetStore.addWidget(w as unknown as Widget)
    }
    editorStore.pushHistory(widgetStore.widgets)
    ElMessage.success(`已应用模板「${template.name}」`)
  } catch {
    ElMessage.error('应用模板失败')
  }
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
        <AppIcon name="grid" :size="14" />
        <span>部件库</span>
      </button>
      <button
        class="left-panel__tab"
        :class="{ 'left-panel__tab--active': activeTab === 'structure' }"
        @click="activeTab = 'structure'"
      >
        <AppIcon name="list" :size="14" />
        <span>结构</span>
      </button>
      <button
        class="left-panel__tab"
        :class="{ 'left-panel__tab--active': activeTab === 'templates' }"
        @click="activeTab = 'templates'"
      >
        <AppIcon name="document" :size="14" />
        <span>模板</span>
      </button>
    </div>

    <!-- Content -->
    <div class="left-panel__content">
      <ComponentPanel v-show="activeTab === 'components'" />
      <WidgetTree v-show="activeTab === 'structure'" />
      <TemplatePanel
        v-show="activeTab === 'templates'"
        ref="templatePanelRef"
        @apply="handleApplyTemplate"
      />
    </div>

    <!-- Status bar -->
    <div v-if="schemaId" class="left-panel__status">
      <span class="left-panel__status-tag" :class="`left-panel__status-tag--${schemaStatus}`">
        {{ schemaStatus === 'published' ? '已发布' : '草稿' }}
      </span>
      <span class="left-panel__status-tag left-panel__status-tag--form">
        表单
      </span>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.left-panel {
  width: 100%;
  flex: 1;
  min-height: 0;
  background: var(--glass-bg, rgba(17, 24, 32, 0.8));
  backdrop-filter: var(--glass-blur, blur(20px));
  -webkit-backdrop-filter: var(--glass-blur, blur(20px));
  border-right: 1px solid var(--color-primary-lighter);
  display: flex;
  flex-direction: column;
  z-index: 2;

  &__tabs {
    display: flex;
    border-bottom: 1px solid var(--color-primary-lighter);
    flex-shrink: 0;
  }

  &__tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 8px 4px;
    font-size: var(--el-font-size-extra-small, 12px);
    font-weight: 500;
    color: var(--text-color-secondary);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s;

    &:hover { color: var(--color-primary); background: var(--color-primary-lighter); }
    &--active {
      color: var(--color-primary);
      border-bottom-color: var(--color-primary);
      background: var(--color-primary-lighter);
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
    border-top: 1px solid var(--color-primary-lighter);
    flex-shrink: 0;
  }

  &__status-tag {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 3px;
    white-space: nowrap;

    &--draft { background: var(--text-color-disabled); color: var(--text-color-placeholder); }
    &--published { background: rgba(0, 230, 118, 0.1); color: #00e676; }
    &--form { background: var(--color-primary-bg-light); color: var(--color-primary); }
    &--search-list { background: var(--color-primary-bg-light); color: var(--color-primary); }
  }
}
</style>
