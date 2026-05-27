<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { View, Check, Pointer } from '@element-plus/icons-vue'
import { useFlowInstanceStore } from '@schema-form/flow-web'
import type { TaskInstance } from '@schema-form/flow-web'

const router = useRouter()
const store = useFlowInstanceStore()

// Filter
const activeTab = ref<'pending' | 'claimed' | 'completed'>('pending')

const filterTabs = [
  { label: '待处理', value: 'pending' as const },
  { label: '已认领', value: 'claimed' as const },
  { label: '已完成', value: 'completed' as const },
]

const filteredTasks = computed(() =>
  store.tasks.filter((t) => t.status === activeTab.value),
)

// Simple complete dialog (no form)
const completeDialogVisible = ref(false)
const completingTask = ref<TaskInstance | null>(null)
const completeOutcome = ref<'approved' | 'rejected'>('approved')
const completeFormData = ref('')

// Form dialog (iframe-based)
const formDialogVisible = ref(false)
const formTask = ref<TaskInstance | null>(null)
const formLoading = ref(true)

function openCompleteDialog(task: TaskInstance) {
  completingTask.value = task
  completeOutcome.value = 'approved'
  completeFormData.value = ''

  if (task.formSchemaId) {
    formLoading.value = true
    formTask.value = task
    formDialogVisible.value = true
  } else {
    completeDialogVisible.value = true
  }
}

function getFormUrl(schemaId: string, mode?: string) {
  const base = `/view?id=${schemaId}`
  if (mode === 'readonly') return `${base}&readonly=true`
  return base
}

function onFormLoad() {
  formLoading.value = false
}

async function handleFormApprove() {
  if (!formTask.value) return
  await store.completeTask(formTask.value.id, undefined, 'approved')
  formDialogVisible.value = false
  ElMessage.success('任务已通过')
  store.fetchMyTasks()
}

async function handleFormReject() {
  if (!formTask.value) return
  await store.completeTask(formTask.value.id, undefined, 'rejected')
  formDialogVisible.value = false
  ElMessage.success('任务已驳回')
  store.fetchMyTasks()
}

async function confirmComplete() {
  if (!completingTask.value) return
  let parsedData: Record<string, unknown> | undefined
  if (completeFormData.value.trim()) {
    try {
      parsedData = JSON.parse(completeFormData.value)
    } catch {
      ElMessage.error('表单数据必须是合法的 JSON 格式')
      return
    }
  }
  try {
    await store.completeTask(completingTask.value.id, parsedData, completeOutcome.value)
    completeDialogVisible.value = false
    ElMessage.success('任务已完成')
  } catch {
    ElMessage.error('操作失败')
  }
}

// Actions
async function handleClaim(task: TaskInstance) {
  try {
    await store.claimTask(task.id)
    ElMessage.success('已认领')
  } catch {
    ElMessage.error('认领失败')
  }
}

function handleViewInstance(task: TaskInstance) {
  router.push({ name: 'flow-instance-detail', params: { id: task.instanceId } })
}

// Data
onMounted(() => {
  store.fetchMyTasks()
})

// Helpers
function formatDate(d: string) {
  return new Date(d).toLocaleString('zh-CN')
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '待处理',
    claimed: '已认领',
    completed: '已完成',
    cancelled: '已取消',
    delegated: '已委派',
  }
  return map[status] ?? status
}

function statusTagType(status: string): '' | 'success' | 'info' | 'warning' | 'danger' {
  const map: Record<string, '' | 'success' | 'info' | 'warning' | 'danger'> = {
    pending: 'warning',
    claimed: '',
    completed: 'success',
    cancelled: 'info',
    delegated: 'info',
  }
  return map[status] ?? 'info'
}
</script>

<template>
  <div :class="$style.view">
    <el-scrollbar :class="$style.scrollbar">
      <!-- Header -->
      <div :class="$style.header">
        <div :class="$style.titleRow">
          <div>
            <h1>我的任务</h1>
            <p :class="$style.subtitle">查看和处理待办任务</p>
          </div>
        </div>

        <!-- Filter tabs -->
        <div :class="$style.toolbar">
          <div :class="$style.tabs">
            <button
              v-for="tab in filterTabs"
              :key="tab.value"
              :class="[$style.tab, activeTab === tab.value && $style.tabActive]"
              @click="activeTab = tab.value"
            >{{ tab.label }}</button>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="store.loading && store.tasks.length === 0" :class="$style.content">
        <el-skeleton :rows="6" animated />
      </div>

      <!-- Empty -->
      <div v-else-if="filteredTasks.length === 0" :class="$style.emptyState">
        <el-empty description="暂无任务" />
      </div>

      <!-- Task Table -->
      <div v-else :class="$style.content">
        <el-table :data="filteredTasks" stripe :class="$style.table">
          <el-table-column prop="nodeName" label="任务名称" min-width="180" />
          <el-table-column prop="instanceId" label="流程实例" min-width="200">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="handleViewInstance(row)">
                {{ row.instanceId }}
              </el-button>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="180">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <el-button
                v-if="row.status === 'pending'"
                size="small"
                type="primary"
                :icon="Pointer"
                @click="handleClaim(row)"
              >认领</el-button>
              <el-button
                v-if="row.status === 'claimed'"
                size="small"
                type="success"
                :icon="Check"
                @click="openCompleteDialog(row)"
              >完成</el-button>
              <el-button
                size="small"
                text
                :icon="View"
                @click="handleViewInstance(row)"
              >查看详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-scrollbar>

    <!-- Complete Dialog (no form) -->
    <el-dialog
      v-model="completeDialogVisible"
      title="完成任务"
      width="480px"
      :close-on-click-modal="false"
      append-to-body
    >
      <el-form label-position="top" @submit.prevent="confirmComplete">
        <el-form-item label="审批结果">
          <el-select v-model="completeOutcome" style="width: 100%">
            <el-option label="通过" value="approved" />
            <el-option label="驳回" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item label="表单数据（JSON，可选）">
          <el-input
            v-model="completeFormData"
            type="textarea"
            :rows="4"
            placeholder='{"key": "value"}'
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="completeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmComplete">确认完成</el-button>
      </template>
    </el-dialog>

    <!-- Form Dialog (iframe-based) -->
    <el-dialog
      v-model="formDialogVisible"
      title="完成任务"
      width="800px"
      :close-on-click-modal="false"
      append-to-body
      destroy-on-close
    >
      <el-skeleton v-if="formLoading" :rows="4" animated />
      <iframe
        v-if="formTask?.formSchemaId"
        :class="$style.formIframe"
        :src="getFormUrl(formTask.formSchemaId, formTask.status === 'completed' ? 'readonly' : undefined)"
        @load="onFormLoad"
      />
      <template #footer>
        <el-button @click="formDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="handleFormReject">驳回</el-button>
        <el-button type="primary" @click="handleFormApprove">通过</el-button>
      </template>
    </el-dialog>
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
  padding: 28px 24px 0;
}

.titleRow {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.titleRow h1 {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 4px;
  color: #303133;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.tabs {
  display: flex;
  gap: 2px;
  background: #e8eaed;
  border-radius: 8px;
  padding: 3px;
}

.tab {
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 500;
  color: #606266;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.tab:hover {
  color: #303133;
}

.tabActive {
  color: #303133;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 24px 0;
}

.emptyState {
  max-width: 1200px;
  margin: 0 auto;
  padding: 80px 24px 0;
}

.table {
  border-radius: 8px;
  overflow: hidden;
}

.formIframe {
  width: 100%;
  height: 600px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}
</style>
