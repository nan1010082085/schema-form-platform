<template>
  <div :class="[$style.node, { [$style.selected]: props.selected }]">
    <Handle type="target" :position="Position.Top" :class="$style.handle" />
    <span :class="$style.icon">✉</span>
    <span :class="$style.label">{{ props.data?.label ?? '发送任务' }}</span>
    <Handle type="source" :position="Position.Bottom" :class="$style.handle" />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

const props = defineProps<{
  id: string
  data?: { label?: string; [key: string]: unknown }
  selected?: boolean
}>()
</script>

<style module>
.node {
  width: 160px;
  height: 60px;
  background: #fff3e0;
  border: 1.5px solid #e65100;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  cursor: grab;
}

.selected {
  box-shadow: 0 0 0 2px #e65100;
}

.icon {
  font-size: 16px;
  pointer-events: none;
  user-select: none;
}

.label {
  font-size: 13px;
  color: #bf360c;
  pointer-events: none;
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.handle {
  width: 8px;
  height: 8px;
  background: #fff;
  border: 1px solid #409eff;
}
</style>
