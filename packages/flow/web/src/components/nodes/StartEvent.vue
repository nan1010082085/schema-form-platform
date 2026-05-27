<template>
  <div :class="[$style.node, { [$style.selected]: props.selected }]">
    <Handle type="source" :position="Position.Bottom" :class="$style.handle" />
    <span :class="$style.label">{{ props.data?.label ?? '开始' }}</span>
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
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e8f5e9;
  border: 2px solid #4caf50;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
}

.selected {
  box-shadow: 0 0 0 2px #4caf50;
}

.label {
  font-size: 11px;
  color: #2e7d32;
  pointer-events: none;
  user-select: none;
}

.handle {
  width: 8px;
  height: 8px;
  background: #fff;
  border: 1px solid #409eff;
}
</style>
