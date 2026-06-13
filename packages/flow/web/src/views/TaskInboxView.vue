<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import { SearchIcon } from 'tdesign-icons-vue-next'
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
const formSchemaDefaults = ref<Record<string, unknown>>({})

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

function taskStatusTheme(status: string) {
  const map: Record<string, string> = {
    pending: 'warning',
    claimed: 'primary',
    completed: 'success',
    approved: 'success',
    rejected: 'danger',
  }
  return map[status] ?? 'default'
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
  MessagePlugin.success('认领成功')
  fetchTasks()
}

async function handleComplete(taskId: string) {
  const confirmed = await new Promise<boolean>((resolve) => {
    const dialog = DialogPlugin.confirm({
      header: '确认',
      body: '确认完成此任务？',
      confirmBtn: '确认完成',
      cancelBtn: '取消',
      theme: 'info',
      onConfirm: () => { dialog.destroy(); resolve(true) },
      onCancel: () => { dialog.destroy(); resolve(false) },
    })
  })
  if (!confirmed) return
  await store.completeTask(taskId, {}, 'completed')
  MessagePlugin.success('任务已完成')
  fetchTasks()
}

function openDelegate(taskId: string) {
  delegateTaskId.value = taskId
  delegateTarget.value = []
  delegateVisible.value = true
}

async function confirmDelegate() {
  if (delegateTarget.value.length === 0) {
    MessagePlugin.warning('请选择委派目标')
    return
  }
  await flowApi.delegateTask(delegateTaskId.value, { targetUserId: delegateTarget.value[0] })
  delegateVisible.value = false
  await store.fetchMyTasks()
  MessagePlugin.success('委派成功')
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
      MessagePlugin.warning('没有可驳回的目标节点')
      rejectVisible.value = false
    }
  } catch {
    MessagePlugin.error('获取驳回目标失败')
    rejectVisible.value = false
  } finally {
    rejectLoading.value = false
  }
}

async function confirmReject() {
  if (!rejectTargetNodeId.value) {
    MessagePlugin.warning('请选择驳回目标节点')
    return
  }
  rejectLoading.value = true
  try {
    await store.rejectToNode(rejectTaskId.value, rejectTargetNodeId.value, rejectComment.value || undefined)
    rejectVisible.value = false
    await store.fetchMyTasks()
    MessagePlugin.success('已驳回到指定节点')
  } catch (e) {
    MessagePlugin.error(e instanceof Error ? e.message : '驳回失败')
  } finally {
    rejectLoading.value = false
  }
}

// ── Batch operations ──

function handleSelectionChange(keys: string[]) {
  selectedTaskIds.value = keys
}

async function confirmBatchApprove() {
  const confirmed = await new Promise<boolean>((resolve) => {
    const dialog = DialogPlugin.confirm({
      header: '批量通过',
      body: `确认批量通过已选的 ${selectedTaskIds.value.length} 个任务？`,
      confirmBtn: '确认通过',
      cancelBtn: '取消',
      theme: 'info',
      onConfirm: () => { dialog.destroy(); resolve(true) },
      onCancel: () => { dialog.destroy(); resolve(false) },
    })
  })
  if (!confirmed) return
  batchLoading.value = true
  try {
    batchResult.value = await store.batchApprove(selectedTaskIds.value)
    selectedTaskIds.value = []
    batchResultVisible.value = true
  } catch (e) {
    MessagePlugin.error(e instanceof Error ? e.message : '批量通过失败')
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
    MessagePlugin.error(e instanceof Error ? e.message : '批量驳回失败')
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

  // If task has a form, fetch schema defaults for cross-node resolution
  if (task.formPublishId) {
    try {
      const schema = await flowApi.getPublishedFormSchema(task.formPublishId)
      if (schema?.json) {
        const widgets = Array.isArray(schema.json) ? schema.json : []
        const defaults = crossNodeData.extractSchemaDefaults(widgets as Array<Record<string, unknown>>)
        if (crossNodeData.hasCrossNodeRefs(defaults)) {
          formSchemaDefaults.value = defaults
        }
      }
    } catch {
      formSchemaDefaults.value = {}
    }
  }
}

function closeForm() {
  activeTask.value = null
  crossNodeData.upstreamData.value = {}
  formSchemaDefaults.value = {}
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
    formSchemaDefaults.value = {}
    MessagePlugin.success('任务已完成')
    fetchTasks()
  } catch {
    MessagePlugin.error('提交失败')
  } finally {
    completing.value = false
  }
}

