<script setup lang="ts">
/**
 * FlowNodePanel — Flow 节点配置面板
 */
import { computed } from 'vue'
import { ElForm, ElFormItem, ElSelect, ElOption, ElInput } from 'element-plus'
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
    <el-form label-position="top" size="small">
      <el-form-item label="关联流程">
        <el-select
          :model-value="config.flowId as string"
          placeholder="选择流程定义"
          filterable
          :class="styles.fullWidth"
          @update:model-value="updateConfig('flowId', $event)"
        >
          <el-option
            v-for="opt in flowOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="触发方式">
        <el-select
          :model-value="(config.triggerType as string) || 'manual'"
          :class="styles.fullWidth"
          @update:model-value="updateConfig('triggerType', $event)"
        >
          <el-option label="手动触发" value="manual" />
          <el-option label="自动触发" value="auto" />
          <el-option label="事件触发" value="event" />
        </el-select>
      </el-form-item>

      <el-form-item label="超时时间（秒）">
        <el-input
          :model-value="(config.timeout as number) || 30"
          type="number"
          @update:model-value="updateConfig('timeout', Number($event))"
        />
      </el-form-item>
    </el-form>
  </div>
</template>
