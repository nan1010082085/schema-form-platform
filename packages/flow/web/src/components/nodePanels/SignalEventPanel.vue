<script setup lang="ts">
import type { Node } from '@vue-flow/core'
import SectionToggle from './SectionToggle.vue'
import FieldRow from './FieldRow.vue'

defineProps<{ node: Node }>()
const emit = defineEmits<{ updateNodeData: [key: string, value: unknown] }>()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}
</script>

<template>
  <SectionToggle title="信号配置" :count="1">
    <FieldRow label="信号引用">
      <t-input
        :model-value="(node.data?.signalRef as string) ?? ''"
        placeholder="信号标识符"
        @input="update('signalRef', $event)"
      />
    </FieldRow>
  </SectionToggle>
</template>
