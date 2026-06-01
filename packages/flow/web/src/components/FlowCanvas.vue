<template>
  <div
    :class="styles.canvas"
    @drop="onDrop"
    @dragover="onDragOver"
  >
    <VueFlow
      v-model:nodes="flowGraph.nodes"
      v-model:edges="flowGraph.edges"
      :class="styles.flow"
      :default-edge-options="defaultEdgeOptions"
      :snap-to-grid="true"
      :snap-grid="[10, 10]"
      :nodes-connectable="!readOnly"
      :nodes-draggable="!readOnly"
      :edges-updatable="!readOnly"
      :elements-selectable="!readOnly"
      :default-viewport="{ zoom: 1, x: 0, y: 0 }"
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
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted } from 'vue'
import { VueFlow, useVueFlow, MarkerType } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/controls/dist/style.css'
import { useFlowDesignerStore } from '../stores/flowDesigner.js'
import { useFlowGraphStore } from '../stores/flowGraph.js'
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
import styles from './FlowCanvas.module.scss'

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
  'bpmn-sub-process': 'sub-process',
}

const defaultEdgeOptions = {
  type: 'animated-edge' as const,
  style: { stroke: 'var(--el-border-color)', strokeWidth: 1.5 },
  markerEnd: { type: MarkerType.ArrowClosed },
}

const props = defineProps<{
  readOnly?: boolean
}>()

const readOnly = computed(() => props.readOnly ?? false)

const designerStore = useFlowDesignerStore()
const flowGraph = useFlowGraphStore()

const {
  onNodeClick,
  onEdgeClick,
  onPaneClick,
  onConnect,
  getNodes,
  getEdges,
  screenToFlowCoordinate,
  fitView,
} = useVueFlow({ id: 'flow-canvas' })

onNodeClick(({ node }) => designerStore.selectNode(node.id))
onEdgeClick(({ edge }) => designerStore.selectEdge(edge.id))
onPaneClick(() => designerStore.clearSelection())

onConnect((params) => {
  if (readOnly.value) return
  flowGraph.addEdge({
    id: `e-${params.source}-${params.target}`,
    source: params.source,
    target: params.target,
    sourceHandle: params.sourceHandle,
    targetHandle: params.targetHandle,
  })
})

// Debounced history push on data change
let historyTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => [flowGraph.nodes, flowGraph.edges],
  () => {
    if (historyTimer) clearTimeout(historyTimer)
    historyTimer = setTimeout(() => {
      designerStore.pushHistory(flowGraph.getSnapshot())
    }, 200)
  },
  { deep: true },
)

function onKeyDown(e: KeyboardEvent) {
  const target = e.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

  if (e.key === 'Delete' || e.key === 'Backspace') {
    const selectedNodes = getNodes.value.filter(n => n.selected)
    const selectedEdges = getEdges.value.filter(e => e.selected)
    for (const n of selectedNodes) flowGraph.removeNode(n.id)
    for (const e of selectedEdges) flowGraph.removeEdge(e.id)
  }
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
}

function onDrop(e: DragEvent) {
  if (readOnly.value) return
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

  flowGraph.addNode({
    id: `node-${crypto.randomUUID()}`,
    type: vfType,
    position,
    data: payload.data,
  })
}

onMounted(() => {
  if (!readOnly.value) window.addEventListener('keydown', onKeyDown)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  if (historyTimer) clearTimeout(historyTimer)
})

defineExpose({
  fitView,
})
</script>
