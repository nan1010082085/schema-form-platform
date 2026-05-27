<script setup lang="ts">
import { computed } from 'vue'
import { getWidget } from '@/widgets/registry'
import type { Widget, ConfigPanelType } from '@/widgets/base/types'

const props = defineProps<{
  visible: boolean
  x: number
  y: number
  widget: Widget | null
}>()

const emit = defineEmits<{
  close: []
  copy: [widget: Widget]
  copyId: [id: string]
  delete: [widget: Widget]
  openEvent: [widget: Widget]
  openRule: [widget: Widget]
  openApi: [widget: Widget]
  openVariables: [widget: Widget]
  savePreview: [widget: Widget]
}>()

const widgetConfig = computed(() => {
  if (!props.widget) return null
  const reg = getWidget(props.widget.type)
  return reg?.config ?? null
})

const configPanels = computed<ConfigPanelType[]>(() => {
  return widgetConfig.value?.configPanels ?? []
})

function handleAction(action: string) {
  if (!props.widget) return
  switch (action) {
    case 'copy': emit('copy', props.widget); break
    case 'copyId': emit('copyId', props.widget.id); break
    case 'delete': emit('delete', props.widget); break
    case 'event': emit('openEvent', props.widget); break
    case 'rule': emit('openRule', props.widget); break
    case 'api': emit('openApi', props.widget); break
    case 'variables': emit('openVariables', props.widget); break
    case 'savePreview': emit('savePreview', props.widget); break
  }
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      :class="$style.backdrop"
      @click="emit('close')"
      @contextmenu.prevent="emit('close')"
    />
    <div
      v-if="visible && widget"
      :class="$style.menu"
      :style="{ left: `${x}px`, top: `${y}px` }"
    >
      <div :class="$style.header">{{ widgetConfig?.displayName ?? widget.name }}</div>
      <div :class="$style.item" @click="handleAction('copy')">复制部件</div>
      <div :class="$style.item" @click="handleAction('copyId')">复制 ID</div>
      <div :class="$style.item" @click="handleAction('delete')">删除部件</div>
      <div :class="$style.item" @click="handleAction('savePreview')">保存预览图</div>
      <template v-if="configPanels.length">
        <div :class="$style.divider" />
        <div v-if="configPanels.includes('events')" :class="$style.item" @click="handleAction('event')">事件配置</div>
        <div v-if="configPanels.includes('rules')" :class="$style.item" @click="handleAction('rule')">规则配置</div>
        <div v-if="configPanels.includes('api')" :class="$style.item" @click="handleAction('api')">数据源</div>
        <div v-if="configPanels.includes('variables')" :class="$style.item" @click="handleAction('variables')">变量配置</div>
      </template>
    </div>
  </Teleport>
</template>

<style module>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 9998;
}

.menu {
  position: fixed;
  z-index: 9999;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 4px 0;
  min-width: 140px;
}

.header {
  padding: 6px 16px;
  font-size: 12px;
  color: #909399;
  border-bottom: 1px solid #f0f2f5;
  margin-bottom: 4px;
}

.item {
  padding: 6px 16px;
  font-size: 13px;
  color: #303133;
  cursor: pointer;
  white-space: nowrap;
}

.item:hover {
  background: #f5f7fa;
  color: var(--el-color-primary);
}

.divider {
  height: 1px;
  background: #f0f2f5;
  margin: 4px 0;
}
</style>
