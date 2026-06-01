<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useFlowInstanceStore } from '../stores/flowInstance.js'
import type { FlowInstanceStatus } from '@schema-form/flow-shared'
import styles from './FlowInstanceListView.module.scss'

const router = useRouter()
const store = useFlowInstanceStore()
const { instances, total, loading } = storeToRefs(store)

const statusFilter = ref<FlowInstanceStatus | ''>('')
const page = ref(1)
const pageSize = ref(20)

const statusOptions = [
  { value: '', label: '全部' },
  { value: 'running', label: '运行中' },
  { value: 'completed', label: '已完成' },
  { value: 'terminated', label: '已终止' },
  { value: 'suspended', label: '已暂停' },
  { value: 'failed', label: '失败' },
]

onMounted(() => {
  fetchInstances()
})

function fetchInstances() {
  store.fetchInstances({
    status: statusFilter.value || undefined,
    page: page.value,
    pageSize: pageSize.value,
  })
}

function handleFilter() {
  page.value = 1
  fetchInstances()
}

function handlePageChange(newPage: number) {
  page.value = newPage
  fetchInstances()
}

function handleSizeChange(newSize: number) {
  pageSize.value = newSize
  page.value = 1
  fetchInstances()
}

function handleViewDetail(id: string) {
  router.push({ name: 'flow-instance-detail', params: { id } })
}

async function handleTerminate(id: string) {
  await ElMessageBox.confirm('确定终止该流程实例？', '确认终止', {
    confirmButtonText: '终止',
    cancelButtonText: '取消',
    type: 'warning',
  })
  await store.terminateInstance(id)
  ElMessage.success('已终止')
}

async function handleSuspend(id: string) {
  await ElMessageBox.confirm('确定暂停该流程实例？', '确认暂停', {
    confirmButtonText: '暂停',
    cancelButtonText: '取消',
    type: 'warning',
  })
  await store.suspendInstance(id)
  ElMessage.success('已暂停')
}

async function handleResume(id: string) {
  await store.resumeInstance(id)
  ElMessage.success('已恢复')
}

function statusType(status: string) {
  const map: Record<string, string> = {
    running: '',
    completed: 'success',
    terminated: 'danger',
    suspended: 'warning',
    failed: 'danger',
  }
  return map[status] ?? 'info'
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    running: '运行中',
    completed: '已完成',
    terminated: '已终止',
    suspended: '已暂停',
    failed: '失败',
  }
  return map[status] ?? status
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}
</script>

<template>
  <div :class="styles.flowInstanceList">
    <div :class="styles.header">
      <h2>流程实例</h2>
    </div>

    <div :class="styles.filters">
      <el-select
        v-model="statusFilter"
        placeholder="状态筛选"
        clearable
        style="width: 160px"
        @change="handleFilter"
      >
        <el-option
          v-for="opt in statusOptions"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>
    </div>

    <el-table :data="instances" v-loading="loading" stripe>
      <el-table-column label="流程名称" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.definitionName || row.definitionId }}
        </template>
      </el-table-column>
      <el-table-column prop="initiatedBy" label="发起人" width="140" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="开始时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.startedAt) }}
        </template>
      </el-table-column>
      <el-table-column label="结束时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.completedAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" min-width="260" fixed="right">
        <template #default="{ row }">
          <div :class="styles.actions">
            <el-button size="small" @click="handleViewDetail(row.id)">
              查看详情
            </el-button>
            <el-button
              v-if="row.status === 'running'"
              size="small"
              type="warning"
              @click="handleTerminate(row.id)"
            >
              终止
            </el-button>
            <el-button
              v-if="row.status === 'running'"
              size="small"
              type="info"
              @click="handleSuspend(row.id)"
            >
              暂停
            </el-button>
            <el-button
              v-if="row.status === 'suspended'"
              size="small"
              type="success"
              @click="handleResume(row.id)"
            >
              恢复
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <div :class="styles.pagination">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>
  </div>
</template>
