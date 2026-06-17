<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

interface Props {
  data: {
    label: string
    bpmnType: string
  }
}

defineProps<Props>()
</script>

<template>
  <div :class="$style.node">
    <Handle type="target" :position="Position.Top" />
    <div :class="$style.circle">
      <div :class="$style.innerCircle" />
    </div>
    <div :class="$style.label">{{ data.label }}</div>
  </div>
</template>

<style module>
.node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(229, 1, 19, 0.08);
  border: 2px solid var(--ai-color-danger, #e50113);
  display: flex;
  align-items: center;
  justify-content: center;
}

.innerCircle {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--ai-color-danger, #e50113);
}

.label {
  font-size: 11px;
  color: var(--ai-text-primary, #333);
  white-space: nowrap;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
