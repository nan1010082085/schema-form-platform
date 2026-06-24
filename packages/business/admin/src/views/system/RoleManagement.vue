<script setup lang="ts">
/**
 * 角色管理 — 表格 + 权限分配弹窗
 */
import { ref, onMounted } from 'vue'
import { loadRoles, loadPermissions, loadMenuTree, createRole, updateRole, deleteRole, type Role, type Permission } from '@/api/adminApi'
import { ElMessage, ElMessageBox } from 'element-plus'

interface MenuNode {
  id: string
  name: string
  permission: string
  type: string
  children?: MenuNode[]
}

const roles = ref<Role[]>([])
const permissions = ref<Permission[]>([])
const menuTree = ref<MenuNode[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const permDialogVisible = ref(false)
const editingRole = ref<Role | null>(null)

const roleForm = ref({
  name: '',
  description: '',
  data_scope: 'all' as string,
  dept_ids: [] as string[],
})

const permForm = ref({
  permissions: [] as string[],
  data_scope: 'all' as string,
  dept_ids: [] as string[],
})

const dataScopeOptions = [
  { label: '全部数据', value: 'all' },
  { label: '本部门数据', value: 'dept' },
  { label: '本部门及以下', value: 'dept' },
  { label: '仅本人数据', value: 'self' },
  { label: '自定义', value: 'custom' },
]

async function loadAllRoles() {
  loading.value = true
  try {
    const data = await loadRoles()
    roles.value = data.items
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '加载角色失败')
  } finally {
    loading.value = false
  }
}

async function loadAllPermissions() {
  try {
    permissions.value = await loadPermissions()
  } catch { /* ignore */ }
}

async function loadAllMenuTree() {
  try {
    menuTree.value = await loadMenuTree()
  } catch { /* ignore */ }
}

// 按模块分组的权限
const groupedPermissions = ref<Record<string, Permission[]>>({})
function groupPermissions() {
  const groups: Record<string, Permission[]> = {}
  for (const p of permissions.value) {
    if (!groups[p.module]) groups[p.module] = []
    groups[p.module].push(p)
  }
  groupedPermissions.value = groups
}

function openCreate() {
  editingRole.value = null
  roleForm.value = { name: '', description: '', data_scope: 'all', dept_ids: [] }
  dialogVisible.value = true
}

function openEdit(role: Role) {
  editingRole.value = role
  roleForm.value = {
    name: role.name,
    description: role.description || '',
    data_scope: role.data_scope,
    dept_ids: [...role.dept_ids],
  }
  dialogVisible.value = true
}

