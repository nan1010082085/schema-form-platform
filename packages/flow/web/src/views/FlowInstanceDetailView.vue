<script setup lang="ts">
import { onMounted, ref, computed, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import type { Node, Edge } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { useFlowInstanceStore } from '../stores/flowInstance.js'
import { flowApi } from '../api/flowApi.js'
import type { FlowGraph, ApprovalLogEntry } from '@schema-form/flow-shared'
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
} from '../components/nodes/index.js'
import { AnimatedEdge } from '../components/edges/index.js'
import { useFlowExport } from '../composables/useFlowExport.js'
import styles from './FlowInstanceDetailView.module.scss'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

const route = useRoute()
const store = useFlowInstanceStore()
const { exporting, exportInstance } = useFlowExport()

const instanceId = computed(() => route.params.id as string)
const graphNodes = ref<Node[]>([])
const graphEdges = ref<Edge[]>([])
const activeTab = ref('graph')

const flowName = ref('')

const vueFlowApi = ref<ReturnType<typeof useVueFlow> | null>(null)

function handlePaneReady(instance: ReturnType<typeof useVueFlow>) {
  vueFlowApi.value = instance
  requestAnimationFrame(() => {
    instance.fitView({ padding: 0.2 })
  })
}

watch(graphNodes, () => {
  const api = vueFlowApi.value
  if (api && graphNodes.value.length > 0) {
    requestAnimationFrame(() => api.fitView({ padding: 0.2 }))
  }
})

// Approval logs
type ApprovalLog = ApprovalLogEntry & { createdAt: string | Date }
const approvalLogs = ref<ApprovalLog[]>([])
const logsLoading = ref(false)