async function handleFormValidate() {
  if (!formRef.value) return
  try {
    const valid = await formRef.value.validate()
    if (valid) {
      MessagePlugin.success('表单校验通过')
    } else {
      MessagePlugin.warning('表单校验未通过')
    }
  } catch {
    MessagePlugin.warning('表单校验未通过')
  }
}

const taskTableColumns = [
  { colKey: 'row-select', type: 'selection', width: 50 },
  { colKey: 'nodeName', title: '任务名称', minWidth: 160 },
  { colKey: 'instanceId', title: '流程实例', minWidth: 200, ellipsis: true },
  { colKey: 'status', title: '状态', width: 100 },
  { colKey: 'priority', title: '优先级', width: 80 },
  { colKey: 'createdAt', title: '创建时间', width: 180 },
  { colKey: 'actions', title: '操作', width: 300, fixed: 'right' },
]
</script>

<template>
  <div :class="styles.taskInbox">
    <div :class="styles.header">
      <h2>我的任务</h2>
    </div>

    <t-tabs v-model:value="activeTab" @change="handleTabChange">
      <t-tab-panel label="待处理" value="pending" />
      <t-tab-panel label="已认领" value="claimed" />
      <t-tab-panel label="已完成" value="completed" />
    </t-tabs>

    <!-- Search bar -->
    <div :class="styles.searchBar">
      <t-input
        v-model="searchQuery"
        placeholder="搜索任务名称"
        :prefix-icon="SearchIcon"
        clearable
        :class="styles.searchInput"
        @clear="handleSearch"
        @keyup.enter="handleSearch"
      />
    </div>

    <!-- Batch action toolbar -->
    <div v-if="selectedTaskIds.length > 0" :class="styles.batchToolbar">
      <span :class="styles.batchInfo">已选 {{ selectedTaskIds.length }} 项</span>
      <t-button
        theme="success"
        size="small"
        :loading="batchLoading"
        @click="confirmBatchApprove"
      >
        批量通过
      </t-button>
      <t-button
        theme="danger"
        size="small"
        :loading="batchLoading"
        @click="openBatchReject"
      >
        批量驳回
      </t-button>
      <t-button size="small" variant="text" @click="selectedTaskIds = []">取消选择</t-button>
    </div>

    <t-table
      :data="displayTasks"
      :loading="store.loading"
      stripe
      :columns="taskTableColumns"
      row-key="id"
      :selected-row-keys="selectedTaskIds"
      @select-change="handleSelectionChange"
    >
      <template #instanceId="{ row }">
        <t-link theme="primary" @click="viewInstance(row.instanceId)">
          {{ row.instanceId }}
        </t-link>
      </template>
      <template #status="{ row }">
        <t-tag :theme="taskStatusTheme(row.status)" size="small">
          {{ taskStatusLabel(row.status) }}
        </t-tag>
      </template>
      <template #createdAt="{ row }">
        {{ formatDate(row.createdAt) }}
      </template>
      <template #actions="{ row }">
        <t-button
          v-if="row.status === 'pending'"
          size="small"
          theme="primary"
          @click="handleClaim(row.id)"
        >
          签收
        </t-button>
        <t-button
          v-if="row.status === 'claimed'"
          size="small"
          theme="success"
          @click="row.formPublishId ? selectTask(row) : handleComplete(row.id)"
        >
          完成
        </t-button>
        <t-button
          v-if="row.status === 'claimed'"
          size="small"
          theme="danger"
          @click="openReject(row.id)"
        >
          驳回
        </t-button>
        <t-button
          v-if="row.status === 'claimed'"
          size="small"
          @click="openDelegate(row.id)"
        >
          委派
        </t-button>
      </template>
    </t-table>

    <!-- Pagination -->
    <div :class="styles.pagination">
      <t-pagination
        v-model:current="page"
        v-model:page-size="pageSize"
        :total="store.tasksTotal"
        :page-sizes="[10, 20, 50]"
        show-total
        show-page-size
        @current-change="handlePageChange"
        @page-size-change="handleSizeChange"
      />
    </div>

    <!-- Form panel for claimed tasks with bound forms -->
    <div v-if="activeTask" :class="styles.formPanel">
      <div :class="styles.formPanelHeader">
        <span :class="styles.formPanelTitle">{{ activeTask.nodeName }} — 审批表单</span>
        <div :class="styles.formPanelActions">
          <t-button size="small" @click="handleFormValidate">校验</t-button>
          <t-button size="small" theme="primary" :loading="completing" @click="handleFormSubmit">提交并完成</t-button>
          <t-button size="small" variant="text" @click="closeForm">关闭</t-button>
        </div>
      </div>
      <MicroFormEmbed
        ref="formRef"
        :publish-id="activeTask.formPublishId ?? ''"
        :mode="resolveFormMode(activeTask)"
        :host-methods="activeTask.hostMethods ?? ['setValues', 'getValues', 'validate']"
        :initial-data="crossNodeData.mergeWithTaskData(activeTask.formData, formSchemaDefaults)"
        :editable-fields="resolveEditableFields(activeTask)"
        :readonly-fields="resolveReadonlyFields(activeTask)"
      />
    </div>

    <t-dialog v-model:visible="delegateVisible" header="委派任务" width="400px">
      <UserPicker v-model="delegateTarget" placeholder="搜索并选择委派目标" />
      <template #footer>
        <t-button @click="delegateVisible = false">取消</t-button>
        <t-button theme="primary" @click="confirmDelegate">确认委派</t-button>
      </template>
    </t-dialog>

    <t-dialog v-model:visible="rejectVisible" header="驳回到指定节点" width="480px" :close-on-overlay-click="false">
      <div v-loading="rejectLoading">
        <t-form label-position="top">
          <t-form-item label="选择驳回目标节点">
            <t-select
              v-model="rejectTargetNodeId"
              placeholder="请选择要驳回到的节点"
              style="width: 100%"
              :disabled="rejectTargets.length === 0"
            >
              <t-option
                v-for="target in rejectTargets"
                :key="target.nodeId"
                :label="target.nodeName"
                :value="target.nodeId"
              />
            </t-select>
          </t-form-item>
          <t-form-item label="驳回原因（可选）">
            <t-textarea
              v-model="rejectComment"
              :rows="3"
              placeholder="请输入驳回原因"
              maxlength="1000"
            />
          </t-form-item>
        </t-form>
      </div>
      <template #footer>
        <t-button @click="rejectVisible = false">取消</t-button>
        <t-button theme="danger" :loading="rejectLoading" @click="confirmReject">确认驳回</t-button>
      </template>
    </t-dialog>

    <!-- Batch reject dialog -->
    <t-dialog v-model:visible="batchRejectVisible" header="批量驳回" width="480px" :close-on-overlay-click="false">
      <t-form label-position="top">
        <t-form-item label="驳回原因（可选）">
          <t-textarea
            v-model="batchRejectReason"
            :rows="3"
            placeholder="请输入驳回原因"
            maxlength="1000"
          />
        </t-form-item>
      </t-form>
      <template #footer>
        <t-button @click="batchRejectVisible = false">取消</t-button>
        <t-button theme="danger" :loading="batchLoading" @click="confirmBatchReject">
          确认驳回 {{ selectedTaskIds.length }} 项
        </t-button>
      </template>
    </t-dialog>

    <!-- Batch result dialog -->
    <t-dialog v-model:visible="batchResultVisible" header="批量操作结果" width="480px">
      <div v-if="batchResult" :class="styles.batchResult">
        <div :class="styles.batchResultSummary">
          <t-tag theme="default" size="large">共 {{ batchResult.summary.total }} 项</t-tag>
          <t-tag theme="success" size="large">成功 {{ batchResult.summary.success }} 项</t-tag>
          <t-tag v-if="batchResult.summary.failed > 0" theme="danger" size="large">
            失败 {{ batchResult.summary.failed }} 项
          </t-tag>
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
        <t-button theme="primary" @click="batchResultVisible = false">确定</t-button>
      </template>
    </t-dialog>
  </div>
</template>
