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
  <SectionToggle title="规则配置" :count="2">
    <FieldRow label="规则表达式">
      <t-input
        :value="(node.data?.ruleRef as string) ?? ''"
        placeholder="如: score >= 90"
        @input="update('ruleRef', $event)"
      />
    </FieldRow>

    <FieldRow label="结果变量">
      <t-input
        :value="(node.data?.resultVariable as string) ?? 'ruleResult'"
        placeholder="存储结果的变量名"
        @input="update('resultVariable', $event)"
      />
    </FieldRow>
  </SectionToggle>
</template>
