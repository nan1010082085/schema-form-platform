<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiClient } from '@/utils/apiClient'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import { AddIcon, SearchIcon } from 'tdesign-icons-vue-next'

interface MicroApp {
  id: string
  name: string
  url: string
  icon: string
  layout: 'default' | 'blank' | 'iframe'
  activateRule: string
  permissions: string[]
  status: 'active' | 'inactive'
  sort: number
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

const apps = ref<MicroApp[]>([])
const loading = ref(false)
const searchQuery = ref('')
const statusFilter = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const form = ref({
  name: '',
  url: '',
  icon: '',
  layout: 'default' as 'default' | 'blank' | 'iframe',
  activateRule: '',
  permissions: [] as string[],
  status: 'active' as 'active' | 'inactive',
  sort: 0,
  remark: '',
})
const editingId = ref('')

const layoutOptions = [
  { value: 'default', label: '默认布局', description: '使用主应用的导航和布局' },
  { value: 'blank', label: '空白布局', description: '无导航，适合独立页面' },
  { value: 'iframe', label: 'iframe 嵌入', description: '通过 iframe 加载外部应用' },
]

async function fetchApps() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (searchQuery.value) params.set('q', searchQuery.value)
    if (statusFilter.value) params.set('status', statusFilter.value)
    params.set('page', String(page.value))
    params.set('pageSize', String(pageSize.value))

    const res = await apiClient.get<PagedResult<MicroApp>>(`/micro-apps?${params.toString()}`)
    apps.value = res.items
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function openCreate() {
  dialogMode.value = 'create'
  form.value = {
    name: '',
    url: '',
    icon: '',
    layout: 'default',
    activateRule: '',
    permissions: [],
    status: 'active',
    sort: 0,
    remark: '',
  }
  dialogVisible.value = true
}

function openEdit(app: MicroApp) {
  dialogMode.value = 'edit'
  editingId.value = app.id
  form.value = {
    name: app.name,
    url: app.url,
    icon: app.icon || '',
    layout: app.layout || 'default',
    activateRule: app.activateRule || '',
    permissions: [...(app.permissions || [])],
    status: app.status || 'active',
    sort: app.sort ?? 0,
    remark: app.remark || '',
  }
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!form.value.name.trim()) {
    MessagePlugin.warning('请输入应用名称')
    return
  }
  if (!form.value.url.trim()) {
    MessagePlugin.warning('请输入应用 URL')
    return
  }

  if (dialogMode.value === 'create') {
    await apiClient.post('/micro-apps', form.value)
    MessagePlugin.success('微应用创建成功')
  } else {
    await apiClient.put(`/micro-apps/${editingId.value}`, form.value)
    MessagePlugin.success('微应用更新成功')
  }
  dialogVisible.value = false
  fetchApps()
}

async function handleDelete(app: MicroApp) {
  const confirmDia = DialogPlugin.confirm({
    header: '删除确认',
    body: `确认删除微应用「${app.name}」？关联的菜单配置将失效。`,
    confirmBtn: '删除',
    cancelBtn: '取消',
    onConfirm: async () => {
      await apiClient.delete(`/micro-apps/${app.id}`)
      MessagePlugin.success('微应用已删除')
      fetchApps()
      confirmDia.destroy()
    },
    onClose: () => {
      confirmDia.destroy()
    },
  })
}

async function handleToggleStatus(app: MicroApp) {
  const newStatus = app.status === 'active' ? 'inactive' : 'active'
  await apiClient.put(`/micro-apps/${app.id}`, { status: newStatus })
  MessagePlugin.success(`微应用已${newStatus === 'active' ? '启用' : '停用'}`)
  fetchApps()
}

function handlePageChange(p: number) {
  page.value = p
  fetchApps()
}

function handleSizeChange(size: number) {
  pageSize.value = size
  page.value = 1
  fetchApps()
}

function handleSearch() {
  page.value = 1
  fetchApps()
}

onMounted(fetchApps)
</script>

