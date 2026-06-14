<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { apiClient } from '@/utils/apiClient'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import { AddIcon, SearchIcon } from 'tdesign-icons-vue-next'

// ── Types ──────────────────────────────────────────────
interface Dept {
  id: string
  name: string
  parentId: string | null
  children?: Dept[]
}

interface Role {
  id: string
  name: string
  description?: string
  data_scope: string
}

interface User {
  id: string
  username: string
  displayName: string
  roles: string[]
  deptId: string | null
  email: string | null
  phone: string | null
  avatar: string
  status: string
}

// ── State ───────────────────────────────────────────────
const users = ref<User[]>([])
const roles = ref<Role[]>([])
const roleMap = ref<Record<string, string>>({})
const deptTree = ref<Dept[]>([])
const deptMap = ref<Record<string, string>>({})
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

// filters
const searchQuery = ref('')
const filterDeptId = ref<string>('')
const filterRoleId = ref<string>('')
const filterStatus = ref<string>('')

// dept tree panel
const deptSearch = ref('')
const expandedDeptIds = ref<string[]>([])

// dialogs
const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const form = ref({
  username: '',
  password: '',
  displayName: '',
  roles: [] as string[],
  deptId: null as string | null,
  email: '' as string,
  phone: '' as string,
  avatar: '' as string,
  status: 'active',
})
const editingId = ref('')

const resetPwdVisible = ref(false)
const resetPwdForm = ref({ password: '' })
const resetPwdUserId = ref('')

// ── Dept tree helpers ──────────────────────────────────
function flattenDeptTree(nodes: Dept[]): Dept[] {
  const result: Dept[] = []
  for (const node of nodes) {
    result.push(node)
    if (node.children?.length) {
      result.push(...flattenDeptTree(node.children))
    }
  }
  return result
}

function buildDeptMap(nodes: Dept[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const dept of flattenDeptTree(nodes)) {
    map[dept.id] = dept.name
  }
  return map
}

const filteredDeptTree = computed(() => {
  if (!deptSearch.value) return deptTree.value
  const keyword = deptSearch.value.toLowerCase()
  function filter(nodes: Dept[]): Dept[] {
    const result: Dept[] = []
    for (const node of nodes) {
      const matchedChildren = node.children?.length ? filter(node.children) : []
      if (node.name.toLowerCase().includes(keyword) || matchedChildren.length > 0) {
        result.push({ ...node, children: matchedChildren })
      }
    }
    return result
  }
  return filter(deptTree.value)
})

function selectDept(deptId: string) {
  filterDeptId.value = filterDeptId.value === deptId ? '' : deptId
  page.value = 1
  fetchUsers()
}

function getDeptName(deptId: string | null): string {
  if (!deptId) return ''
  return deptMap.value[deptId] || deptId
}

// ── Data fetching ───────────────────────────────────────
async function fetchDepts() {
  const data = await apiClient.get<Dept[]>('/depts?tree=true')
  deptTree.value = Array.isArray(data) ? data : []
  deptMap.value = buildDeptMap(deptTree.value)
  expandedDeptIds.value = deptTree.value.map(d => d.id)
}

async function fetchRoles() {
  const res = await apiClient.get<{ items: Role[] }>('/roles')
  roles.value = res.items
  roleMap.value = {}
  for (const role of res.items) {
    roleMap.value[role.id] = role.name
  }
}

async function fetchUsers() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (searchQuery.value) params.set('q', searchQuery.value)
    if (filterDeptId.value) params.set('deptId', filterDeptId.value)
    if (filterRoleId.value) params.set('roleId', filterRoleId.value)
    if (filterStatus.value) params.set('status', filterStatus.value)
    params.set('page', String(page.value))
    params.set('pageSize', String(pageSize.value))
    const qs = params.toString()
    const res = await apiClient.get<{ items: User[]; total: number }>(`/users${qs ? `?${qs}` : ''}`)
    users.value = res.items
    total.value = res.total
  } finally {
    loading.value = false
  }
}

// ── Role display ────────────────────────────────────────
function getRoleNames(roleIds: string[]): string[] {
  return roleIds.map(id => roleMap.value[id] || id).filter(Boolean)
}

