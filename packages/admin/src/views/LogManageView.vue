<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { apiClient } from '@/utils/apiClient'
import AppIcon from '@schema-form/shared-components/common/AppIcon.vue'

interface AuditLog {
  id: string
  userId: string
  username: string
  module: string
  action: string
  targetId: string | null
  targetName: string
  method: string
  url: string
  ip: string
  userAgent: string
  status: 'success' | 'fail'
  errorMsg: string
  duration: number
  createdAt: string
}

interface LogDetail extends AuditLog {
  requestBody: Record<string, unknown> | null
}

interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const logs = ref<AuditLog[]>([])
const loading = ref(false)
const searchQuery = ref('')
const moduleFilter = ref('')
const actionFilter = ref('')
const statusFilter = ref('')
const usernameFilter = ref('')
const dateStart = ref('')
const dateEnd = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const modules = ref<string[]>([])
const detailVisible = ref(false)
const detailData = ref<LogDetail | null>(null)

const ACTION_LABELS: Record<string, string> = {
  create: '新增',
  update: '修改',
  delete: '删除',
  login: '登录',
  logout: '登出',
  export: '导出',
  import: '导入',
  other: '其他',
}

const ACTION_TAG_TYPES: Record<string, string> = {
  create: 'success',
  update: '',
  delete: 'danger',
  login: 'info',
  logout: 'info',
  warning: 'warning',
  other: 'info',
}

const METHOD_TAG_TYPES: Record<string, string> = {
  DELETE: 'danger',
  POST: 'success',
  PUT: 'warning',
}

async function fetchLogs() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (searchQuery.value) params.set('q', searchQuery.value)
    if (moduleFilter.value) params.set('module', moduleFilter.value)
    if (actionFilter.value) params.set('action', actionFilter.value)
    if (statusFilter.value) params.set('status', statusFilter.value)
    if (usernameFilter.value) params.set('username', usernameFilter.value)
    if (dateStart.value) params.set('startDate', dateStart.value)
    if (dateEnd.value) params.set('endDate', dateEnd.value)
    params.set('page', String(page.value))
    params.set('pageSize', String(pageSize.value))

    const res = await apiClient.get<PagedResult<AuditLog>>(`/audit-logs?${params.toString()}`)
    logs.value = res.items
    total.value = res.total
  } finally {
    loading.value = false
  }
}

async function fetchModules() {
  const res = await apiClient.get<string[]>('/audit-logs/modules/list')
  modules.value = res
}

async function showDetail(log: AuditLog) {
  const res = await apiClient.get<LogDetail>(`/audit-logs/${log.id}`)
  detailData.value = res
  detailVisible.value = true
}

function handlePageChange(p: number) {
  page.value = p
  fetchLogs()
}

function handleSizeChange(size: number) {
  pageSize.value = size
  page.value = 1
  fetchLogs()
}

