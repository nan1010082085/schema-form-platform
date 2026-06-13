<script setup lang="ts">
import { computed } from 'vue'
import type { Node } from '@vue-flow/core'
import SectionToggle from './SectionToggle.vue'
import FieldRow from './FieldRow.vue'

const props = defineProps<{ node: Node }>()
const emit = defineEmits<{ updateNodeData: [key: string, value: unknown] }>()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

const messageType = computed(() => (props.node.data?.messageType as string) ?? '')
const timeout = computed(() => (props.node.data?.timeout as number | undefined) ?? undefined)
const receiveCondition = computed(() => (props.node.data?.receiveCondition as string) ?? '')
</script>

<template>
  <SectionToggle title="节点配置" :count="3">
    <FieldRow label="消息类型">
      <t-input
        :model-value="messageType"
        placeholder="例: notification、callback"

        @input="update('messageType', $event)"
      />
    </FieldRow>

    <FieldRow label="超时时间">
      <t-input-number
        :model-value="timeout"
        :min="1"
        :max="86400"

        placeholder="秒"
        @change="update('timeout', $event)"
      />
    </FieldRow>

    <FieldRow label="接收条件">
      <t-input
        :model-value="receiveCondition"
        placeholder="例: ${status === 'approved'}"

        @input="update('receiveCondition', $event)"
      />
    </FieldRow>
  </SectionToggle>
</template>
