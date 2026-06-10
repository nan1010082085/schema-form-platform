<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { apiClient } from '@/utils/apiClient'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'

interface Dept {
  id: string
  name: string
  parentId: string | null
  sort: number
  status: string
  leader: string
  children?: Dept[]
}

const deptTree = ref<Dept[]>([])
const loading = ref(false)
const searchQuery = ref('')

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const form = ref({
  name: '',
  parentId: null as string | null,
  sort: 0,
  status: 'active',
  leader: '',
})
const editingId = ref('')

const filteredTree = computed(() => {
  if (!searchQuery.value) return deptTree.value
  const keyword = searchQuery.value.toLowerCase()
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

const expandedKeys = ref<string[]>([])

async function fetchDepts() {
  loading.value = true
  try {
    const data = await apiClient.get<Dept[]>('/depts?tree=true')
    deptTree.value = Array.isArray(data) ? data : []
    expandedKeys.value = deptTree.value.map(d => d.id)
  } finally {
    loading.value = false
  }
}

function openCreate(parentId: string | null = null) {
  dialogMode.value = 'create'
  form.value = { name: '', parentId, sort: 0, status: 'active', leader: '' }
  dialogVisible.value = true
}

function openEdit(dept: Dept) {
  dialogMode.value = 'edit'
  editingId.value = dept.id
  form.value = {
    name: dept.name,
    parentId: dept.parentId,
    sort: dept.sort ?? 0,
    status: dept.status || 'active',
    leader: dept.leader || '',
  }
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入部门名称')
    return
  }

  if (dialogMode.value === 'create') {
    await apiClient.post('/depts', form.value)
    ElMessage.success('部门创建成功')
  } else {
    await apiClient.put(`/depts/${editingId.value}`, {
      name: form.value.name,
      sort: form.value.sort,
      status: form.value.status,
      leader: form.value.leader,
    })
    ElMessage.success('部门更新成功')
  }
  dialogVisible.value = false
  fetchDepts()
}

async function handleDelete(dept: Dept) {
  await ElMessageBox.confirm(`确认删除部门「${dept.name}」？如有子部门或关联用户需先处理。`, '删除确认', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  })
  await apiClient.delete(`/depts/${dept.id}`)
  ElMessage.success('部门已删除')
  fetchDepts()
}

async function handleDragEnd(draggingNode: { data: Dept }, dropNode: { data: Dept }, dropType: string) {
  if (dropType === 'inner') {
    await apiClient.patch(`/depts/${draggingNode.data.id}/move`, { parentId: dropNode.data.id })
  } else if (dropType === 'before' || dropType === 'after') {
    await apiClient.patch(`/depts/${draggingNode.data.id}/move`, { parentId: dropNode.data.parentId })
  }
  ElMessage.success('排序已更新')
  fetchDepts()
}

onMounted(fetchDepts)
</script>

<template>
  <div :class="$style.wrapper">
    <div :class="$style.toolbar">
      <el-input
        v-model="searchQuery"
        placeholder="搜索部门名称"
        :prefix-icon="Search"
        clearable
        :class="$style.search"
      />
      <el-button type="primary" :icon="Plus" @click="openCreate(null)">
        新增部门
      </el-button>
    </div>

    <el-tree
      :data="filteredTree"
      node-key="id"
      :props="{ label: 'name', children: 'children' }"
      :default-expanded-keys="expandedKeys"
      :expand-on-click-node="false"
      draggable
      :allow-drop="(_draggingNode: unknown, _dropNode: unknown, type: string) => type !== 'inner' || true"
      :class="$style.tree"
      v-loading="loading"
      @node-drop="handleDragEnd"
    >
      <template #default="{ data }">
        <div :class="$style.nodeRow">
          <div :class="$style.nodeInfo">
            <span :class="$style.nodeName">{{ data.name }}</span>
            <el-tag v-if="data.leader" size="small" type="info" :class="$style.nodeTag">
              {{ data.leader }}
            </el-tag>
            <el-tag v-if="data.status === 'inactive'" size="small" type="warning" :class="$style.nodeTag">
              停用
            </el-tag>
          </div>
          <div :class="$style.nodeActions">
            <el-button text size="small" @click.stop="openCreate(data.id)">添加子部门</el-button>
            <el-button text size="small" @click.stop="openEdit(data)">编辑</el-button>
            <el-button text size="small" type="danger" @click.stop="handleDelete(data)">删除</el-button>
          </div>
        </div>
      </template>
    </el-tree>

    <div v-if="!loading && filteredTree.length === 0" :class="$style.empty">
      暂无部门数据
    </div>
  </div>

  <!-- Create/Edit Dialog -->
  <el-dialog
    v-model="dialogVisible"
    :title="dialogMode === 'create' ? '新增部门' : '编辑部门'"
    width="480px"
    destroy-on-close
  >
    <el-form label-width="80px">
      <el-form-item label="部门名称">
        <el-input v-model="form.name" placeholder="请输入部门名称" />
      </el-form-item>
      <el-form-item label="上级部门">
        <el-tree-select
          v-model="form.parentId"
          :data="deptTree"
          :props="{ label: 'name', children: 'children', value: 'id' }"
          placeholder="选择上级部门（留空为顶级）"
          clearable
          check-strictly
          :render-after-expand="false"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="负责人">
        <el-input v-model="form.leader" placeholder="部门负责人（可选）" />
      </el-form-item>
      <el-form-item label="排序">
        <el-input-number v-model="form.sort" :min="0" :max="9999" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="form.status" style="width: 100%">
          <el-option label="正常" value="active" />
          <el-option label="停用" value="inactive" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
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

.tree {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 8px;
  min-height: 300px;
}

.nodeRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 4px 0;
}

.nodeInfo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nodeName {
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.nodeTag {
  margin-left: 4px;
}

.nodeActions {
  display: flex;
  gap: 4px;
  align-items: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.nodeRow:hover .nodeActions {
  opacity: 1;
}

.empty {
  text-align: center;
  padding: 48px 20px;
  color: var(--el-text-color-placeholder);
  font-size: 14px;
}
</style>
