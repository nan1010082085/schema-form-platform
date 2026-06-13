<script setup lang="ts">
/**
 * ConditionNodePanel — 条件节点配置面板
 */
import { computed } from 'vue'
import type { WorkflowNodeData, WorkflowVariable } from '@/composables/useWorkflow'
import styles from './WorkflowNodePanel.module.scss'

interface Props {
  nodeData: WorkflowNodeData
  variables?: WorkflowVariable[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:config': [config: Record<string, unknown>]
}>()

const config = computed(() => props.nodeData.config)

function updateConfig(key: string, value: unknown) {
  emit('update:config', { ...config.value, [key]: value })
}

const operatorOptions = [
  { label: '等于', value: 'equals' },
  { label: '不等于', value: 'not_equals' },
  { label: '大于', value: 'greater_than' },
  { label: '小于', value: 'less_than' },
  { label: '包含', value: 'contains' },
  { label: '不包含', value: 'not_contains' },
  { label: '为空', value: 'is_empty' },
  { label: '不为空', value: 'is_not_empty' },
]

const fieldOptions = computed(() => {
  if (props.variables?.length) {
    return props.variables.map(v => ({ label: v.label, value: v.key }))
  }
  return [
    { label: '表单字段 A', value: 'field_a' },
    { label: '表单字段 B', value: 'field_b' },
  ]
})
</script>

<template>
  <div :class="styles.panel">
    <t-form label-align="top" size="small">
      <t-form-item label="判断字段">
        <t-select
          :model-value="config.field as string"
          placeholder="选择字段"
          filterable
          :class="styles.fullWidth"
          @update:model-value="updateConfig('field', $event)"
        >
          <t-option
            v-for="opt in fieldOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </t-select>
      </t-form-item>

      <t-form-item label="运算符">
        <t-select
          :model-value="(config.operator as string) || 'equals'"
          :class="styles.fullWidth"
          @update:model-value="updateConfig('operator', $event)"
        >
          <t-option
            v-for="opt in operatorOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </t-select>
      </t-form-item>

      <t-form-item v-if="!['is_empty', 'is_not_empty'].includes(config.operator as string)" label="比较值">
        <t-input
          :model-value="config.value as string"
          placeholder="输入比较值"
          @update:model-value="updateConfig('value', $event)"
        />
      </t-form-item>
    </t-form>
  </div>
</template>
