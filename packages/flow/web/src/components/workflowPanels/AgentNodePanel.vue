<template>
  <div :class="$style.container">
    <SectionToggle title="Agent 配置" :count="4">
      <FieldRow label="Agent 名称">
        <t-input
          :model-value="name"
          placeholder="输入 Agent 名称"
          @input="update('name', $event)"
        />
      </FieldRow>

      <FieldRow label="Agent 类型">
        <t-select
          :model-value="agentType"
          placeholder="选择 Agent 类型"
          @change="update('agentType', $event)"
        >
          <t-option label="LLM Agent" value="llm" />
          <t-option label="Tool Agent" value="tool" />
          <t-option label="Collaborator" value="collaborator" />
          <t-option label="Supervisor" value="supervisor" />
        </t-select>
      </FieldRow>

      <FieldRow label="模型">
        <t-select
          :model-value="model"
          filterable
          placeholder="选择模型"
          @change="update('model', $event)"
        >
          <t-option
            v-for="opt in modelOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </t-select>
      </FieldRow>

      <FieldRow label="系统提示词" textarea>
        <t-input
          type="textarea"
          :model-value="systemPrompt"
          :rows="4"
          placeholder="定义 Agent 的角色和行为"
          @input="update('systemPrompt', $event)"
        />
      </FieldRow>
    </SectionToggle>

    <SectionToggle title="工具配置" :count="1">
      <FieldRow label="可用工具">
        <t-select
          :model-value="tools"
          multiple
          filterable
          placeholder="选择可用工具"
          @change="update('tools', $event)"
        >
          <t-option
            v-for="tool in availableTools"
            :key="tool"
            :label="tool"
            :value="tool"
          />
        </t-select>
      </FieldRow>
    </SectionToggle>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Node } from '@vue-flow/core'
import SectionToggle from '@/components/nodePanels/SectionToggle.vue'
import FieldRow from '@/components/nodePanels/FieldRow.vue'

const props = defineProps<{ node: Node }>()
const emit = defineEmits<{ updateNodeData: [key: string, value: unknown] }>()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

const name = computed(() => (props.node.data?.name as string) ?? '')
const agentType = computed(() => (props.node.data?.agentType as string) ?? 'llm')
const model = computed(() => (props.node.data?.model as string) ?? '')
const systemPrompt = computed(() => (props.node.data?.systemPrompt as string) ?? '')
const tools = computed(() => (props.node.data?.tools as string[]) ?? [])

const modelOptions = [
  { label: 'GPT-4o', value: 'gpt-4o' },
  { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
  { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet' },
  { label: 'Claude 3 Haiku', value: 'claude-3-haiku' },
  { label: 'DeepSeek V3', value: 'deepseek-v3' },
  { label: 'Qwen Max', value: 'qwen-max' },
]

const availableTools = [
  'search_schemas',
  'get_schema_detail',
  'create_schema',
  'update_schema',
  'search_flows',
  'get_flow_detail',
  'create_flow',
  'update_flow',
  'search_users',
  'send_notification',
  'http_request',
  'database_query',
  'file_operation',
]
</script>

<style module>
.container {
  padding: 16px;
}
</style>
