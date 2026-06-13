<script setup lang="ts">
/**
 * SubmissionListView — 表单提交数据查看页
 *
 * 选择表单 → 查看该表单的所有提交数据，支持状态筛选、分页、删除、导出 CSV/Excel。
 */
import { onMounted, ref, computed, watch } from 'vue'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import { SearchIcon, DownloadIcon, FileIcon, DeleteIcon, CheckIcon, ChevronDownIcon } from 'tdesign-icons-vue-next'
import {
  fetchSchemas,
  fetchSubmissions,
  deleteSubmission,
  exportSubmissions,
  batchDeleteSubmissions,
  batchUpdateSubmissionsStatus,
  type SubmissionItem,
  type ExportFormat,
} from '@/utils/apiClient'
import type { PaginatedResponse, SchemaListItem } from '@/types/api'
import styles from './SubmissionListView.module.scss'

// ── 表单列表 ──
const schemas = ref<SchemaListItem[]>([])
const selectedSchemaId = ref('')

// ── 提交数据 ──
const submissions = ref<SubmissionItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)

// ── 筛选 ──
const activeStatus = ref('')

// ── 批量选择 ──
const selectedRows = ref<SubmissionItem[]>([])
const hasSelection = computed(() => selectedRows.value.length > 0)

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '已提交', value: 'submitted' },
  { label: '已通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' },
]

// ── 当前选中的 schema 名称 ──
const selectedSchemaName = computed(() => {
  const s = schemas.value.find((item) => item.id === selectedSchemaId.value)
  return s?.name ?? ''
})

// ── 加载表单列表 ──
async function loadSchemas() {
  const res: PaginatedResponse<SchemaListItem> = await fetchSchemas({ pageSize: 200 })
  schemas.value = res.items
  if (schemas.value.length > 0 && !selectedSchemaId.value) {
    selectedSchemaId.value = schemas.value[0].id
  }
}

// ── 加载提交数据 ──
async function loadSubmissions() {
  if (!selectedSchemaId.value) {
    submissions.value = []
    total.value = 0
    return
  }

  loading.value = true
  try {
    const res: PaginatedResponse<SubmissionItem> = await fetchSubmissions(selectedSchemaId.value, {
      status: activeStatus.value || undefined,
      page: page.value,
      pageSize: pageSize.value,
    })
    submissions.value = res.items
    total.value = res.total
  } catch (err) {
    MessagePlugin.error(err instanceof Error ? err.message : '加载提交数据失败')
  } finally {
    loading.value = false
  }
}

// ── 初始化 ──
onMounted(async () => {
  await loadSchemas()
  if (selectedSchemaId.value) {
    await loadSubmissions()
  }
})

// ── 表单切换时重新加载 ──
watch(selectedSchemaId, () => {
  page.value = 1
  loadSubmissions()
})

watch(activeStatus, () => {
  page.value = 1
  loadSubmissions()
})

// ── 分页 ──
function handlePageChange(p: number) {
  page.value = p
  loadSubmissions()
}

// ── 删除 ──
async function handleDelete(item: SubmissionItem) {
  const confirmDia = DialogPlugin.confirm({
    header: '删除确认',
    body: '确认删除此条提交数据？删除后不可恢复。',
    theme: 'warning',
    confirmBtn: '删除',
    onConfirm: async () => {
      await deleteSubmission(selectedSchemaId.value, item.id)
      MessagePlugin.success('已删除')
      await loadSubmissions()
      confirmDia.hide()
    },
  })
}

// ── 批量删除 ──
async function handleBatchDelete() {
  const ids = selectedRows.value.map((r) => r.id)
  const confirmDia = DialogPlugin.confirm({
    header: '批量删除确认',
    body: `确认删除选中的 ${ids.length} 条提交数据？删除后不可恢复。`,
    theme: 'warning',
    confirmBtn: '删除',
    onConfirm: async () => {
      const result = await batchDeleteSubmissions(selectedSchemaId.value, ids)
      MessagePlugin.success(`已删除 ${result.deletedCount} 条数据`)
      selectedRows.value = []
      await loadSubmissions()
      confirmDia.hide()
    },
  })
}

// ── 批量审批 ──
async function handleBatchApprove() {
  const ids = selectedRows.value.map((r) => r.id)
  const confirmDia = DialogPlugin.confirm({
    header: '批量审批确认',
    body: `确认通过选中的 ${ids.length} 条提交数据？`,
    theme: 'warning',
    confirmBtn: '通过',
    onConfirm: async () => {
      const result = await batchUpdateSubmissionsStatus(selectedSchemaId.value, ids, 'approved')
      MessagePlugin.success(`已更新 ${result.modifiedCount} 条数据状态`)
      selectedRows.value = []
      await loadSubmissions()
      confirmDia.hide()
    },
  })
}

// ── 选择变更 ──
function handleSelectionChange(rows: SubmissionItem[]) {
  selectedRows.value = rows
}

// ── 导出 ──
const FORMAT_EXTENSIONS: Record<ExportFormat, string> = { csv: 'csv', xlsx: 'xlsx' }
const FORMAT_LABELS: Record<ExportFormat, string> = { csv: 'CSV', xlsx: 'Excel' }

async function handleExport(format: ExportFormat) {
  if (!selectedSchemaId.value) return
  try {
    const blob = await exportSubmissions(selectedSchemaId.value, format, activeStatus.value || undefined)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `submissions-${selectedSchemaName.value || selectedSchemaId.value}.${FORMAT_EXTENSIONS[format]}`
    a.click()
    URL.revokeObjectURL(url)
    MessagePlugin.success(`导出 ${FORMAT_LABELS[format]} 成功`)
  } catch (err) {
    MessagePlugin.error(err instanceof Error ? err.message : '导出失败')
  }
}

