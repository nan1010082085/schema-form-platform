<script setup lang="ts">
import { inject, computed, ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { widgetDataKey, widgetStyleKey } from '../base/types'
import type { Widget } from '../base/types'
import { useWidgetRenderState } from '../../composables/useWidgetRenderState'
import { useExposeWidget } from '../../composables/useExposeWidget'
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  type UserItem,
  type CreateUserPayload,
} from '../../api/userApi'
import styles from './style.module.scss'

// ---- Inject ----
const widgetData = inject(widgetDataKey)!
const widgetStyle = inject(widgetStyleKey)!
const { isDisabled } = useWidgetRenderState()

// ---- State ----
const loading = ref(false)
const tableData = ref<UserItem[]>([])
const total = ref(0)
const currentPage = ref(1)
const searchQuery = ref('')
const selectedRows = ref<UserItem[]>([])

// ---- Dialog state ----
const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingUserId = ref<string>('')
const resetPwdVisible = ref(false)
const resetPwdTarget = ref<UserItem | null>(null)
const resetPwdValue = ref('')

const formRef = ref()
const resetFormRef = ref()

const formData = reactive<CreateUserPayload>({
  username: '',
  password: '',
  displayName: '',
  phone: '',
  email: '',
  deptId: '',
  status: 'active',
})

// ---- Props ----
const tableColumns = computed(() => {
  const cols = widgetData.value.props?.tableColumns as string[] | undefined
  return cols ?? ['username', 'displayName', 'deptId', 'phone', 'status', 'createdAt']
})

const pageSize = computed(() => {
  return (widgetData.value.props?.pageSize as number) || 20
})

const searchable = computed(() => {
  return (widgetData.value.props?.searchable as boolean) !== false
})

// ---- Column definitions ----
interface ColumnDef {
  prop: string
  label: string
  width?: number
  minWidth?: number
}

const ALL_COLUMNS: Record<string, ColumnDef> = {
  username: { prop: 'username', label: '用户名', width: 120 },
  displayName: { prop: 'displayName', label: '昵称', width: 120 },
  deptId: { prop: 'deptId', label: '部门', width: 120 },
  phone: { prop: 'phone', label: '手机号', width: 140 },
  status: { prop: 'status', label: '状态', width: 80 },
  createdAt: { prop: 'createdAt', label: '创建时间', width: 180 },
}

const visibleColumns = computed(() => {
  return tableColumns.value.map(key => ALL_COLUMNS[key]).filter(Boolean)
})

// ---- Form rules ----
const formRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  displayName: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
}

const resetPwdRules = {
  password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' },
  ],
}

// ---- API ----
async function loadData() {
  loading.value = true
  try {
    const res = await fetchUsers({
      q: searchQuery.value || undefined,
      page: currentPage.value,
      pageSize: String(pageSize.value),
    })
    tableData.value = res.data.items
    total.value = res.data.total
  } catch (err) {
    ElMessage.error('加载用户列表失败')
  } finally {
    loading.value = false
  }
}

// ---- Search ----
let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    loadData()
  }, 300)
}

// ---- Pagination ----
function onPageChange(page: number) {
  currentPage.value = page
  loadData()
}

function onSizeChange(size: number) {
  currentPage.value = 1
  loadData()
}

// ---- Selection ----
function onSelectionChange(rows: UserItem[]) {
  selectedRows.value = rows
}

// ---- Add / Edit ----
function openAddDialog() {
  dialogMode.value = 'add'
  editingUserId.value = ''
  Object.assign(formData, {
    username: '',
    password: '',
    displayName: '',
    phone: '',
    email: '',
    deptId: '',
    status: 'active',
  })
  dialogVisible.value = true
}

function openEditDialog(row: UserItem) {
  dialogMode.value = 'edit'
  editingUserId.value = row._id
  Object.assign(formData, {
    username: row.username,
    password: '',
    displayName: row.displayName,
    phone: row.phone ?? '',
    email: row.email ?? '',
    deptId: row.deptId ?? '',
    status: row.status,
  })
  dialogVisible.value = true
}

async function submitForm() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  try {
    if (dialogMode.value === 'add') {
      await createUser(formData)
      ElMessage.success('用户创建成功')
    } else {
      const { password: _, ...updates } = formData
      await updateUser(editingUserId.value, updates)
      ElMessage.success('用户更新成功')
    }
    dialogVisible.value = false
    loadData()
  } catch (err) {
    ElMessage.error(dialogMode.value === 'add' ? '创建失败' : '更新失败')
  }
}

