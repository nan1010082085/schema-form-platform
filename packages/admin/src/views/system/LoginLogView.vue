<script setup lang="ts">
/**
 * 登录日志
 */
import { ref, onMounted } from 'vue'
import { apiClient } from '@schema-form/shared-utils/apiClient'
import { ElMessage, ElMessageBox } from 'element-plus'

const logs = ref<any[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const filters = ref({ username: '', status: '', startTime: '', endTime: '' })

async function load() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    params.set('page', String(page.value))
    params.set('pageSize', '20')
    if (filters.value.username) params.set('username', filters.value.username)
    if (filters.value.status) params.set('status', filters.value.status)
    if (filters.value.startTime) params.set('startTime', filters.value.startTime)
    if (filters.value.endTime) params.set('endTime', filters.value.endTime)
    const d = await apiClient.get(`/login-logs?${params}`)
    logs.value = d.items; total.value = d.total
  } catch { } finally { loading.value = false }
}

async function handleClear() {
  try {
    await ElMessageBox.confirm('确定清空所有登录日志吗？', '确认清空', { type: 'warning' })
    await apiClient.delete('/login-logs')
    ElMessage.success('已清空'); await load()
  } catch { /* cancel */ }
}

function handlePageChange(p: number) { page.value = p; load() }
function handleSearch() { page.value = 1; load() }

onMounted(load)
</script>

<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <h2>登录日志</h2>
      <el-button type="danger" @click="handleClear">清空日志</el-button>
    </div>
    <div :class="$style.filters">
      <el-input v-model="filters.username" placeholder="用户名" clearable style="width: 150px" @keyup.enter="handleSearch" />
      <el-select v-model="filters.status" placeholder="状态" clearable style="width: 100px" @change="handleSearch">
        <el-option label="成功" value="success" /><el-option label="失败" value="fail" />
      </el-select>
      <el-date-picker v-model="filters.startTime" type="datetime" placeholder="开始时间" style="width: 180px" @change="handleSearch" />
      <el-date-picker v-model="filters.endTime" type="datetime" placeholder="结束时间" style="width: 180px" @change="handleSearch" />
      <el-button type="primary" @click="handleSearch">搜索</el-button>
    </div>
    <el-table :data="logs" v-loading="loading" stripe size="small">
      <el-table-column prop="username" label="用户名" width="120" />
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">{{ row.status === 'success' ? '成功' : '失败' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="message" label="信息" width="150" />
      <el-table-column prop="ip" label="IP" width="130" />
      <el-table-column prop="userAgent" label="浏览器" min-width="200" show-overflow-tooltip />
      <el-table-column prop="loginTime" label="登录时间" width="170">
        <template #default="{ row }">{{ row.loginTime?.slice(0, 19).replace('T', ' ') }}</template>
      </el-table-column>
    </el-table>
    <div :class="$style.pagination">
      <el-pagination v-model:current-page="page" :page-size="20" :total="total" layout="total, prev, pager, next" @current-change="handlePageChange" />
    </div>
  </div>
</template>

<style module>
.container { padding: 16px; background: var(--bg-color-page); height: 100%; display: flex; flex-direction: column; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header h2 { margin: 0; font-size: 18px; font-weight: 600; }
.filters { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