// ── 辅助函数 ──
function formatDate(d: string): string {
  return new Date(d).toLocaleString('zh-CN')
}

function statusLabel(status: string): string {
  const map: Record<string, string> = { submitted: '已提交', approved: '已通过', rejected: '已驳回' }
  return map[status] ?? status
}

function statusTagTheme(status: string): 'default' | 'success' | 'warning' | 'danger' {
  const map: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
    submitted: 'default',
    approved: 'success',
    rejected: 'danger',
  }
  return map[status] ?? 'default'
}

function dataPreview(data: Record<string, unknown>): string {
  const entries = Object.entries(data)
  if (entries.length === 0) return '-'
  const preview = entries
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(', ')
  return entries.length > 3 ? `${preview} ...` : preview
}

function dataKeys(item: SubmissionItem): string[] {
  return Object.keys(item.data)
}
</script>

<template>
  <div :class="styles.submissionView">
    <div :class="styles.scrollbar">
      <!-- Header -->
      <div :class="styles.header">
        <div :class="styles.titleRow">
          <div>
            <h1 :class="styles.title">表单数据</h1>
            <p :class="styles.subtitle">查看和管理表单提交数据</p>
          </div>
          <div :class="styles.headerActions">
            <template v-if="hasSelection">
              <t-button theme="danger" @click="handleBatchDelete">
                <template #icon><DeleteIcon /></template>
                批量删除 ({{ selectedRows.length }})
              </t-button>
              <t-button theme="success" @click="handleBatchApprove">
                <template #icon><CheckIcon /></template>
                批量通过 ({{ selectedRows.length }})
              </t-button>
              <t-divider layout="vertical" />
            </template>
            <t-dropdown
              :options="[
                { content: '导出 CSV', value: 'csv' },
                { content: '导出 Excel', value: 'xlsx' },
              ]"
              :disabled="!selectedSchemaId || total === 0"
              @click="(data: { value: string }) => handleExport(data.value as ExportFormat)"
            >
              <t-button :disabled="!selectedSchemaId || total === 0">
                <template #icon><DownloadIcon /></template>
                导出
                <template #suffix><ChevronDownIcon /></template>
              </t-button>
            </t-dropdown>
          </div>
        </div>

        <!-- Toolbar -->
        <div :class="styles.toolbar">
          <div :class="styles.toolbarLeft">
            <t-select
              v-model="selectedSchemaId"
              placeholder="选择表单"
              filterable
              :class="styles.schemaSelect"
            >
              <t-option
                v-for="s in schemas"
                :key="s.id"
                :label="s.name"
                :value="s.id"
              />
            </t-select>
            <t-select v-model="activeStatus" :class="styles.statusSelect">
              <t-option
                v-for="opt in statusOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </t-select>
          </div>
        </div>
      </div>

      <!-- 未选择表单 -->
      <div v-if="!selectedSchemaId" :class="styles.emptyState">
        <div :class="styles.emptyIcon">
          <FileIcon :size="64" />
        </div>
        <h2 :class="styles.emptyTitle">请选择表单</h2>
        <p :class="styles.emptyDesc">从上方下拉框选择一个表单来查看提交数据</p>
      </div>

      <!-- Loading -->
      <div v-else-if="loading && submissions.length === 0" :class="styles.tableWrapper">
        <t-skeleton :row-col="[{ width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }, { width: '100%' }]" animation="gradient" />
      </div>

      <!-- Empty -->
      <div v-else-if="total === 0" :class="styles.emptyState">
        <div :class="styles.emptyIcon">
          <SearchIcon :size="64" />
        </div>
        <h2 :class="styles.emptyTitle">暂无提交数据</h2>
        <p :class="styles.emptyDesc">该表单还没有收到任何提交</p>
      </div>

      <!-- Table -->
      <div v-else :class="styles.tableWrapper">
        <t-loading :loading="loading">
          <t-table
            :data="submissions"
            :columns="[
              { colKey: 'row-select', type: 'multiple', width: 55 },
              { colKey: 'id', title: 'ID', width: 280, ellipsis: true },
              { colKey: 'data', title: '提交数据', minWidth: 300 },
              { colKey: 'status', title: '状态', width: 100 },
              { colKey: 'submitterId', title: '提交者', width: 280, ellipsis: true },
              { colKey: 'createdAt', title: '提交时间', width: 170 },
              { colKey: 'actions', title: '操作', width: 100, fixed: 'right' },
            ]"
            stripe
            row-key="id"
            @select-change="handleSelectionChange"
          >
            <template #data="{ row }">
              <t-popup :content="dataKeys(row).map(key => `${key}: ${typeof row.data[key] === 'object' ? JSON.stringify(row.data[key]) : String(row.data[key] ?? '')}`).join('\n')" placement="top" :show-after="500">
                <span :class="styles.dataPreview">{{ dataPreview(row.data) }}</span>
              </t-popup>
            </template>
            <template #status="{ row }">
              <div :class="styles.statusCell">
                <span :class="[styles.statusDot, styles[`statusDot${row.status.charAt(0).toUpperCase()}${row.status.slice(1)}`]]" />
                <t-tag :theme="statusTagTheme(row.status)" size="small">{{ statusLabel(row.status) }}</t-tag>
              </div>
            </template>
            <template #submitterId="{ row }">
              {{ row.submitterId ?? '-' }}
            </template>
            <template #createdAt="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
            <template #actions="{ row }">
              <t-button size="small" variant="text" theme="danger" @click="handleDelete(row)">删除</t-button>
            </template>
          </t-table>
        </t-loading>

        <!-- Pagination -->
        <div v-if="total > 0" :class="styles.pagination">
          <t-pagination
            v-model="page"
            :page-size="pageSize"
            :total="total"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>
