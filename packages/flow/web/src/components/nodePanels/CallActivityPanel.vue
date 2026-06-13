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
  <SectionToggle title="调用配置" :count="1">
    <FieldRow label="流程定义 ID">
      <t-input
        :model-value="(node.data?.callActivityDefinitionId as string) ?? ''"
        placeholder="关联的流程定义 ID"
        @input="update('callActivityDefinitionId', $event)"
      />
    </FieldRow>
  </SectionToggle>
</template>
