<script setup lang="ts">
/**
 * 用户管理 — 表格 + 弹窗
 */
import { ref, onMounted } from 'vue'
import { apiClient } from '@schema-form/platform-shared/utils/apiClient'
import { ElMessage, ElMessageBox } from 'element-plus'

interface User {
  id: string
  username: string
  displayName: string
  email: string | null
  phone: string | null
  avatar: string
  status: string
  roles: string[]
  deptId: string | null
  createdAt: string
}

interface Role {
  id: string
  name: string
}

const users = ref<User[]>([])
const roles = ref<Role[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const searchQuery = ref('')
const statusFilter = ref('')
const dialogVisible = ref(false)
const editingUser = ref<Partial<User> | null>(null)
const dialogTitle = ref('新增用户')

const userForm = ref({
  username: '',
  displayName: '',
  password: '',
  email: '',
  phone: '',
  roles: [] as string[],
  status: 'active',
})

async function loadUsers() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    params.set('page', String(page.value))
    params.set('pageSize', String(pageSize.value))
    if (searchQuery.value) params.set('q', searchQuery.value)
    if (statusFilter.value) params.set('status', statusFilter.value)

    const data = await apiClient.get<{ items: User[]; total: number }>(`/users?${params}`)
    users.value = data.items
    total.value = data.total
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '加载用户失败')
  } finally {
    loading.value = false
  }
}

async function loadRoles() {
  try {
    const data = await apiClient.get<{ items: Role[] }>('/roles')
    roles.value = data.items
  } catch { /* ignore */ }
}

function openCreate() {
  editingUser.value = null
  dialogTitle.value = '新增用户'
  userForm.value = {
    username: '',
    displayName: '',
    password: '',
    email: '',
    phone: '',
    roles: [],
    status: 'active',
  }
  dialogVisible.value = true
}

function openEdit(user: User) {
  editingUser.value = user
  dialogTitle.value = '编辑用户'
  userForm.value = {
    username: user.username,
    displayName: user.displayName,
    password: '',
    email: user.email || '',
    phone: user.phone || '',
    roles: [...user.roles],
    status: user.status,
  }
  dialogVisible.value = true
}

async function handleSave() {
  if (!userForm.value.username || !userForm.value.displayName) {
    ElMessage.warning('请填写必填字段')
    return
  }

  try {
    if (editingUser.value) {
      const updateData: Record<string, unknown> = {
        displayName: userForm.value.displayName,
        email: userForm.value.email || null,
        phone: userForm.value.phone || null,
        roles: userForm.value.roles,
        status: userForm.value.status,
      }
      await apiClient.put(`/users/${editingUser.value.id}`, updateData)
      ElMessage.success('更新成功')
    } else {
      if (!userForm.value.password) {
        ElMessage.warning('请输入密码')
        return
      }
      await apiClient.post('/users', userForm.value)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    await loadUsers()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  }
}

async function handleDelete(user: User) {
  try {
    await ElMessageBox.confirm(`确定删除用户 "${user.displayName}" 吗？`, '确认删除', { type: 'warning' })
    await apiClient.delete(`/users/${user.id}`)
    ElMessage.success('删除成功')
    await loadUsers()
  } catch (e: unknown) {
    if (e !== 'cancel') ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}

async function handleResetPassword(user: User) {
  try {
    await ElMessageBox.confirm(`确定重置用户 "${user.displayName}" 的密码为 Temp123456 吗？`, '重置密码', { type: 'warning' })
    await apiClient.put(`/users/${user.id}/password`, { password: 'Temp123456' })
    ElMessage.success('密码已重置为 Temp123456')
  } catch (e: unknown) {
    if (e !== 'cancel') ElMessage.error(e instanceof Error ? e.message : '重置失败')
  }
}

function handlePageChange(newPage: number) {
  page.value = newPage
  loadUsers()
}

onMounted(() => {
  loadUsers()
  loadRoles()
})
</script>

<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <h2>用户管理</h2>
      <div :class="$style.actions">
        <el-input
          v-model="searchQuery"
          placeholder="搜索用户名/显示名"
          clearable
          style="width: 200px"
          @keyup.enter="loadUsers"
        />
        <el-select v-model="statusFilter" placeholder="状态" clearable style="width: 100px" @change="loadUsers">
          <el-option label="正常" value="active" />
          <el-option label="停用" value="inactive" />
        </el-select>
        <el-button type="primary" @click="openCreate">+ 新增用户</el-button>
      </div>
    </div>

    <el-table :data="users" v-loading="loading" stripe>
      <el-table-column prop="username" label="用户名" width="120" />
      <el-table-column prop="displayName" label="显示名" width="120" />
      <el-table-column prop="email" label="邮箱" width="180" />
      <el-table-column prop="phone" label="手机" width="130" />
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
            {{ row.status === 'active' ? '正常' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="170">
        <template #default="{ row }">
          {{ row.createdAt?.slice(0, 19).replace('T', ' ') }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button link type="warning" size="small" @click="handleResetPassword(row)">重置密码</el-button>
          <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div :class="$style.pagination">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <el-form :model="userForm" label-width="80px">
        <el-form-item label="用户名" required>
          <el-input v-model="userForm.username" :disabled="!!editingUser" />
        </el-form-item>
        <el-form-item label="显示名" required>
          <el-input v-model="userForm.displayName" />
        </el-form-item>
        <el-form-item v-if="!editingUser" label="密码" required>
          <el-input v-model="userForm.password" type="password" placeholder="至少8位，含大小写+数字" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="userForm.email" />
        </el-form-item>
        <el-form-item label="手机">
          <el-input v-model="userForm.phone" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="userForm.roles" multiple style="width: 100%">
            <el-option v-for="role in roles" :key="role.id" :label="role.name" :value="role.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="userForm.status">
            <el-radio value="active">正常</el-radio>
            <el-radio value="inactive">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style module>
.container {
  padding: 16px;
  background: var(--bg-color-page);
  height: 100%;
  display: flex;
  flex-direction: column;
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

.actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
