<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { useFlowInstanceStore } from '../stores/flowInstance.js'
import type { TaskInstance } from '../stores/flowInstance.js'
import type { RejectTargetNode, BatchResult } from '@schema-form/flow-shared'
import { flowApi } from '../api/flowApi.js'
import { useCrossNodeData } from '../composables/useCrossNodeData.js'
import MicroFormEmbed from '../components/MicroFormEmbed.vue'
import UserPicker from '../components/UserPicker.vue'
import styles from './TaskInboxView.module.scss'

const router = useRouter()
const store = useFlowInstanceStore()

const activeTab = ref('pending')
const searchQuery = ref('')
const page = ref(1)
const pageSize = ref(20)
const delegateVisible = ref(false)
const delegateTarget = ref<string[]>([])
const delegateTaskId = ref('')

// Reject-to-node state
const rejectVisible = ref(false)
const rejectTaskId = ref('')
const rejectTargets = ref<RejectTargetNode[]>([])
const rejectTargetNodeId = ref('')
const rejectComment = ref('')
const rejectLoading = ref(false)

// Batch selection state
const selectedTaskIds = ref<string[]>([])
const batchLoading = ref(false)
const batchRejectVisible = ref(false)
const batchRejectReason = ref('')
const batchResultVisible = ref(false)
const batchResult = ref<BatchResult | null>(null)

// Form integration state
const activeTask = ref<TaskInstance | null>(null)
const formRef = ref<InstanceType<typeof MicroFormEmbed>>()
const completing = ref(false)
const crossNodeData = useCrossNodeData()

onMounted(() => {
  fetchTasks()
})

function fetchTasks() {
  const statusMap: Record<string, string> = {
    pending: 'pending',
    claimed: 'claimed',
    completed: 'completed',
  }
  const status = statusMap[activeTab.value]
  store.fetchMyTasks(page.value, pageSize.value, {
    status,
    q: searchQuery.value || undefined,
  })
}

function handleSearch() {
  page.value = 1
  fetchTasks()
}

function handlePageChange(newPage: number) {
  page.value = newPage
  fetchTasks()
}

function handleSizeChange(newSize: number) {
  pageSize.value = newSize
  page.value = 1
  fetchTasks()
}

function handleTabChange() {
  page.value = 1
  fetchTasks()
}

// Backend filters by status, so store.tasks already contains the correct filtered set
const displayTasks = computed(() => store.tasks)

function taskStatusType(status: string) {
  const map: Record<string, string> = {
    pending: 'warning',
    claimed: 'primary',
    completed: 'success',
    approved: 'success',
    rejected: 'danger',
  }
  return map[status] ?? 'info'
}

function taskStatusLabel(status: string) {
  const map: Record<string, string> = {
    pending: '待处理',
    claimed: '已认领',
    completed: '已完成',
    approved: '已通过',
    rejected: '已驳回',
  }
  return map[status] ?? status
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN')
}

async function handleClaim(taskId: string) {
  await store.claimTask(taskId)
  ElMessage.success('认领成功')
  fetchTasks()
}

async function handleComplete(taskId: string) {
  await ElMessageBox.confirm('确认完成此任务？', '确认', {
    confirmButtonText: '确认完成',
    cancelButtonText: '取消',
    type: 'info',
  })
  await store.completeTask(taskId, {}, 'completed')
  ElMessage.success('任务已完成')
  fetchTasks()
}

function openDelegate(taskId: string) {
  delegateTaskId.value = taskId
  delegateTarget.value = []
  delegateVisible.value = true
}

async function confirmDelegate() {
  if (delegateTarget.value.length === 0) {
    ElMessage.warning('请选择委派目标')
    return
  }
  await flowApi.delegateTask(delegateTaskId.value, { targetUserId: delegateTarget.value[0] })
  delegateVisible.value = false
  await store.fetchMyTasks()
  ElMessage.success('委派成功')
}

async function openReject(taskId: string) {
  rejectTaskId.value = taskId
  rejectTargetNodeId.value = ''
  rejectComment.value = ''
  rejectLoading.value = true
  rejectVisible.value = true
  try {
    rejectTargets.value = await store.getRejectTargets(taskId)
    if (rejectTargets.value.length === 0) {
      ElMessage.warning('没有可驳回的目标节点')
      rejectVisible.value = false
    }
  } catch {
    ElMessage.error('获取驳回目标失败')
    rejectVisible.value = false
  } finally {
    rejectLoading.value = false
  }
}

async function confirmReject() {
  if (!rejectTargetNodeId.value) {
    ElMessage.warning('请选择驳回目标节点')
    return
  }
  rejectLoading.value = true
  try {
    await store.rejectToNode(rejectTaskId.value, rejectTargetNodeId.value, rejectComment.value || undefined)
    rejectVisible.value = false
    await store.fetchMyTasks()
    ElMessage.success('已驳回到指定节点')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '驳回失败')
  } finally {
    rejectLoading.value = false
  }
}

// ── Batch operations ──

function handleSelectionChange(rows: TaskInstance[]) {
  selectedTaskIds.value = rows.map((r) => r.id)
}

