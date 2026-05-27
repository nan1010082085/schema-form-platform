<script setup lang="ts">
/**
 * FlowInstanceDetailView -- 流程实例详情页
 *
 * 展示单个流程实例的完整信息：基本信息、流程图（只读 Vue Flow）、关联任务、操作按钮。
 */
import { onMounted, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, VideoPause, VideoPlay, CircleClose } from '@element-plus/icons-vue'
import { VueFlow, MarkerType } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import type { Node, Edge } from '@vue-flow/core'
import {
  useFlowInstanceStore,
  flowApi,
  StartEventNode,
  EndEventNode,
  UserTaskNode,
  ServiceTaskNode,
  ExclusiveGatewayNode,
  ParallelGatewayNode,
} from '@schema-form/flow-web'
import type { TaskInstance } from '@schema-form/flow-web'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

const props = defineProps<{ id: string }>()
const router = useRouter()
const store = useFlowInstanceStore()

const loadingGraph = ref(false)
const graphNodes = ref<Node[]>([])
const graphEdges = ref<Edge[]>([])
const instanceTasks = ref<TaskInstance[]>([])
const loadingTasks = ref(false)

const instance = computed(() => store.currentInstance)

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    running: '运行中',
    completed: '已完成',
    terminated: '已终止',
    suspended: '已挂起',
    failed: '已失败',
  }
  return map[instance.value?.status ?? ''] ?? instance.value?.status ?? ''
})

const statusType = computed(() => {
  const map: Record<string, '' | 'success' | 'info' | 'warning' | 'danger'> = {
    running: '',
    completed: 'success',
    terminated: 'danger',
    suspended: 'warning',
    failed: 'danger',
  }
  return map[instance.value?.status ?? ''] ?? 'info'
})

const BPMN_TYPE_TO_VF: Record<string, string> = {
  'bpmn-start-event': 'start-event',
  'bpmn-end-event': 'end-event',
  'bpmn-user-task': 'user-task',
  'bpmn-service-task': 'service-task',
  'bpmn-exclusive-gateway': 'exclusive-gateway',
  'bpmn-parallel-gateway': 'parallel-gateway',
}

const defaultEdgeOptions = {
  type: 'smoothstep' as const,
  style: { stroke: '#a0a0a0', strokeWidth: 1.5 },
  markerEnd: { type: MarkerType.ArrowClosed },
}

const activeNodeIds = computed(() => {
  if (!instance.value) return new Set<string>()
  return new Set(
    instance.value.tokens
      .filter((t) => t.state === 'active' || t.state === 'waiting')
      .map((t) => t.nodeId),
  )
})

interface VersionGraphData {
  graph: {
    nodes: Array<{ id: string; shape: string; x: number; y: number; data: Record<string, unknown> }>
    edges: Array<{ id: string; source: { cell: string; port?: string }; target: { cell: string; port?: string }; data?: Record<string, unknown> }>
  }
}

async function loadGraph() {
  if (!instance.value) return
  loadingGraph.value = true
  try {
    const version = (await flowApi.getVersion(
      instance.value.definitionId,
      instance.value.versionId,
    )) as VersionGraphData

    graphNodes.value = version.graph.nodes.map((n) => ({
      id: n.id,
      type: BPMN_TYPE_TO_VF[n.shape] ?? n.shape,
      position: { x: n.x, y: n.y },
      data: n.data,
      class: activeNodeIds.value.has(n.id) ? 'active-token' : '',
    }))

    graphEdges.value = version.graph.edges.map((e) => ({
      id: e.id,
      source: e.source.cell,
      target: e.target.cell,
      sourceHandle: e.source.port,
      targetHandle: e.target.port,
      label: e.data?.label as string | undefined,
      data: e.data,
    }))
  } catch {
    ElMessage.error('加载流程图失败')
  } finally {
    loadingGraph.value = false
  }
}

async function loadTasks() {
  if (!instance.value) return
  loadingTasks.value = true
  try {
    await store.fetchMyTasks()
    instanceTasks.value = store.tasks.filter((t) => t.instanceId === props.id)
  } catch {
    // Tasks may not be available
  } finally {
    loadingTasks.value = false
  }
}

// Actions
async function handleTerminate() {
  if (!instance.value) return
  try {
    await ElMessageBox.confirm('确认终止此流程实例？终止后无法恢复。', '终止确认', {
      type: 'warning',
      confirmButtonText: '终止',
      confirmButtonClass: 'el-button--danger',
    })
    await store.terminateInstance(instance.value.id)
    ElMessage.success('已终止')
  } catch {
    // cancelled
  }
}

async function handleSuspend() {
  if (!instance.value) return
  try {
    await ElMessageBox.confirm('确认挂起此流程实例？', '挂起确认')
    await store.suspendInstance(instance.value.id)
    ElMessage.success('已挂起')
  } catch {
    // cancelled
  }
}

async function handleResume() {
  if (!instance.value) return
  try {
    await store.resumeInstance(instance.value.id)
    ElMessage.success('已恢复')
  } catch {
    ElMessage.error('恢复失败')
  }
}

function goBack() {
  router.back()
}

function formatDate(d: string | undefined) {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN')
}

function taskStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '待处理',
    claimed: '已认领',
    completed: '已完成',
    cancelled: '已取消',
    delegated: '已委派',
  }
  return map[status] ?? status
}

