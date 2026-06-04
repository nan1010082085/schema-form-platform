<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

interface Props {
  data: {
    label: string
    bpmnType: string
  }
}

defineProps<Props>()

const taskIcons: Record<string, string> = {
  userTask: '&#x1F464;',
  serviceTask: '&#x2699;',
  scriptTask: '&#x1F4DC;',
  sendTask: '&#x1F4E8;',
  receiveTask: '&#x1F4E5;',
}
</script>

<template>
  <div :class="$style.node">
    <Handle type="target" :position="Position.Top" />
    <div :class="$style.box">
      <span :class="$style.icon" v-html="taskIcons[data.bpmnType] || '&#x1F4CB;'" />
      <span :class="$style.label">{{ data.label }}</span>
    </div>
    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>

<style module>
.node {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.box {
  min-width: 100px;
  max-width: 160px;
  padding: 8px 12px;
  background: var(--ai-color-info-bg, rgba(22, 119, 255, 0.08));
  border: 1.5px solid var(--ai-color-info, #4581e9);
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.icon {
  font-size: 14px;
  flex-shrink: 0;
}

.label {
  font-size: 11px;
  color: var(--ai-text-primary, #333);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