async function confirmBatchApprove() {
  await ElMessageBox.confirm(
    `确认批量通过已选的 ${selectedTaskIds.value.length} 个任务？`,
    '批量通过',
    { confirmButtonText: '确认通过', cancelButtonText: '取消', type: 'info' },
  )
  batchLoading.value = true
  try {
    batchResult.value = await store.batchApprove(selectedTaskIds.value)
    selectedTaskIds.value = []
    batchResultVisible.value = true
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '批量通过失败')
  } finally {
    batchLoading.value = false
  }
}

function openBatchReject() {
  batchRejectReason.value = ''
  batchRejectVisible.value = true
}

async function confirmBatchReject() {
  batchLoading.value = true
  try {
    batchResult.value = await store.batchReject(
      selectedTaskIds.value,
      batchRejectReason.value || undefined,
    )
    selectedTaskIds.value = []
    batchRejectVisible.value = false
    batchResultVisible.value = true
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '批量驳回失败')
  } finally {
    batchLoading.value = false
  }
}

function viewInstance(instanceId: string) {
  router.push({ name: 'flow-instance-detail', params: { id: instanceId } })
}

/**
 * 将表单模式映射为 MicroFormEmbed 的 mode prop
 * - editable / edit → 'edit'
 * - readonly / view → 'view'
 * - partial → 'partial'（MicroFormEmbed 内部处理字段级只读）
 */
function resolveFormMode(task: TaskInstance): 'edit' | 'view' | 'partial' {
  const mode = task.formMode
  if (mode === 'editable' || mode === 'edit') return 'edit'
  if (mode === 'readonly' || mode === 'view') return 'view'
  if (mode === 'partial') return 'partial'
  return 'edit'
}

/**
 * 计算 partial 模式下的只读字段列表
 * 如果配置了 editableFields，则只读字段 = 全部字段 - editableFields
 * 如果配置了 readonlyFields，直接使用
 * 都没配置，默认全部只读
 */
function resolveReadonlyFields(task: TaskInstance): string[] | undefined {
  if (task.formMode !== 'partial') return undefined
  if (task.readonlyFields?.length) return task.readonlyFields
  // editableFields 配置时，需要从表单 schema 中排除这些字段
  // 由于此处无法获取完整 schema，通过 MicroFormEmbed 传入 editableFields 让渲染器处理
  return undefined
}

function resolveEditableFields(task: TaskInstance): string[] | undefined {
  if (task.formMode !== 'partial') return undefined
  return task.editableFields
}

async function selectTask(task: TaskInstance) {
  if (task.status !== 'claimed') return
  activeTask.value = task
  // Fetch upstream node data for cross-node variable resolution
  await crossNodeData.fetchUpstreamData(task.id)
}

function closeForm() {
  activeTask.value = null
  crossNodeData.upstreamData.value = {}
}

async function handleFormSubmit() {
  if (!activeTask.value || !formRef.value) return
  completing.value = true
  try {
    let formData: Record<string, unknown> = {}
    if (activeTask.value.formPublishId) {
      formData = (await formRef.value.getValues()) as Record<string, unknown>
    }
    await store.completeTask(activeTask.value.id, formData, 'completed')
    activeTask.value = null
    crossNodeData.upstreamData.value = {}
    ElMessage.success('任务已完成')
    fetchTasks()
  } catch {
    ElMessage.error('提交失败')
  } finally {
    completing.value = false
  }
}

async function handleFormValidate() {
  if (!formRef.value) return
  try {
    const valid = await formRef.value.validate()
    if (valid) {
      ElMessage.success('表单校验通过')
    } else {
      ElMessage.warning('表单校验未通过')
    }
  } catch {
    ElMessage.warning('表单校验未通过')
  }
}
</script>

