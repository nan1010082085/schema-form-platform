<script setup lang="ts">
/**
 * 在线用户
 */
import { ref, onMounted } from 'vue'
import { apiClient } from '@schema-form/shared-utils/apiClient'
import { ElMessage, ElMessageBox } from 'element-plus'

const users = ref<any[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)

async function load() {
  loading.value = true
  try {
    const d = await apiClient.get(`/online-users?page=${page.value}&pageSize=20`)
    users.value = d.items; total.value = d.total
  } catch { } finally { loading.value = false }
}

async function handleKick(session: any) {
  try {
    await ElMessageBox.confirm(`确定强制用户 "${session.user?.displayName || session.userId}" 下线吗？`, '强制下线', { type: 'warning' })
    await apiClient.delete(`/online-users/${session.id}`)
    ElMessage.success('已强制下线'); await load()
  } catch { /* cancel */ }
}

function handlePageChange(p: number) { page.value = p; load() }

onMounted(load)
</script>

<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <h2>在线用户</h2>
      <el-button @click="load">刷新</el-button>
    </div>
    <el-table :data="users" v-loading="loading" stripe>
      <el-table-column label="用户名" width="120">
        <template #default="{ row }">{{ row.user?.username || row.userId }}</template>
      </el-table-column>
      <el-table-column label="显示名" width="120">
        <template #default="{ row }">{{ row.user?.displayName || '-' }}</template>
      </el-table-column>
      <el-table-column prop="ip" label="IP" width="130" />
      <el-table-column prop="userAgent" label="浏览器" min-width="200" show-overflow-tooltip />
      <el-table-column prop="loginTime" label="登录时间" width="170">
        <template #default="{ row }">{{ row.loginTime?.slice(0, 19).replace('T', ' ') }}</template>
      </el-table-column>
      <el-table-column prop="expireTime" label="过期时间" width="170">
        <template #default="{ row }">{{ row.expireTime?.slice(0, 19).replace('T', ' ') }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button link type="danger" size="small" @click="handleKick(row)">强制下线</el-button>
        </template>
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
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
