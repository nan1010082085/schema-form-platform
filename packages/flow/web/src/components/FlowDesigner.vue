<template>
  <div :class="$style.designer">
    <FlowToolbar
      @save="onSave"
      @undo="onUndo"
      @redo="onRedo"
      @export-bpmn="onExportBpmn"
      @import-bpmn="onImportBpmn"
      @validate="onValidate"
      @publish="onPublish"
      @settings="settingsVisible = true"
    />
    <div :class="$style.body">
      <FlowPalette />
      <FlowCanvas ref="canvasRef" />
      <FlowPropertyPanel />
    </div>

    <FlowSettingsDialog
      :visible="settingsVisible"
      :settings="flowSettings"
      @update:visible="settingsVisible = $event"
      @save="onSettingsSave"
    />

    <!-- Validation result dialog -->
    <el-dialog
      v-model="validationVisible"
      title="流程校验结果"
      width="520px"
      :close-on-click-modal="false"
    >
      <div v-if="validationErrors.length === 0" :class="$style.noErrors">
        校验通过，没有发现错误或警告。
      </div>
      <div v-else :class="$style.errorList">
        <div
          v-for="(err, idx) in validationErrors"
          :key="idx"
          :class="[$style.errorItem, err.level === 'error' ? $style.errorLevel : $style.warnLevel]"
        >
          <span :class="$style.badge">{{ err.level === 'error' ? '错误' : '警告' }}</span>
          <span :class="$style.errMsg">{{ err.message }}</span>
          <span v-if="err.nodeId || err.edgeId" :class="$style.errId">
            ({{ err.nodeId ?? err.edgeId }})
          </span>
        </div>
      </div>
      <template #footer>
        <el-button @click="validationVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { Node, Edge } from '@vue-flow/core'
import {
  exportToBpmnXml,
  importFromBpmnXml,
  BpmnElementType,
  DEFAULT_NODE_SIZES,
  validateFlow,
} from '@schema-form/flow-shared'
import type {
  FlowGraph,
  FlowNodeData,
  FlowEdgeData,
  FlowPermissions,
  RejectPolicy,
  ValidationError,
} from '@schema-form/flow-shared'
import FlowToolbar from './FlowToolbar.vue'
import FlowPalette from './FlowPalette.vue'
import FlowCanvas from './FlowCanvas.vue'
import FlowPropertyPanel from './FlowPropertyPanel.vue'
import FlowSettingsDialog from './FlowSettingsDialog.vue'
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

const settingsVisible = ref(false)
const validationVisible = ref(false)
const validationErrors = ref<ValidationError[]>([])
const flowSettings = reactive({
  name: '',
  description: '',
  category: '',
  permissions: { editors: [], launchers: [], viewers: [] } as FlowPermissions,
  defaultRejectPolicy: 'reject-on-all' as RejectPolicy,
})

function onSettingsSave(settings: typeof flowSettings) {
  Object.assign(flowSettings, settings)
}

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
        isDefault: (e.data as Record<string, unknown>)?.isDefault as boolean | undefined,
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
      data: {
        conditionExpression: e.data?.conditionExpression,
        isDefault: e.data?.isDefault,
      },
    })),
  }
}

/* --- Validation --- */

function runValidation(): ValidationError[] {
  const snapshot = canvasRef.value?.getGraph() as GraphSnapshot | undefined
  if (!snapshot) return []
  const flowGraph = toFlowGraph(snapshot)
  return validateFlow(flowGraph)
}

function hasErrors(errors: ValidationError[]): boolean {
  return errors.some((e) => e.level === 'error')
}

function onValidate() {
  const errors = runValidation()
  validationErrors.value = errors
  validationVisible.value = true
}

/* --- Save / Publish --- */

function onSave() {
  const errors = runValidation()
  if (hasErrors(errors)) {
    validationErrors.value = errors
    validationVisible.value = true
    return
  }
  const data = canvasRef.value?.getGraph() as GraphSnapshot | undefined
  if (!data) return
  store.markClean()
  emit('save', data)
}

function onPublish() {
  const errors = runValidation()
  if (hasErrors(errors)) {
    validationErrors.value = errors
    validationVisible.value = true
    return
  }
  validationErrors.value = []
  validationVisible.value = true
}

/* --- Undo / Redo --- */

function onUndo() {
  const snapshot = store.undo()
  if (snapshot) canvasRef.value?.loadGraph(snapshot as GraphSnapshot)
}

function onRedo() {
  const snapshot = store.redo()
  if (snapshot) canvasRef.value?.loadGraph(snapshot as GraphSnapshot)
}

/* --- Export / Import --- */

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

.noErrors {
  padding: 12px 0;
  color: #67c23a;
  font-size: 14px;
}

.errorList {
  max-height: 360px;
  overflow-y: auto;
}

.errorItem {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
}

.errorItem:last-child {
  border-bottom: none;
}

.badge {
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 500;
}

.errorLevel .badge {
  background: #fef0f0;
  color: #f56c6c;
}

.warnLevel .badge {
  background: #fdf6ec;
  color: #e6a23c;
}

.errMsg {
  color: #303133;
}

.errId {
  color: #909399;
  font-size: 12px;
}
</style>
