<template>
  <div :class="styles.designer">
    <FlowToolbar
      :is-preview="store.mode === 'preview'"
      :show-left-panel="showLeftPanel"
      :show-right-panel="showRightPanel"
      :show-ai-drawer="showAiDrawer"
      :saving="saving"
      :layout-direction="layoutDirection"
      :layout-node-sep="layoutNodeSep"
      :layout-rank-sep="layoutRankSep"
      @back="goBack"
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
          <micro-app
            v-if="showAiDrawer"
            name="ai-sidebar-flow"
            :url="aiBaseUrl + '?agent=flow'"
            :data="aiDrawerData"
            iframe
            :class="styles.aiIframe"
            @datachange="handleAiDataChange"
          />
        </div>
      </div>
    </div>

    <!-- Form preview panel (hidden in flow preview mode) -->
    <div v-if="previewPublishId && store.mode === 'design'" :class="styles.formPreview">
      <div :class="styles.formPreviewHeader">
        <span :class="styles.formPreviewTitle">表单预览</span>
        <el-button size="small" text @click="previewPublishId = ''">关闭</el-button>
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
    >
      <div v-if="validationErrors.length === 0" :class="styles.noErrors">
        校验通过，没有发现错误或警告。
      </div>
      <div v-else :class="styles.errorList">
        <div
          v-for="(err, idx) in validationErrors"
          :key="idx"
          :class="[styles.errorItem, err.level === 'error' ? styles.errorLevel : styles.warnLevel]"
        >
          <span :class="styles.badge">{{ err.level === 'error' ? '错误' : '警告' }}</span>
          <span :class="styles.errMsg">{{ err.message }}</span>
          <span v-if="err.nodeId || err.edgeId" :class="styles.errId">
            ({{ err.nodeId ?? err.edgeId }})
          </span>
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
        :data="versions"
        v-loading="versionLoading"
        :class="styles.versionTable"
        empty-text="暂无版本历史"
        stripe
      >
        <el-table-column label="版本号" prop="version" width="100" />
        <el-table-column label="创建时间" min-width="180">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.id === definitionStore.currentDefinition?.currentVersionId" type="success" size="small">当前</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              size="small"
              @click="loadVersion(row.id)"
            >
              加载此版本
            </el-button>
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
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
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
import styles from './FlowDesigner.module.scss'

const canvasRef = ref<InstanceType<typeof FlowCanvas>>()
const store = useFlowDesignerStore()
const graphStore = useFlowGraphStore()
const definitionStore = useFlowDefinitionStore()
const {
  direction: layoutDirection,
  nodeSep: layoutNodeSep,
  rankSep: layoutRankSep,
  applyLayout: runAutoLayout,
} = useAutoLayout()
const router = useRouter()
const route = useRoute()

const definitionId = ref<string | null>((route.query.id as string) ?? null)
const saving = ref(false)

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
const aiBaseUrl = import.meta.env.VITE_AI_URL || 'http://localhost:5300/ai/index-sidebar.html'

const aiDrawerData = computed(() => ({
  source: 'flow',
  currentFlow: graphStore.toFlowGraph(),
}))

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

async function loadVersion(versionId: string) {
  if (store.isDirty) {
    try {
      await ElMessageBox.confirm('当前有未保存的修改，加载历史版本将覆盖这些修改。确定继续？', '提示', {
        confirmButtonText: '继续',
        cancelButtonText: '取消',
        type: 'warning',
      })
    } catch {
      return
    }
  }

  if (!definitionId.value) return
  try {
    const version = await flowApi.getVersion(definitionId.value, versionId)
    if (version.graph) {
      graphStore.loadFromFlowGraph(version.graph)
      setTimeout(() => canvasRef.value?.fitView(), 100)
    }
    if (version.metadata?.defaultRejectPolicy) {
      flowSettings.defaultRejectPolicy = version.metadata.defaultRejectPolicy
    }
    if (version.metadata?.permissions) {
      flowSettings.permissions = version.metadata.permissions
    }
    store.markClean()
    versionHistoryVisible.value = false
    ElMessage.success('已加载历史版本')
  } catch {
    ElMessage.error('加载版本失败')
  }
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

function goBack() {
  router.push('/list')
}

/* --- Load existing flow on mount --- */

onMounted(async () => {
  if (!definitionId.value) return
  try {
    await definitionStore.fetchDefinition(definitionId.value)
    const def = definitionStore.currentDefinition
    if (!def) return
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

// Socket: 监听 AI 推送事件
connectSocket()
onAiApply((data: AiApplyEvent) => {
  if (data.type === 'flow' && data.payload && typeof data.payload === 'object' && !Array.isArray(data.payload)) {
    const { nodes, edges } = data.payload as { nodes?: unknown[]; edges?: unknown[] }
    if (nodes && edges) {
      graphStore.loadFromFlowGraph(data.payload as unknown as FlowGraph)
      ElMessage.success('已应用 AI 生成的流程')
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
  ElMessageBox.confirm('当前流程有未保存的修改，确定离开？', '提示', {
    confirmButtonText: '离开',
    cancelButtonText: '留下',
    type: 'warning',
  })
    .then(() => next())
    .catch(() => next(false))
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
  validationVisible.value = true
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
        name: flowSettings.name || '未命名流程',
        description: flowSettings.description,
        category: flowSettings.category,
      })) as { id: string }
      definitionId.value = def.id
    } else {
      // Update definition metadata
      await flowApi.updateFlow(definitionId.value, {
        name: flowSettings.name,
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
    await ElMessageBox.confirm('确定发布此流程？发布后将创建新版本。', '确认发布', {
      confirmButtonText: '发布',
      cancelButtonText: '取消',
      type: 'info',
    })
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
  runAutoLayout()
  setTimeout(() => canvasRef.value?.fitView(), 50)
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
