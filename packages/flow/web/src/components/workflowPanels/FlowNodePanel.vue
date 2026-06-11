<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import type { Node } from '@vue-flow/core'
import { Plus, Delete } from '@element-plus/icons-vue'
import SectionToggle from '@/components/nodePanels/SectionToggle.vue'
import FieldRow from '@/components/nodePanels/FieldRow.vue'
import HintText from '@/components/nodePanels/HintText.vue'
import { flowApi } from '@/api/flowApi.js'
import styles from './FlowNodePanel.module.scss'

const props = defineProps<{ node: Node }>()
const emit = defineEmits<{ updateNodeData: [key: string, value: unknown] }>()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

/* --- Flow definitions list --- */

interface FlowDefinition {
  id: string
  name: string
  status: string
}

const flowDefinitions = ref<FlowDefinition[]>([])

onMounted(async () => {
  try {
    const data = await flowApi.listFlows({ pageSize: 100 })
    flowDefinitions.value = (data?.items as FlowDefinition[]) ?? []
  } catch {
    // dropdown stays empty
  }
})

/* --- Selected flow definition --- */

const flowDefinitionId = computed(() => (props.node.data?.flowDefinitionId as string) ?? '')

function onFlowSelect(id: string) {
  update('flowDefinitionId', id)
  const def = flowDefinitions.value.find((f) => f.id === id)
  update('flowDefinitionName', def?.name ?? '')
}

/* --- Node list within the sub-flow --- */

interface FlowNodeConfig {
  nodeRef: string
  label: string
  inputMapping: string
}

const flowNodes = computed<FlowNodeConfig[]>(() => {
  return (props.node.data?.flowNodes as FlowNodeConfig[]) ?? []
})

function addFlowNode() {
  const current = [...flowNodes.value]
  current.push({ nodeRef: '', label: '', inputMapping: '' })
  update('flowNodes', current)
}

function removeFlowNode(index: number) {
  const current = [...flowNodes.value]
  current.splice(index, 1)
  update('flowNodes', current)
}

function updateFlowNode(index: number, key: keyof FlowNodeConfig, value: string) {
  const current = [...flowNodes.value]
  current[index] = { ...current[index], [key]: value }
  update('flowNodes', current)
}
</script>

<template>
  <!-- 流程配置 -->
  <SectionToggle title="流程配置" :count="1">
    <FieldRow label="流程定义">
      <el-select
        :model-value="flowDefinitionId"
        filterable
        placeholder="选择子流程定义"
        @change="onFlowSelect"
      >
        <el-option
          v-for="def in flowDefinitions"
          :key="def.id"
          :label="def.name"
          :value="def.id"
        >
          <span>{{ def.name }}</span>
          <el-tag
            v-if="def.status === 'published'"
            size="small"
            type="success"
            :class="styles.statusTag"
          >已发布</el-tag>
        </el-option>
      </el-select>
    </FieldRow>
    <HintText>选择一个已发布的流程定义作为子流程执行</HintText>
  </SectionToggle>

  <!-- 节点配置 -->
  <SectionToggle title="节点配置" :count="flowNodes.length">
    <div
      v-for="(node, index) in flowNodes"
      :key="index"
      :class="styles.nodeCard"
    >
      <div :class="styles.nodeCardHeader">
        <span :class="styles.nodeCardTitle">节点 {{ index + 1 }}</span>
        <el-icon
          :class="styles.deleteIcon"
          @click="removeFlowNode(index)"
        >
          <Delete />
        </el-icon>
      </div>

      <FieldRow label="节点引用">
        <el-input
          :model-value="node.nodeRef"
          placeholder="目标节点 ID"
          @input="updateFlowNode(index, 'nodeRef', $event)"
        />
      </FieldRow>

      <FieldRow label="节点标签">
        <el-input
          :model-value="node.label"
          placeholder="显示名称"
          @input="updateFlowNode(index, 'label', $event)"
        />
      </FieldRow>

      <FieldRow label="输入映射">
        <el-input
          :model-value="node.inputMapping"
          type="textarea"
          :rows="2"
          placeholder='例: {"key": "${variables.value}"}'
          @input="updateFlowNode(index, 'inputMapping', $event)"
        />
      </FieldRow>
    </div>

    <el-button
      :class="styles.addNodeBtn"
      :icon="Plus"
      @click="addFlowNode"
    >
      添加节点
    </el-button>

    <HintText v-if="flowNodes.length === 0">
      配置子流程中需要调用的节点及其输入映射关系
    </HintText>
  </SectionToggle>
</template>
