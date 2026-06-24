<template>
  <div :class="$style.container">
    <div v-if="loading" :class="$style.loading">
      <el-icon class="is-loading"><Loading /></el-icon>
    </div>

    <template v-else-if="task">
      <!-- 任务信息 -->
      <div :class="$style.header">
        <h3 :class="$style.title">{{ task.nodeName }}</h3>
        <el-tag :type="statusType(task.status)" size="small">
          {{ statusLabel(task.status) }}
        </el-tag>
      </div>

      <!-- 流程图预览（如果有 instanceId） -->
      <div v-if="task.instanceId" :class="$style.flowPreview">
        <FlowMiniMap
          :instance-id="task.instanceId"
          :current-node-id="task.nodeId"
        />
      </div>

      <!-- 表单预览/编辑 -->
      <div v-if="task.formSchemaId" :class="$style.formSection">
        <SchemaPreview
          :schema-id="task.formSchemaId"
          :mode="task.formMode ?? 'edit'"
          :initial-data="task.formData"
          :editable-fields="task.editableFields"
          @submit="handleFormSubmit"
        />
      </div>

      <!-- AI 建议 -->
      <div v-if="aiSuggestion" :class="$style.aiSuggestion">
        <el-alert
          :title="aiSuggestion.suggestion"
          :description="aiSuggestion.reasoning"
          type="info"
          show-icon
          :closable="false"
        />
      </div>

      <!-- 审批操作 -->
      <div :class="$style.actions">
        <el-button
          v-if="task.status === 'pending' || task.status === 'claimed'"
          type="success"
          @click="handleApprove"
        >
          通过
        </el-button>
        <el-button
          v-if="task.status === 'pending' || task.status === 'claimed'"
          type="danger"
          @click="showRejectDialog = true"
        >
          驳回
        </el-button>
        <el-button
          v-if="task.status === 'pending'"
          @click="handleClaim"
        >
          认领
        </el-button>
        <el-button
          v-if="task.status === 'pending' || task.status === 'claimed'"
          @click="showDelegateDialog = true"
        >
          委派
        </el-button>
      </div>

      <!-- 审批日志 -->
      <div :class="$style.logs">
        <h4>审批记录</h4>
        <div v-if="logs.length === 0" :class="$style.emptyLogs">
          暂无审批记录
        </div>
        <div v-else :class="$style.logList">
          <div
            v-for="log in logs"
            :key="log.id"
            :class="$style.logItem"
          >
            <div :class="$style.logHeader">
              <el-tag :type="actionType(log.action)" size="small">
                {{ actionLabel(log.action) }}
              </el-tag>
              <span :class="$style.logOperator">{{ log.operator }}</span>
            </div>
            <div v-if="log.comment" :class="$style.logComment">
              {{ log.comment }}
            </div>
            <div :class="$style.logTime">
              {{ formatTime(log.createdAt) }}
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 驳回对话框 -->
    <el-dialog v-model="showRejectDialog" title="驳回" width="400px">
      <el-form label-width="80px">
        <el-form-item label="驳回到">
          <el-select v-model="rejectTarget" placeholder="选择驳回节点">
            <el-option
              v-for="target in rejectTargets"
              :key="target.nodeId"
              :label="target.nodeName"
              :value="target.nodeId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="rejectComment"
            type="textarea"
            placeholder="请输入驳回原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRejectDialog = false">取消</el-button>
        <el-button type="danger" @click="handleReject">确认驳回</el-button>
      </template>
    </el-dialog>

    <!-- 委派对话框 -->
    <el-dialog v-model="showDelegateDialog" title="委派" width="400px">
      <el-form label-width="80px">
        <el-form-item label="委派给">
          <el-input v-model="delegateAssignee" placeholder="请输入用户 ID" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="delegateComment"
            type="textarea"
            placeholder="请输入委派原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDelegateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleDelegate">确认委派</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { flowApi } from '../../api/flowApi'
import FlowMiniMap from '../../components/FlowMiniMap.vue'

const props = defineProps<{
  taskId: string
}>()

