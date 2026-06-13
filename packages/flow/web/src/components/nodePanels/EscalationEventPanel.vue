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
  <SectionToggle title="升级配置" :count="1">
    <FieldRow label="升级代码">
      <t-input
        :model-value="(node.data?.escalationCode as string) ?? ''"
        placeholder="升级标识符"
        @input="update('escalationCode', $event)"
      />
    </FieldRow>
  </SectionToggle>
</template>
