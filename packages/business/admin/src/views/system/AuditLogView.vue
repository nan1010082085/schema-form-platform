<script setup lang="ts">
/**
 * 操作日志 — 只读表格
 */
import { ref, onMounted } from 'vue'
import { apiClient } from '@schema-form/platform-shared/utils/apiClient'
import { ElMessage } from 'element-plus'

const logs = ref<any[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const filters = ref({ module: '', username: '', status: '', startTime: '', endTime: '' })

async function load() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    params.set('page', String(page.value))
    params.set('pageSize', '20')
    if (filters.value.module) params.set('module', filters.value.module)
    if (filters.value.username) params.set('username', filters.value.username)
    if (filters.value.status) params.set('status', filters.value.status)
    if (filters.value.startTime) params.set('startTime', filters.value.startTime)
    if (filters.value.endTime) params.set('endTime', filters.value.endTime)
    const d = await apiClient.get(`/audit-logs?${params}`)
    logs.value = d.items; total.value = d.total
  } catch { } finally { loading.value = false }
}

function handlePageChange(p: number) { page.value = p; load() }
function handleSearch() { page.value = 1; load() }

const modules = ['schema', 'flow', 'user', 'role', 'menu', 'dept', 'tenant', 'dict', 'config', 'auth']

onMounted(load)
</script>

<template>
  <div :class="$style.container">
    <div :class="$style.header"><h2>操作日志</h2></div>
    <div :class="$style.filters">
      <el-input v-model="filters.module" placeholder="模块" clearable style="width: 120px" @keyup.enter="handleSearch" />
      <el-input v-model="filters.username" placeholder="操作人" clearable style="width: 120px" @keyup.enter="handleSearch" />
      <el-select v-model="filters.status" placeholder="状态" clearable style="width: 100px" @change="handleSearch">
        <el-option label="成功" value="success" /><el-option label="失败" value="fail" />
      </el-select>
      <el-date-picker v-model="filters.startTime" type="datetime" placeholder="开始时间" style="width: 180px" @change="handleSearch" />
      <el-date-picker v-model="filters.endTime" type="datetime" placeholder="结束时间" style="width: 180px" @change="handleSearch" />
      <el-button type="primary" @click="handleSearch">搜索</el-button>
    </div>
    <el-table :data="logs" v-loading="loading" stripe size="small">
      <el-table-column prop="module" label="模块" width="100" />
      <el-table-column prop="action" label="操作" width="80" />
      <el-table-column prop="username" label="操作人" width="100" />
      <el-table-column prop="method" label="方法" width="80" />
      <el-table-column prop="url" label="URL" min-width="200" show-overflow-tooltip />
      <el-table-column prop="ip" label="IP" width="130" />
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">{{ row.status === 'success' ? '成功' : '失败' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="duration" label="耗时" width="80">
        <template #default="{ row }">{{ row.duration }}ms</template>
      </el-table-column>
      <el-table-column prop="createdAt" label="时间" width="170">
        <template #default="{ row }">{{ row.createdAt?.slice(0, 19).replace('T', ' ') }}</template>
      </el-table-column>
    </el-table>
    <div :class="$style.pagination">
      <el-pagination v-model:current-page="page" :page-size="20" :total="total" layout="total, prev, pager, next" @current-change="handlePageChange" />
    </div>
  </div>
</template>

<style module>
.container { padding: 16px; background: var(--bg-color-page); height: 100%; display: flex; flex-direction: column; }
.header { margin-bottom: 16px; }
.header h2 { margin: 0; font-size: 18px; font-weight: 600; }
.filters { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
