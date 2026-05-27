<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useFlowInstanceStore } from '../stores/flowInstance.js'

const router = useRouter()
const store = useFlowInstanceStore()

const activeTab = ref('pending')
const delegateVisible = ref(false)
const delegateTarget = ref('')
const delegateTaskId = ref('')

onMounted(() => {
  store.fetchMyTasks()
})

const pendingTasks = computed(() =>
  store.tasks.filter((t) => t.status === 'pending'),
)

const claimedTasks = computed(() =>
  store.tasks.filter((t) => t.status === 'claimed'),
)

const completedTasks = computed(() =>
  store.tasks.filter((t) => t.status === 'completed' || t.status === 'approved' || t.status === 'rejected'),
)

const displayTasks = computed(() => {
  switch (activeTab.value) {
    case 'pending': return pendingTasks.value
    case 'claimed': return claimedTasks.value
    case 'completed': return completedTasks.value
    default: return []
  }
})

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
}

async function handleComplete(taskId: string) {
  await ElMessageBox.confirm('确认完成此任务？', '确认', {
    confirmButtonText: '确认完成',
    cancelButtonText: '取消',
    type: 'info',
  })
  await store.completeTask(taskId, {}, 'completed')
  ElMessage.success('任务已完成')
}

function openDelegate(taskId: string) {
  delegateTaskId.value = taskId
  delegateTarget.value = ''
  delegateVisible.value = true
}

async function confirmDelegate() {
  if (!delegateTarget.value.trim()) {
    ElMessage.warning('请输入委派目标')
    return
  }
  await store.completeTask(delegateTaskId.value, { delegateTo: delegateTarget.value }, 'delegated')
  delegateVisible.value = false
  ElMessage.success('委派成功')
}

function viewInstance(instanceId: string) {
  router.push({ name: 'flow-instance-detail', params: { id: instanceId } })
}
</script>

<template>
  <div class="task-inbox">
    <div class="header">
      <h2>我的任务</h2>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="待处理" name="pending">
        <template #label>
          待处理
          <el-badge :value="pendingTasks.length" :hidden="pendingTasks.length === 0" class="tabBadge" />
        </template>
      </el-tab-pane>
      <el-tab-pane label="已认领" name="claimed">
        <template #label>
          已认领
          <el-badge :value="claimedTasks.length" :hidden="claimedTasks.length === 0" class="tabBadge" />
        </template>
      </el-tab-pane>
      <el-tab-pane label="已完成" name="completed" />
    </el-tabs>

    <el-table :data="displayTasks" v-loading="store.loading" stripe>
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
      <el-table-column label="操作" width="240" fixed="right">
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
            @click="handleComplete(row.id)"
          >
            完成
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

    <el-dialog v-model="delegateVisible" title="委派任务" width="400px">
      <el-input v-model="delegateTarget" placeholder="请输入委派目标用户名" />
      <template #footer>
        <el-button @click="delegateVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmDelegate">确认委派</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.task-inbox {
  padding: 24px;
}
.header {
  margin-bottom: 20px;
}
.header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}
.tabBadge {
  margin-left: 6px;
}
</style>