const emit = defineEmits<{
  approved: []
  rejected: []
}>()

const loading = ref(false)
const task = ref<any>(null)
const logs = ref<any[]>([])
const aiSuggestion = ref<any>(null)

// 驳回对话框
const showRejectDialog = ref(false)
const rejectTarget = ref('')
const rejectComment = ref('')
const rejectTargets = ref<any[]>([])

// 委派对话框
const showDelegateDialog = ref(false)
const delegateAssignee = ref('')
const delegateComment = ref('')

async function loadTask() {
  if (!props.taskId) return

  loading.value = true
  try {
    task.value = await flowApi.getTask(props.taskId)

    // 加载审批日志
    if (task.value?.instanceId) {
      const res = await flowApi.getApprovalLogs(task.value.instanceId)
      logs.value = res.items ?? res as unknown as any[]
    }

    // 加载驳回目标节点
    rejectTargets.value = await flowApi.getRejectTargets(props.taskId)
  } catch (err) {
    console.error('Failed to load task:', err)
  } finally {
    loading.value = false
  }
}

async function handleApprove() {
  if (!task.value) return

  try {
    await flowApi.completeTask(task.value.id, {
      formData: task.value.formData,
      outcome: 'approve',
    })
    emit('approved')
  } catch (err) {
    console.error('Failed to approve:', err)
  }
}

async function handleReject() {
  if (!task.value || !rejectTarget.value) return

  try {
    await flowApi.rejectToNode(task.value.id, {
      targetNodeId: rejectTarget.value,
      comment: rejectComment.value,
    })
    showRejectDialog.value = false
    emit('rejected')
  } catch (err) {
    console.error('Failed to reject:', err)
  }
}

async function handleClaim() {
  if (!task.value) return

  try {
    await flowApi.claimTask(task.value.id)
    await loadTask()
  } catch (err) {
    console.error('Failed to claim:', err)
  }
}

async function handleDelegate() {
  if (!task.value || !delegateAssignee.value) return

  try {
    await flowApi.delegateTask(task.value.id, {
      targetUserId: delegateAssignee.value,
    })
    showDelegateDialog.value = false
    await loadTask()
  } catch (err) {
    console.error('Failed to delegate:', err)
  }
}

function handleFormSubmit(data: Record<string, unknown>) {
  if (task.value) {
    task.value.formData = { ...task.value.formData, ...data }
  }
}

function statusType(status: string): '' | 'success' | 'warning' | 'danger' {
  const map: Record<string, '' | 'success' | 'warning' | 'danger'> = {
    pending: 'warning',
    claimed: '',
    completed: 'success',
    cancelled: 'danger',
  }
  return map[status] ?? ''
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '待处理',
    claimed: '已认领',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[status] ?? status
}

function actionType(action: string): '' | 'success' | 'danger' | 'warning' {
  const map: Record<string, '' | 'success' | 'danger' | 'warning'> = {
    approve: 'success',
    reject: 'danger',
    claim: '',
    delegate: 'warning',
    'reject-to-node': 'danger',
  }
  return map[action] ?? ''
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    approve: '通过',
    reject: '驳回',
    claim: '认领',
    delegate: '委派',
    'reject-to-node': '驳回到节点',
  }
  return map[action] ?? action
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN')
}

watch(() => props.taskId, loadTask, { immediate: true })
</script>

<style module>
.container {
  padding: 16px;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.flowPreview {
  height: 200px;
  margin-bottom: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  overflow: hidden;
}

.formSection {
  margin-bottom: 16px;
}

.aiSuggestion {
  margin-bottom: 16px;
}

.actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
}

.logs {
  margin-top: 16px;
}

.logs h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.emptyLogs {
  text-align: center;
  color: var(--el-text-color-secondary);
  padding: 20px;
}

.logList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.logItem {
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-bg-color);
}

.logHeader {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.logOperator {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.logComment {
  font-size: 13px;
  color: var(--el-text-color-regular);
  margin-bottom: 8px;
}

.logTime {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
