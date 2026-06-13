<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiClient } from '@/utils/apiClient'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import { AddIcon, SearchIcon } from 'tdesign-icons-vue-next'

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

const permissions = ref<Permission[]>([])
const permTree = ref<PermTreeNode[]>([])

const deptTree = ref<Dept[]>([])

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

function buildPermTree(perms: Permission[]): PermTreeNode[] {
  const grouped = new Map<string, Permission[]>()
  for (const p of perms) {
    const list = grouped.get(p.module) || []
    list.push(p)
    grouped.set(p.module, list)
  }

  const moduleLabels: Record<string, string> = {
    flow: '流程管理',
    workflow: '工作流管理',
    schema: '表单管理',
    system: '系统管理',
    microapp: '微应用管理',
    webhook: 'Webhook 管理',
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
    MessagePlugin.warning('请输入角色名称')
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
    MessagePlugin.success('角色创建成功')
  } else {
    await apiClient.put(`/roles/${editingId.value}`, payload)
    MessagePlugin.success('角色更新成功')
  }
  dialogVisible.value = false
  fetchRoles()
}

async function handleDelete(role: Role) {
  const confirmDia = DialogPlugin.confirm({
    header: '删除确认',
    body: `确认删除角色「${role.name}」？删除后该角色下的用户将失去此角色。`,
    confirmBtn: '删除',
    cancelBtn: '取消',
    onConfirm: async () => {
      await apiClient.delete(`/roles/${role.id}`)
      MessagePlugin.success('角色已删除')
      fetchRoles()
      confirmDia.destroy()
    },
    onClose: () => {
      confirmDia.destroy()
    },
  })
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

function handlePermCheck(value: string[]) {
  form.value.permissions = value.filter(k => !k.startsWith('module:'))
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
  <div :class="$style.wrapper">
    <div :class="$style.toolbar">
      <t-input
        v-model="searchQuery"
        placeholder="搜索角色名称或描述"
        :prefix-icon="SearchIcon"
        clearable
        :class="$style.search"
        @clear="fetchRoles"
        @keyup.enter="fetchRoles"
      />
      <t-button theme="primary" :icon="AddIcon" @click="openCreate">
        新增角色
      </t-button>
    </div>

    <t-table :data="roles" :loading="loading" :class="$style.table">
      <t-col prop="name" label="角色名称" :min-width="120" />
      <t-col prop="description" label="描述" :min-width="160" />
      <t-col label="数据范围" :width="120">
        <template #cell="{ row }">
          <t-tag size="small">{{ getDataScopeLabel(row.data_scope) }}</t-tag>
        </template>
      </t-col>
      <t-col label="权限数" :width="80">
        <template #cell="{ row }">
          <span>{{ getPermCount(row) }}</span>
        </template>
      </t-col>
      <t-col label="操作" :width="220" fixed="right">
        <template #cell="{ row }">
          <div :class="$style.actions">
            <t-button variant="text" size="small" @click="openMembers(row)">查看成员</t-button>
            <t-button variant="text" size="small" @click="openEdit(row)">编辑</t-button>
            <t-button variant="text" size="small" theme="danger" @click="handleDelete(row)">删除</t-button>
          </div>
        </template>
      </t-col>
    </t-table>
  </div>

  <!-- Create/Edit Dialog -->
  <t-dialog
    v-model:visible="dialogVisible"
    :header="dialogMode === 'create' ? '新增角色' : '编辑角色'"
    width="600px"
    destroy-on-close
  >
    <t-form label-width="80px">
      <t-form-item label="角色名称">
        <t-input v-model:value="form.name" placeholder="请输入角色名称（如：管理员、部门经理）" />
      </t-form-item>
      <t-form-item label="描述">
        <t-input v-model:value="form.description" type="textarea" :rows="2" placeholder="角色描述（可选）" />
      </t-form-item>
      <t-form-item label="数据范围">
        <t-select v-model:value="form.data_scope" :style="{ width: '100%' }">
          <t-option
            v-for="opt in dataScopeOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </t-select>
      </t-form-item>
      <t-form-item v-if="form.data_scope === 'custom'" label="自定义部门">
        <t-tree-select
          v-model="form.dept_ids"
          :data="deptTree"
          :keys="{ label: 'name', children: 'children', value: 'id' }"
          placeholder="选择部门"
          multiple
          check-strictly
          :style="{ width: '100%' }"
        />
      </t-form-item>
      <t-form-item label="权限配置">
        <div :class="$style.permTreeWrapper">
          <t-tree
            :data="permTree"
            :keys="{ label: 'label', children: 'children', value: 'id' }"
            :default-expanded="permTree.map(n => n.id)"
            checkable
            :value="form.permissions"
            @change="handlePermCheck"
          />
        </div>
      </t-form-item>
    </t-form>
    <template #footer>
      <t-button @click="dialogVisible = false">取消</t-button>
      <t-button theme="primary" @click="handleSubmit">确定</t-button>
    </template>
  </t-dialog>

  <!-- Members Dialog -->
  <t-dialog
    v-model:visible="membersVisible"
    :header="`角色成员 - ${currentRole?.name || ''}`"
    width="500px"
    destroy-on-close
  >
    <t-table :data="members" :loading="membersLoading" :class="$style.membersTable" empty="暂无成员">
      <t-col prop="username" label="用户名" :min-width="120" />
      <t-col prop="displayName" label="显示名" :min-width="120" />
    </t-table>
    <div v-if="!membersLoading && members.length === 0" :class="$style.emptyMembers">
      暂无成员
    </div>
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
  border: 1px solid var(--td-border-level-2-color);
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
  color: var(--td-text-color-placeholder);
  font-size: 14px;
}
</style>
