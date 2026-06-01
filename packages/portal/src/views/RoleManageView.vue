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
}

interface User {
  id: string
  username: string
  displayName: string
}

const roles = ref<Role[]>([])
const loading = ref(false)
const searchQuery = ref('')

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const form = ref({ name: '', description: '' })
const editingId = ref('')

const membersVisible = ref(false)
const currentRole = ref<Role | null>(null)
const members = ref<User[]>([])
const membersLoading = ref(false)

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

function openCreate() {
  dialogMode.value = 'create'
  form.value = { name: '', description: '' }
  dialogVisible.value = true
}

function openEdit(role: Role) {
  dialogMode.value = 'edit'
  editingId.value = role.id
  form.value = { name: role.name, description: role.description || '' }
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!form.value.name) {
    ElMessage.warning('请输入角色名称')
    return
  }

  if (dialogMode.value === 'create') {
    await apiClient.post('/roles', form.value)
    ElMessage.success('角色创建成功')
  } else {
    await apiClient.put(`/roles/${editingId.value}`, form.value)
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

onMounted(fetchRoles)
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
        <el-table-column prop="name" label="角色名称" min-width="140" />
        <el-table-column prop="description" label="描述" min-width="200" />
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
      width="440px"
      destroy-on-close
    >
      <el-form label-width="70px">
        <el-form-item label="角色名称">
          <el-input v-model="form.name" placeholder="请输入角色名称（如：管理员、部门经理）" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="角色描述（可选）" />
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

.membersTable {
  border-radius: 8px;
  overflow: hidden;
}

.emptyMembers {
  text-align: center;
  padding: 24px;
  color: var(--text-color-placeholder);
  font-size: 14px;
}
</style>
