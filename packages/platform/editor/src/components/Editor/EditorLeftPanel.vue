<script setup lang="ts">
/**
 * EditorLeftPanel — 编辑器左侧面板
 *
 * 部件库标签页 + 结构树标签页 + 模板标签页
 */
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import ComponentPanel from './ComponentPanel.vue'
import AppIcon from '@schema-form/platform-shared/components/common/AppIcon.vue'
import WidgetTree from './WidgetTree.vue'
import TemplatePanel from './TemplatePanel.vue'
import { useWidgetStore } from '@/stores/widget'
import { useEditorStore } from '@/stores/editor'
import { applyTemplate } from '@/utils/apiClient'
import type { TemplateItem } from '@/utils/apiClient'
import type { Widget } from '@/widgets/base/types'
import styles from './EditorLeftPanel.module.scss'

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
  <aside :class="styles['left-panel']">
    <!-- Tabs -->
    <div :class="styles['left-panel__tabs']">
      <button
        :class="[styles['left-panel__tab'], { [styles['left-panel__tab--active']]: activeTab === 'components' }]"
        @click="activeTab = 'components'"
      >
        <AppIcon name="grid" :size="14" />
        <span>部件库</span>
      </button>
      <button
        :class="[styles['left-panel__tab'], { [styles['left-panel__tab--active']]: activeTab === 'structure' }]"
        @click="activeTab = 'structure'"
      >
        <AppIcon name="list" :size="14" />
        <span>结构</span>
      </button>
      <button
        :class="[styles['left-panel__tab'], { [styles['left-panel__tab--active']]: activeTab === 'templates' }]"
        @click="activeTab = 'templates'"
      >
        <AppIcon name="document" :size="14" />
        <span>模板</span>
      </button>
    </div>

    <!-- Content -->
    <div :class="styles['left-panel__content']">
      <ComponentPanel v-show="activeTab === 'components'" />
      <WidgetTree v-show="activeTab === 'structure'" />
      <TemplatePanel
        v-show="activeTab === 'templates'"
        ref="templatePanelRef"
        @apply="handleApplyTemplate"
      />
    </div>

    <!-- Status bar -->
    <div v-if="schemaId" :class="styles['left-panel__status']">
      <span :class="[styles['left-panel__status-tag'], styles[`left-panel__status-tag--${schemaStatus}`]]">
        {{ schemaStatus === 'published' ? '已发布' : '草稿' }}
      </span>
      <span :class="[styles['left-panel__status-tag'], styles['left-panel__status-tag--form']]">
        表单
      </span>
    </div>
  </aside>
</template>
