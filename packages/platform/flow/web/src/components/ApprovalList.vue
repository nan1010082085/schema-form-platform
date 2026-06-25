<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <h3 :class="$style.title">审批记录</h3>
      <el-button size="small" @click="refresh">刷新</el-button>
    </div>

    <div v-loading="loading" :class="$style.list">
      <div
        v-for="task in tasks"
        :key="task.taskId"
        :class="[$style.item, $style[task.status]]"
      >
        <div :class="$style.itemHeader">
          <span :class="$style.nodeName">{{ task.nodeName }}</span>
          <el-tag :type="getStatusTheme(task.status)" size="small" effect="light">
            {{ getStatusLabel(task.status) }}
          </el-tag>
        </div>

        <div :class="$style.itemBody">
          <div v-if="task.assignee" :class="$style.assignee">
            <span :class="$style.label">审批人：</span>
            <span>{{ task.assignee }}</span>
          </div>
          <div v-if="task.outcome" :class="$style.outcome">
            <span :class="$style.label">结果：</span>
            <el-tag :type="getOutcomeTheme(task.outcome)" size="small" effect="light">
              {{ getOutcomeLabel(task.outcome) }}
            </el-tag>
          </div>
          <div v-if="task.updatedAt" :class="$style.time">
            <span :class="$style.label">时间：</span>
            <span>{{ formatTime(task.updatedAt) }}</span>
          </div>
        </div>
      </div>

      <el-empty v-if="!loading && tasks.length === 0" description="暂无审批记录" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { flowApi } from '@/api/flowApi'

interface ApprovalTask {
  taskId: string
  nodeId: string
  nodeName: string
  status: 'pending' | 'claimed' | 'completed' | 'cancelled'
  assignee?: string
  outcome?: string
  formData?: Record<string, unknown>
  formSchemaId?: string
  formPublishId?: string
  createdAt: string
  updatedAt: string
}

const props = defineProps<{
  instanceId: string
}>()

const loading = ref(false)
const tasks = ref<ApprovalTask[]>([])

async function fetchApprovalList() {
  if (!props.instanceId) return

  loading.value = true
  try {
    const data = await flowApi.getApprovalList(props.instanceId)
    tasks.value = data.tasks || []
  } finally {
    loading.value = false
  }
}

function refresh() {
  fetchApprovalList()
}

function getStatusTheme(status: string) {
  const map: Record<string, string> = {
    pending: 'warning',
    claimed: 'default',
    completed: 'success',
    cancelled: 'danger',
  }
  return map[status] || 'default'
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    pending: '待处理',
    claimed: '已认领',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[status] || status
}

function getOutcomeTheme(outcome: string) {
  const map: Record<string, string> = {
    approved: 'success',
    rejected: 'danger',
    submitted: 'primary',
  }
  return map[outcome] || 'default'
}

function getOutcomeLabel(outcome: string) {
  const map: Record<string, string> = {
    approved: '通过',
    rejected: '拒绝',
    submitted: '已提交',
  }
  return map[outcome] || outcome
}

function formatTime(time: string) {
  if (!time) return '-'
  return new Date(time).toLocaleString()
}

watch(() => props.instanceId, () => {
  if (props.instanceId) {
    fetchApprovalList()
  }
})

onMounted(() => {
  if (props.instanceId) {
    fetchApprovalList()
  }
})
</script>

<style module>
.container {
  background: var(--bg-color);
  border-radius: 8px;
  border: 1px solid var(--border-color-lighter);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-color-lighter);
}

.title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.list {
  padding: 16px;
  min-height: 100px;
}

.item {
  padding: 12px;
  border: 1px solid var(--border-color-lighter);
  border-radius: 8px;
  margin-bottom: 12px;
}

.item:last-child {
  margin-bottom: 0;
}

.item.pending {
  border-left: 3px solid var(--color-warning);
}

.item.completed {
  border-left: 3px solid var(--color-success);
}

.item.cancelled {
  border-left: 3px solid var(--color-danger);
}

.itemHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.nodeName {
  font-weight: 500;
  color: var(--text-color-primary);
}

.itemBody {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: var(--text-color-secondary);
}

.assignee,
.outcome,
.time {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label {
  color: var(--text-color-placeholder);
  min-width: 60px;
}
</style>
