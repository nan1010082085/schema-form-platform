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
  <SectionToggle title="消息配置" :count="1">
    <FieldRow label="消息引用">
      <t-input
        :model-value="(node.data?.messageRef as string) ?? ''"
        placeholder="消息标识符"
        @input="update('messageRef', $event)"
      />
    </FieldRow>
  </SectionToggle>
</template>
