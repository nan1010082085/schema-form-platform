<script setup lang="ts">
/**
 * FlowNodePanel — Flow 节点配置面板
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

// 模拟流程定义列表
const flowOptions = [
  { label: '审批流程', value: 'flow_1' },
  { label: '通知流程', value: 'flow_2' },
  { label: '数据同步流程', value: 'flow_3' },
]
</script>

<template>
  <div :class="styles.panel">
    <t-form label-align="top" size="small">
      <t-form-item label="关联流程">
        <t-select
          :model-value="config.flowId as string"
          placeholder="选择流程定义"
          filterable
          :class="styles.fullWidth"
          @update:model-value="updateConfig('flowId', $event)"
        >
          <t-option
            v-for="opt in flowOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </t-select>
      </t-form-item>

      <t-form-item label="触发方式">
        <t-select
          :model-value="(config.triggerType as string) || 'manual'"
          :class="styles.fullWidth"
          @update:model-value="updateConfig('triggerType', $event)"
        >
          <t-option label="手动触发" value="manual" />
          <t-option label="自动触发" value="auto" />
          <t-option label="事件触发" value="event" />
        </t-select>
      </t-form-item>

      <t-form-item label="超时时间（秒）">
        <t-input
          :model-value="(config.timeout as number) || 30"
          type="number"
          @update:model-value="updateConfig('timeout', Number($event))"
        />
      </t-form-item>
    </t-form>
  </div>
</template>