<template>
  <div :class="styles.taskInbox">
    <div :class="styles.header">
      <h2>我的任务</h2>
    </div>

    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <el-tab-pane label="待处理" name="pending" />
      <el-tab-pane label="已认领" name="claimed" />
      <el-tab-pane label="已完成" name="completed" />
    </el-tabs>

    <!-- Search bar -->
    <div :class="styles.searchBar">
      <el-input
        v-model="searchQuery"
        placeholder="搜索任务名称"
        :prefix-icon="Search"
        clearable
        :class="styles.searchInput"
        @clear="handleSearch"
        @keyup.enter="handleSearch"
      />
    </div>

    <!-- Batch action toolbar -->
    <div v-if="selectedTaskIds.length > 0" :class="styles.batchToolbar">
      <span :class="styles.batchInfo">已选 {{ selectedTaskIds.length }} 项</span>
      <el-button
        type="success"
        size="small"
        :loading="batchLoading"
        @click="confirmBatchApprove"
      >
        批量通过
      </el-button>
      <el-button
        type="danger"
        size="small"
        :loading="batchLoading"
        @click="openBatchReject"
      >
        批量驳回
      </el-button>
      <el-button size="small" text @click="selectedTaskIds = []">取消选择</el-button>
    </div>

    <el-table
      ref="tableRef"
      :data="displayTasks"
      v-loading="store.loading"
      stripe
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="50" />
      <el-table-column prop="nodeName" label="任务名称" min-width="160" />
      <el-table-column prop="instanceId" label="流程实例" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">
          <el-link type="primary" @click="viewInstance(row.instanceId)">
            {{ row.instanceId }}
          </el-link>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="taskStatusType(row.status)" size="small">
            {{ taskStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="priority" label="优先级" width="80" />
      <el-table-column label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="300" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="row.status === 'pending'"
            size="small"
            type="primary"
            @click="handleClaim(row.id)"
          >
            签收
          </el-button>
          <el-button
            v-if="row.status === 'claimed'"
            size="small"
            type="success"
            @click="row.formPublishId ? selectTask(row) : handleComplete(row.id)"
          >
            完成
          </el-button>
          <el-button
            v-if="row.status === 'claimed'"
            size="small"
            type="danger"
            @click="openReject(row.id)"
          >
            驳回
          </el-button>
          <el-button
            v-if="row.status === 'claimed'"
            size="small"
            @click="openDelegate(row.id)"
          >
            委派
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- Pagination -->
    <div :class="styles.pagination">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="store.tasksTotal"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>

    <!-- Form panel for claimed tasks with bound forms -->
    <div v-if="activeTask" :class="styles.formPanel">
      <div :class="styles.formPanelHeader">
        <span :class="styles.formPanelTitle">{{ activeTask.nodeName }} — 审批表单</span>
        <div :class="styles.formPanelActions">
          <el-button size="small" @click="handleFormValidate">校验</el-button>
          <el-button size="small" type="primary" :loading="completing" @click="handleFormSubmit">提交并完成</el-button>
          <el-button size="small" text @click="closeForm">关闭</el-button>
        </div>
      </div>
      <MicroFormEmbed
        ref="formRef"
        :publish-id="activeTask.formPublishId ?? ''"
        :mode="resolveFormMode(activeTask)"
        :host-methods="activeTask.hostMethods ?? ['setValues', 'getValues', 'validate']"
        :initial-data="crossNodeData.mergeWithTaskData(activeTask.formData)"
        :editable-fields="resolveEditableFields(activeTask)"
        :readonly-fields="resolveReadonlyFields(activeTask)"
      />
    </div>

    <el-dialog v-model="delegateVisible" title="委派任务" width="400px">
      <UserPicker v-model="delegateTarget" placeholder="搜索并选择委派目标" />
      <template #footer>
        <el-button @click="delegateVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmDelegate">确认委派</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="rejectVisible" title="驳回到指定节点" width="480px" :close-on-click-modal="false">
      <div v-loading="rejectLoading">
        <el-form label-position="top">
          <el-form-item label="选择驳回目标节点">
            <el-select
              v-model="rejectTargetNodeId"
              placeholder="请选择要驳回到的节点"
              style="width: 100%"
              :disabled="rejectTargets.length === 0"
            >
              <el-option
                v-for="target in rejectTargets"
                :key="target.nodeId"
                :label="target.nodeName"
                :value="target.nodeId"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="驳回原因（可选）">
            <el-input
              v-model="rejectComment"
              type="textarea"
              :rows="3"
              placeholder="请输入驳回原因"
              maxlength="1000"
              show-word-limit
            />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="danger" :loading="rejectLoading" @click="confirmReject">确认驳回</el-button>
      </template>
    </el-dialog>

    <!-- Batch reject dialog -->
    <el-dialog v-model="batchRejectVisible" title="批量驳回" width="480px" :close-on-click-modal="false">
      <el-form label-position="top">
        <el-form-item label="驳回原因（可选）">
          <el-input
            v-model="batchRejectReason"
            type="textarea"
            :rows="3"
            placeholder="请输入驳回原因"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchRejectVisible = false">取消</el-button>
        <el-button type="danger" :loading="batchLoading" @click="confirmBatchReject">
          确认驳回 {{ selectedTaskIds.length }} 项
        </el-button>
      </template>
    </el-dialog>

    <!-- Batch result dialog -->
    <el-dialog v-model="batchResultVisible" title="批量操作结果" width="480px">
      <div v-if="batchResult" :class="styles.batchResult">
        <div :class="styles.batchResultSummary">
          <el-tag type="info" size="large">共 {{ batchResult.summary.total }} 项</el-tag>
          <el-tag type="success" size="large">成功 {{ batchResult.summary.success }} 项</el-tag>
          <el-tag v-if="batchResult.summary.failed > 0" type="danger" size="large">
            失败 {{ batchResult.summary.failed }} 项
          </el-tag>
        </div>
        <div v-if="batchResult.summary.failed > 0" :class="styles.batchResultDetails">
          <div
            v-for="item in batchResult.results.filter((r) => !r.success)"
            :key="item.taskId"
            :class="styles.batchResultItem"
          >
            <span :class="styles.batchResultTaskId">{{ item.taskId }}</span>
            <span :class="styles.batchResultError">{{ item.error }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="batchResultVisible = false">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>
