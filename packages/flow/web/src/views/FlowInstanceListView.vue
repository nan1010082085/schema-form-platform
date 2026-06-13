<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import { SearchIcon } from 'tdesign-icons-vue-next'
import { useFlowInstanceStore } from '../stores/flowInstance.js'
import { useFlowExport } from '../composables/useFlowExport.js'
import type { FlowInstanceStatus } from '@schema-form/flow-shared'
import styles from './FlowInstanceListView.module.scss'

const router = useRouter()
const store = useFlowInstanceStore()
const { instances, total, loading } = storeToRefs(store)
const { exporting, exportInstance, exportBatch } = useFlowExport()

const selectedIds = ref<string[]>([])

const searchQuery = ref('')
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
    search: searchQuery.value || undefined,
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
  const confirmed = await new Promise<boolean>((resolve) => {
    const dialog = DialogPlugin.confirm({
      header: '确认终止',
      body: '确定终止该流程实例？',
      confirmBtn: '终止',
      cancelBtn: '取消',
      theme: 'warning',
      onConfirm: () => { dialog.destroy(); resolve(true) },
      onCancel: () => { dialog.destroy(); resolve(false) },
    })
  })
  if (!confirmed) return
  await store.terminateInstance(id)
  MessagePlugin.success('已终止')
}

async function handleSuspend(id: string) {
  const confirmed = await new Promise<boolean>((resolve) => {
    const dialog = DialogPlugin.confirm({
      header: '确认暂停',
      body: '确定暂停该流程实例？',
      confirmBtn: '暂停',
      cancelBtn: '取消',
      theme: 'warning',
      onConfirm: () => { dialog.destroy(); resolve(true) },
      onCancel: () => { dialog.destroy(); resolve(false) },
    })
  })
  if (!confirmed) return
  await store.suspendInstance(id)
  MessagePlugin.success('已暂停')
}

async function handleResume(id: string) {
  await store.resumeInstance(id)
  MessagePlugin.success('已恢复')
}

function statusTheme(status: string) {
  const map: Record<string, string> = {
    running: 'default',
    completed: 'success',
    terminated: 'danger',
    suspended: 'warning',
    failed: 'danger',
  }
  return map[status] ?? 'default'
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

function handleSelectionChange(keys: string[]) {
  selectedIds.value = keys
}

const tableColumns = [
  { colKey: 'row-select', type: 'selection', width: 50 },
  { colKey: 'definitionName', title: '流程名称', minWidth: 180, ellipsis: true },
  { colKey: 'initiatedBy', title: '发起人', width: 140 },
  { colKey: 'status', title: '状态', width: 100 },
  { colKey: 'startedAt', title: '开始时间', width: 180 },
  { colKey: 'completedAt', title: '结束时间', width: 180 },
  { colKey: 'actions', title: '操作', minWidth: 260, fixed: 'right' },
]
</script>

<template>
  <div :class="styles.flowInstanceList">
    <div :class="styles.header">
      <h2>流程实例</h2>
      <div :class="styles.headerActions">
        <t-button
          v-if="selectedIds.length > 0"
          theme="primary"
          :loading="exporting"
          @click="exportBatch(selectedIds)"
        >
          批量导出 ({{ selectedIds.length }})
        </t-button>
      </div>
    </div>

    <div :class="styles.filters">
      <t-input
        v-model:value="searchQuery"
        placeholder="搜索流程名称或发起人"
        :prefix-icon="SearchIcon"
        clearable
        :class="styles.searchInput"
        @clear="handleFilter"
        @keyup.enter="handleFilter"
      />
      <t-select
        v-model:value="statusFilter"
        placeholder="状态筛选"
        clearable
        style="width: 160px"
        @change="handleFilter"
      >
        <t-option
          v-for="opt in statusOptions"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </t-select>
    </div>

    <t-table
      :data="instances"
      :loading="loading"
      stripe
      :columns="tableColumns"
      row-key="id"
      :selected-row-keys="selectedIds"
      @select-change="handleSelectionChange"
    >
      <template #definitionName="{ row }">
        {{ row.definitionName || row.definitionId }}
      </template>
      <template #status="{ row }">
        <t-tag :theme="statusTheme(row.status)" size="small">
          {{ statusLabel(row.status) }}
        </t-tag>
      </template>
      <template #startedAt="{ row }">
        {{ formatDate(row.startedAt) }}
      </template>
      <template #completedAt="{ row }">
        {{ formatDate(row.completedAt) }}
      </template>
      <template #actions="{ row }">
        <div :class="styles.actions">
          <t-button size="small" @click="handleViewDetail(row.id)">
            查看详情
          </t-button>
          <t-button
            v-if="row.status === 'running'"
            size="small"
            theme="warning"
            @click="handleTerminate(row.id)"
          >
            终止
          </t-button>
          <t-button
            v-if="row.status === 'running'"
            size="small"
            theme="default"
            @click="handleSuspend(row.id)"
          >
            暂停
          </t-button>
          <t-button
            v-if="row.status === 'suspended'"
            size="small"
            theme="success"
            @click="handleResume(row.id)"
          >
            恢复
          </t-button>
          <t-button
            size="small"
            :loading="exporting"
            @click="exportInstance(row.id)"
          >
            导出
          </t-button>
        </div>
      </template>
    </t-table>

    <div :class="styles.pagination">
      <t-pagination
        v-model:current="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        show-total
        show-page-size
        @current-change="handlePageChange"
        @page-size-change="handleSizeChange"
      />
    </div>
  </div>
</template>
