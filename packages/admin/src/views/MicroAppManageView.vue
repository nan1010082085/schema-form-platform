<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiClient } from '@/utils/apiClient'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus } from '@element-plus/icons-vue'

interface MicroApp {
  id: string
  name: string
  url: string
  icon: string
  layout: 'with-menu' | 'without-menu'
  activeRule: string
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
  layout: 'with-menu' as 'with-menu' | 'without-menu',
  activeRule: '',
  permissions: [] as string[],
  status: 'active' as 'active' | 'inactive',
  sort: 0,
  remark: '',
})
const editingId = ref('')
const permissionsInput = ref('')

const layoutOptions = [
  { value: 'with-menu', label: '带菜单布局', description: '使用主应用的导航和侧边栏' },
  { value: 'without-menu', label: '无菜单布局', description: '无导航，适合独立页面' },
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
    layout: 'with-menu',
    activeRule: '',
    permissions: [],
    status: 'active',
    sort: 0,
    remark: '',
  }
  permissionsInput.value = ''
  dialogVisible.value = true
}

function openEdit(app: MicroApp) {
  dialogMode.value = 'edit'
  editingId.value = app.id
  form.value = {
    name: app.name,
    url: app.url,
    icon: app.icon || '',
    layout: app.layout || 'with-menu',
    activeRule: app.activeRule || '',
    permissions: [...(app.permissions || [])],
    status: app.status || 'active',
    sort: app.sort ?? 0,
    remark: app.remark || '',
  }
  permissionsInput.value = (app.permissions || []).join(', ')
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入应用名称')
    return
  }
  if (!form.value.url.trim()) {
    ElMessage.warning('请输入应用 URL')
    return
  }

  form.value.permissions = permissionsInput.value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  if (dialogMode.value === 'create') {
    await apiClient.post('/micro-apps', form.value)
    ElMessage.success('微应用创建成功')
  } else {
    await apiClient.put(`/micro-apps/${editingId.value}`, form.value)
    ElMessage.success('微应用更新成功')
  }
  dialogVisible.value = false
  fetchApps()
}

async function handleDelete(app: MicroApp) {
  try {
    await ElMessageBox.confirm(
      `确认删除微应用「${app.name}」？关联的菜单配置将失效。`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
    )
    await apiClient.delete(`/micro-apps/${app.id}`)
    ElMessage.success('微应用已删除')
    fetchApps()
  } catch {
    // 用户取消，无需处理
  }
}

async function handleToggleStatus(app: MicroApp, val: boolean) {
  const newStatus = val ? 'active' : 'inactive'
  await apiClient.put(`/micro-apps/${app.id}`, { status: newStatus })
  ElMessage.success(`微应用已${newStatus === 'active' ? '启用' : '停用'}`)
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
        <el-input
          v-model="searchQuery"
          placeholder="搜索应用名称"
          :prefix-icon="Search"
          clearable
          style="width: 240px"
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        />
        <el-select v-model="statusFilter" placeholder="状态" clearable style="width: 100px" @change="handleSearch">
          <el-option label="启用" value="active" />
          <el-option label="停用" value="inactive" />
        </el-select>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreate">新增微应用</el-button>
    </div>

    <el-table v-loading="loading" :data="apps" :class="$style.table">
      <el-table-column prop="name" label="应用名称" min-width="120" />
      <el-table-column prop="url" label="应用 URL" min-width="200" />
      <el-table-column label="布局方式" width="100" align="center">
        <template #default="{ row }">
          <el-tag size="small" :type="row.layout === 'without-menu' ? 'info' : 'primary'">
            {{ row.layout === 'with-menu' ? '带菜单' : '无菜单' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="activeRule" label="激活规则" min-width="160" />
      <el-table-column label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-switch
            :model-value="row.status === 'active'"
            size="small"
            @change="(val: boolean) => handleToggleStatus(row, val)"
          />
        </template>
      </el-table-column>
      <el-table-column prop="sort" label="排序" width="70" align="center" />
      <el-table-column prop="remark" label="备注" min-width="140" />
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <div :class="$style.actions">
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <div :class="$style.pagination">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>
  </div>

  <!-- Create/Edit Dialog -->
  <el-dialog
    v-model="dialogVisible"
    :title="dialogMode === 'create' ? '新增微应用' : '编辑微应用'"
    width="580px"
    destroy-on-close
  >
    <el-form label-width="100px">
      <el-form-item label="应用名称">
        <el-input v-model="form.name" placeholder="请输入应用名称（如：表单编辑器）" />
      </el-form-item>
      <el-form-item label="应用 URL">
        <el-input v-model="form.url" placeholder="如：http://localhost:5100/editor/" />
      </el-form-item>
      <el-form-item label="图标">
        <el-input v-model="form.icon" placeholder="图标名称或 URL（可选）" />
      </el-form-item>
      <el-form-item label="布局方式">
        <el-radio-group v-model="form.layout">
          <el-radio v-for="opt in layoutOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </el-radio>
        </el-radio-group>
        <div :class="$style.layoutDesc">
          {{ layoutOptions.find(o => o.value === form.layout)?.description }}
        </div>
      </el-form-item>
      <el-form-item label="激活规则">
        <el-input v-model="form.activeRule" placeholder="URL 匹配规则，如：^/editor/" />
      </el-form-item>
      <el-form-item label="所需权限">
        <el-input v-model="permissionsInput" placeholder="权限编码，多个用逗号分隔（可选）" />
      </el-form-item>
      <el-form-item label="排序">
        <el-input-number v-model="form.sort" :min="0" :max="9999" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="form.status" style="width: 100%">
          <el-option label="启用" value="active" />
          <el-option label="停用" value="inactive" />
        </el-select>
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="备注信息（可选）" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
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
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}
</style>
