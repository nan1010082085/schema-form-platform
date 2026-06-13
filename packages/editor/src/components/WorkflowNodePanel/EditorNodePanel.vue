<script setup lang="ts">
/**
 * EditorNodePanel — Editor 节点配置面板
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

// 模拟表单 Schema 列表
const schemaOptions = [
  { label: '请假申请表', value: 'schema_1' },
  { label: '报销申请表', value: 'schema_2' },
  { label: '采购申请表', value: 'schema_3' },
]
</script>

<template>
  <div :class="styles.panel">
    <t-form label-align="top" size="small">
      <t-form-item label="关联表单">
        <t-select
          :model-value="config.schemaId as string"
          placeholder="选择表单 Schema"
          filterable
          :class="styles.fullWidth"
          @update:model-value="updateConfig('schemaId', $event)"
        >
          <t-option
            v-for="opt in schemaOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </t-select>
      </t-form-item>

      <t-form-item label="操作类型">
        <t-select
          :model-value="(config.action as string) || 'read'"
          :class="styles.fullWidth"
          @update:model-value="updateConfig('action', $event)"
        >
          <t-option label="读取数据" value="read" />
          <t-option label="写入数据" value="write" />
          <t-option label="更新数据" value="update" />
        </t-select>
      </t-form-item>
    </t-form>
  </div>
</template>