// ---- Delete ----
async function handleDelete(row: UserItem) {
  try {
    await ElMessageBox.confirm('确认删除该用户？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await deleteUser(row._id)
    ElMessage.success('删除成功')
    loadData()
  } catch {
    // user cancelled
  }
}

// ---- Reset Password ----
function openResetPwd(row: UserItem) {
  resetPwdTarget.value = row
  resetPwdValue.value = ''
  resetPwdVisible.value = true
}

async function submitResetPwd() {
  try {
    await resetFormRef.value?.validate()
  } catch {
    return
  }
  if (!resetPwdTarget.value) return
  try {
    await resetUserPassword(resetPwdTarget.value._id, resetPwdValue.value)
    ElMessage.success('密码重置成功')
    resetPwdVisible.value = false
  } catch {
    ElMessage.error('密码重置失败')
  }
}

// ---- Format ----
function formatTime(val: string | undefined): string {
  if (!val) return '-'
  const d = new Date(val)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---- Expose ----
useExposeWidget((wd: { value: Widget }) => ({
  get loading() { return loading.value },
  get tableData() { return tableData.value },
  get total() { return total.value },
  get selectedRows() { return selectedRows.value },
}))

// ---- Watch props changes ----
watch(() => widgetData.value.props?.pageSize, () => {
  currentPage.value = 1
  loadData()
})

// ---- Lifecycle ----
onMounted(() => {
  loadData()
})
</script>

<template>
  <div :class="styles.container">
    <!-- Search Bar -->
    <div v-if="searchable" :class="styles.searchBar">
      <el-input
        v-model="searchQuery"
        :class="styles.searchInput"
        placeholder="搜索用户名 / 昵称"
        clearable
        @input="onSearchInput"
      />
      <el-button type="primary" @click="openAddDialog" :disabled="isDisabled">
        新增用户
      </el-button>
    </div>
    <div v-else :class="styles.searchBar">
      <el-button type="primary" @click="openAddDialog" :disabled="isDisabled">
        新增用户
      </el-button>
    </div>

    <!-- Table -->
    <div :class="styles.tableWrap">
      <el-table
        :data="tableData"
        :loading="loading"
        stripe
        border
        style="width: 100%"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column
          v-for="col in visibleColumns"
          :key="col.prop"
          :prop="col.prop"
          :label="col.label"
          :width="col.width"
          :min-width="col.minWidth"
        >
          <template #default="{ row }">
            <el-tag
              v-if="col.prop === 'status'"
              :type="row.status === 'active' ? 'success' : 'danger'"
              size="small"
            >
              {{ row.status === 'active' ? '启用' : '停用' }}
            </el-tag>
            <span v-else-if="col.prop === 'createdAt'">
              {{ formatTime(row.createdAt) }}
            </span>
            <span v-else>{{ row[col.prop] ?? '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openEditDialog(row)">
              编辑
            </el-button>
            <el-button type="warning" link size="small" @click="openResetPwd(row)">
              重置密码
            </el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Pagination -->
    <div :class="styles.pagination">
      <el-pagination
        :current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="onPageChange"
        @size-change="onSizeChange"
      />
    </div>

    <!-- Add/Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'add' ? '新增用户' : '编辑用户'"
      width="560px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="dialogMode === 'add' ? formRules : { ...formRules, password: undefined }"
        label-width="80px"
        :class="styles.formGrid"
      >
        <el-form-item label="用户名" prop="username" :class="styles.fullWidth">
          <el-input
            v-model="formData.username"
            :disabled="dialogMode === 'edit'"
            placeholder="请输入用户名"
          />
        </el-form-item>
        <el-form-item
          v-if="dialogMode === 'add'"
          label="密码"
          prop="password"
          :class="styles.fullWidth"
        >
          <el-input
            v-model="formData.password"
            type="password"
            show-password
            placeholder="请输入密码"
          />
        </el-form-item>
        <el-form-item label="昵称" prop="displayName">
          <el-input v-model="formData.displayName" placeholder="请输入昵称" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="formData.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="formData.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="部门" prop="deptId">
          <el-input v-model="formData.deptId" placeholder="请输入部门" />
        </el-form-item>
        <el-form-item label="状态" prop="status" :class="styles.fullWidth">
          <el-select v-model="formData.status" placeholder="请选择状态">
            <el-option label="启用" value="active" />
            <el-option label="停用" value="inactive" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>

    <!-- Reset Password Dialog -->
    <el-dialog
      v-model="resetPwdVisible"
      title="重置密码"
      width="400px"
      destroy-on-close
    >
      <el-form
        ref="resetFormRef"
        :model="{ password: resetPwdValue }"
        :rules="resetPwdRules"
        label-width="80px"
      >
        <el-form-item label="用户">
          <span>{{ resetPwdTarget?.displayName }}（{{ resetPwdTarget?.username }}）</span>
        </el-form-item>
        <el-form-item label="新密码" prop="password">
          <el-input
            v-model="resetPwdValue"
            type="password"
            show-password
            placeholder="请输入新密码（至少6位）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetPwdVisible = false">取消</el-button>
        <el-button type="primary" @click="submitResetPwd">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>
