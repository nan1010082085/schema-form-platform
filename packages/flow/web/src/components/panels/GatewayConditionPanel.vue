<script setup lang="ts">
import { computed } from 'vue'
import type { Node, Edge } from '@vue-flow/core'
import { useFlowGraphStore } from '@/stores/flowGraph.js'
import SectionToggle from '../nodePanels/SectionToggle.vue'
import FieldRow from '../nodePanels/FieldRow.vue'
import HintText from '../nodePanels/HintText.vue'
import styles from './GatewayConditionPanel.module.scss'

const props = defineProps<{ node: Node }>()
const emit = defineEmits<{ updateNodeData: [key: string, value: unknown] }>()

const graphStore = useFlowGraphStore()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

const defaultFlow = computed(() => (props.node.data?.defaultFlow as string) ?? '')
const description = computed(() => (props.node.data?.description as string) ?? '')

const gatewayType = computed(() => props.node.type ?? '')
const isExclusive = computed(() => gatewayType.value === 'exclusive-gateway')
const isParallel = computed(() => gatewayType.value === 'parallel-gateway')
const gatewayLabel = computed(() => {
  if (isExclusive.value) return '排他网关'
  if (isParallel.value) return '并行网关'
  return '包含网关'
})
const conditionPlaceholder = computed(() => {
  if (isExclusive.value) return '${amount > 10000}'
  if (isParallel.value) return '(并行网关无条件，所有分支同时执行)'
  return '${status == \'active\'}'
})

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

/* --- Resolve target node label --- */

function targetLabel(edge: Edge): string {
  const targetNode = graphStore.findNode(edge.target)
  return (targetNode?.data?.label as string) ?? edge.target
}
</script>

<template>
  <SectionToggle title="网关配置" :count="2">
    <FieldRow label="默认连线">
      <t-input
        :model-value="defaultFlow"
        placeholder="默认连线 ID（可选）"
        @input="update('defaultFlow', $event)"
      />
    </FieldRow>

    <FieldRow label="网关描述">
      <t-input
        :model-value="description"
        placeholder="网关描述（可选）"
        @input="update('description', $event)"
      />
    </FieldRow>

    <HintText>
      <template v-if="isParallel">
        {{ gatewayLabel }}：所有出线将同时执行，无需配置条件。
      </template>
      <template v-else-if="isExclusive">
        {{ gatewayLabel }}：所有出线中，第一个条件为 true 的分支将被执行。
      </template>
      <template v-else>
        包含网关：允许多个条件同时为 true，所有匹配的分支都会执行。
      </template>
    </HintText>
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
      :class="[styles.edgeCard, { [styles.edgeCardDefault]: edge.data?.isDefault }]"
    >
      <div :class="styles.edgeHeader">
        <span :class="styles.edgeTarget" :title="edge.target">
          → {{ targetLabel(edge) }}
        </span>
        <t-checkbox
          :checked="edge.data?.isDefault ?? false"
          :class="styles.defaultCheck"
          @change="toggleEdgeDefault(edge, $event)"
        >
          默认
        </t-checkbox>
      </div>

      <FieldRow label="条件标签">
        <t-input
          :model-value="(edge.label as string) ?? ''"
          placeholder="条件标签"
          @input="updateEdgeLabel(edge, $event)"
        />
      </FieldRow>

      <FieldRow label="条件表达式">
        <t-input
          :model-value="edge.data?.conditionExpression ?? ''"
          :placeholder="conditionPlaceholder"
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