const SHAPE_TO_VF_TYPE: Record<string, string> = {
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

const VF_TYPES = new Set([
  'start-event', 'end-event', 'timer-event',
  'user-task', 'service-task', 'script-task', 'send-task', 'receive-task',
  'exclusive-gateway', 'parallel-gateway', 'inclusive-gateway', 'sub-process',
])

function resolveNodeType(n: { type?: string; shape?: string; data?: unknown }): string {
  if (n.type && VF_TYPES.has(n.type)) return n.type
  if (n.shape && SHAPE_TO_VF_TYPE[n.shape]) return SHAPE_TO_VF_TYPE[n.shape]
  const d = n.data as Record<string, unknown> | undefined
  if (d?.bpmnType) {
    const bpmnType = String(d.bpmnType)
    const camelToKebab = bpmnType.replace(/([A-Z])/g, '-$1').toLowerCase()
    if (VF_TYPES.has(camelToKebab)) return camelToKebab
  }
  return 'user-task'
}

onMounted(async () => {
  await store.fetchInstanceDetail(instanceId.value)
  const inst = store.currentInstance
  if (!inst) return

  // Fetch flow definition name
  if (inst.definitionId) {
    try {
      const def = (await flowApi.getFlow(inst.definitionId)) as { name?: string }
      if (def?.name) flowName.value = def.name
    } catch {
      // definition fetch failure is non-critical
    }
  }

  if (inst.definitionId && inst.versionId) {
    try {
      const version = (await flowApi.getVersion(inst.definitionId, inst.versionId)) as { graph: FlowGraph }
      if (version.graph) {
        const tokenMap = new Map((inst.tokens ?? []).map((t) => [t.nodeId, t.state]))
        graphNodes.value = version.graph.nodes.map((n) => {
          const state = tokenMap.get(n.id)
          return {
            id: n.id,
            type: resolveNodeType(n),
            position: { x: n.x, y: n.y },
            data: { label: n.data?.label ?? n.id },
            class: getNodeClass(state, inst.status),
          }
        })
        graphEdges.value = version.graph.edges.map((e) => {
          const sourceState = tokenMap.get(e.source.cell)
          const targetState = tokenMap.get(e.target.cell)
          const edgeState = resolveEdgeState(sourceState, targetState, inst.status)
          return {
            id: e.id,
            type: 'animated-edge',
            source: e.source.cell,
            target: e.target.cell,
            label: e.data?.label,
            class: edgeState,
            data: {
              conditionExpression: e.data?.conditionExpression,
              isDefault: e.data?.isDefault,
              animated: edgeState === 'edge-active',
            },
          }
        })
        return
      }
    } catch {
      // Fallback to token-based graph
    }
  }

  if (inst.tokens) {
    graphNodes.value = inst.tokens.map((token) => ({
      id: token.nodeId,
      type: token.nodeId.startsWith('end') ? 'end-event' : 'user-task',
      position: { x: 0, y: 0 },
      data: { label: token.nodeId },
      class: getNodeClass(token.state, inst.status),
    }))
    graphEdges.value = []
  }

  await nextTick()
  const api = vueFlowApi.value
  if (api) {
    setTimeout(() => api.fitView({ padding: 0.2 }), 200)
  }
})

async function loadApprovalLogs() {
  if (approvalLogs.value.length > 0) return
  logsLoading.value = true
  try {
    const data = await flowApi.getApprovalLogs(instanceId.value)
    approvalLogs.value = (data.items ?? []) as ApprovalLog[]
  } catch {
    // ignore
  } finally {
    logsLoading.value = false
  }
}

function onTabChange(tab: string) {
  if (tab === 'logs') loadApprovalLogs()
}

function getNodeClass(state: string | undefined, instanceStatus?: string): string {
  if (state === 'active') {
    // If instance failed, active nodes should show as failed
    if (instanceStatus === 'failed') return 'node-failed'
    return 'node-running'
  }
  if (state === 'completed') return 'node-completed'
  if (state === 'waiting') {
    // If instance failed, waiting nodes should show as failed
    if (instanceStatus === 'failed') return 'node-failed'
    return 'node-waiting'
  }
  if (state === 'failed') return 'node-failed'
  return ''
}

function resolveEdgeState(sourceState: string | undefined, targetState: string | undefined, instanceStatus?: string): string {
  if (instanceStatus === 'failed') {
    // If instance failed, show edges connected to active/waiting nodes as failed
    if (targetState === 'active' || targetState === 'waiting') return 'edge-failed'
    if (sourceState === 'active' || sourceState === 'waiting') return 'edge-failed'
  }
  if (targetState === 'active') return 'edge-active'
  if (sourceState === 'completed' && targetState === 'completed') return 'edge-completed'
  return 'edge-pending'
}

const instance = computed(() => store.currentInstance)

const statusType = computed(() => {
  const map: Record<string, string> = {
    running: 'primary',
    completed: 'success',
    terminated: 'danger',
    suspended: 'warning',
    failed: 'danger',
  }
  return map[instance.value?.status ?? ''] ?? 'default'
})

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

function actionLabel(action: string) {
  const map: Record<string, string> = {
    claim: '签收',
    approve: '通过',
    reject: '驳回',
    delegate: '委派',
    comment: '评论',
  }
  return map[action] ?? action
}

function actionTheme(action: string) {
  const map: Record<string, string> = {
    approve: 'success',
    reject: 'danger',
    claim: 'primary',
    delegate: 'warning',
  }
  return map[action] ?? 'default'
}

function formatDate(dateStr?: string | Date) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

// TTable columns config for approval logs
const logColumns = [
  { colKey: 'nodeName', title: '节点', minWidth: 140 },
  {
    colKey: 'action',
    title: '操作',
    width: 100,
    cell: 'actionCell',
  },
  { colKey: 'operator', title: '操作人', width: 120 },
  {
    colKey: 'outcome',
    title: '结果',
    width: 100,
    cell: 'outcomeCell',
  },
  {
    colKey: 'comment',
    title: '备注',
    minWidth: 160,
    cell: 'commentCell',
  },
  {
    colKey: 'createdAt',
    title: '时间',
    width: 180,
    cell: 'dateCell',
  },
]
</script>

<template>
  <div v-loading="store.loading" :class="styles.instanceDetail">
    <div v-if="instance" :class="styles.content">
      <!-- Instance info header -->
      <div :class="styles.header">
        <div :class="styles.headerActions">
          <t-button
            theme="primary"
            :loading="exporting"
            @click="exportInstance(instanceId)"
          >
            导出审批记录
          </t-button>
        </div>
      </div>

      <div :class="styles.infoCard">
        <div :class="styles.infoRow">
          <span :class="styles.label">流程名称</span>
          <span :class="styles.value">{{ flowName || '-' }}</span>
        </div>
        <div :class="styles.infoRow">
          <span :class="styles.label">流程 ID</span>
          <span :class="[styles.value, styles.mono]">{{ instance.definitionId || '-' }}</span>
        </div>
        <div :class="styles.infoRow">
          <span :class="styles.label">实例 ID</span>
          <span :class="[styles.value, styles.mono]">{{ instance.id }}</span>
        </div>
        <div :class="styles.infoRow">
          <span :class="styles.label">状态</span>
          <t-tag :theme="statusType" size="small">{{ statusLabel }}</t-tag>
        </div>
        <div :class="styles.infoRow">
          <span :class="styles.label">发起人</span>
          <span :class="styles.value">{{ instance.initiatedBy || '-' }}</span>
        </div>
        <div :class="styles.infoRow">
          <span :class="styles.label">开始时间</span>
          <span :class="styles.value">{{ formatDate(instance.startedAt) }}</span>
        </div>
        <div :class="styles.infoRow">
          <span :class="styles.label">完成时间</span>
          <span :class="styles.value">{{ formatDate(instance.completedAt) }}</span>
        </div>
      </div>

      <!-- Tabbed content -->
      <t-tabs v-model:value="activeTab" @change="onTabChange">
        <t-tab-panel label="流程图" value="graph">
          <div :class="styles.graphContainer">
            <VueFlow
              id="flow-instance-view"
              :nodes="graphNodes"
              :edges="graphEdges"
              fit-view-on-init
              :class="styles.flowGraph"
              @pane-ready="handlePaneReady"
            >
              <template #node-start-event="props"><StartEventNode v-bind="props" /></template>
              <template #node-end-event="props"><EndEventNode v-bind="props" /></template>
              <template #node-timer-event="props"><TimerEventNode v-bind="props" /></template>
              <template #node-user-task="props"><UserTaskNode v-bind="props" /></template>
              <template #node-service-task="props"><ServiceTaskNode v-bind="props" /></template>
              <template #node-script-task="props"><ScriptTaskNode v-bind="props" /></template>
              <template #node-send-task="props"><SendTaskNode v-bind="props" /></template>
              <template #node-receive-task="props"><ReceiveTaskNode v-bind="props" /></template>
              <template #node-exclusive-gateway="props"><ExclusiveGatewayNode v-bind="props" /></template>
              <template #node-parallel-gateway="props"><ParallelGatewayNode v-bind="props" /></template>
              <template #node-inclusive-gateway="props"><InclusiveGatewayNode v-bind="props" /></template>
              <template #node-sub-process="props"><SubProcessNode v-bind="props" /></template>
              <template #edge-animated-edge="edgeProps"><AnimatedEdge v-bind="edgeProps" /></template>
              <Background />
            </VueFlow>
          </div>
        </t-tab-panel>

        <t-tab-panel label="流程变量" value="variables">
          <template v-if="instance.variables && Object.keys(instance.variables).length > 0">
            <t-descriptions :column="2" bordered size="small">
              <t-descriptions-item
                v-for="(value, key) in instance.variables"
                :key="String(key)"
                :label="String(key)"
              >
                {{ String(value) }}
              </t-descriptions-item>
            </t-descriptions>
          </template>
          <div v-else :class="styles.emptyTip">暂无流程变量</div>
        </t-tab-panel>

        <t-tab-panel label="活动轨迹" value="tokens">
          <t-timeline>
            <t-timeline-item
              v-for="token in instance.tokens"
              :key="token.tokenId"
              :theme="token.state === 'active' ? 'primary' : token.state === 'completed' ? 'success' : 'default'"
              :label="formatDate(instance.updatedAt)"
            >
              <span :class="styles.tokenNode">{{ token.nodeId }}</span>
              <t-tag size="small" :theme="token.state === 'active' ? 'primary' : 'default'" :class="styles.tokenState">
                {{ token.state }}
              </t-tag>
            </t-timeline-item>
          </t-timeline>
        </t-tab-panel>

        <t-tab-panel label="审批日志" value="logs">
          <div v-loading="logsLoading">
            <t-table
              v-if="approvalLogs.length > 0"
              :data="approvalLogs"
              :columns="logColumns"
              size="small"
              stripe
              row-key="id"
            >
              <template #actionCell="{ row }">
                <t-tag :theme="actionTheme(row.action)" size="small">{{ actionLabel(row.action) }}</t-tag>
              </template>
              <template #outcomeCell="{ row }">
                {{ row.outcome || '-' }}
              </template>
              <template #commentCell="{ row }">
                {{ row.comment || '-' }}
              </template>
              <template #dateCell="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </t-table>
            <div v-else-if="!logsLoading" :class="styles.emptyTip">暂无审批记录</div>
          </div>
        </t-tab-panel>
      </t-tabs>
    </div>
  </div>
</template>
