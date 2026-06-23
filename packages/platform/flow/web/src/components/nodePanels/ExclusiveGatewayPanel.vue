<script setup lang="ts">
import { computed } from 'vue'
import type { Node, Edge } from '@vue-flow/core'
import { useFlowGraphStore } from '@/stores/flowGraph.js'
import SectionToggle from './SectionToggle.vue'
import FieldRow from './FieldRow.vue'
import HintText from './HintText.vue'
import styles from './ExclusiveGatewayPanel.module.scss'

const props = defineProps<{ node: Node }>()
const emit = defineEmits<{ updateNodeData: [key: string, value: unknown] }>()

const graphStore = useFlowGraphStore()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

const defaultFlow = computed(() => (props.node.data?.defaultFlow as string) ?? '')
const description = computed(() => (props.node.data?.description as string) ?? '')

/* --- Outgoing edges --- */

const outgoingEdges = computed(() =>
  graphStore.edges.filter((e) => e.source === props.node.id),
)

function updateEdgeLabel(edge: Edge, value: string) {
  graphStore.updateEdgeData(edge.id, 'label', value)
}

function updateEdgeCondition(edge: Edge, value: string) {
  graphStore.updateEdgeData(edge.id, 'conditionExpression', value)
}

function toggleEdgeDefault(edge: Edge, value: boolean) {
  graphStore.updateEdgeData(edge.id, 'isDefault', value)
}
</script>

<template>
  <SectionToggle title="节点配置" :count="2">
    <FieldRow label="默认连线">
      <el-input
        :model-value="defaultFlow"
        placeholder="默认连线 ID（可选）"
        @input="update('defaultFlow', $event)"
      />
    </FieldRow>

    <FieldRow label="网关描述">
      <el-input
        :model-value="description"
        placeholder="网关描述（可选）"
        @input="update('description', $event)"
      />
    </FieldRow>
  </SectionToggle>

  <!-- Outgoing edge conditions -->
  <SectionToggle
    v-if="outgoingEdges.length > 0"
    title="出线条件"
    :count="outgoingEdges.length"
  >
    <div
      v-for="edge in outgoingEdges"
      :key="edge.id"
      :class="styles.edgeCard"
    >
      <div :class="styles.edgeHeader">
        <span :class="styles.edgeTarget" :title="edge.target">
          → {{ edge.target }}
        </span>
        <el-checkbox
          :model-value="edge.data?.isDefault ?? false"
          :class="styles.defaultCheck"
          @change="toggleEdgeDefault(edge, $event)"
        >
          默认
        </el-checkbox>
      </div>

      <FieldRow label="条件标签">
        <el-input
          :model-value="(edge.label as string) ?? ''"
          placeholder="条件标签"
          @input="updateEdgeLabel(edge, $event)"
        />
      </FieldRow>

      <FieldRow label="条件表达式">
        <el-input
          :model-value="edge.data?.conditionExpression ?? ''"
          placeholder="${amount > 10000}"
          @input="updateEdgeCondition(edge, $event)"
        />
      </FieldRow>
    </div>

    <HintText>
      表达式使用 JUEL 语法：${变量名 运算符 值}，例如 ${amount &gt; 10000}、${status == 'approved'}
    </HintText>
  </SectionToggle>

  <SectionToggle v-else title="出线条件" :count="0">
    <HintText :indent="false">
      暂无出线。从该网关拖出连线后，可在此配置每条出线的条件表达式。
    </HintText>
  </SectionToggle>
</template>
