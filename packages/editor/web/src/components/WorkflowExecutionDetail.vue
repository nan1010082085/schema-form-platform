<script setup lang="ts">
/**
 * WorkflowExecutionDetail — 执行详情抽屉
 *
 * 展示单次执行的节点时间线、变量快照、错误信息。
 */
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { CircleCheck, CircleClose, Loading, WarningFilled, Remove } from '@element-plus/icons-vue'
import { apiClient } from '@/utils/apiClient'
import styles from './WorkflowExecutionDetail.module.scss'

// ── Types ──
interface NodeLog {
  id: string
  nodeId: string
  nodeName: string
  status: 'running' | 'completed' | 'failed' | 'skipped'
  input: Record<string, unknown>
  output: Record<string, unknown>
  error: string
  startedAt: string
  completedAt: string | null
  duration: number
}

interface ExecutionDetail {
  id: string
  definitionId: string
  workflowName: string
  status: string
  variables: Record<string, unknown>
  initiatedBy: string
  startedAt: string
  completedAt: string | null
  nodeLogs: NodeLog[]
}

// ── Props ──
const props = defineProps<{
  visible: boolean
  executionId: string | null
}>()

const emit = defineEmits<{
  'update:visible': [val: boolean]
}>()

// ── State ──
const loading = ref(false)
const detail = ref<ExecutionDetail | null>(null)

// ── Fetch ──
async function fetchDetail() {
  if (!props.executionId) return
  loading.value = true
  try {
    detail.value = await apiClient.get<ExecutionDetail>(
      `/workflow-executions/${encodeURIComponent(props.executionId)}`,
    )
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '加载详情失败')
  } finally {
    loading.value = false
  }
}

watch(() => props.visible, (val) => {
  if (val && props.executionId) {
    fetchDetail()
  } else {
    detail.value = null
  }
})

// ── Helpers ──
function statusLabel(s: string): string {
  const map: Record<string, string> = {
    running: '运行中',
    completed: '已完成',
    failed: '失败',
    terminated: '已终止',
    suspended: '已挂起',
    skipped: '已跳过',
  }
  return map[s] ?? s
}

function statusType(s: string): '' | 'success' | 'info' | 'warning' | 'danger' {
  const map: Record<string, '' | 'success' | 'info' | 'warning' | 'danger'> = {
    running: '',
    completed: 'success',
    failed: 'danger',
    terminated: 'warning',
    suspended: 'info',
    skipped: 'info',
  }
  return map[s] ?? 'info'
}

function nodeIcon(status: string) {
  const map: Record<string, typeof CircleCheck> = {
    completed: CircleCheck,
    failed: CircleClose,
    running: Loading,
    skipped: Remove,
  }
  return map[status] ?? WarningFilled
}

function nodeIconColor(status: string): string {
  const map: Record<string, string> = {
    completed: 'var(--color-success)',
    failed: 'var(--color-danger)',
    running: 'var(--color-primary)',
    skipped: 'var(--text-color-secondary)',
  }
  return map[status] ?? 'var(--text-color-secondary)'
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`
}

function formatDate(d: string | null): string {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN')
}

function formatJson(obj: unknown): string {
  if (!obj || (typeof obj === 'object' && Object.keys(obj).length === 0)) return '(空)'
  return JSON.stringify(obj, null, 2)
}
</script>

<template>
  <el-drawer
    :model-value="visible"
    title="执行详情"
    direction="rtl"
    size="560px"
    @update:model-value="emit('update:visible', $event)"
  >
    <div v-if="loading" :class="styles.loading">
      <el-skeleton :rows="10" animated />
    </div>

    <div v-else-if="detail" :class="styles.root">
      <!-- Overview -->
      <div :class="styles.overview">
        <div :class="styles.overviewRow">
          <span :class="styles.label">工作流</span>
          <span :class="styles.value">{{ detail.workflowName }}</span>
        </div>
        <div :class="styles.overviewRow">
          <span :class="styles.label">状态</span>
          <el-tag :type="statusType(detail.status)" size="small">
            {{ statusLabel(detail.status) }}
          </el-tag>
        </div>
        <div :class="styles.overviewRow">
          <span :class="styles.label">发起人</span>
          <span :class="styles.value">{{ detail.initiatedBy }}</span>
        </div>
        <div :class="styles.overviewRow">
          <span :class="styles.label">开始时间</span>
          <span :class="styles.value">{{ formatDate(detail.startedAt) }}</span>
        </div>
        <div :class="styles.overviewRow">
          <span :class="styles.label">结束时间</span>
          <span :class="styles.value">{{ formatDate(detail.completedAt) }}</span>
        </div>
      </div>

      <!-- Variables Snapshot -->
      <el-divider content-position="left">变量快照</el-divider>
      <div :class="styles.variables">
        <pre :class="styles.jsonBlock">{{ formatJson(detail.variables) }}</pre>
      </div>

      <!-- Node Timeline -->
      <el-divider content-position="left">节点执行时间线</el-divider>
      <div :class="styles.timeline">
        <div
          v-for="node in detail.nodeLogs"
          :key="node.id"
          :class="styles.timelineItem"
        >
          <div :class="styles.timelineDot">
            <el-icon :size="18" :style="{ color: nodeIconColor(node.status) }">
              <component :is="nodeIcon(node.status)" />
            </el-icon>
          </div>
          <div :class="styles.timelineContent">
            <div :class="styles.timelineHeader">
              <span :class="styles.nodeName">{{ node.nodeName || node.nodeId }}</span>
              <el-tag :type="statusType(node.status)" size="small">
                {{ statusLabel(node.status) }}
              </el-tag>
            </div>
            <div :class="styles.timelineMeta">
              <span v-if="node.duration">耗时: {{ formatDuration(node.duration) }}</span>
              <span>{{ formatDate(node.startedAt) }}</span>
            </div>

            <!-- Error -->
            <div v-if="node.error" :class="styles.errorBlock">
              <el-icon><WarningFilled /></el-icon>
              <span>{{ node.error }}</span>
            </div>

            <!-- Input/Output (collapsed) -->
            <el-collapse v-if="Object.keys(node.input ?? {}).length > 0 || Object.keys(node.output ?? {}).length > 0">
              <el-collapse-item title="输入/输出数据" name="io">
                <div v-if="Object.keys(node.input ?? {}).length > 0" :class="styles.ioSection">
                  <span :class="styles.ioLabel">Input</span>
                  <pre :class="styles.jsonBlock">{{ formatJson(node.input) }}</pre>
                </div>
                <div v-if="Object.keys(node.output ?? {}).length > 0" :class="styles.ioSection">
                  <span :class="styles.ioLabel">Output</span>
                  <pre :class="styles.jsonBlock">{{ formatJson(node.output) }}</pre>
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>
        </div>

        <div v-if="detail.nodeLogs.length === 0" :class="styles.emptyNodes">
          暂无节点执行记录
        </div>
      </div>
    </div>
  </el-drawer>
</template>
