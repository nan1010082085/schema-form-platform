<script setup lang="ts">
/**
 * WorkflowInstanceView — 流程实例跟踪页
 *
 * 两种模式：
 *   1. 列表模式（/workflow/:id/instances）：展示该工作流的所有流程实例
 *   2. 详情模式（/workflow/:id/instances/:instanceId）：展示单个实例的进度和审批历史
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Loading,
  CircleCloseFilled,
  CircleCheck,
  Clock,
  Warning,
} from '@element-plus/icons-vue'
import type { WorkflowItem } from '@/utils/apiClient'
import {
  fetchWorkflowById,
  fetchFlowInstances,
  fetchFlowInstanceById,
  fetchApprovalLogs,
  fetchLatestFlowVersion,
  type FlowInstanceItem,
  type ApprovalLogItem,
  type FlowVersionItem,
} from '@/utils/apiClient'
import styles from './WorkflowInstanceView.module.scss'

const route = useRoute()
const router = useRouter()

const workflowId = computed(() => route.params.id as string)
const instanceId = computed(() => route.params.instanceId as string | undefined)
const isDetailMode = computed(() => !!instanceId.value)

// ── 状态 ──
const workflow = ref<WorkflowItem | null>(null)
const instances = ref<FlowInstanceItem[]>([])
const instancesTotal = ref(0)
const instancesPage = ref(1)
const instancesPageSize = 20
const instance = ref<FlowInstanceItem | null>(null)
const approvalLogs = ref<ApprovalLogItem[]>([])
const flowVersion = ref<FlowVersionItem | null>(null)
const loading = ref(true)
const error = ref('')

// ── 列表模式：加载实例列表 ──
async function loadInstances(wfId: string, page = 1) {
  loading.value = true
  error.value = ''

  try {
    if (!workflow.value) {
      workflow.value = await fetchWorkflowById(wfId)
    }
    const res = await fetchFlowInstances({
      definitionId: workflow.value.flowDefinitionId,
      page,
      pageSize: instancesPageSize,
    })
    instances.value = res.items
    instancesTotal.value = res.total
    instancesPage.value = page
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载实例列表失败'
  } finally {
    loading.value = false
  }
}

// ── 详情模式：加载单个实例 ──
async function loadInstanceDetail(wfId: string, instId: string) {
  loading.value = true
  error.value = ''

  try {
    const [wf, inst, logs] = await Promise.all([
      fetchWorkflowById(wfId),
      fetchFlowInstanceById(instId),
      fetchApprovalLogs(instId),
    ])

    workflow.value = wf
    instance.value = inst
    approvalLogs.value = logs

    const version = await fetchLatestFlowVersion(wf.flowDefinitionId).catch(() => null)
    flowVersion.value = version
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载流程实例失败'
  } finally {
    loading.value = false
  }
}

// ── 流程节点列表 ──
interface FlowNodeInfo {
  id: string
  name: string
  type: string
  tokenState?: 'active' | 'waiting' | 'completed'
}

const flowNodes = computed<FlowNodeInfo[]>(() => {
  if (!flowVersion.value?.graph?.nodes || !instance.value) return []
  const nodes = flowVersion.value.graph.nodes as Array<{
    id: string
    type: string
    data?: { label?: string; name?: string }
  }>
  const tokens = instance.value.tokens ?? []

  return nodes.map((node) => {
    const token = tokens.find((t) => t.nodeId === node.id)
    return {
      id: node.id,
      name: node.data?.label || node.data?.name || node.id,
      type: node.type,
      tokenState: token?.state,
    }
  })
})

// ── 状态映射 ──
const statusLabelMap: Record<string, string> = {
  running: '进行中',
  completed: '已完成',
  terminated: '已终止',
  suspended: '已挂起',
  failed: '已失败',
}

const statusTypeMap: Record<string, string> = {
  running: 'primary',
  completed: 'success',
  terminated: 'danger',
  suspended: 'warning',
  failed: 'danger',
}

const actionLabelMap: Record<string, string> = {
  approve: '审批通过',
  reject: '审批驳回',
  delegate: '转办',
  complete: '完成任务',
  claim: '认领任务',
  start: '发起流程',
  terminate: '终止流程',
  suspend: '挂起流程',
  resume: '恢复流程',
}

// ── 工具函数 ──
function getInitial(name: string): string {
  return name ? name.charAt(0).toUpperCase() : '?'
}

function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return '进行中'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins} 分钟`
  const hours = Math.floor(mins / 60)
  const remainMins = mins % 60
  if (hours < 24) return `${hours} 小时 ${remainMins} 分钟`
  const days = Math.floor(hours / 24)
  return `${days} 天 ${hours % 24} 小时`
}

function goToDetail(instId: string) {
  router.push(`/workflow/${workflowId.value}/instances/${instId}`)
}

function goBackToList() {
  router.push(`/workflow/${workflowId.value}/instances`)
}

function handleBack() {
  router.push('/workflows')
}

// ── 初始化 + 路由变化监听 ──
function loadData() {
  if (!workflowId.value) {
    error.value = '缺少工作流 ID'
    loading.value = false
    return
  }

  if (isDetailMode.value && instanceId.value) {
    loadInstanceDetail(workflowId.value, instanceId.value)
  } else {
    loadInstances(workflowId.value)
  }
}

onMounted(loadData)
watch(() => route.fullPath, loadData)
</script>

<template>
  <div :class="styles.page">
    <!-- 顶部导航 -->
    <div :class="styles.header">
      <div :class="styles.headerLeft">
        <button
          :class="styles.backBtn"
          :title="isDetailMode ? '返回实例列表' : '返回工作流列表'"
          @click="isDetailMode ? goBackToList() : handleBack()"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span :class="styles.headerTitle">
          {{ isDetailMode ? '流程实例详情' : (workflow?.name ?? '流程实例') }}
        </span>
        <el-tag
          v-if="isDetailMode && instance"
          :type="(statusTypeMap[instance.status] as any) ?? 'info'"
          size="small"
        >
          {{ statusLabelMap[instance.status] ?? instance.status }}
        </el-tag>
      </div>
      <div :class="styles.headerRight">
        <el-button size="small" @click="router.push(`/workflow/${workflowId}/preview`)">
          预览工作流
        </el-button>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" :class="styles.loading">
      <el-icon class="is-loading" :size="20"><Loading /></el-icon>
      <span>加载中...</span>
    </div>

    <!-- 错误 -->
    <div v-else-if="error" :class="styles.errorState">
      <el-icon :size="48" color="var(--el-color-danger)"><CircleCloseFilled /></el-icon>
      <p>{{ error }}</p>
      <el-button @click="handleBack">返回工作流列表</el-button>
    </div>

    <!-- 列表模式 -->
    <template v-else-if="!isDetailMode">
      <div :class="styles.body">
        <div :class="styles.content" style="max-width: 960px;">
          <div :class="styles.card">
            <div :class="styles.cardHeader">
              <span :class="styles.cardTitle">流程实例列表</span>
              <el-tag size="small" type="info">{{ instancesTotal }} 个实例</el-tag>
            </div>
            <div :class="styles.cardBody">
              <div v-if="instances.length === 0" :class="styles.emptyState">
                暂无流程实例
              </div>
              <el-table v-else :data="instances" style="width: 100%">
                <el-table-column prop="id" label="实例 ID" width="280" show-overflow-tooltip />
                <el-table-column label="状态" width="100">
                  <template #default="{ row }">
                    <el-tag
                      :type="(statusTypeMap[row.status] as any) ?? 'info'"
                      size="small"
                    >
                      {{ statusLabelMap[row.status] ?? row.status }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="initiatedBy" label="发起人" width="120" />
                <el-table-column label="开始时间" width="180">
                  <template #default="{ row }">
                    {{ formatTime(row.startedAt) }}
                  </template>
                </el-table-column>
                <el-table-column label="耗时">
                  <template #default="{ row }">
                    {{ formatDuration(row.startedAt, row.completedAt) }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="100" fixed="right">
                  <template #default="{ row }">
                    <el-button
                      type="primary"
                      link
                      size="small"
                      @click="goToDetail(row.id)"
                    >
                      查看详情
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
              <div v-if="instancesTotal > instancesPageSize" style="margin-top: 16px; display: flex; justify-content: center;">
                <el-pagination
                  :current-page="instancesPage"
                  :page-size="instancesPageSize"
                  :total="instancesTotal"
                  layout="prev, pager, next"
                  small
                  @current-change="(p: number) => loadInstances(workflowId, p)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 详情模式 -->
    <template v-else-if="instance">
      <div :class="styles.body">
        <div :class="styles.content">
          <!-- 左列：进度 + 审批历史 -->
          <div :class="styles.leftCol">
            <!-- 流程进度 -->
            <div :class="styles.progressCard">
              <div :class="styles.cardHeader">
                <span :class="styles.cardTitle">流程进度</span>
              </div>
              <div :class="styles.cardBody">
                <div v-if="flowNodes.length === 0" :class="styles.emptyState">
                  暂无流程节点数据
                </div>
                <div v-else :class="styles.progressTimeline">
                  <div
                    v-for="node in flowNodes"
                    :key="node.id"
                    :class="styles.progressNode"
                  >
                    <div
                      :class="[
                        styles.progressDot,
                        node.tokenState === 'active' ? styles.progressDot + '--active' :
                        node.tokenState === 'completed' ? styles.progressDot + '--completed' :
                        styles.progressDot + '--waiting'
                      ]"
                    >
                      <el-icon v-if="node.tokenState === 'active'" :size="12"><Loading /></el-icon>
                      <el-icon v-else-if="node.tokenState === 'completed'" :size="12"><CircleCheck /></el-icon>
                    </div>
                    <div :class="styles.progressInfo">
                      <div :class="styles.progressName">{{ node.name }}</div>
                      <div :class="styles.progressMeta">
                        {{ node.type }}
                        <template v-if="node.tokenState === 'active'"> — 当前节点</template>
                        <template v-else-if="node.tokenState === 'completed'"> — 已完成</template>
                        <template v-else-if="node.tokenState === 'waiting'"> — 等待中</template>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 审批历史 -->
            <div :class="styles.historyCard">
              <div :class="styles.cardHeader">
                <span :class="styles.cardTitle">审批历史</span>
                <el-tag size="small" type="info">{{ approvalLogs.length }} 条记录</el-tag>
              </div>
              <div :class="styles.cardBody">
                <div v-if="approvalLogs.length === 0" :class="styles.emptyState">
                  暂无审批记录
                </div>
                <div v-else :class="styles.historyList">
                  <div
                    v-for="log in approvalLogs"
                    :key="log.id"
                    :class="styles.historyItem"
                  >
                    <div :class="styles.historyAvatar">
                      {{ getInitial(log.operator) }}
                    </div>
                    <div :class="styles.historyContent">
                      <div :class="styles.historyHeader">
                        <span :class="styles.historyOperator">{{ log.operator }}</span>
                        <span :class="styles.historyTime">{{ formatTime(log.createdAt) }}</span>
                      </div>
                      <div :class="styles.historyAction">
                        {{ actionLabelMap[log.action] ?? log.action }}
                        <template v-if="log.nodeName"> — {{ log.nodeName }}</template>
                        <template v-if="log.outcome"> ({{ log.outcome }})</template>
                      </div>
                      <div v-if="log.comment" :class="styles.historyComment">
                        {{ log.comment }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 右列：状态 + 变量 -->
          <div :class="styles.rightCol">
            <!-- 当前状态 -->
            <div :class="styles.statusCard">
              <div :class="styles.cardHeader">
                <span :class="styles.cardTitle">当前状态</span>
              </div>
              <div :class="styles.cardBody">
                <div :class="styles.statusRow">
                  <div :class="styles.statusItem">
                    <span :class="styles.statusLabel">状态</span>
                    <el-tag
                      :type="(statusTypeMap[instance.status] as any) ?? 'info'"
                      size="small"
                    >
                      {{ statusLabelMap[instance.status] ?? instance.status }}
                    </el-tag>
                  </div>
                  <div :class="styles.statusItem">
                    <span :class="styles.statusLabel">发起人</span>
                    <span :class="styles.statusValue">{{ instance.initiatedBy }}</span>
                  </div>
                  <div :class="styles.statusItem">
                    <span :class="styles.statusLabel">版本</span>
                    <span :class="styles.statusValue">{{ instance.version }}</span>
                  </div>
                </div>
                <el-divider />
                <div :class="styles.statusRow">
                  <div :class="styles.statusItem">
                    <span :class="styles.statusLabel">开始时间</span>
                    <span :class="styles.statusValue">{{ formatTime(instance.startedAt) }}</span>
                  </div>
                  <div :class="styles.statusItem">
                    <span :class="styles.statusLabel">耗时</span>
                    <span :class="styles.statusValue">
                      {{ formatDuration(instance.startedAt, instance.completedAt) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 实例变量 -->
            <div :class="styles.card">
              <div :class="styles.cardHeader">
                <span :class="styles.cardTitle">实例变量</span>
              </div>
              <div :class="styles.cardBody">
                <div
                  v-if="Object.keys(instance.variables).length === 0"
                  :class="styles.emptyState"
                >
                  无变量数据
                </div>
                <template v-else>
                  <div
                    v-for="(value, key) in instance.variables"
                    :key="key"
                    :class="styles.statusItem"
                    style="margin-bottom: 8px;"
                  >
                    <span :class="styles.statusLabel">{{ key }}</span>
                    <span :class="styles.statusValue">
                      {{ typeof value === 'object' ? JSON.stringify(value) : String(value) }}
                    </span>
                  </div>
                </template>
              </div>
            </div>

            <!-- Token 状态 -->
            <div :class="styles.card">
              <div :class="styles.cardHeader">
                <span :class="styles.cardTitle">Token 状态</span>
              </div>
              <div :class="styles.cardBody">
                <div
                  v-if="instance.tokens.length === 0"
                  :class="styles.emptyState"
                >
                  无 Token 数据
                </div>
                <template v-else>
                  <div
                    v-for="token in instance.tokens"
                    :key="token.tokenId"
                    :class="styles.statusItem"
                    style="margin-bottom: 8px;"
                  >
                    <span :class="styles.statusLabel">
                      {{ token.nodeId }}
                      <el-tag
                        :type="token.state === 'active' ? 'primary' : token.state === 'completed' ? 'success' : 'info'"
                        size="small"
                        style="margin-left: 4px;"
                      >
                        {{ token.state }}
                      </el-tag>
                    </span>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
