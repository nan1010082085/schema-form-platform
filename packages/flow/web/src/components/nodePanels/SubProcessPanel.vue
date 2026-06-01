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

const subProcessId = computed(() => (props.node.data?.subProcessDefinitionId as string) ?? '')

const inputMapping = computed(() => {
  const m = props.node.data?.inputMapping
  if (!m) return ''
  if (typeof m === 'string') return m
  try { return JSON.stringify(m, null, 2) } catch { return '' }
})

const outputMapping = computed(() => {
  const m = props.node.data?.outputMapping
  if (!m) return ''
  if (typeof m === 'string') return m
  try { return JSON.stringify(m, null, 2) } catch { return '' }
})

function parseJsonOrRaw(val: string): unknown {
  try { return JSON.parse(val) } catch { return val }
}
</script>

<template>
  <SectionToggle title="节点配置" :count="3">
    <FieldRow label="子流程 ID">
      <el-input
        :model-value="subProcessId"
        placeholder="输入子流程定义 ID"

        @input="update('subProcessDefinitionId', $event)"
      />
    </FieldRow>

    <FieldRow label="输入变量映射" textarea>
      <el-input
        type="textarea"
        :model-value="inputMapping"
        :rows="3"
        placeholder='{"inputVar": "${parentVar}"}'

        @input="update('inputMapping', parseJsonOrRaw($event))"
      />
    </FieldRow>

    <FieldRow label="输出变量映射" textarea>
      <el-input
        type="textarea"
        :model-value="outputMapping"
        :rows="3"
        placeholder='{"parentResult": "${childOutput}"}'

        @input="update('outputMapping', parseJsonOrRaw($event))"
      />
    </FieldRow>
  </SectionToggle>
</template>