const dataScopeLabel: Record<string, string> = {
  all: '全部数据',
  dept: '本部门',
  self: '仅本人',
  custom: '自定义',
}

function getRoleScopeDesc(role: Role): string {
  return `${role.name}（${dataScopeLabel[role.data_scope] || role.data_scope}）`
}

const userColumns = [
  { colKey: 'username', title: '用户名', minWidth: 100 },
  { colKey: 'displayName', title: '显示名', minWidth: 100 },
  { colKey: 'email', title: '邮箱', minWidth: 140, cell: (_: any, { row }: any) => row.email || '-' },
  { colKey: 'phone', title: '手机', minWidth: 120, cell: (_: any, { row }: any) => row.phone || '-' },
  { colKey: 'deptId', title: '所属部门', minWidth: 100, cell: (_: any, { row }: any) => getDeptName(row.deptId) || '未分配' },
  { colKey: 'roles', title: '角色', minWidth: 150 },
  { colKey: 'status', title: '状态', width: 80 },
  { colKey: 'actions', title: '操作', width: 220, fixed: 'right' as const },
]

// ── User CRUD ───────────────────────────────────────────
function openCreate() {
  dialogMode.value = 'create'
  form.value = {
    username: '',
    password: '',
    displayName: '',
    roles: [],
    deptId: null,
    email: '',
    phone: '',
    avatar: '',
    status: 'active',
  }
  dialogVisible.value = true
}

function openEdit(user: User) {
  dialogMode.value = 'edit'
  editingId.value = user.id
  form.value = {
    username: user.username,
    password: '',
    displayName: user.displayName,
    roles: [...user.roles],
    deptId: user.deptId,
    email: user.email || '',
    phone: user.phone || '',
    avatar: user.avatar || '',
    status: user.status || 'active',
  }
  dialogVisible.value = true
}

async function handleSubmit() {
  if (dialogMode.value === 'create') {
    if (!form.value.username || !form.value.password || !form.value.displayName) {
      MessagePlugin.warning('请填写完整信息')
      return
    }
    await apiClient.post('/users', {
      username: form.value.username,
      password: form.value.password,
      displayName: form.value.displayName,
      roles: form.value.roles,
      deptId: form.value.deptId,
      email: form.value.email || null,
      phone: form.value.phone || null,
      avatar: form.value.avatar || '',
      status: form.value.status,
    })
    MessagePlugin.success('用户创建成功')
  } else {
    await apiClient.put(`/users/${editingId.value}`, {
      displayName: form.value.displayName,
      roles: form.value.roles,
      deptId: form.value.deptId,
      email: form.value.email || null,
      phone: form.value.phone || null,
      avatar: form.value.avatar || '',
      status: form.value.status,
    })
    MessagePlugin.success('用户更新成功')
  }
  dialogVisible.value = false
  fetchUsers()
}

async function handleDelete(user: User) {
  const confirmDia = DialogPlugin.confirm({
    header: '删除确认',
    body: `确认删除用户「${user.displayName}」？`,
    confirmBtn: '删除',
    cancelBtn: '取消',
    onConfirm: async () => {
      await apiClient.delete(`/users/${user.id}`)
      MessagePlugin.success('用户已删除')
      fetchUsers()
      confirmDia.destroy()
    },
    onClose: () => {
      confirmDia.destroy()
    },
  })
}

function openResetPassword(user: User) {
  resetPwdUserId.value = user.id
  resetPwdForm.value = { password: '' }
  resetPwdVisible.value = true
}

async function handleResetPassword() {
  if (resetPwdForm.value.password.length < 8) {
    MessagePlugin.warning('密码至少 8 个字符')
    return
  }
  await apiClient.put(`/users/${resetPwdUserId.value}/password`, resetPwdForm.value)
  MessagePlugin.success('密码已重置')
  resetPwdVisible.value = false
}

function clearFilters() {
  filterRoleId.value = ''
  filterStatus.value = ''
  filterDeptId.value = ''
  page.value = 1
  fetchUsers()
}

