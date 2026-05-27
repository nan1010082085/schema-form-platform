<template>
  <div
    :class="$style.canvas"
    @drop="onDrop"
    @dragover="onDragOver"
  >
    <VueFlow
      v-model:nodes="nodes"
      v-model:edges="edges"
      :class="$style.flow"
      :default-edge-options="defaultEdgeOptions"
      :snap-to-grid="true"
      :snap-grid="[10, 10]"
      fit-view-on-init
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

      <Background :gap="10" :size="1" />
      <Controls />
    </VueFlow>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { VueFlow, useVueFlow, MarkerType } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import type { Node, Edge } from '@vue-flow/core'
import { useFlowDesignerStore } from '../stores/flowDesigner.js'
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
} from './nodes/index.js'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

const BPMN_TYPE_TO_VF_TYPE: Record<string, string> = {
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
}

const defaultEdgeOptions = {
  type: 'smoothstep' as const,
  style: { stroke: '#a0a0a0', strokeWidth: 1.5 },
  markerEnd: { type: MarkerType.ArrowClosed },
}

const props = defineProps<{
  initialNodes?: Node[]
  initialEdges?: Edge[]
}>()

const store = useFlowDesignerStore()
const nodes = ref<Node[]>(props.initialNodes ?? [])
const edges = ref<Edge[]>(props.initialEdges ?? [])

const {
  onNodeClick,
  onEdgeClick,
  onPaneClick,
  onConnect,
  addNodes,
  addEdges,
  getNodes,
  getEdges,
  toObject,
  removeNodes,
  removeEdges,
  fitView,
  screenToFlowCoordinate,
} = useVueFlow()

onNodeClick(({ node }) => store.selectNode(node.id))
onEdgeClick(({ edge }) => store.selectEdge(edge.id))
onPaneClick(() => store.clearSelection())

onConnect((params) => {
  addEdges({
    id: `e-${params.source}-${params.target}`,
    source: params.source,
    target: params.target,
    sourceHandle: params.sourceHandle,
    targetHandle: params.targetHandle,
  })
})

let historyTimer: ReturnType<typeof setTimeout> | null = null
watch([nodes, edges], () => {
  if (historyTimer) clearTimeout(historyTimer)
  historyTimer = setTimeout(() => {
    store.pushHistory(toObject())
  }, 200)
}, { deep: true })

function onKeyDown(e: KeyboardEvent) {
  const target = e.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

  if (e.key === 'Delete' || e.key === 'Backspace') {
    const selectedNodes = getNodes.value.filter(n => n.selected)
    const selectedEdges = getEdges.value.filter(e => e.selected)
    if (selectedNodes.length) removeNodes(selectedNodes.map(n => n.id))
    if (selectedEdges.length) removeEdges(selectedEdges.map(e => e.id))
  }
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
}

function onDrop(e: DragEvent) {
  if (!e.dataTransfer) return
  const raw = e.dataTransfer.getData('application/bpmn-node')
  if (!raw) return

  const payload = JSON.parse(raw) as {
    shape: string
    data: Record<string, unknown>
    width: number
    height: number
  }

  const vfType = BPMN_TYPE_TO_VF_TYPE[payload.shape]
  if (!vfType) return

  const position = screenToFlowCoordinate({
    x: e.clientX - payload.width / 2,
    y: e.clientY - payload.height / 2,
  })

  addNodes({
    id: `node-${Date.now()}`,
    type: vfType,
    position,
    data: payload.data,
  })
}

onMounted(() => window.addEventListener('keydown', onKeyDown))
onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  if (historyTimer) clearTimeout(historyTimer)
})

defineExpose({
  getGraph: () => toObject(),
  loadGraph: (data: { nodes: Node[]; edges: Edge[] }) => {
    nodes.value = data.nodes
    edges.value = data.edges
    nextTick(() => fitView())
  },
  addNode: (node: Node) => addNodes(node),
})
</script>

<style module>
.canvas {
  flex: 1;
  position: relative;
  overflow: hidden;
  min-width: 0;
}

.flow {
  width: 100%;
  height: 100%;
}
</style>
