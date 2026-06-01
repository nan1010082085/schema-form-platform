<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiClient } from '@/utils/apiClient'
import SubPageLayout from '@/components/SubPageLayout.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'

interface User {
  id: string
  username: string
  displayName: string
  roles: string[]
}

interface Role {
  id: string
  name: string
}

const users = ref<User[]>([])
const roles = ref<Role[]>([])
const roleMap = ref<Record<string, string>>({})
const loading = ref(false)
const searchQuery = ref('')

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const form = ref({ username: '', password: '', displayName: '', roles: [] as string[] })
const editingId = ref('')

const resetPwdVisible = ref(false)
const resetPwdForm = ref({ password: '' })
const resetPwdUserId = ref('')

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
    const params = searchQuery.value ? `?q=${encodeURIComponent(searchQuery.value)}` : ''
    const res = await apiClient.get<{ items: User[] }>(`/users${params}`)
    users.value = res.items
  } finally {
    loading.value = false
  }
}

function getRoleNames(roleIds: string[]): string[] {
  return roleIds.map(id => roleMap.value[id] || id).filter(Boolean)
}

function openCreate() {
  dialogMode.value = 'create'
  form.value = { username: '', password: '', displayName: '', roles: [] }
  dialogVisible.value = true
}

function openEdit(user: User) {
  dialogMode.value = 'edit'
  editingId.value = user.id
  form.value = { username: user.username, password: '', displayName: user.displayName, roles: [...user.roles] }
  dialogVisible.value = true
}

async function handleSubmit() {
  if (dialogMode.value === 'create') {
    if (!form.value.username || !form.value.password || !form.value.displayName) {
      ElMessage.warning('请填写完整信息')
      return
    }
    await apiClient.post('/users', form.value)
    ElMessage.success('用户创建成功')
  } else {
    await apiClient.put(`/users/${editingId.value}`, {
      displayName: form.value.displayName,
      roles: form.value.roles,
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
  if (resetPwdForm.value.password.length < 4) {
    ElMessage.warning('密码至少 4 个字符')
    return
  }
  await apiClient.put(`/users/${resetPwdUserId.value}/password`, resetPwdForm.value)
  ElMessage.success('密码已重置')
  resetPwdVisible.value = false
}

onMounted(async () => {
  await fetchRoles()
  await fetchUsers()
})
</script>

<template>
  <SubPageLayout title="用户管理">
    <div :class="$style.wrapper">
      <div :class="$style.toolbar">
        <el-input
          v-model="searchQuery"
          placeholder="搜索用户名或显示名"
          :prefix-icon="Search"
          clearable
          :class="$style.search"
          @clear="fetchUsers"
          @keyup.enter="fetchUsers"
        />
        <el-button type="primary" :icon="Plus" @click="openCreate">
          新增用户
        </el-button>
      </div>

      <el-table :data="users" v-loading="loading" :class="$style.table" empty-text="暂无数据">
        <el-table-column prop="username" label="用户名" min-width="140" />
        <el-table-column prop="displayName" label="显示名" min-width="140" />
        <el-table-column label="角色" min-width="200">
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
    </div>

    <!-- Create/Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增用户' : '编辑用户'"
      width="440px"
      destroy-on-close
    >
      <el-form label-width="70px">
        <el-form-item label="用户名">
          <el-input
            v-model="form.username"
            :disabled="dialogMode === 'edit'"
            placeholder="请输入用户名"
          />
        </el-form-item>
        <el-form-item v-if="dialogMode === 'create'" label="密码">
          <el-input v-model="form.password" type="password" show-password placeholder="请输入密码" />
        </el-form-item>
        <el-form-item label="显示名">
          <el-input v-model="form.displayName" placeholder="请输入显示名" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.roles" multiple placeholder="选择角色" style="width: 100%">
            <el-option
              v-for="role in roles"
              :key="role.id"
              :label="role.name"
              :value="role.id"
            />
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
          <el-input v-model="resetPwdForm.password" type="password" show-password placeholder="请输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetPwdVisible = false">取消</el-button>
        <el-button type="primary" @click="handleResetPassword">确定</el-button>
      </template>
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

.roleTag {
  margin-right: 4px;
  margin-bottom: 2px;
}

.noRole {
  color: var(--text-color-placeholder);
  font-size: 13px;
}
</style>
