<template>
  <div ref="containerRef" :class="styles.container">
    <div v-if="!hasNodes" :class="styles.empty">
      <el-empty description="暂无流程图数据" :image-size="80" />
    </div>

    <template v-else>
      <VueFlow
        :id="flowId"
        :nodes="vfNodes"
        :edges="vfEdges"
        :class="styles.flow"
        :nodes-connectable="false"
        :nodes-draggable="false"
        :edges-updatable="false"
        :elements-selectable="false"
        :pannable="true"
        :zoomable="true"
        :default-edge-options="defaultEdgeOptions"
        :default-viewport="{ zoom: 1, x: 0, y: 0 }"
        :min-zoom="0.2"
        :max-zoom="2"
      >
        <template #node-start-event="nodeProps">
          <StartEventNode v-bind="nodeProps" />
        </template>
        <template #node-end-event="nodeProps">
          <EndEventNode v-bind="nodeProps" />
        </template>
        <template #node-user-task="nodeProps">
          <UserTaskNode v-bind="nodeProps" />
        </template>
        <template #node-service-task="nodeProps">
          <ServiceTaskNode v-bind="nodeProps" />
        </template>
        <template #node-exclusive-gateway="nodeProps">
          <ExclusiveGatewayNode v-bind="nodeProps" />
        </template>
        <template #node-parallel-gateway="nodeProps">
          <ParallelGatewayNode v-bind="nodeProps" />
        </template>
        <template #node-inclusive-gateway="nodeProps">
          <InclusiveGatewayNode v-bind="nodeProps" />
        </template>
        <template #node-timer-event="nodeProps">
          <TimerEventNode v-bind="nodeProps" />
        </template>
        <template #node-script-task="nodeProps">
          <ScriptTaskNode v-bind="nodeProps" />
        </template>
        <template #node-send-task="nodeProps">
          <SendTaskNode v-bind="nodeProps" />
        </template>
        <template #node-receive-task="nodeProps">
          <ReceiveTaskNode v-bind="nodeProps" />
        </template>
        <template #node-sub-process="nodeProps">
          <SubProcessNode v-bind="nodeProps" />
        </template>

        <template #edge-animated-edge="edgeProps">
          <AnimatedEdge v-bind="edgeProps" />
        </template>

        <Background :gap="20" :size="0.8" color="#d0d5dd" />
        <Controls />
      </VueFlow>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { VueFlow, MarkerType, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import type { FlowGraph } from '@schema-form/flow-shared'
import {
  StartEventNode,
  EndEventNode,
  TimerEventNode,
  UserTaskNode,
  ServiceTaskNode,
  ScriptTaskNode,
  SendTaskNode,
  ReceiveTaskNode,
  ExclusiveGatewayNode,
  ParallelGatewayNode,
  InclusiveGatewayNode,
  SubProcessNode,
} from './nodes/index.js'
import { AnimatedEdge } from './edges/index.js'
import styles from './FlowGraphPreview.module.scss'

const BPMN_SHAPE_TO_VF_TYPE: Record<string, string> = {
  'bpmn-start-event': 'start-event',
  'bpmn-end-event': 'end-event',
  'bpmn-timer-event': 'timer-event',
  'bpmn-user-task': 'user-task',
  'bpmn-service-task': 'service-task',
  'bpmn-script-task': 'script-task',
  'bpmn-send-task': 'send-task',
  'bpmn-receive-task': 'receive-task',
  'bpmn-exclusive-gateway': 'exclusive-gateway',
  'bpmn-parallel-gateway': 'parallel-gateway',
  'bpmn-inclusive-gateway': 'inclusive-gateway',
  'bpmn-sub-process': 'sub-process',
}

const defaultEdgeOptions = {
  type: 'animated-edge' as const,
  style: { stroke: 'var(--border-color)', strokeWidth: 1.5 },
  markerEnd: { type: MarkerType.ArrowClosed },
}

const props = withDefaults(defineProps<{
  graph?: FlowGraph | null
  highlightNodeIds?: string[]
}>(), {
  graph: null,
  highlightNodeIds: () => [],
})

const containerRef = ref<HTMLDivElement>()
const flowId = `flow-preview-${Math.random().toString(36).slice(2, 8)}`

const { fitView } = useVueFlow({ id: flowId })

function resolveNodeType(shape: string): string {
  if (BPMN_SHAPE_TO_VF_TYPE[shape]) return BPMN_SHAPE_TO_VF_TYPE[shape]
  if (shape?.startsWith('bpmn-')) {
    const vfType = shape.slice(5)
    if (BPMN_SHAPE_TO_VF_TYPE[`bpmn-${vfType}`]) return vfType
  }
  return 'user-task'
}

const vfNodes = computed(() => {
  const graphNodes = props.graph?.nodes ?? []
  return graphNodes.map((n) => ({
    id: n.id,
    type: resolveNodeType(n.shape),
    position: { x: n.x, y: n.y },
    data: { ...n.data, label: n.data?.label ?? n.id },
    class: props.highlightNodeIds.includes(n.id) ? 'highlighted' : '',
  }))
})

const vfEdges = computed(() => {
  const graphEdges = props.graph?.edges ?? []
  return graphEdges.map((e) => ({
    id: e.id,
    source: e.source.cell,
    target: e.target.cell,
    label: e.data?.label,
    data: {
      conditionExpression: e.data?.conditionExpression,
      isDefault: e.data?.isDefault,
    },
    class: '',
  }))
})

const hasNodes = computed(() => (props.graph?.nodes?.length ?? 0) > 0)

// fitView after graph loads
watch(
  () => props.graph,
  async (newGraph) => {
    if (newGraph?.nodes?.length) {
      await nextTick()
      setTimeout(() => fitView({ padding: 0.15 }), 100)
    }
  },
  { immediate: true },
)
</script>
