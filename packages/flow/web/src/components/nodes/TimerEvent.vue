<template>
  <div :class="[$style.node, { [$style.selected]: props.selected }]">
    <Handle type="target" :position="Position.Top" :class="$style.handle" />
    <span :class="$style.icon">⏱</span>
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
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e0f2f1;
  border: 2px dashed #009688;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
}

.selected {
  box-shadow: 0 0 0 2px #009688;
}

.icon {
  font-size: 14px;
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
