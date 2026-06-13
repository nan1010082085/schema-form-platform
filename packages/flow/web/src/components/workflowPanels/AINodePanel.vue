<script setup lang="ts">
import { computed } from 'vue'
import type { Node } from '@vue-flow/core'
import SectionToggle from '@/components/nodePanels/SectionToggle.vue'
import FieldRow from '@/components/nodePanels/FieldRow.vue'
import HintText from '@/components/nodePanels/HintText.vue'

const props = defineProps<{ node: Node }>()
const emit = defineEmits<{ updateNodeData: [key: string, value: unknown] }>()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

/* --- Model config --- */

const model = computed(() => (props.node.data?.aiModel as string) ?? '')

const temperature = computed(() => {
  const val = props.node.data?.temperature as number | undefined
  return val ?? 0.7
})

const maxTokens = computed(() => {
  const val = props.node.data?.maxTokens as number | undefined
  return val ?? 2048
})

const modelOptions = [
  { label: 'GPT-4o', value: 'gpt-4o' },
  { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
  { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet' },
  { label: 'Claude 3 Haiku', value: 'claude-3-haiku' },
  { label: 'DeepSeek V3', value: 'deepseek-v3' },
  { label: 'Qwen Max', value: 'qwen-max' },
]

/* --- Prompt --- */

const systemPrompt = computed(() => (props.node.data?.systemPrompt as string) ?? '')
const userPrompt = computed(() => (props.node.data?.userPrompt as string) ?? '')

/* --- Output --- */

const outputVariable = computed(() => (props.node.data?.outputVariable as string) ?? '')

const outputFormat = computed(() => (props.node.data?.outputFormat as string) ?? 'text')

const outputFormatOptions = [
  { label: '纯文本', value: 'text' },
  { label: 'JSON', value: 'json' },
  { label: 'Markdown', value: 'markdown' },
]
</script>

<template>
  <!-- 模型配置 -->
  <SectionToggle title="模型配置" :count="3">
    <FieldRow label="AI 模型">
      <t-select
        :value="model"
        filterable
        placeholder="选择 AI 模型"
        @change="update('aiModel', $event)"
      >
        <t-option
          v-for="opt in modelOptions"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </t-select>
    </FieldRow>

    <FieldRow label="温度">
      <t-slider
        :value="temperature"
        :min="0"
        :max="2"
        :step="0.1"
        :show-tooltip="true"
        :format-tooltip="(val: number) => val.toFixed(1)"
        @change="update('temperature', $event)"
      />
    </FieldRow>
    <HintText>值越低输出越确定，值越高输出越随机。推荐 0.3-0.9。</HintText>

    <FieldRow label="最大 Token">
      <t-input-number
        :value="maxTokens"
        :min="1"
        :max="128000"
        :step="256"
        @change="update('maxTokens', $event)"
      />
    </FieldRow>
  </SectionToggle>

  <!-- 提示词 -->
  <SectionToggle title="提示词" :count="2">
    <FieldRow label="系统提示" textarea>
      <t-input
        type="textarea"
        :value="systemPrompt"
        placeholder="定义 AI 的角色和行为规则"
        :rows="3"
        @input="update('systemPrompt', $event)"
      />
    </FieldRow>

    <FieldRow label="用户提示" textarea>
      <t-input
        type="textarea"
        :value="userPrompt"
        placeholder="用户的具体请求，支持 ${变量} 引用"
        :rows="4"
        @input="update('userPrompt', $event)"
      />
    </FieldRow>
    <HintText>支持 <code>${变量名}</code> 语法引用流程变量</HintText>
  </SectionToggle>

  <!-- 输出配置 -->
  <SectionToggle title="输出配置" :count="2">
    <FieldRow label="输出变量">
      <t-input
        :value="outputVariable"
        placeholder="例: aiResult"
        @input="update('outputVariable', $event)"
      />
    </FieldRow>
    <HintText>AI 响应将写入该流程变量名</HintText>

    <FieldRow label="输出格式">
      <t-select
        :value="outputFormat"
        @change="update('outputFormat', $event)"
      >
        <t-option
          v-for="opt in outputFormatOptions"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </t-select>
    </FieldRow>
  </SectionToggle>
</template>
