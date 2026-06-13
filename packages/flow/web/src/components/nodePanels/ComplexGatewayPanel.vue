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
  <SectionToggle title="复杂网关配置" :count="1">
    <FieldRow label="复杂条件">
      <t-input
        :model-value="(node.data?.complexCondition as string) ?? ''"
        placeholder="条件表达式"
        @input="update('complexCondition', $event)"
      />
    </FieldRow>
  </SectionToggle>
</template>
