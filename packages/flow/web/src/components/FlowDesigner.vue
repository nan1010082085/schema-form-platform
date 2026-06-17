<template>
  <div :class="styles.designer">
    <FlowToolbar
      :title="flowTitle"
      :is-preview="store.mode === 'preview'"
      :show-left-panel="showLeftPanel"
      :show-right-panel="showRightPanel"
      :show-ai-drawer="showAiDrawer"
      :saving="saving"
      :layout-direction="layoutDirection"
      :layout-node-sep="layoutNodeSep"
      :layout-rank-sep="layoutRankSep"
      @save="onSave"
      @undo="onUndo"
      @redo="onRedo"
      @export-bpmn="onExportBpmn"
      @import-bpmn="onImportBpmn"
      @validate="onValidate"
      @publish="onPublish"
      @settings="settingsVisible = true"
      @version-history="onVersionHistory()"
      @toggle-preview="togglePreview"
      @toggle-left-panel="showLeftPanel = !showLeftPanel"
      @toggle-right-panel="showRightPanel = !showRightPanel"
      @toggle-ai="showAiDrawer = !showAiDrawer"
      @auto-layout="onAutoLayout"
      @save-as-template="onSaveAsTemplate"
      @update:title="flowTitle = $event"
      @update:layout-direction="layoutDirection = $event"
      @update:layout-node-sep="layoutNodeSep = $event"
      @update:layout-rank-sep="layoutRankSep = $event"
    />
    <div :class="styles.body">
      <div
        v-if="store.mode === 'design'"
        :class="[styles.drawer, styles.drawerLeft, { [styles.drawerClosed]: !showLeftPanel }]"
      >
        <FlowPalette />
      </div>
      <FlowCanvas ref="canvasRef" :read-only="store.mode === 'preview'" />
      <div
        v-if="store.mode === 'design'"
        :class="[styles.drawer, styles.drawerRight, { [styles.drawerClosed]: !showRightPanel }]"
      >
        <FlowPropertyPanel />
      </div>
      <div
        v-if="store.mode === 'design'"
        :class="[styles.drawer, styles.aiDrawer, { [styles.drawerClosed]: !showAiDrawer }]"
      >
        <div :class="styles.aiDrawerInner">
          <iframe
            v-if="showAiDrawer"
            :src="aiBaseUrl + '?agent=flow'"
            :class="styles.aiIframe"
            @load="onAiIframeLoad"
          />
        </div>
      </div>
    </div>

    <!-- Form preview panel (hidden in flow preview mode) -->
    <div v-if="previewPublishId && store.mode === 'design'" :class="styles.formPreview">
      <div :class="styles.formPreviewHeader">
        <span :class="styles.formPreviewTitle">表单预览</span>
        <el-button size="small" link @click="previewPublishId = ''">关闭</el-button>
      </div>
      <MicroFormEmbed
        :publish-id="previewPublishId"
        :mode="previewMode"
        :host-methods="previewHostMethods"
      />
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
      destroy-on-close
      @close="store.clearErrorNodes()"
    >
      <div v-if="validationErrors.length === 0" :class="styles.noErrors">
        校验通过，没有发现错误或警告。
      </div>
      <div v-else :class="styles.errorList">
        <div
          v-for="(err, idx) in validationErrors"
          :key="idx"
          :class="[
            styles.errorItem,
            err.level === 'error' ? styles.errorLevel : styles.warnLevel,
            { [styles.errorItemClickable]: !!err.nodeId },
          ]"
          @click="onValidationErrorClick(err)"
        >
          <span :class="styles.badge">{{ err.level === 'error' ? '错误' : '警告' }}</span>
          <span :class="styles.errMsg">{{ err.message }}</span>
          <span v-if="err.nodeId || err.edgeId" :class="styles.errId">
            ({{ err.nodeId ?? err.edgeId }})
          </span>
          <AppIcon name="location" v-if="err.nodeId" :class="styles.errLocateIcon" :size="14" />
        </div>
      </div>
      <template #footer>
        <el-button @click="validationVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- Version history dialog -->
    <el-dialog
      v-model="versionHistoryVisible"
      title="版本历史"
      width="600px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-table
        v-loading="versionLoading"
        :data="versions"
        :class="styles.versionTable"
        stripe
        row-key="id"
      >
        <el-table-column prop="version" label="版本号" width="100" />
        <el-table-column label="创建时间" min-width="180">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            {{ row.id === definitionStore.currentDefinition?.currentVersionId ? '当前' : '' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            {{ row.id }}
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="versionHistoryVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { connect as connectSocket, onAiApply, onAiPublished } from '@schema-form/socket'
import type { AiApplyEvent, AiPublishedEvent } from '@schema-form/socket'
import {
  exportToBpmnXml,
  importFromBpmnXml,
  validateFlow,
} from '@schema-form/flow-shared'
import type {
  FlowGraph,
  FlowPermissions,
  FlowVersionData,
  RejectPolicy,
  ValidationError,
} from '@schema-form/flow-shared'
import type { Node, Edge } from '@vue-flow/core'
import FlowToolbar from './FlowToolbar.vue'
import FlowPalette from './FlowPalette.vue'
import FlowCanvas from './FlowCanvas.vue'
import FlowPropertyPanel from './FlowPropertyPanel.vue'
import FlowSettingsDialog from './FlowSettingsDialog.vue'
import MicroFormEmbed from './MicroFormEmbed.vue'
import { useFlowDesignerStore } from '../stores/flowDesigner.js'
import { useFlowGraphStore } from '../stores/flowGraph.js'
import { useFlowDefinitionStore } from '../stores/flowDefinition.js'
import { useAutoLayout } from '../composables/useAutoLayout.js'
import { flowApi } from '../api/flowApi.js'
import { useFlowTemplateStore } from '../stores/flowTemplate.js'
import styles from './FlowDesigner.module.scss'
import AppIcon from '@schema-form/shared-components/common/AppIcon.vue'

const canvasRef = ref<InstanceType<typeof FlowCanvas>>()
const store = useFlowDesignerStore()
const graphStore = useFlowGraphStore()
const definitionStore = useFlowDefinitionStore()
const templateStore = useFlowTemplateStore()
const {
  direction: layoutDirection,
  nodeSep: layoutNodeSep,
  rankSep: layoutRankSep,
  computeLayout,
} = useAutoLayout()
const route = useRoute()

const definitionId = ref<string | null>((route.query.id as string) ?? null)
const saving = ref(false)
const flowTitle = ref('')

// Form preview state
const previewPublishId = ref('')
const previewMode = ref<'edit' | 'view'>('view')
const previewHostMethods = ref<string[]>(['setValues', 'getValues', 'validate'])

const settingsVisible = ref(false)
const validationVisible = ref(false)
const versionHistoryVisible = ref(false)
const versions = ref<FlowVersionData[]>([])
const versionLoading = ref(false)
const showLeftPanel = ref(true)
const showRightPanel = ref(true)
const showAiDrawer = ref(false)
const aiBaseUrl = import.meta.env.VITE_AI_URL || '/ai/index-sidebar.html'

function handleAiDataChange(data: Record<string, unknown>) {
  const { type, payload } = data as { type: string; payload: unknown }
  if (type === 'ai:published' && payload) {
    ElMessage.success('AI 已发布流程')
  }
  if (type === 'ai:open-in-editor' && payload) {
    const { flow } = payload as { flow: FlowGraph | null }
    if (flow && flow.nodes && flow.edges) {
      graphStore.loadFromFlowGraph(flow)
      ElMessage.success('已加载 AI 生成的流程')
    }
  }
}

function onAiIframeMessage(event: MessageEvent) {
  const data = event.data as Record<string, unknown> | undefined
  if (!data || typeof data !== 'object') return
  if (data.type === 'ai:datachange') {
    handleAiDataChange(data.payload as Record<string, unknown>)
  }
}

function onAiIframeLoad() {
  window.addEventListener('message', onAiIframeMessage)
}

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

/* --- Version History --- */

async function loadVersionHistory() {
  if (!definitionId.value) return
  versionLoading.value = true
  try {
    const res = await flowApi.listVersions(definitionId.value)
    versions.value = res.items ?? []
  } catch {
    ElMessage.error('加载版本历史失败')
  } finally {
    versionLoading.value = false
  }
}

function onVersionHistory() {
  versionHistoryVisible.value = true
  loadVersionHistory()
}

// Watch selected node for form preview
watch(() => store.selectedNodeId, (nodeId) => {
  if (!nodeId) {
    previewPublishId.value = ''
    return
  }
  const node = graphStore.findNode(nodeId)
  const data = node?.data as Record<string, unknown> | undefined
  if (data?.formPublishId && data?.formSchemaId) {
    previewPublishId.value = data.formPublishId as string
    previewMode.value = (data.formMode as string) === 'view' ? 'view' : 'edit'
    previewHostMethods.value = (data.hostMethods as string[]) ?? ['setValues', 'getValues', 'validate']
  } else {
    previewPublishId.value = ''
  }
})

function togglePreview() {
  store.setMode(store.mode === 'design' ? 'preview' : 'design')
}

/* --- Load existing flow on mount --- */

// Listen for Ctrl+S from FlowCanvas
function handleFlowSave() { onSave() }

onMounted(async () => {
  window.addEventListener('flow:save', handleFlowSave)
  if (!definitionId.value) return
  try {
    await definitionStore.fetchDefinition(definitionId.value)
    const def = definitionStore.currentDefinition
    if (!def) return
    flowTitle.value = def.name
    flowSettings.name = def.name
    flowSettings.description = def.description ?? ''
    flowSettings.category = def.category ?? ''

    if (def.currentVersionId) {
      const version = (await flowApi.getVersion(definitionId.value, def.currentVersionId)) as {
        graph: FlowGraph
        metadata?: { defaultRejectPolicy?: RejectPolicy; permissions?: FlowPermissions }
      }
      if (version.graph) {
        graphStore.loadFromFlowGraph(version.graph)
        // Fit view after graph loads
        setTimeout(() => canvasRef.value?.fitView(), 100)
      }
      if (version.metadata?.defaultRejectPolicy) {
        flowSettings.defaultRejectPolicy = version.metadata.defaultRejectPolicy
      }
      if (version.metadata?.permissions) {
        flowSettings.permissions = version.metadata.permissions
      }
    }
    store.markClean()
  } catch (e) {
    ElMessage.error('加载流程失败')
  }
})

onUnmounted(() => {
  window.removeEventListener('flow:save', handleFlowSave)
  window.removeEventListener('message', onAiIframeMessage)
})

// Socket: 监听 AI 推送事件
connectSocket()
onAiApply((data: AiApplyEvent) => {
  if (data.type === 'flow' && data.payload && typeof data.payload === 'object' && !Array.isArray(data.payload)) {
    const { nodes, edges } = data.payload as { nodes?: unknown[]; edges?: unknown[] }
    if (nodes && edges) {
      // 生成 ID 映射，避免与现有节点冲突
      const idMap = new Map<string, string>()
      const newNodes = nodes.map((n: any) => {
        const newId = `node-${crypto.randomUUID()}`
        idMap.set(n.id, newId)
        // 从 data.bpmnType 推断节点类型
        const bpmnType = n.data?.bpmnType
        const nodeType = bpmnType === 'startEvent' ? 'start' : bpmnType === 'endEvent' ? 'end' : 'task'
        return {
          id: newId,
          type: nodeType,
          position: { x: n.x ?? 0, y: n.y ?? 0 },
          data: n.data,
        } as Node
      })
      const newEdges = edges.map((e: any) => {
        const sourceId = idMap.get(e.source?.cell ?? '') ?? e.source?.cell ?? ''
        const targetId = idMap.get(e.target?.cell ?? '') ?? e.target?.cell ?? ''
        return {
          id: `edge-${crypto.randomUUID()}`,
          source: sourceId,
          target: targetId,
          label: e.data?.label,
          data: {
            conditionExpression: e.data?.conditionExpression,
            isDefault: e.data?.isDefault,
          },
        } as Edge
      })
      // 逐个插入，保留当前画布已有的节点和边
      for (const node of newNodes) {
        graphStore.addNode(node)
      }
      for (const edge of newEdges) {
        graphStore.addEdge(edge)
      }
      ElMessage.success(`已插入 ${newNodes.length} 个节点到流程`)
      setTimeout(() => canvasRef.value?.fitView(), 100)
    }
  }
})
onAiPublished((data: AiPublishedEvent) => {
  if (data.type === 'flow') {
    ElMessage.success('AI 已发布流程')
  }
})

/* --- Route leave guard --- */

onBeforeRouteLeave((_to, _from, next) => {
  if (!store.isDirty) return next()
  ElMessageBox.confirm(
    '当前流程有未保存的修改，确定离开？',
    '提示',
    {
      confirmButtonText: '离开',
      cancelButtonText: '留下',
      type: 'warning',
    }
  )
    .then(() => {
      next()
    })
    .catch(() => {
      next(false)
    })
})

defineExpose({
  getGraph: () => graphStore.getSnapshot(),
  loadGraph: (data: { nodes: Node[]; edges: Edge[] }) => {
    graphStore.loadGraph(data)
  },
})

/* --- Validation --- */

function runValidation(): ValidationError[] {
  const flowGraph = graphStore.toFlowGraph()
  return validateFlow(flowGraph)
}

function hasErrors(errors: ValidationError[]): boolean {
  return errors.some((e) => e.level === 'error')
}

function onValidate() {
  const errors = runValidation()
  validationErrors.value = errors
  // Highlight error nodes
  const errorIds = errors.filter(e => e.nodeId).map(e => e.nodeId!)
  store.setErrorNodes(errorIds)
  validationVisible.value = true
}

function onValidationErrorClick(err: ValidationError) {
  if (!err.nodeId) return
  // Close dialog and navigate to node
  validationVisible.value = false
  canvasRef.value?.selectAndZoomToNode(err.nodeId)
}

/* --- Save / Publish --- */

const COOLDOWN_MS = 2000
let _savingLock = false

async function onSave() {
  if (_savingLock) return

  const errors = runValidation()
  if (hasErrors(errors)) {
    validationErrors.value = errors
    validationVisible.value = true
    return
  }

  _savingLock = true
  saving.value = true
  try {
    // Create definition if new
    if (!definitionId.value) {
      const def = (await definitionStore.createDefinition({
        name: flowTitle.value || '未命名流程',
        description: flowSettings.description,
        category: flowSettings.category,
      })) as { id: string }
      definitionId.value = def.id
    } else {
      // Update definition metadata
      await flowApi.updateFlow(definitionId.value, {
        name: flowTitle.value,
        description: flowSettings.description,
        category: flowSettings.category,
        permissions: flowSettings.permissions,
      })
    }

    // Save version with graph
    const flowGraph = graphStore.toFlowGraph()
    await flowApi.saveVersion(definitionId.value, {
      graph: flowGraph,
      metadata: {
        defaultRejectPolicy: flowSettings.defaultRejectPolicy,
        permissions: flowSettings.permissions,
      },
    })

    store.markClean()
    ElMessage.success('保存成功')
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    setTimeout(() => {
      _savingLock = false
      saving.value = false
    }, COOLDOWN_MS)
  }
}

async function onPublish() {
  if (_savingLock) return

  try {
    await ElMessageBox.confirm(
      '确定发布此流程？发布后将创建新版本。',
      '确认发布',
      {
        confirmButtonText: '发布',
        cancelButtonText: '取消',
        type: 'info',
      }
    )
  } catch {
    return
  }

  const errors = runValidation()
  if (hasErrors(errors)) {
    validationErrors.value = errors
    validationVisible.value = true
    return
  }

  if (!definitionId.value) {
    // Save first if never saved
    await onSave()
    if (!definitionId.value) return
  }

  _savingLock = true
  saving.value = true
  try {
    await flowApi.publishFlow(definitionId.value)
    await definitionStore.fetchDefinition(definitionId.value)
    ElMessage.success('发布成功')
  } catch (e) {
    ElMessage.error('发布失败')
  } finally {
    setTimeout(() => {
      _savingLock = false
      saving.value = false
    }, COOLDOWN_MS)
  }
}

/* --- Undo / Redo --- */

function onUndo() {
  const snapshot = store.undo()
  if (snapshot) graphStore.loadSnapshot(snapshot)
}

function onRedo() {
  const snapshot = store.redo()
  if (snapshot) graphStore.loadSnapshot(snapshot)
}

/* --- Export / Import --- */

function onAutoLayout() {
  // Push current state to history before layout, so the operation is undoable
  store.pushHistory(graphStore.getSnapshot())
  const result = computeLayout()
  if (result) {
    graphStore.loadGraph(result)
    setTimeout(() => canvasRef.value?.fitView(), 50)
  }
}

function onExportBpmn() {
  const flowGraph = graphStore.toFlowGraph()
  const xml = exportToBpmnXml(flowGraph)

  const blob = new Blob([xml], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `flow-${Date.now()}.bpmn`
  a.click()
  URL.revokeObjectURL(url)
}

async function onSaveAsTemplate() {
  if (!definitionId.value) {
    ElMessage.warning('请先保存流程，再执行此操作')
    return
  }

  let templateName = flowTitle.value || '未命名模板'

  try {
    const { value } = await ElMessageBox.prompt(
      '请输入模板名称：',
      '保存为模板',
      {
        confirmButtonText: '保存',
        cancelButtonText: '取消',
        inputValue: templateName,
      }
    )
    templateName = value
  } catch {
    return
  }

  try {
    await templateStore.saveAsTemplate(definitionId.value, {
      name: templateName.trim(),
      description: flowSettings.description,
      category: flowSettings.category,
    })
    ElMessage.success('已保存为模板')
  } catch (e) {
    ElMessage.error('保存模板失败')
  }
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
    definitionId.value = null
    store.reset()
    graphStore.loadFromFlowGraph(flowGraph)
    ElMessage.success('BPMN 导入成功')
  }
  input.click()
}
</script>
