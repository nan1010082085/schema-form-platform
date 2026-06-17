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
    <div :class="$style.circle">
      <div :class="$style.innerCircle" />
    </div>
    <div :class="$style.label">{{ data.label }}</div>
    <Handle type="source" :position="Position.Bottom" />
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
  background: var(--ai-color-success-bg, rgba(82, 196, 26, 0.15));
  border: 2px solid var(--ai-color-success, #52c41a);
  display: flex;
  align-items: center;
  justify-content: center;
}

.innerCircle {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--ai-color-success, #52c41a);
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