function taskStatusTagType(status: string): '' | 'success' | 'info' | 'warning' | 'danger' {
  const map: Record<string, '' | 'success' | 'info' | 'warning' | 'danger'> = {
    pending: 'warning',
    claimed: '',
    completed: 'success',
    cancelled: 'info',
    delegated: 'info',
  }
  return map[status] ?? 'info'
}

onMounted(async () => {
  await store.fetchInstanceDetail(props.id)
  await Promise.all([loadGraph(), loadTasks()])
})

// Re-fetch on route param change
watch(() => props.id, async (newId) => {
  await store.fetchInstanceDetail(newId)
  await Promise.all([loadGraph(), loadTasks()])
})
</script>

<template>
  <div :class="$style.view">
    <el-scrollbar :class="$style.scrollbar">
      <!-- Header -->
      <div :class="$style.header">
        <div :class="$style.headerTop">
          <el-button :icon="ArrowLeft" text @click="goBack">返回</el-button>
          <div :class="$style.headerTitle">
            <h1>流程实例详情</h1>
            <el-tag v-if="instance" :type="statusType" size="large">{{ statusLabel }}</el-tag>
          </div>
          <div :class="$style.headerActions">
            <el-button
              v-if="instance?.status === 'running'"
              type="warning"
              :icon="VideoPause"
              @click="handleSuspend"
            >挂起</el-button>
            <el-button
              v-if="instance?.status === 'running'"
              type="danger"
              :icon="CircleClose"
              @click="handleTerminate"
            >终止</el-button>
            <el-button
              v-if="instance?.status === 'suspended'"
              type="primary"
              :icon="VideoPlay"
              @click="handleResume"
            >恢复</el-button>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="store.loading && !instance" :class="$style.content">
        <el-skeleton :rows="8" animated />
      </div>

      <template v-else-if="instance">
        <!-- Info Section -->
        <div :class="$style.content">
          <div :class="$style.section">
            <h2 :class="$style.sectionTitle">基本信息</h2>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="实例 ID">{{ instance.id }}</el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag :type="statusType" size="small">{{ statusLabel }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="流程定义 ID">{{ instance.definitionId }}</el-descriptions-item>
              <el-descriptions-item label="版本">v{{ instance.version }}</el-descriptions-item>
              <el-descriptions-item label="发起人">{{ instance.initiatedBy }}</el-descriptions-item>
              <el-descriptions-item label="开始时间">{{ formatDate(instance.startedAt) }}</el-descriptions-item>
              <el-descriptions-item label="完成时间">{{ formatDate(instance.completedAt) }}</el-descriptions-item>
              <el-descriptions-item label="创建时间">{{ formatDate(instance.createdAt) }}</el-descriptions-item>
            </el-descriptions>
          </div>

          <!-- Variables -->
          <div v-if="instance.variables && Object.keys(instance.variables).length > 0" :class="$style.section">
            <h2 :class="$style.sectionTitle">流程变量</h2>
            <pre :class="$style.jsonBlock">{{ JSON.stringify(instance.variables, null, 2) }}</pre>
          </div>

          <!-- Flow Graph -->
          <div :class="$style.section">
            <h2 :class="$style.sectionTitle">流程图</h2>
            <div :class="$style.graphContainer">
              <el-skeleton v-if="loadingGraph" :rows="6" animated />
              <VueFlow
                v-else
                :nodes="graphNodes"
                :edges="graphEdges"
                :default-edge-options="defaultEdgeOptions"
                :nodes-connectable="false"
                :nodes-draggable="false"
                :elements-selectable="false"
                fit-view-on-init
                :class="$style.flow"
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
                <Background :gap="10" :size="1" />
                <Controls />
              </VueFlow>
            </div>
          </div>

          <!-- Tasks -->
          <div :class="$style.section">
            <h2 :class="$style.sectionTitle">关联任务</h2>
            <el-skeleton v-if="loadingTasks" :rows="3" animated />
            <el-empty v-else-if="instanceTasks.length === 0" description="暂无关联任务" />
            <el-table v-else :data="instanceTasks" stripe :class="$style.table">
              <el-table-column prop="nodeName" label="任务名称" min-width="160" />
              <el-table-column prop="assignee" label="处理人" width="120">
                <template #default="{ row }">{{ row.assignee || '-' }}</template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="taskStatusTagType(row.status)" size="small">{{ taskStatusLabel(row.status) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="outcome" label="结果" width="100">
                <template #default="{ row }">{{ row.outcome || '-' }}</template>
              </el-table-column>
              <el-table-column prop="createdAt" label="创建时间" width="180">
                <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </template>
    </el-scrollbar>
  </div>
</template>

<style module>
.view {
  height: 100%;
  background: #f0f2f5;
}

.scrollbar {
  height: 100%;
}

.header {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 24px 0;
}

.headerTop {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.headerTitle {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.headerTitle h1 {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: #303133;
}

.headerActions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px 32px;
}

.section {
  margin-bottom: 24px;
}

.sectionTitle {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px;
}

.graphContainer {
  height: 480px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.flow {
  width: 100%;
  height: 100%;
}

.jsonBlock {
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 12px 16px;
  font-size: 13px;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  color: #303133;
  overflow-x: auto;
  margin: 0;
}

.table {
  border-radius: 8px;
  overflow: hidden;
}

/* Active token highlight on flow nodes */
.flow :global(.active-token) {
  outline: 3px solid var(--el-color-primary);
  outline-offset: 2px;
  border-radius: 4px;
}
</style>
