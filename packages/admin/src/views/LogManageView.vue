<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { apiClient } from '@/utils/apiClient'
import { SearchIcon, RefreshIcon } from 'tdesign-icons-vue-next'

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
const dateRange = ref<[string, string] | null>(null)
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

const ACTION_THEMES: Record<string, string> = {
  create: 'success',
  update: 'primary',
  delete: 'danger',
  login: 'default',
  logout: 'default',
  export: 'warning',
  import: 'warning',
  other: 'default',
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
    if (dateRange.value?.[0]) params.set('startDate', dateRange.value[0])
    if (dateRange.value?.[1]) params.set('endDate', dateRange.value[1])
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

function handleReset() {
  searchQuery.value = ''
  moduleFilter.value = ''
  actionFilter.value = ''
  statusFilter.value = ''
  usernameFilter.value = ''
  dateRange.value = null
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
watch(dateRange, () => { page.value = 1; fetchLogs() })

onMounted(() => {
  fetchLogs()
  fetchModules()
})
</script>

<template>
  <div :class="$style.wrapper">
    <div :class="$style.toolbar">
      <div :class="$style.filters">
        <t-input
          v-model="searchQuery"
          placeholder="搜索用户/模块/目标"
          :prefix-icon="SearchIcon"
          clearable
          :style="{ width: '200px' }"
        />
        <t-input
          v-model="usernameFilter"
          placeholder="用户名"
          clearable
          :style="{ width: '120px' }"
        />
        <t-select v-model:value="moduleFilter" placeholder="模块" clearable :style="{ width: '120px' }">
          <t-option v-for="m in modules" :key="m" :label="m" :value="m" />
        </t-select>
        <t-select v-model:value="actionFilter" placeholder="操作类型" clearable :style="{ width: '110px' }">
          <t-option label="新增" value="create" />
          <t-option label="修改" value="update" />
          <t-option label="删除" value="delete" />
          <t-option label="登录" value="login" />
          <t-option label="登出" value="logout" />
          <t-option label="导出" value="export" />
          <t-option label="导入" value="import" />
          <t-option label="其他" value="other" />
        </t-select>
        <t-select v-model:value="statusFilter" placeholder="状态" clearable :style="{ width: '100px' }">
          <t-option label="成功" value="success" />
          <t-option label="失败" value="fail" />
        </t-select>
        <t-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          :style="{ width: '240px' }"
        />
        <t-button :icon="RefreshIcon" @click="handleReset">重置</t-button>
      </div>
    </div>

    <t-table :data="logs" :loading="loading" :class="$style.table">
      <t-col prop="username" label="操作人" :width="100" />
      <t-col prop="module" label="模块" :width="100">
        <template #cell="{ row }">
          <t-tag size="small" theme="default">{{ row.module }}</t-tag>
        </template>
      </t-col>
      <t-col label="操作类型" :width="90" align="center">
        <template #cell="{ row }">
          <t-tag :theme="(ACTION_THEMES[row.action] as any)" size="small">
            {{ ACTION_LABELS[row.action] || row.action }}
          </t-tag>
        </template>
      </t-col>
      <t-col prop="targetName" label="操作目标" :min-width="140" />
      <t-col prop="method" label="请求方法" :width="80" align="center">
        <template #cell="{ row }">
          <t-tag
            :theme="row.method === 'DELETE' ? 'danger' : row.method === 'POST' ? 'success' : row.method === 'PUT' ? 'warning' : 'default'"
            size="small"
          >
            {{ row.method }}
          </t-tag>
        </template>
      </t-col>
      <t-col prop="url" label="请求路径" :min-width="200" />
      <t-col prop="ip" label="IP 地址" :width="130" />
      <t-col label="状态" :width="70" align="center">
        <template #cell="{ row }">
          <t-tag :theme="row.status === 'success' ? 'success' : 'danger'" size="small">
            {{ row.status === 'success' ? '成功' : '失败' }}
          </t-tag>
        </template>
      </t-col>
      <t-col label="耗时" :width="80" align="center">
        <template #cell="{ row }">
          {{ formatDuration(row.duration) }}
        </template>
      </t-col>
      <t-col prop="createdAt" label="操作时间" :width="170">
        <template #cell="{ row }">
          {{ new Date(row.createdAt).toLocaleString() }}
        </template>
      </t-col>
      <t-col label="操作" :width="80" fixed="right">
        <template #cell="{ row }">
          <t-button variant="text" size="small" @click="showDetail(row)">详情</t-button>
        </template>
      </t-col>
    </t-table>

    <div v-if="total > pageSize" :class="$style.pagination">
      <t-pagination
        :total="total"
        :page-size="pageSize"
        :current="page"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 详情对话框 -->
    <t-dialog
      v-model:visible="detailVisible"
      header="操作日志详情"
      width="640px"
      destroy-on-close
    >
      <template v-if="detailData">
        <t-descriptions :column="2" bordered size="small">
          <t-descriptions-item label="操作人">{{ detailData.username }}</t-descriptions-item>
          <t-descriptions-item label="模块">{{ detailData.module }}</t-descriptions-item>
          <t-descriptions-item label="操作类型">{{ ACTION_LABELS[detailData.action] || detailData.action }}</t-descriptions-item>
          <t-descriptions-item label="操作目标">{{ detailData.targetName || '-' }}</t-descriptions-item>
          <t-descriptions-item label="请求方法">{{ detailData.method }}</t-descriptions-item>
          <t-descriptions-item label="请求路径" :span="2">{{ detailData.url }}</t-descriptions-item>
          <t-descriptions-item label="IP 地址">{{ detailData.ip }}</t-descriptions-item>
          <t-descriptions-item label="耗时">{{ formatDuration(detailData.duration) }}</t-descriptions-item>
          <t-descriptions-item label="状态">
            <t-tag :theme="detailData.status === 'success' ? 'success' : 'danger'" size="small">
              {{ detailData.status === 'success' ? '成功' : '失败' }}
            </t-tag>
          </t-descriptions-item>
          <t-descriptions-item label="操作时间">{{ new Date(detailData.createdAt).toLocaleString() }}</t-descriptions-item>
          <t-descriptions-item v-if="detailData.errorMsg" label="错误信息" :span="2">
            <span style="color: var(--td-error-color)">{{ detailData.errorMsg }}</span>
          </t-descriptions-item>
          <t-descriptions-item label="User-Agent" :span="2">{{ detailData.userAgent || '-' }}</t-descriptions-item>
        </t-descriptions>

        <div v-if="detailData.requestBody" :class="$style.requestBodySection">
          <h4 :class="$style.requestBodyTitle">请求体</h4>
          <pre :class="$style.requestBody">{{ JSON.stringify(detailData.requestBody, null, 2) }}</pre>
        </div>
      </template>
    </t-dialog>
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
  color: var(--td-text-color-primary);
}

.requestBody {
  background: var(--td-bg-color-container-hover);
  border: 1px solid var(--td-border-level-2-color);
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
