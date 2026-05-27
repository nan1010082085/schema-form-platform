<template>
  <div :class="$style.designer">
    <FlowToolbar
      @save="onSave"
      @undo="onUndo"
      @redo="onRedo"
      @export-bpmn="onExportBpmn"
      @import-bpmn="onImportBpmn"
    />
    <div :class="$style.body">
      <FlowPalette />
      <FlowCanvas ref="canvasRef" />
      <FlowPropertyPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Node, Edge } from '@vue-flow/core'
import {
  exportToBpmnXml,
  importFromBpmnXml,
  BpmnElementType,
  DEFAULT_NODE_SIZES,
} from '@schema-form/flow-shared'
import type { FlowGraph, FlowNodeData, FlowEdgeData } from '@schema-form/flow-shared'
import FlowToolbar from './FlowToolbar.vue'
import FlowPalette from './FlowPalette.vue'
import FlowCanvas from './FlowCanvas.vue'
import FlowPropertyPanel from './FlowPropertyPanel.vue'
import { useFlowDesignerStore } from '../stores/flowDesigner.js'

interface GraphSnapshot {
  nodes: Node[]
  edges: Edge[]
}

const VF_TYPE_TO_BPMN_TYPE: Record<string, BpmnElementType> = {
  'start-event': BpmnElementType.StartEvent,
  'end-event': BpmnElementType.EndEvent,
  'timer-event': BpmnElementType.TimerEvent,
  'user-task': BpmnElementType.UserTask,
  'service-task': BpmnElementType.ServiceTask,
  'script-task': BpmnElementType.ScriptTask,
  'send-task': BpmnElementType.SendTask,
  'receive-task': BpmnElementType.ReceiveTask,
  'exclusive-gateway': BpmnElementType.ExclusiveGateway,
  'parallel-gateway': BpmnElementType.ParallelGateway,
  'inclusive-gateway': BpmnElementType.InclusiveGateway,
}

const BPMN_TYPE_TO_VF_TYPE: Record<string, string> = Object.fromEntries(
  Object.entries(VF_TYPE_TO_BPMN_TYPE).map(([vf, bpmn]) => [bpmn, vf]),
)

const canvasRef = ref<InstanceType<typeof FlowCanvas>>()
const store = useFlowDesignerStore()

const emit = defineEmits<{
  save: [data: GraphSnapshot]
}>()

defineExpose({
  getGraph: () => canvasRef.value?.getGraph(),
  loadGraph: (data: GraphSnapshot) => {
    canvasRef.value?.loadGraph(data)
  },
})

function toFlowGraph(snapshot: GraphSnapshot): FlowGraph {
  return {
    nodes: snapshot.nodes.map((n) => {
      const bpmnType = VF_TYPE_TO_BPMN_TYPE[n.type ?? '']
      const size = bpmnType ? DEFAULT_NODE_SIZES[bpmnType] : { width: 160, height: 80 }
      return {
        id: n.id,
        shape: `bpmn-${n.type}`,
        x: n.position.x,
        y: n.position.y,
        width: size.width,
        height: size.height,
        data: n.data,
      } as FlowNodeData
    }),
    edges: snapshot.edges.map((e) => ({
      id: e.id,
      shape: 'smoothstep',
      source: { cell: e.source },
      target: { cell: e.target },
      data: {
        label: typeof e.label === 'string' ? e.label : undefined,
        conditionExpression: (e.data as Record<string, unknown>)?.conditionExpression as string | undefined,
      },
    }) as FlowEdgeData),
  }
}

function toVueFlowGraph(flowGraph: FlowGraph): GraphSnapshot {
  return {
    nodes: flowGraph.nodes.map((n) => ({
      id: n.id,
      type: BPMN_TYPE_TO_VF_TYPE[n.data.bpmnType] ?? 'user-task',
      position: { x: n.x, y: n.y },
      data: n.data,
    })),
    edges: flowGraph.edges.map((e) => ({
      id: e.id,
      source: e.source.cell,
      target: e.target.cell,
      label: e.data?.label,
      data: { conditionExpression: e.data?.conditionExpression },
    })),
  }
}

function onSave() {
  const data = canvasRef.value?.getGraph() as GraphSnapshot | undefined
  if (!data) return
  store.markClean()
  emit('save', data)
}

function onUndo() {
  const snapshot = store.undo()
  if (snapshot) canvasRef.value?.loadGraph(snapshot as GraphSnapshot)
}

function onRedo() {
  const snapshot = store.redo()
  if (snapshot) canvasRef.value?.loadGraph(snapshot as GraphSnapshot)
}

function onExportBpmn() {
  const snapshot = canvasRef.value?.getGraph() as GraphSnapshot | undefined
  if (!snapshot) return

  const flowGraph = toFlowGraph(snapshot)
  const xml = exportToBpmnXml(flowGraph)

  const blob = new Blob([xml], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `flow-${Date.now()}.bpmn`
  a.click()
  URL.revokeObjectURL(url)
}

function onImportBpmn() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.bpmn,.xml'
  input.onchange = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    const text = await file.text()
    const flowGraph = importFromBpmnXml(text)
    const snapshot = toVueFlowGraph(flowGraph)
    canvasRef.value?.loadGraph(snapshot)
  }
  input.click()
}
</script>

<style module>
.designer {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.body {
  display: flex;
  flex: 1;
  overflow: hidden;
}
</style>