async function handleSave() {
  if (!roleForm.value.name) {
    ElMessage.warning('请输入角色名称')
    return
  }

  try {
    if (editingRole.value) {
      await updateRole(editingRole.value.id, roleForm.value)
      ElMessage.success('更新成功')
    } else {
      await createRole(roleForm.value)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    await loadAllRoles()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  }
}

async function handleDelete(role: Role) {
  try {
    await ElMessageBox.confirm(`确定删除角色 "${role.name}" 吗？关联用户的此角色将被移除。`, '确认删除', { type: 'warning' })
    await deleteRole(role.id)
    ElMessage.success('删除成功')
    await loadAllRoles()
  } catch (e: unknown) {
    if (e !== 'cancel') ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}

// 打开权限分配弹窗
function openPermDialog(role: Role) {
  editingRole.value = role
  permForm.value = {
    permissions: [...role.permissions],
    data_scope: role.data_scope,
    dept_ids: [...role.dept_ids],
  }
  groupPermissions()
  permDialogVisible.value = true
}

async function handleSavePermissions() {
  if (!editingRole.value) return

  try {
    await updateRole(editingRole.value.id, {
      permissions: permForm.value.permissions,
      data_scope: permForm.value.data_scope,
      dept_ids: permForm.value.dept_ids,
    })
    ElMessage.success('权限更新成功')
    permDialogVisible.value = false
    await loadAllRoles()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '更新失败')
  }
}

// 全选/全不选某模块
function toggleModule(moduleName: string) {
  const modulePerms = groupedPermissions.value[moduleName] || []
  const codes = modulePerms.map(p => p.code)
  const allSelected = codes.every(c => permForm.value.permissions.includes(c))

  if (allSelected) {
    permForm.value.permissions = permForm.value.permissions.filter(p => !codes.includes(p))
  } else {
    const toAdd = codes.filter(c => !permForm.value.permissions.includes(c))
    permForm.value.permissions.push(...toAdd)
  }
}

function selectAll() {
  permForm.value.permissions = permissions.value.map(p => p.code)
}

function selectNone() {
  permForm.value.permissions = []
}

onMounted(loadAllRoles)
</script>

<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <h2>角色管理</h2>
      <el-button type="primary" @click="openCreate">+ 新增角色</el-button>
    </div>

    <el-table :data="roles" v-loading="loading" stripe>
      <el-table-column prop="name" label="角色名称" width="150" />
      <el-table-column prop="description" label="描述" width="250" />
      <el-table-column label="权限数" width="100">
        <template #default="{ row }">
          <el-tag size="small">{{ row.permissions.length }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="data_scope" label="数据范围" width="120">
        <template #default="{ row }">
          <el-tag size="small" :type="row.data_scope === 'all' ? 'success' : 'info'">
            {{ row.data_scope === 'all' ? '全部' : row.data_scope === 'dept' ? '本部门' : row.data_scope === 'self' ? '仅本人' : '自定义' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="170">
        <template #default="{ row }">
          {{ row.createdAt?.slice(0, 19).replace('T', ' ') }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="250" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openPermDialog(row)">分配权限</el-button>
          <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editingRole ? '编辑角色' : '新增角色'" width="400px">
      <el-form :model="roleForm" label-width="80px">
        <el-form-item label="角色名称" required>
          <el-input v-model="roleForm.name" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="roleForm.description" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">确定</el-button>
      </template>
    </el-dialog>

    <!-- 权限分配弹窗 -->
    <el-dialog v-model="permDialogVisible" :title="`分配权限: ${editingRole?.name}`" width="600px">
      <div :class="$style.permToolbar">
        <el-button size="small" @click="selectAll">全选</el-button>
        <el-button size="small" @click="selectNone">全不选</el-button>
        <span :class="$style.permCount">已选 {{ permForm.permissions.length }} 项</span>
      </div>

      <el-scrollbar max-height="400px">
        <div v-for="(modulePerms, moduleName) in groupedPermissions" :key="moduleName" :class="$style.permGroup">
          <div :class="$style.permGroupHeader">
            <el-checkbox
              :model-value="modulePerms.every(p => permForm.permissions.includes(p.code))"
              :indeterminate="modulePerms.some(p => permForm.permissions.includes(p.code)) && !modulePerms.every(p => permForm.permissions.includes(p.code))"
              @change="toggleModule(moduleName as string)"
            >
              <strong>{{ moduleName }}</strong>
            </el-checkbox>
          </div>
          <div :class="$style.permItems">
            <el-checkbox
              v-for="perm in modulePerms"
              :key="perm.code"
              v-model="permForm.permissions"
              :value="perm.code"
            >
              {{ perm.name }}
            </el-checkbox>
          </div>
        </div>
      </el-scrollbar>

      <el-divider />

      <el-form label-width="80px" size="small">
        <el-form-item label="数据权限">
          <el-select v-model="permForm.data_scope">
            <el-option v-for="opt in dataScopeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="permDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSavePermissions">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style module>
.container {
  padding: 16px;
  background: var(--bg-color-page);
  height: 100%;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.permToolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}

.permCount {
  margin-left: auto;
  font-size: 13px;
  color: var(--text-color-secondary);
}

.permGroup {
  margin-bottom: 16px;
}

.permGroupHeader {
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border-color-lighter);
}

.permItems {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding-left: 24px;
}
</style>