<template>
  <div :class="$style.wrapper">
    <div :class="$style.toolbar">
      <div :class="$style.toolbarLeft">
        <t-input
          v-model="searchQuery"
          placeholder="搜索应用名称"
          :prefix-icon="SearchIcon"
          clearable
          :style="{ width: '240px' }"
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        />
        <t-select v-model:value="statusFilter" placeholder="状态" clearable :style="{ width: '100px' }" @change="handleSearch">
          <t-option label="启用" value="active" />
          <t-option label="停用" value="inactive" />
        </t-select>
      </div>
      <t-button theme="primary" :icon="AddIcon" @click="openCreate">新增微应用</t-button>
    </div>

    <t-table :data="apps" :loading="loading" :class="$style.table">
      <t-col prop="name" label="应用名称" :min-width="120" />
      <t-col prop="url" label="应用 URL" :min-width="200" />
      <t-col label="布局方式" :width="100" align="center">
        <template #cell="{ row }">
          <t-tag size="small" :theme="row.layout === 'iframe' ? 'warning' : row.layout === 'blank' ? 'default' : 'primary'">
            {{ row.layout === 'default' ? '默认' : row.layout === 'blank' ? '空白' : 'iframe' }}
          </t-tag>
        </template>
      </t-col>
      <t-col prop="activateRule" label="激活规则" :min-width="160" />
      <t-col label="状态" :width="80" align="center">
        <template #cell="{ row }">
          <t-switch
            :value="row.status === 'active'"
            size="small"
            @change="handleToggleStatus(row)"
          />
        </template>
      </t-col>
      <t-col prop="sort" label="排序" :width="70" align="center" />
      <t-col prop="remark" label="备注" :min-width="140" />
      <t-col label="操作" :width="140" fixed="right">
        <template #cell="{ row }">
          <div :class="$style.actions">
            <t-button variant="text" size="small" @click="openEdit(row)">编辑</t-button>
            <t-button variant="text" size="small" theme="danger" @click="handleDelete(row)">删除</t-button>
          </div>
        </template>
      </t-col>
    </t-table>

    <div :class="$style.pagination">
      <t-pagination
        v-model:current="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-size-options="[10, 20, 50]"
        show-total
        show-page-size
        @current-change="handlePageChange"
        @page-size-change="handleSizeChange"
      />
    </div>
  </div>

  <!-- Create/Edit Dialog -->
  <t-dialog
    v-model:visible="dialogVisible"
    :header="dialogMode === 'create' ? '新增微应用' : '编辑微应用'"
    width="580px"
    destroy-on-close
  >
    <t-form label-width="100px">
      <t-form-item label="应用名称">
        <t-input v-model:value="form.name" placeholder="请输入应用名称（如：表单编辑器）" />
      </t-form-item>
      <t-form-item label="应用 URL">
        <t-input v-model:value="form.url" placeholder="如：http://localhost:5100/editor/" />
      </t-form-item>
      <t-form-item label="图标">
        <t-input v-model:value="form.icon" placeholder="图标名称或 URL（可选）" />
      </t-form-item>
      <t-form-item label="布局方式">
        <t-radio-group v-model:value="form.layout">
          <t-radio v-for="opt in layoutOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </t-radio>
        </t-radio-group>
        <div :class="$style.layoutDesc">
          {{ layoutOptions.find(o => o.value === form.layout)?.description }}
        </div>
      </t-form-item>
      <t-form-item label="激活规则">
        <t-input v-model:value="form.activateRule" placeholder="URL 匹配规则，如：^/editor/" />
      </t-form-item>
      <t-form-item label="所需权限">
        <t-input v-model:value="form.permissions" placeholder="权限编码，多个用逗号分隔（可选）" />
      </t-form-item>
      <t-form-item label="排序">
        <t-input-number v-model:value="form.sort" :min="0" :max="9999" />
      </t-form-item>
      <t-form-item label="状态">
        <t-select v-model:value="form.status" :style="{ width: '100%' }">
          <t-option label="启用" value="active" />
          <t-option label="停用" value="inactive" />
        </t-select>
      </t-form-item>
      <t-form-item label="备注">
        <t-input v-model:value="form.remark" type="textarea" :rows="2" placeholder="备注信息（可选）" />
      </t-form-item>
    </t-form>
    <template #footer>
      <t-button @click="dialogVisible = false">取消</t-button>
      <t-button theme="primary" @click="handleSubmit">确定</t-button>
    </template>
  </t-dialog>
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
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.layoutDesc {
  font-size: 12px;
  color: var(--td-text-color-placeholder);
  margin-top: 4px;
}
</style>
