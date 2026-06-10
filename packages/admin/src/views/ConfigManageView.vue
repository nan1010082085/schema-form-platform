<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { apiClient } from '@/utils/apiClient'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'

interface Config {
  id: string
  name: string
  key: string
  value: string
  type: 'system' | 'business'
  status: 'active' | 'inactive'
  remark: string
  createdAt: string
  updatedAt: string
}

interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const configs = ref<Config[]>([])
const loading = ref(false)
const searchQuery = ref('')
const typeFilter = ref('')
const statusFilter = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const form = ref({
  name: '',
  key: '',
  value: '',
  type: 'business' as 'system' | 'business',
  status: 'active' as 'active' | 'inactive',
  remark: '',
})
const editingId = ref('')

async function fetchConfigs() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (searchQuery.value) params.set('q', searchQuery.value)
    if (typeFilter.value) params.set('type', typeFilter.value)
    if (statusFilter.value) params.set('status', statusFilter.value)
    params.set('page', String(page.value))
    params.set('pageSize', String(pageSize.value))

    const res = await apiClient.get<PagedResult<Config>>(`/config?${params.toString()}`)
    configs.value = res.items
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function openCreate() {
  dialogMode.value = 'create'
  form.value = { name: '', key: '', value: '', type: 'business', status: 'active', remark: '' }
  dialogVisible.value = true
}

function openEdit(config: Config) {
  dialogMode.value = 'edit'
  editingId.value = config.id
  form.value = {
    name: config.name,
    key: config.key,
    value: config.value,
    type: config.type,
    status: config.status,
    remark: config.remark || '',
  }
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入参数名称')
    return
  }
  if (!form.value.key.trim()) {
    ElMessage.warning('请输入参数键名')
    return
  }

  if (dialogMode.value === 'create') {
    await apiClient.post('/config', form.value)
    ElMessage.success('参数创建成功')
  } else {
    await apiClient.put(`/config/${editingId.value}`, form.value)
    ElMessage.success('参数更新成功')
  }
  dialogVisible.value = false
  fetchConfigs()
}

async function handleDelete(config: Config) {
  await ElMessageBox.confirm(
    `确认删除参数「${config.name}」（${config.key}）？`,
    '删除确认',
    { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
  )
  await apiClient.delete(`/config/${config.id}`)
  ElMessage.success('参数已删除')
  fetchConfigs()
}

function handlePageChange(p: number) {
  page.value = p
  fetchConfigs()
}

watch(searchQuery, () => {
  page.value = 1
  fetchConfigs()
})

watch(typeFilter, () => {
  page.value = 1
  fetchConfigs()
})

watch(statusFilter, () => {
  page.value = 1
  fetchConfigs()
})

onMounted(fetchConfigs)
</script>

<template>
  <div :class="$style.wrapper">
    <div :class="$style.toolbar">
      <div :class="$style.toolbarLeft">
        <el-input
          v-model="searchQuery"
          placeholder="搜索名称或键名"
          :prefix-icon="Search"
          clearable
          style="width: 240px"
        />
        <el-select v-model="typeFilter" placeholder="参数类型" clearable style="width: 120px">
          <el-option label="系统参数" value="system" />
          <el-option label="业务参数" value="business" />
        </el-select>
        <el-select v-model="statusFilter" placeholder="状态" clearable style="width: 100px">
          <el-option label="启用" value="active" />
          <el-option label="停用" value="inactive" />
        </el-select>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreate">新增参数</el-button>
    </div>

    <el-table :data="configs" v-loading="loading" :class="$style.table">
      <el-table-column prop="name" label="参数名称" min-width="160" show-overflow-tooltip />
      <el-table-column prop="key" label="参数键名" min-width="200">
        <template #default="{ row }">
          <el-tag size="small" type="info" disable-transitions>{{ row.key }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="value" label="参数值" min-width="200" show-overflow-tooltip />
      <el-table-column label="类型" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.type === 'system' ? 'danger' : 'primary'" size="small" disable-transitions>
            {{ row.type === 'system' ? '系统' : '业务' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'warning'" size="small" disable-transitions>
            {{ row.status === 'active' ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <div :class="$style.actions">
            <el-button text size="small" @click="openEdit(row)">编辑</el-button>
            <el-button text size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="total > pageSize" :class="$style.pagination">
      <el-pagination
        layout="total, prev, pager, next"
        :total="total"
        :page-size="pageSize"
        :current-page="page"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增参数' : '编辑参数'"
      width="520px"
      destroy-on-close
    >
      <el-form label-width="80px">
        <el-form-item label="参数名称">
          <el-input v-model="form.name" placeholder="请输入参数名称" />
        </el-form-item>
        <el-form-item label="参数键名">
          <el-input v-model="form.key" placeholder="如 sys.upload.maxSize" :disabled="dialogMode === 'edit'" />
        </el-form-item>
        <el-form-item label="参数值">
          <el-input v-model="form.value" placeholder="请输入参数值" />
        </el-form-item>
        <el-form-item label="参数类型">
          <el-select v-model="form.type" style="width: 100%">
            <el-option label="系统参数" value="system" />
            <el-option label="业务参数" value="business" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="启用" value="active" />
            <el-option label="停用" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="备注（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.toolbarLeft {
  display: flex;
  gap: 8px;
  align-items: center;
}

.table {
  border-radius: 8px;
  overflow: hidden;
}

.actions {
  display: flex;
  gap: 4px;
  align-items: center;
}

.pagination {
  padding: 12px 0 4px;
  display: flex;
  justify-content: flex-end;
}
</style>
