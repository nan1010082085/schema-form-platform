<script setup lang="ts">
/**
 * SubmissionListView — 表单提交数据查看页
 *
 * 选择表单 → 查看该表单的所有提交数据，支持状态筛选、分页、删除、导出 CSV/Excel。
 */
import { onMounted, ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Download, Document, Delete, Check, ArrowDown } from '@element-plus/icons-vue'
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
    ElMessage.error(err instanceof Error ? err.message : '加载提交数据失败')
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
  try {
    await ElMessageBox.confirm(
      '确认删除此条提交数据？删除后不可恢复。',
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', confirmButtonClass: 'el-button--danger' },
    )
    await deleteSubmission(selectedSchemaId.value, item.id)
    ElMessage.success('已删除')
    await loadSubmissions()
  } catch { /* cancelled */ }
}

// ── 批量删除 ──
async function handleBatchDelete() {
  const ids = selectedRows.value.map((r) => r.id)
  try {
    await ElMessageBox.confirm(
      `确认删除选中的 ${ids.length} 条提交数据？删除后不可恢复。`,
      '批量删除确认',
      { type: 'warning', confirmButtonText: '删除', confirmButtonClass: 'el-button--danger' },
    )
    const result = await batchDeleteSubmissions(selectedSchemaId.value, ids)
    ElMessage.success(`已删除 ${result.deletedCount} 条数据`)
    selectedRows.value = []
    await loadSubmissions()
  } catch { /* cancelled */ }
}

// ── 批量审批 ──
async function handleBatchApprove() {
  const ids = selectedRows.value.map((r) => r.id)
  try {
    await ElMessageBox.confirm(
      `确认通过选中的 ${ids.length} 条提交数据？`,
      '批量审批确认',
      { type: 'warning', confirmButtonText: '通过' },
    )
    const result = await batchUpdateSubmissionsStatus(selectedSchemaId.value, ids, 'approved')
    ElMessage.success(`已更新 ${result.modifiedCount} 条数据状态`)
    selectedRows.value = []
    await loadSubmissions()
  } catch { /* cancelled */ }
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
    ElMessage.success(`导出 ${FORMAT_LABELS[format]} 成功`)
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '导出失败')
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

function statusTagType(status: string): '' | 'success' | 'info' | 'warning' | 'danger' {
  const map: Record<string, '' | 'success' | 'info' | 'warning' | 'danger'> = {
    submitted: 'info',
    approved: 'success',
    rejected: 'danger',
  }
  return map[status] ?? 'info'
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
    <el-scrollbar :class="styles.scrollbar">
      <!-- Header -->
      <div :class="styles.header">
        <div :class="styles.titleRow">
          <div>
            <h1 :class="styles.title">表单数据</h1>
            <p :class="styles.subtitle">查看和管理表单提交数据</p>
          </div>
          <div :class="styles.headerActions">
            <template v-if="hasSelection">
              <el-button :icon="Delete" type="danger" @click="handleBatchDelete">
                批量删除 ({{ selectedRows.length }})
              </el-button>
              <el-button :icon="Check" type="success" @click="handleBatchApprove">
                批量通过 ({{ selectedRows.length }})
              </el-button>
              <el-divider direction="vertical" />
            </template>
            <el-dropdown
              @command="(cmd: ExportFormat) => handleExport(cmd)"
              :disabled="!selectedSchemaId || total === 0"
            >
              <el-button :icon="Download" :disabled="!selectedSchemaId || total === 0">
                导出 <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="csv">导出 CSV</el-dropdown-item>
                  <el-dropdown-item command="xlsx">导出 Excel</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>

        <!-- Toolbar -->
        <div :class="styles.toolbar">
          <div :class="styles.toolbarLeft">
            <el-select
              v-model="selectedSchemaId"
              placeholder="选择表单"
              filterable
              :class="styles.schemaSelect"
            >
              <el-option
                v-for="s in schemas"
                :key="s.id"
                :label="s.name"
                :value="s.id"
              />
            </el-select>
            <el-select v-model="activeStatus" :class="styles.statusSelect">
              <el-option
                v-for="opt in statusOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </div>
        </div>
      </div>

      <!-- 未选择表单 -->
      <div v-if="!selectedSchemaId" :class="styles.emptyState">
        <div :class="styles.emptyIcon">
          <el-icon :size="64"><Document /></el-icon>
        </div>
        <h2 :class="styles.emptyTitle">请选择表单</h2>
        <p :class="styles.emptyDesc">从上方下拉框选择一个表单来查看提交数据</p>
      </div>

      <!-- Loading -->
      <div v-else-if="loading && submissions.length === 0" :class="styles.tableWrapper">
        <el-skeleton :rows="8" animated />
      </div>

      <!-- Empty -->
      <div v-else-if="total === 0" :class="styles.emptyState">
        <div :class="styles.emptyIcon">
          <el-icon :size="64"><Search /></el-icon>
        </div>
        <h2 :class="styles.emptyTitle">暂无提交数据</h2>
        <p :class="styles.emptyDesc">该表单还没有收到任何提交</p>
      </div>

      <!-- Table -->
      <div v-else :class="styles.tableWrapper">
        <el-table
          :data="submissions"
          stripe
          style="width: 100%"
          v-loading="loading"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column prop="id" label="ID" width="280" show-overflow-tooltip />
          <el-table-column label="提交数据" min-width="300">
            <template #default="{ row }">
              <el-tooltip placement="top" :show-after="500">
                <template #content>
                  <div style="max-width: 400px; word-break: break-all;">
                    <div v-for="key in dataKeys(row)" :key="key" style="margin-bottom: 4px;">
                      <strong>{{ key }}:</strong> {{ typeof row.data[key] === 'object' ? JSON.stringify(row.data[key]) : String(row.data[key] ?? '') }}
                    </div>
                  </div>
                </template>
                <span :class="styles.dataPreview">{{ dataPreview(row.data) }}</span>
              </el-tooltip>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <div :class="styles.statusCell">
                <span :class="[styles.statusDot, styles[`statusDot${row.status.charAt(0).toUpperCase()}${row.status.slice(1)}`]]" />
                <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="submitterId" label="提交者" width="280" show-overflow-tooltip>
            <template #default="{ row }">
              {{ row.submitterId ?? '-' }}
            </template>
          </el-table-column>
          <el-table-column label="提交时间" width="170">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button size="small" text type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- Pagination -->
        <div v-if="total > 0" :class="styles.pagination">
          <el-pagination
            v-model:current-page="page"
            :page-size="pageSize"
            :total="total"
            layout="total, prev, pager, next"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </el-scrollbar>
  </div>
</template>
