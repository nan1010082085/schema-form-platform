<script setup lang="ts">
import { inject, computed, ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { widgetDataKey, widgetStyleKey } from '../base/types'
import type { Widget } from '../base/types'
import { useWidgetRenderState } from '../../composables/useWidgetRenderState'
import { useExposeWidget } from '../../composables/useExposeWidget'
import {
  fetchRoles,
  createRole,
  updateRole,
  deleteRole,
  fetchPermissions,
  type RoleItem,
  type PermissionItem,
  type CreateRolePayload,
} from '../../api/roleApi'
import styles from './style.module.scss'

// ---- Inject ----
const widgetData = inject(widgetDataKey)!
const widgetStyle = inject(widgetStyleKey)!
const { isDisabled } = useWidgetRenderState()

// ---- State ----
const loading = ref(false)
const tableData = ref<RoleItem[]>([])
const total = ref(0)
const currentPage = ref(1)
const searchQuery = ref('')
const selectedRows = ref<RoleItem[]>([])

// ---- Dialog state ----
const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const editingRoleId = ref('')

const formRef = ref()

const formData = reactive<CreateRolePayload>({
  name: '',
  description: '',
  permissions: [],
  data_scope: 'all',
  dept_ids: [],
})

// ---- Permission dialog state ----
const permDialogVisible = ref(false)
const permRoleId = ref('')
const permRoleName = ref('')
const permissions = ref<PermissionItem[]>([])
const checkedPermissions = ref<string[]>([])
const permTreeRef = ref()

// ---- Props ----
const tableColumns = computed(() => {
  const cols = widgetData.value.props?.tableColumns as string[] | undefined
  return cols ?? ['name', 'permissions', 'data_scope', 'createdAt']
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
  name: { prop: 'name', label: '角色名称', width: 150 },
  permissions: { prop: 'permissions', label: '权限字符', minWidth: 200 },
  data_scope: { prop: 'data_scope', label: '数据范围', width: 120 },
  createdAt: { prop: 'createdAt', label: '创建时间', width: 180 },
}

const visibleColumns = computed(() => {
  return tableColumns.value.map(key => ALL_COLUMNS[key]).filter(Boolean)
})

// ---- Data scope labels ----
const dataScopeLabels: Record<string, string> = {
  all: '全部数据',
  dept: '本部门数据',
  self: '仅本人数据',
  custom: '自定义',
}

// ---- Form rules ----
const formRules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
}

// ---- Permission tree ----
interface TreeNode {
  id: string
  label: string
  children?: TreeNode[]
}

const permissionTree = computed<TreeNode[]>(() => {
  const grouped: Record<string, PermissionItem[]> = {}
  for (const p of permissions.value) {
    if (!grouped[p.module]) grouped[p.module] = []
    grouped[p.module].push(p)
  }

  return Object.entries(grouped).map(([module, items]) => ({
    id: `module:${module}`,
    label: module,
    children: items.map(item => ({
      id: item.code,
      label: `${item.name}（${item.code}）`,
    })),
  }))
})

// ---- API ----
async function loadData() {
  loading.value = true
  try {
    const res = await fetchRoles({
      q: searchQuery.value || undefined,
      page: currentPage.value,
      pageSize: String(pageSize.value),
    })
    tableData.value = res.data.items
    total.value = res.data.total
  } catch (err) {
    ElMessage.error('加载角色列表失败')
  } finally {
    loading.value = false
  }
}

async function loadPermissions() {
  try {
    const res = await fetchPermissions()
    permissions.value = res.data
  } catch {
    ElMessage.error('加载权限列表失败')
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

function onSizeChange(_size: number) {
  currentPage.value = 1
  loadData()
}

// ---- Selection ----
function onSelectionChange(rows: RoleItem[]) {
  selectedRows.value = rows
}

// ---- Add / Edit ----
function openAddDialog() {
  dialogMode.value = 'add'
  editingRoleId.value = ''
  Object.assign(formData, {
    name: '',
    description: '',
    permissions: [],
    data_scope: 'all',
    dept_ids: [],
  })
  dialogVisible.value = true
}

function openEditDialog(row: RoleItem) {
  dialogMode.value = 'edit'
  editingRoleId.value = row._id
  Object.assign(formData, {
    name: row.name,
    description: row.description ?? '',
    permissions: [...row.permissions],
    data_scope: row.data_scope,
    dept_ids: [...row.dept_ids],
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
      await createRole(formData)
      ElMessage.success('角色创建成功')
    } else {
      await updateRole(editingRoleId.value, formData)
      ElMessage.success('角色更新成功')
    }
    dialogVisible.value = false
    loadData()
  } catch (err) {
    ElMessage.error(dialogMode.value === 'add' ? '创建失败' : '更新失败')
  }
}

// ---- Delete ----
async function handleDelete(row: RoleItem) {
  try {
    await ElMessageBox.confirm(`确认删除角色「${row.name}」？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await deleteRole(row._id)
    ElMessage.success('删除成功')
    loadData()
  } catch {
    // user cancelled
  }
}

// ---- Assign Permissions ----
function openPermDialog(row: RoleItem) {
  permRoleId.value = row._id
  permRoleName.value = row.name
  checkedPermissions.value = [...row.permissions]
  permDialogVisible.value = true
}

async function submitPermissions() {
  try {
    await updateRole(permRoleId.value, { permissions: checkedPermissions.value })
    ElMessage.success('权限分配成功')
    permDialogVisible.value = false
    loadData()
  } catch {
    ElMessage.error('权限分配失败')
  }
}

function onPermCheckChange() {
  if (!permTreeRef.value) return
  const checked = permTreeRef.value.getCheckedKeys(false)
  const halfChecked = permTreeRef.value.getHalfCheckedKeys()
  checkedPermissions.value = [...checked, ...halfChecked].filter(
    (k: string) => !k.startsWith('module:'),
  )
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

function formatPermissions(perms: string[]): string {
  if (!perms.length) return '-'
  if (perms.length <= 3) return perms.join('、')
  return `${perms.slice(0, 3).join('、')} 等${perms.length}项`
}

// ---- Expose ----
useExposeWidget((_wd: { value: Widget }) => ({
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
  loadPermissions()
})
</script>

<template>
  <div :class="styles.container">
    <!-- Search Bar -->
    <div v-if="searchable" :class="styles.searchBar">
      <el-input
        v-model="searchQuery"
        :class="styles.searchInput"
        placeholder="搜索角色名称 / 描述"
        clearable
        @input="onSearchInput"
      />
      <el-button type="primary" @click="openAddDialog" :disabled="isDisabled">
        新增角色
      </el-button>
    </div>
    <div v-else :class="styles.searchBar">
      <el-button type="primary" @click="openAddDialog" :disabled="isDisabled">
        新增角色
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
            <span v-if="col.prop === 'permissions'">
              {{ formatPermissions(row.permissions) }}
            </span>
            <el-tag
              v-else-if="col.prop === 'data_scope'"
              size="small"
              :type="row.data_scope === 'all' ? 'primary' : row.data_scope === 'custom' ? 'warning' : 'info'"
            >
              {{ dataScopeLabels[row.data_scope] ?? row.data_scope }}
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
            <el-button type="success" link size="small" @click="openPermDialog(row)">
              分配权限
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
      :title="dialogMode === 'add' ? '新增角色' : '编辑角色'"
      width="500px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入角色描述"
          />
        </el-form-item>
        <el-form-item label="数据范围" prop="data_scope">
          <el-select v-model="formData.data_scope" placeholder="请选择数据范围">
            <el-option label="全部数据" value="all" />
            <el-option label="本部门数据" value="dept" />
            <el-option label="仅本人数据" value="self" />
            <el-option label="自定义" value="custom" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>

    <!-- Assign Permissions Dialog -->
    <el-dialog
      v-model="permDialogVisible"
      :title="`分配权限 — ${permRoleName}`"
      width="560px"
      destroy-on-close
    >
      <div :class="styles.permTreeWrap">
        <el-tree
          ref="permTreeRef"
          :data="permissionTree"
          :props="{ children: 'children', label: 'label' }"
          show-checkbox
          node-key="id"
          :default-checked-keys="checkedPermissions"
          check-strictly
          default-expand-all
          @check="onPermCheckChange"
        />
      </div>
      <template #footer>
        <el-button @click="permDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitPermissions">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>
