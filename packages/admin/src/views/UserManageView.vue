<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { apiClient } from '@/utils/apiClient'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'

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
      ElMessage.warning('请填写完整信息')
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
    ElMessage.success('用户创建成功')
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
    ElMessage.success('用户更新成功')
  }
  dialogVisible.value = false
  fetchUsers()
}

async function handleDelete(user: User) {
  await ElMessageBox.confirm(`确认删除用户「${user.displayName}」？`, '删除确认', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  })
  await apiClient.delete(`/users/${user.id}`)
  ElMessage.success('用户已删除')
  fetchUsers()
}

function openResetPassword(user: User) {
  resetPwdUserId.value = user.id
  resetPwdForm.value = { password: '' }
  resetPwdVisible.value = true
}

async function handleResetPassword() {
  if (resetPwdForm.value.password.length < 8) {
    ElMessage.warning('密码至少 8 个字符')
    return
  }
  await apiClient.put(`/users/${resetPwdUserId.value}/password`, resetPwdForm.value)
  ElMessage.success('密码已重置')
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
      <el-input
        v-model="deptSearch"
        placeholder="搜索部门"
        clearable
        size="small"
        :prefix-icon="Search"
        :class="$style.deptSearch"
      />
      <el-tree
        :data="filteredDeptTree"
        node-key="id"
        :props="{ label: 'name', children: 'children' }"
        :default-expanded-keys="expandedDeptIds"
        :expand-on-click-node="false"
        highlight-current
        :current-node-key="filterDeptId"
        :class="$style.deptTree"
        @node-click="(data: Dept) => selectDept(data.id)"
      >
        <template #default="{ data }">
          <span :class="[$style.deptNode, filterDeptId === data.id && $style.deptNodeActive]">
            {{ data.name }}
          </span>
        </template>
      </el-tree>
    </aside>

    <!-- Right: User list -->
    <div :class="$style.main">
      <!-- Toolbar -->
      <div :class="$style.toolbar">
        <div :class="$style.filters">
          <el-input
            v-model="searchQuery"
            placeholder="搜索用户名或显示名"
            :prefix-icon="Search"
            clearable
            :class="$style.search"
            @clear="page = 1; fetchUsers()"
            @keyup.enter="page = 1; fetchUsers()"
          />
          <el-select v-model="filterRoleId" placeholder="角色筛选" clearable :class="$style.filterSelect" @change="page = 1; fetchUsers()">
            <el-option v-for="role in roles" :key="role.id" :label="role.name" :value="role.id" />
          </el-select>
          <el-select v-model="filterStatus" placeholder="状态筛选" clearable :class="$style.filterSelect" @change="page = 1; fetchUsers()">
            <el-option label="正常" value="active" />
            <el-option label="停用" value="inactive" />
            <el-option label="禁用" value="disabled" />
          </el-select>
          <el-button text @click="clearFilters">重置</el-button>
        </div>
        <el-button type="primary" :icon="Plus" @click="openCreate">
          新增用户
        </el-button>
      </div>

      <!-- Active filter tags -->
      <div v-if="filterDeptId" :class="$style.activeFilter">
        <el-tag closable @close="selectDept(filterDeptId)">
          部门: {{ getDeptName(filterDeptId) }}
        </el-tag>
      </div>

      <!-- Table -->
      <el-table :data="users" v-loading="loading" :class="$style.table" empty-text="暂无数据">
        <el-table-column prop="username" label="用户名" min-width="100" />
        <el-table-column prop="displayName" label="显示名" min-width="100" />
        <el-table-column label="邮箱" min-width="140">
          <template #default="{ row }">
            <span>{{ row.email || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="手机" min-width="120">
          <template #default="{ row }">
            <span>{{ row.phone || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="所属部门" min-width="100">
          <template #default="{ row }">
            <span>{{ getDeptName(row.deptId) || '未分配' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="角色" min-width="150">
          <template #default="{ row }">
            <el-tag
              v-for="roleName in getRoleNames(row.roles)"
              :key="roleName"
              size="small"
              :class="$style.roleTag"
              disable-transitions
            >
              {{ roleName }}
            </el-tag>
            <span v-if="!row.roles || row.roles.length === 0" :class="$style.noRole">未分配</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : row.status === 'disabled' ? 'danger' : 'info'" size="small">
              {{ row.status === 'active' ? '正常' : row.status === 'disabled' ? '禁用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <div :class="$style.actions">
              <el-button text size="small" @click="openEdit(row)">编辑</el-button>
              <el-button text size="small" @click="openResetPassword(row)">重置密码</el-button>
              <el-button text size="small" type="danger" @click="handleDelete(row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div :class="$style.pagination">
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
    </div>
  </div>

  <!-- Create/Edit Dialog -->
  <el-dialog
    v-model="dialogVisible"
    :title="dialogMode === 'create' ? '新增用户' : '编辑用户'"
    width="540px"
    destroy-on-close
  >
    <el-form label-width="80px">
      <el-form-item label="用户名">
        <el-input
          v-model="form.username"
          :disabled="dialogMode === 'edit'"
          placeholder="请输入用户名"
        />
      </el-form-item>
      <el-form-item v-if="dialogMode === 'create'" label="密码">
        <el-input v-model="form.password" type="password" show-password placeholder="请输入密码（至少8位）" />
      </el-form-item>
      <el-form-item label="显示名">
        <el-input v-model="form.displayName" placeholder="请输入显示名" />
      </el-form-item>
      <el-form-item label="邮箱">
        <el-input v-model="form.email" placeholder="请输入邮箱地址" />
      </el-form-item>
      <el-form-item label="手机号">
        <el-input v-model="form.phone" placeholder="请输入手机号" />
      </el-form-item>
      <el-form-item label="头像URL">
        <el-input v-model="form.avatar" placeholder="头像链接地址（可选）" />
      </el-form-item>
      <el-form-item label="所属部门">
        <el-tree-select
          v-model="form.deptId"
          :data="deptTree"
          :props="{ label: 'name', children: 'children', value: 'id' }"
          placeholder="选择部门"
          clearable
          check-strictly
          :render-after-expand="false"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="角色">
        <el-select v-model="form.roles" multiple placeholder="选择角色" style="width: 100%">
          <el-option
            v-for="role in roles"
            :key="role.id"
            :label="getRoleScopeDesc(role)"
            :value="role.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="form.status" style="width: 100%">
          <el-option label="正常" value="active" />
          <el-option label="停用" value="inactive" />
          <el-option label="禁用" value="disabled" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>

  <!-- Reset Password Dialog -->
  <el-dialog v-model="resetPwdVisible" title="重置密码" width="400px" destroy-on-close>
    <el-form label-width="70px">
      <el-form-item label="新密码">
        <el-input v-model="resetPwdForm.password" type="password" show-password placeholder="请输入新密码（至少8位）" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="resetPwdVisible = false">取消</el-button>
      <el-button type="primary" @click="handleResetPassword">确定</el-button>
    </template>
  </el-dialog>
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
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 12px;
  background: var(--el-bg-color);
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
  color: var(--el-text-color-primary);
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
  color: var(--el-color-primary);
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
  color: var(--el-text-color-placeholder);
  font-size: 13px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
