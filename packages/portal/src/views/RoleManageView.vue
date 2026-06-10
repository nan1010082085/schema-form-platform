<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiClient } from '@/utils/apiClient'
import SubPageLayout from '@/components/SubPageLayout.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'

interface Role {
  id: string
  name: string
  description?: string
  permissions: string[]
  data_scope: string
  dept_ids: string[]
}

interface User {
  id: string
  username: string
  displayName: string
}

interface Permission {
  id: string
  code: string
  name: string
  module: string
  description?: string
}

interface Dept {
  id: string
  name: string
  parentId: string | null
  children?: Dept[]
}

// ── Permission tree node for el-tree ──
interface PermTreeNode {
  id: string
  label: string
  children?: PermTreeNode[]
}

const roles = ref<Role[]>([])
const loading = ref(false)
const searchQuery = ref('')

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const form = ref({
  name: '',
  description: '',
  permissions: [] as string[],
  data_scope: 'all' as string,
  dept_ids: [] as string[],
})
const editingId = ref('')

// 权限树数据
const permissions = ref<Permission[]>([])
const permTree = ref<PermTreeNode[]>([])
const permTreeRef = ref<InstanceType<typeof import('element-plus')['ElTree']> | null>(null)

// 部门树数据（用于 custom 数据范围选择）
const deptTree = ref<Dept[]>([])

// 成员弹窗
const membersVisible = ref(false)
const currentRole = ref<Role | null>(null)
const members = ref<User[]>([])
const membersLoading = ref(false)

const dataScopeOptions = [
  { value: 'all', label: '全部数据' },
  { value: 'dept', label: '本部门数据' },
  { value: 'self', label: '仅本人数据' },
  { value: 'custom', label: '自定义部门' },
]

// 构建权限树
function buildPermTree(perms: Permission[]): PermTreeNode[] {
  const grouped = new Map<string, Permission[]>()
  for (const p of perms) {
    const list = grouped.get(p.module) || []
    list.push(p)
    grouped.set(p.module, list)
  }

  const moduleLabels: Record<string, string> = {
    flow: '流程管理',
    schema: '表单管理',
    system: '系统管理',
  }

  const result: PermTreeNode[] = []
  for (const [module, items] of grouped) {
    result.push({
      id: `module:${module}`,
      label: moduleLabels[module] || module,
      children: items.map(p => ({
        id: p.code,
        label: `${p.name}（${p.code}）`,
      })),
    })
  }
  return result
}

async function fetchRoles() {
  loading.value = true
  try {
    const params = searchQuery.value ? `?q=${encodeURIComponent(searchQuery.value)}` : ''
    const res = await apiClient.get<{ items: Role[] }>(`/roles${params}`)
    roles.value = res.items
  } finally {
    loading.value = false
  }
}

async function fetchPermissions() {
  const data = await apiClient.get<Permission[]>('/roles/permissions')
  permissions.value = Array.isArray(data) ? data : []
  permTree.value = buildPermTree(permissions.value)
}

async function fetchDeptTree() {
  const data = await apiClient.get<Dept[]>('/depts?tree=true')
  deptTree.value = Array.isArray(data) ? data : []
}

function openCreate() {
  dialogMode.value = 'create'
  form.value = { name: '', description: '', permissions: [], data_scope: 'all', dept_ids: [] }
  dialogVisible.value = true
}

function openEdit(role: Role) {
  dialogMode.value = 'edit'
  editingId.value = role.id
  form.value = {
    name: role.name,
    description: role.description || '',
    permissions: [...(role.permissions || [])],
    data_scope: role.data_scope || 'all',
    dept_ids: [...(role.dept_ids || [])],
  }
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入角色名称')
    return
  }

  const payload = {
    name: form.value.name,
    description: form.value.description,
    permissions: form.value.permissions,
    data_scope: form.value.data_scope,
    dept_ids: form.value.data_scope === 'custom' ? form.value.dept_ids : [],
  }

  if (dialogMode.value === 'create') {
    await apiClient.post('/roles', payload)
    ElMessage.success('角色创建成功')
  } else {
    await apiClient.put(`/roles/${editingId.value}`, payload)
    ElMessage.success('角色更新成功')
  }
  dialogVisible.value = false
  fetchRoles()
}

