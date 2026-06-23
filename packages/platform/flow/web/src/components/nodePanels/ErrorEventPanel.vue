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
  <SectionToggle title="错误配置" :count="1">
    <FieldRow label="错误代码">
      <el-input
        :model-value="(node.data?.errorCode as string) ?? ''"
        placeholder="错误标识符"
        @input="update('errorCode', $event)"
      />
    </FieldRow>
  </SectionToggle>
</template>
