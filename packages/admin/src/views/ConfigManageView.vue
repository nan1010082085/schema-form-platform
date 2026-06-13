<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { apiClient } from '@/utils/apiClient'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import { AddIcon, SearchIcon } from 'tdesign-icons-vue-next'

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
    MessagePlugin.warning('请输入参数名称')
    return
  }
  if (!form.value.key.trim()) {
    MessagePlugin.warning('请输入参数键名')
    return
  }

  if (dialogMode.value === 'create') {
    await apiClient.post('/config', form.value)
    MessagePlugin.success('参数创建成功')
  } else {
    await apiClient.put(`/config/${editingId.value}`, form.value)
    MessagePlugin.success('参数更新成功')
  }
  dialogVisible.value = false
  fetchConfigs()
}

async function handleDelete(config: Config) {
  const confirmDia = DialogPlugin.confirm({
    header: '删除确认',
    body: `确认删除参数「${config.name}」（${config.key}）？`,
    confirmBtn: '删除',
    cancelBtn: '取消',
    onConfirm: async () => {
      await apiClient.delete(`/config/${config.id}`)
      MessagePlugin.success('参数已删除')
      fetchConfigs()
      confirmDia.destroy()
    },
    onClose: () => {
      confirmDia.destroy()
    },
  })
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
        <t-input
          v-model:value="searchQuery"
          placeholder="搜索名称或键名"
          :prefix-icon="SearchIcon"
          clearable
          :style="{ width: '240px' }"
        />
        <t-select v-model:value="typeFilter" placeholder="参数类型" clearable :style="{ width: '120px' }">
          <t-option label="系统参数" value="system" />
          <t-option label="业务参数" value="business" />
        </t-select>
        <t-select v-model:value="statusFilter" placeholder="状态" clearable :style="{ width: '100px' }">
          <t-option label="启用" value="active" />
          <t-option label="停用" value="inactive" />
        </t-select>
      </div>
      <t-button theme="primary" :icon="AddIcon" @click="openCreate">新增参数</t-button>
    </div>

    <t-table :data="configs" :loading="loading" :class="$style.table">
      <t-col prop="name" label="参数名称" :min-width="160" />
      <t-col prop="key" label="参数键名" :min-width="200">
        <template #cell="{ row }">
          <t-tag size="small" theme="default">{{ row.key }}</t-tag>
        </template>
      </t-col>
      <t-col prop="value" label="参数值" :min-width="200" />
      <t-col label="类型" :width="100" align="center">
        <template #cell="{ row }">
          <t-tag :theme="row.type === 'system' ? 'danger' : 'primary'" size="small">
            {{ row.type === 'system' ? '系统' : '业务' }}
          </t-tag>
        </template>
      </t-col>
      <t-col label="状态" :width="80" align="center">
        <template #cell="{ row }">
          <t-tag :theme="row.status === 'active' ? 'success' : 'warning'" size="small">
            {{ row.status === 'active' ? '启用' : '停用' }}
          </t-tag>
        </template>
      </t-col>
      <t-col prop="remark" label="备注" :min-width="160" />
      <t-col label="操作" :width="140" fixed="right">
        <template #cell="{ row }">
          <div :class="$style.actions">
            <t-button variant="text" size="small" @click="openEdit(row)">编辑</t-button>
            <t-button variant="text" size="small" theme="danger" @click="handleDelete(row)">删除</t-button>
          </div>
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

    <!-- 创建/编辑对话框 -->
    <t-dialog
      v-model:visible="dialogVisible"
      :header="dialogMode === 'create' ? '新增参数' : '编辑参数'"
      width="520px"
      destroy-on-close
    >
      <t-form label-width="80px">
        <t-form-item label="参数名称">
          <t-input v-model:value="form.name" placeholder="请输入参数名称" />
        </t-form-item>
        <t-form-item label="参数键名">
          <t-input v-model:value="form.key" placeholder="如 sys.upload.maxSize" :disabled="dialogMode === 'edit'" />
        </t-form-item>
        <t-form-item label="参数值">
          <t-input v-model:value="form.value" placeholder="请输入参数值" />
        </t-form-item>
        <t-form-item label="参数类型">
          <t-select v-model:value="form.type" :style="{ width: '100%' }">
            <t-option label="系统参数" value="system" />
            <t-option label="业务参数" value="business" />
          </t-select>
        </t-form-item>
        <t-form-item label="状态">
          <t-select v-model:value="form.status" :style="{ width: '100%' }">
            <t-option label="启用" value="active" />
            <t-option label="停用" value="inactive" />
          </t-select>
        </t-form-item>
        <t-form-item label="备注">
          <t-input v-model:value="form.remark" type="textarea" :rows="2" placeholder="备注（可选）" />
        </t-form-item>
      </t-form>
      <template #footer>
        <t-button @click="dialogVisible = false">取消</t-button>
        <t-button theme="primary" @click="handleSubmit">确定</t-button>
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
