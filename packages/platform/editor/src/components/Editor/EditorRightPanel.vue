<script setup lang="ts">
/**
 * EditorRightPanel — 编辑器右侧属性面板
 *
 * 包含面板头部 + PropertyPanel + 全局配置提示
 */
import PropertyPanel from './PropertyPanel.vue'
import type { PartialWidget } from '@/components/WidgetRenderer/types'
import AppIcon from '@schema-form/platform-shared/components/common/AppIcon.vue'
import styles from './EditorRightPanel.module.scss'

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
  <aside :class="styles['right-panel']">
    <!-- Header -->
    <div :class="styles['right-panel__header']">
      <AppIcon name="setting" :size="14" />
      <span v-if="selectedSchema">{{ getDisplayLabel(selectedSchema) }} 配置</span>
      <span v-else>编辑器配置</span>
      <button :class="styles['right-panel__close']" @click="emit('close')">
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
    <div v-else :class="styles['right-panel__hint']">
      <p>选择画布中的组件查看和编辑属性</p>
    </div>
  </aside>
</template>