async function handleDelete(role: Role) {
  await ElMessageBox.confirm(`确认删除角色「${role.name}」？删除后该角色下的用户将失去此角色。`, '删除确认', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  })
  await apiClient.delete(`/roles/${role.id}`)
  ElMessage.success('角色已删除')
  fetchRoles()
}

async function openMembers(role: Role) {
  currentRole.value = role
  membersVisible.value = true
  membersLoading.value = true
  try {
    const res = await apiClient.get<User[]>(`/roles/${role.id}/users`)
    members.value = res
  } finally {
    membersLoading.value = false
  }
}

function handlePermCheck() {
  if (!permTreeRef.value) return
  // 获取所有选中的叶子节点（排除半选的父节点）
  const checkedKeys = permTreeRef.value.getCheckedKeys(false) as string[]
  // 过滤掉模块节点（module:xxx）
  form.value.permissions = checkedKeys.filter(k => !k.startsWith('module:'))
}

function getPermCount(role: Role): number {
  return role.permissions?.length ?? 0
}

function getDataScopeLabel(scope: string): string {
  const opt = dataScopeOptions.find(o => o.value === scope)
  return opt?.label || scope
}

onMounted(async () => {
  await Promise.all([fetchPermissions(), fetchDeptTree()])
  await fetchRoles()
})
</script>

<template>
  <SubPageLayout title="角色管理">
    <div :class="$style.wrapper">
      <div :class="$style.toolbar">
        <el-input
          v-model="searchQuery"
          placeholder="搜索角色名称或描述"
          :prefix-icon="Search"
          clearable
          :class="$style.search"
          @clear="fetchRoles"
          @keyup.enter="fetchRoles"
        />
        <el-button type="primary" :icon="Plus" @click="openCreate">
          新增角色
        </el-button>
      </div>

      <el-table :data="roles" v-loading="loading" :class="$style.table">
        <el-table-column prop="name" label="角色名称" min-width="120" />
        <el-table-column prop="description" label="描述" min-width="160" />
        <el-table-column label="数据范围" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ getDataScopeLabel(row.data_scope) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="权限数" width="80">
          <template #default="{ row }">
            <span>{{ getPermCount(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <div :class="$style.actions">
              <el-button text size="small" @click="openMembers(row)">查看成员</el-button>
              <el-button text size="small" @click="openEdit(row)">编辑</el-button>
              <el-button text size="small" type="danger" @click="handleDelete(row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Create/Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增角色' : '编辑角色'"
      width="600px"
      destroy-on-close
    >
      <el-form label-width="80px">
        <el-form-item label="角色名称">
          <el-input v-model="form.name" placeholder="请输入角色名称（如：管理员、部门经理）" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="角色描述（可选）" />
        </el-form-item>
        <el-form-item label="数据范围">
          <el-select v-model="form.data_scope" style="width: 100%">
            <el-option
              v-for="opt in dataScopeOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.data_scope === 'custom'" label="自定义部门">
          <el-tree-select
            v-model="form.dept_ids"
            :data="deptTree"
            :props="{ label: 'name', children: 'children', value: 'id' }"
            placeholder="选择部门"
            multiple
            check-strictly
            :render-after-expand="false"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="权限配置">
          <div :class="$style.permTreeWrapper">
            <el-tree
              ref="permTreeRef"
              :data="permTree"
              node-key="id"
              show-checkbox
              :default-checked-keys="form.permissions"
              :props="{ label: 'label', children: 'children' }"
              :default-expand-all="true"
              @check="handlePermCheck"
            />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- Members Dialog -->
    <el-dialog
      v-model="membersVisible"
      :title="`角色成员 - ${currentRole?.name || ''}`"
      width="500px"
      destroy-on-close
    >
      <el-table :data="members" v-loading="membersLoading" :class="$style.membersTable" empty-text="暂无成员">
        <el-table-column prop="username" label="用户名" min-width="120" />
        <el-table-column prop="displayName" label="显示名" min-width="120" />
      </el-table>
      <div v-if="!membersLoading && members.length === 0" :class="$style.emptyMembers">
        暂无成员
      </div>
    </el-dialog>
  </SubPageLayout>
</template>

<style module>
.wrapper {
  width: 100%;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.search {
  width: 280px;
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

.permTreeWrapper {
  width: 100%;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 8px;
}

.membersTable {
  border-radius: 8px;
  overflow: hidden;
}

.emptyMembers {
  text-align: center;
  padding: 24px;
  color: var(--el-text-color-placeholder);
  font-size: 14px;
}
</style>
