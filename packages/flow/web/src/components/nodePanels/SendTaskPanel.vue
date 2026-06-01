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

const serviceType = computed(() => (props.node.data?.serviceType as string) ?? 'http')

function getServiceConfig(): Record<string, unknown> {
  const cfg = props.node.data?.serviceConfig
  return (typeof cfg === 'object' && cfg !== null ? cfg : {}) as Record<string, unknown>
}

const targetUrl = computed(() => (getServiceConfig().url as string) ?? '')
const messageType = computed(() => (props.node.data?.messageType as string) ?? '')
const messageTemplate = computed(() => (getServiceConfig().bodyTemplate as string) ?? '')

function updateServiceConfig(key: string, value: unknown) {
  const current = getServiceConfig()
  emit('updateNodeData', 'serviceConfig', { ...current, [key]: value })
}
</script>

<template>
  <SectionToggle title="节点配置" :count="4">
    <FieldRow label="服务类型">
      <el-radio-group
        :model-value="serviceType"

        @change="update('serviceType', $event)"
      >
        <el-radio value="http">HTTP 请求</el-radio>
        <el-radio value="function">函数调用</el-radio>
      </el-radio-group>
    </FieldRow>

    <FieldRow label="消息类型">
      <el-input
        :model-value="messageType"
        placeholder="例: notification、email"

        @input="update('messageType', $event)"
      />
    </FieldRow>

    <FieldRow label="目标地址">
      <el-input
        :model-value="targetUrl"
        placeholder="https://api.example.com/send"

        @input="updateServiceConfig('url', $event)"
      />
    </FieldRow>

    <FieldRow label="消息内容模板" textarea>
      <el-input
        type="textarea"
        :model-value="messageTemplate"
        :rows="4"
        placeholder='{"title": "...", "body": "${variable}"}'

        @input="updateServiceConfig('bodyTemplate', $event)"
      />
    </FieldRow>
  </SectionToggle>
</template>
