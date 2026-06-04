<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

interface Props {
  data: {
    label: string
    bpmnType: string
  }
}

defineProps<Props>()

const gatewayIcons: Record<string, string> = {
  exclusiveGateway: '&#x2716;',
  parallelGateway: '&#x002B;',
  inclusiveGateway: '&#x25CE;',
}
</script>

<template>
  <div :class="$style.node">
    <Handle type="target" :position="Position.Top" />
    <div :class="$style.diamond">
      <span :class="$style.icon" v-html="gatewayIcons[data.bpmnType] || '&#x25C6;'" />
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

.diamond {
  width: 32px;
  height: 32px;
  background: var(--ai-color-warning-bg, rgba(250, 173, 20, 0.1));
  border: 1.5px solid var(--ai-color-warning, #faad14);
  transform: rotate(45deg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon {
  transform: rotate(-45deg);
  font-size: 14px;
  color: var(--ai-color-warning, #faad14);
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
