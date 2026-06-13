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
  <SectionToggle title="条件配置" :count="1">
    <FieldRow label="条件表达式">
      <t-input
        :model-value="(node.data?.conditionExpression as string) ?? ''"
        placeholder="如: amount > 1000"
        @input="update('conditionExpression', $event)"
      />
    </FieldRow>
  </SectionToggle>
</template>