function handleReset() {
  searchQuery.value = ''
  moduleFilter.value = ''
  actionFilter.value = ''
  statusFilter.value = ''
  usernameFilter.value = ''
  dateStart.value = ''
  dateEnd.value = ''
  page.value = 1
  fetchLogs()
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

watch(searchQuery, () => { page.value = 1; fetchLogs() })
watch(moduleFilter, () => { page.value = 1; fetchLogs() })
watch(actionFilter, () => { page.value = 1; fetchLogs() })
watch(statusFilter, () => { page.value = 1; fetchLogs() })
watch(usernameFilter, () => { page.value = 1; fetchLogs() })
watch(dateStart, () => { page.value = 1; fetchLogs() })
watch(dateEnd, () => { page.value = 1; fetchLogs() })

onMounted(() => {
  fetchLogs()
  fetchModules()
})
</script>

<template>
  <div :class="$style.wrapper">
    <div :class="$style.toolbar">
      <div :class="$style.filters">
        <el-input
          v-model="searchQuery"
          placeholder="搜索用户/模块/目标"
          clearable
          style="width: 200px"
        >
          <template #prefix>
            <AppIcon name="search" />
          </template>
        </el-input>
        <el-input
          v-model="usernameFilter"
          placeholder="用户名"
          clearable
          style="width: 120px"
        />
        <el-select v-model="moduleFilter" placeholder="模块" clearable style="width: 120px">
          <el-option v-for="m in modules" :key="m" :label="m" :value="m" />
        </el-select>
        <el-select v-model="actionFilter" placeholder="操作类型" clearable style="width: 110px">
          <el-option label="新增" value="create" />
          <el-option label="修改" value="update" />
          <el-option label="删除" value="delete" />
          <el-option label="登录" value="login" />
          <el-option label="登出" value="logout" />
          <el-option label="导出" value="export" />
          <el-option label="导入" value="import" />
          <el-option label="其他" value="other" />
        </el-select>
        <el-select v-model="statusFilter" placeholder="状态" clearable style="width: 100px">
          <el-option label="成功" value="success" />
          <el-option label="失败" value="fail" />
        </el-select>
        <el-date-picker
          v-model="dateStart"
          type="date"
          placeholder="开始日期"
          value-format="YYYY-MM-DD"
          style="width: 140px"
        />
        <el-date-picker
          v-model="dateEnd"
          type="date"
          placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width: 140px"
        />
        <el-button :icon="Refresh" @click="handleReset">重置</el-button>
      </div>
    </div>

    <el-table v-loading="loading" :data="logs" :class="$style.table" border stripe>
      <el-table-column prop="username" label="操作人" width="100" />
      <el-table-column prop="module" label="模块" width="100">
        <template #default="{ row }">
          <el-tag size="small">{{ row.module }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="action" label="操作类型" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="(ACTION_TAG_TYPES[row.action] as any)" size="small">
            {{ ACTION_LABELS[row.action] || row.action }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="targetName" label="操作目标" min-width="140" />
      <el-table-column prop="method" label="请求方法" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="(METHOD_TAG_TYPES[row.method] as any)" size="small">
            {{ row.method }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="url" label="请求路径" min-width="200" />
      <el-table-column prop="ip" label="IP 地址" width="130" />
      <el-table-column prop="status" label="状态" width="70" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">
            {{ row.status === 'success' ? '成功' : '失败' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="duration" label="耗时" width="80" align="center">
        <template #default="{ row }">
          {{ formatDuration(row.duration) }}
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="操作时间" width="170">
        <template #default="{ row }">
          {{ new Date(row.createdAt).toLocaleString() }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="80" fixed="right" align="center">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="showDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="total > pageSize" :class="$style.pagination">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailVisible"
      title="操作日志详情"
      width="640px"
      destroy-on-close
    >
      <template v-if="detailData">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="操作人">{{ detailData.username }}</el-descriptions-item>
          <el-descriptions-item label="模块">{{ detailData.module }}</el-descriptions-item>
          <el-descriptions-item label="操作类型">{{ ACTION_LABELS[detailData.action] || detailData.action }}</el-descriptions-item>
          <el-descriptions-item label="操作目标">{{ detailData.targetName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="请求方法">{{ detailData.method }}</el-descriptions-item>
          <el-descriptions-item label="请求路径" :span="2">{{ detailData.url }}</el-descriptions-item>
          <el-descriptions-item label="IP 地址">{{ detailData.ip }}</el-descriptions-item>
          <el-descriptions-item label="耗时">{{ formatDuration(detailData.duration) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="detailData.status === 'success' ? 'success' : 'danger'" size="small">
              {{ detailData.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="操作时间">{{ new Date(detailData.createdAt).toLocaleString() }}</el-descriptions-item>
          <el-descriptions-item v-if="detailData.errorMsg" label="错误信息" :span="2">
            <span style="color: var(--el-color-danger)">{{ detailData.errorMsg }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="User-Agent" :span="2">{{ detailData.userAgent || '-' }}</el-descriptions-item>
        </el-descriptions>

        <div v-if="detailData.requestBody" :class="$style.requestBodySection">
          <h4 :class="$style.requestBodyTitle">请求体</h4>
          <pre :class="$style.requestBody">{{ JSON.stringify(detailData.requestBody, null, 2) }}</pre>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style module>
.wrapper {
  width: 100%;
  padding: 20px;
}

.toolbar {
  margin-bottom: 16px;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.table {
  border-radius: 8px;
  overflow: hidden;
}

.pagination {
  padding: 12px 0 4px;
  display: flex;
  justify-content: flex-end;
}

.requestBodySection {
  margin-top: 16px;
}

.requestBodyTitle {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 8px;
  color: var(--el-text-color-primary);
}

.requestBody {
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  padding: 12px;
  font-size: 12px;
  font-family: monospace;
  overflow-x: auto;
  max-height: 300px;
  overflow-y: auto;
  margin: 0;
}
</style>