function handlePageChange(newPage: number) {
  page.value = newPage
  fetchUsers()
}

function handleSizeChange(newSize: number) {
  pageSize.value = newSize
  page.value = 1
  fetchUsers()
}

onMounted(async () => {
  await Promise.all([fetchDepts(), fetchRoles()])
  await fetchUsers()
})
</script>

<template>
  <div :class="$style.layout">
    <!-- Left: Dept tree panel -->
    <aside :class="$style.deptPanel">
      <div :class="$style.deptHeader">
        <span :class="$style.deptTitle">部门</span>
      </div>
      <t-input
        v-model:value="deptSearch"
        placeholder="搜索部门"
        clearable
        size="small"
        :prefix-icon="SearchIcon"
        :class="$style.deptSearch"
      />
      <t-tree
        :data="filteredDeptTree"
        :keys="{ label: 'name', children: 'children', value: 'id' }"
        :default-expanded="expandedDeptIds"
        :expand-on-click-node="false"
        activable
        :value="filterDeptId ? [filterDeptId] : []"
        :class="$style.deptTree"
        @click="(node: any) => selectDept(node.value)"
      />
    </aside>

    <!-- Right: User list -->
    <div :class="$style.main">
      <!-- Toolbar -->
      <div :class="$style.toolbar">
        <div :class="$style.filters">
          <t-input
            v-model:value="searchQuery"
            placeholder="搜索用户名或显示名"
            :prefix-icon="SearchIcon"
            clearable
            :class="$style.search"
            @clear="page = 1; fetchUsers()"
            @enter="page = 1; fetchUsers()"
          />
          <t-select v-model:value="filterRoleId" placeholder="角色筛选" clearable :class="$style.filterSelect" @change="page = 1; fetchUsers()">
            <t-option v-for="role in roles" :key="role.id" :label="role.name" :value="role.id" />
          </t-select>
          <t-select v-model:value="filterStatus" placeholder="状态筛选" clearable :class="$style.filterSelect" @change="page = 1; fetchUsers()">
            <t-option label="正常" value="active" />
            <t-option label="停用" value="inactive" />
            <t-option label="禁用" value="disabled" />
          </t-select>
          <t-button variant="text" @click="clearFilters">重置</t-button>
        </div>
        <t-button theme="primary" :icon="AddIcon" @click="openCreate">
          新增用户
        </t-button>
      </div>

      <!-- Active filter tags -->
      <div v-if="filterDeptId" :class="$style.activeFilter">
        <t-tag closable @close="selectDept(filterDeptId)">
          部门: {{ getDeptName(filterDeptId) }}
        </t-tag>
      </div>

      <!-- Table -->
      <t-table
        :data="users"
        :columns="userColumns"
        :loading="loading"
        :class="$style.table"
        empty="暂无数据"
      >
        <template #cell-roles="{ row }">
          <t-tag
            v-for="roleName in getRoleNames(row.roles)"
            :key="roleName"
            size="small"
            :class="$style.roleTag"
          >
            {{ roleName }}
          </t-tag>
          <span v-if="!row.roles || row.roles.length === 0" :class="$style.noRole">未分配</span>
        </template>
        <template #cell-status="{ row }">
          <t-tag :theme="row.status === 'active' ? 'success' : row.status === 'disabled' ? 'danger' : 'warning'" size="small">
            {{ row.status === 'active' ? '正常' : row.status === 'disabled' ? '禁用' : '停用' }}
          </t-tag>
        </template>
        <template #cell-actions="{ row }">
          <div :class="$style.actions">
            <t-button variant="text" size="small" @click="openEdit(row)">编辑</t-button>
            <t-button variant="text" size="small" @click="openResetPassword(row)">重置密码</t-button>
            <t-button variant="text" size="small" theme="danger" @click="handleDelete(row)">删除</t-button>
          </div>
        </template>
      </t-table>

      <!-- Pagination -->
      <div :class="$style.pagination">
        <t-pagination
          v-model:current="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-size-options="[10, 20, 50, 100]"
          show-total
          show-page-size
          @current-change="handlePageChange"
          @page-size-change="handleSizeChange"
        />
      </div>
    </div>
  </div>

  <!-- Create/Edit Dialog -->
  <t-dialog
    v-model:visible="dialogVisible"
    :header="dialogMode === 'create' ? '新增用户' : '编辑用户'"
    width="540px"
    destroy-on-close
  >
    <t-form label-width="80px">
      <t-form-item label="用户名">
        <t-input
          v-model:value="form.username"
          :disabled="dialogMode === 'edit'"
          placeholder="请输入用户名"
        />
      </t-form-item>
      <t-form-item v-if="dialogMode === 'create'" label="密码">
        <t-input v-model:value="form.password" type="password" placeholder="请输入密码（至少8位）" />
      </t-form-item>
      <t-form-item label="显示名">
        <t-input v-model:value="form.displayName" placeholder="请输入显示名" />
      </t-form-item>
      <t-form-item label="邮箱">
        <t-input v-model:value="form.email" placeholder="请输入邮箱地址" />
      </t-form-item>
      <t-form-item label="手机号">
        <t-input v-model:value="form.phone" placeholder="请输入手机号" />
      </t-form-item>
      <t-form-item label="头像URL">
        <t-input v-model:value="form.avatar" placeholder="头像链接地址（可选）" />
      </t-form-item>
      <t-form-item label="所属部门">
        <t-tree-select
          v-model:value="form.deptId"
          :data="deptTree"
          :keys="{ label: 'name', children: 'children', value: 'id' }"
          placeholder="选择部门"
          clearable
          check-strictly
          :style="{ width: '100%' }"
        />
      </t-form-item>
      <t-form-item label="角色">
        <t-select v-model:value="form.roles" multiple placeholder="选择角色" :style="{ width: '100%' }">
          <t-option
            v-for="role in roles"
            :key="role.id"
            :label="getRoleScopeDesc(role)"
            :value="role.id"
          />
        </t-select>
      </t-form-item>
      <t-form-item label="状态">
        <t-select v-model:value="form.status" :style="{ width: '100%' }">
          <t-option label="正常" value="active" />
          <t-option label="停用" value="inactive" />
          <t-option label="禁用" value="disabled" />
        </t-select>
      </t-form-item>
    </t-form>
    <template #footer>
      <t-button @click="dialogVisible = false">取消</t-button>
      <t-button theme="primary" @click="handleSubmit">确定</t-button>
    </template>
  </t-dialog>

  <!-- Reset Password Dialog -->
  <t-dialog v-model:visible="resetPwdVisible" header="重置密码" width="400px" destroy-on-close>
    <t-form label-width="70px">
      <t-form-item label="新密码">
        <t-input v-model:value="resetPwdForm.password" type="password" placeholder="请输入新密码（至少8位）" />
      </t-form-item>
    </t-form>
    <template #footer>
      <t-button @click="resetPwdVisible = false">取消</t-button>
      <t-button theme="primary" @click="handleResetPassword">确定</t-button>
    </template>
  </t-dialog>
</template>

<style module>
.layout {
  display: flex;
  gap: 16px;
  width: 100%;
  min-height: 500px;
  padding: 20px;
}

.deptPanel {
  width: 220px;
  flex-shrink: 0;
  border: 1px solid var(--td-border-level-2-color);
  border-radius: 8px;
  padding: 12px;
  background: var(--td-bg-color-container);
}

.deptHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.deptTitle {
  font-size: 14px;
  font-weight: 600;
  color: var(--td-text-color-primary);
}

.deptSearch {
  margin-bottom: 8px;
}

.deptTree {
  max-height: 400px;
  overflow-y: auto;
}

.deptNode {
  font-size: 13px;
}

.deptNodeActive {
  color: var(--td-brand-color);
  font-weight: 600;
}

.main {
  flex: 1;
  min-width: 0;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 12px;
}

.filters {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  flex: 1;
}

.search {
  width: 200px;
}

.filterSelect {
  width: 140px;
}

.activeFilter {
  margin-bottom: 8px;
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

.roleTag {
  margin-right: 4px;
  margin-bottom: 2px;
}

.noRole {
  color: var(--td-text-color-placeholder);
  font-size: 13px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
