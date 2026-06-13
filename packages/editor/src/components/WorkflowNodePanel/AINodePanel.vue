<script setup lang="ts">
/**
 * AINodePanel — AI 节点配置面板
 */
import { computed } from 'vue'
import type { WorkflowNodeData } from '@/composables/useWorkflow'
import styles from './WorkflowNodePanel.module.scss'

interface Props {
  nodeData: WorkflowNodeData
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:config': [config: Record<string, unknown>]
}>()

const config = computed(() => props.nodeData.config)

function updateConfig(key: string, value: unknown) {
  emit('update:config', { ...config.value, [key]: value })
}

const modelOptions = [
  { label: 'GPT-4', value: 'gpt-4' },
  { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
  { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
  { label: 'Claude 3 Opus', value: 'claude-3-opus' },
  { label: 'Claude 3 Sonnet', value: 'claude-3-sonnet' },
]
</script>

<template>
  <div :class="styles.panel">
    <t-form label-align="top" size="small">
      <t-form-item label="AI 模型">
        <t-select
          :model-value="(config.model as string) || 'gpt-4'"
          :class="styles.fullWidth"
          @update:model-value="updateConfig('model', $event)"
        >
          <t-option
            v-for="opt in modelOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </t-select>
      </t-form-item>

      <t-form-item label="提示词">
        <t-textarea
          :model-value="config.prompt as string"
          :rows="4"
          placeholder="输入 AI 提示词..."
          @update:model-value="updateConfig('prompt', $event)"
        />
      </t-form-item>

      <t-form-item label="温度">
        <t-slider
          :model-value="(config.temperature as number) ?? 0.7"
          :min="0"
          :max="2"
          :step="0.1"
          :show-input="true"
          @update:model-value="updateConfig('temperature', $event)"
        />
      </t-form-item>

      <t-form-item label="最大 Token 数">
        <t-input
          :model-value="(config.maxTokens as number) || 2000"
          type="number"
          @update:model-value="updateConfig('maxTokens', Number($event))"
        />
      </t-form-item>
    </t-form>
  </div>
</template>
