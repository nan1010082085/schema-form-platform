<script setup lang="ts">
/**
 * 部门管理 — 树形表格
 */
import { ref, onMounted } from 'vue'
import { apiClient } from '@schema-form/shared-utils/apiClient'
import { ElMessage, ElMessageBox } from 'element-plus'

interface Dept {
  id: string
  name: string
  parentId: string | null
  sort: number
  status: string
  leader: string
  children?: Dept[]
  createdAt: string
}

const deptTree = ref<Dept[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const editingDept = ref<Dept | null>(null)

const deptForm = ref({
  name: '',
  parentId: null as string | null,
  sort: 0,
  status: 'active',
  leader: '',
})

async function loadDepts() {
  loading.value = true
  try {
    deptTree.value = await apiClient.get<Dept[]>('/depts?tree=true')
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '加载部门失败')
  } finally {
    loading.value = false
  }
}

function openCreate(parent?: Dept) {
  editingDept.value = null
  deptForm.value = {
    name: '',
    parentId: parent?.id || null,
    sort: 0,
    status: 'active',
    leader: '',
  }
  dialogVisible.value = true
}

function openEdit(dept: Dept) {
  editingDept.value = dept
  deptForm.value = {
    name: dept.name,
    parentId: dept.parentId,
    sort: dept.sort,
    status: dept.status,
    leader: dept.leader || '',
  }
  dialogVisible.value = true
}

async function handleSave() {
  if (!deptForm.value.name) {
    ElMessage.warning('请输入部门名称')
    return
  }
  try {
    if (editingDept.value) {
      await apiClient.put(`/depts/${editingDept.value.id}`, deptForm.value)
      ElMessage.success('更新成功')
    } else {
      await apiClient.post('/depts', deptForm.value)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    await loadDepts()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  }
}

async function handleDelete(dept: Dept) {
  try {
    await ElMessageBox.confirm(`确定删除部门 "${dept.name}" 吗？`, '确认删除', { type: 'warning' })
    await apiClient.delete(`/depts/${dept.id}`)
    ElMessage.success('删除成功')
    await loadDepts()
  } catch (e: unknown) {
    if (e !== 'cancel') ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}

onMounted(loadDepts)
</script>

<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <h2>部门管理</h2>
      <el-button type="primary" @click="openCreate()">+ 新增部门</el-button>
    </div>

    <el-table :data="deptTree" v-loading="loading" row-key="id" default-expand-all stripe>
      <el-table-column prop="name" label="部门名称" width="250" />
      <el-table-column prop="leader" label="负责人" width="120" />
      <el-table-column prop="sort" label="排序" width="80" />
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
            {{ row.status === 'active' ? '正常' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="250">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openCreate(row)">新增子部门</el-button>
          <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editingDept ? '编辑部门' : '新增部门'" width="450px">
      <el-form :model="deptForm" label-width="80px">
        <el-form-item label="部门名称" required>
          <el-input v-model="deptForm.name" />
        </el-form-item>
        <el-form-item label="负责人">
          <el-input v-model="deptForm.leader" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="deptForm.sort" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="deptForm.status">
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
.container { padding: 16px; background: var(--bg-color-page); height: 100%; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header h2 { margin: 0; font-size: 18px; font-weight: 600; }
</style>
