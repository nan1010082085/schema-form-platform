<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { apiClient } from '@/utils/apiClient'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import { AddIcon, SearchIcon } from 'tdesign-icons-vue-next'

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
    MessagePlugin.warning('请输入部门名称')
    return
  }

  if (dialogMode.value === 'create') {
    await apiClient.post('/depts', form.value)
    MessagePlugin.success('部门创建成功')
  } else {
    await apiClient.put(`/depts/${editingId.value}`, {
      name: form.value.name,
      sort: form.value.sort,
      status: form.value.status,
      leader: form.value.leader,
    })
    MessagePlugin.success('部门更新成功')
  }
  dialogVisible.value = false
  fetchDepts()
}

async function handleDelete(dept: Dept) {
  const confirmDia = DialogPlugin.confirm({
    header: '删除确认',
    body: `确认删除部门「${dept.name}」？如有子部门或关联用户需先处理。`,
    confirmBtn: '删除',
    cancelBtn: '取消',
    onConfirm: async () => {
      await apiClient.delete(`/depts/${dept.id}`)
      MessagePlugin.success('部门已删除')
      fetchDepts()
      confirmDia.destroy()
    },
    onClose: () => {
      confirmDia.destroy()
    },
  })
}

async function handleDragEnd(info: any) {
  const { dragNode, dropNode, dropPosition } = info
  if (dropPosition === 0) {
    await apiClient.patch(`/depts/${dragNode.data.id}/move`, { parentId: dropNode.data.id })
  } else {
    await apiClient.patch(`/depts/${dragNode.data.id}/move`, { parentId: dropNode.data.parentId })
  }
  MessagePlugin.success('排序已更新')
  fetchDepts()
}

onMounted(fetchDepts)
</script>

<template>
  <div :class="$style.wrapper">
    <div :class="$style.toolbar">
      <t-input
        v-model="searchQuery"
        placeholder="搜索部门名称"
        :prefix-icon="SearchIcon"
        clearable
        :class="$style.search"
      />
      <t-button theme="primary" :icon="AddIcon" @click="openCreate(null)">
        新增部门
      </t-button>
    </div>

    <t-tree
      :data="filteredTree"
      :keys="{ label: 'name', children: 'children', value: 'id' }"
      :default-expanded="expandedKeys"
      :expand-on-click-node="false"
      :class="$style.tree"
      :loading="loading"
      hover
      line
      draggable
      @drag-end="handleDragEnd"
    >
      <template #label="{ node }">
        <div :class="$style.nodeRow">
          <div :class="$style.nodeInfo">
            <span :class="$style.nodeName">{{ node.data.name }}</span>
            <t-tag v-if="node.data.leader" size="small" theme="default" :class="$style.nodeTag">
              {{ node.data.leader }}
            </t-tag>
            <t-tag v-if="node.data.status === 'inactive'" size="small" theme="warning" :class="$style.nodeTag">
              停用
            </t-tag>
          </div>
          <div :class="$style.nodeActions">
            <t-button variant="text" size="small" @click.stop="openCreate(node.data.id)">添加子部门</t-button>
            <t-button variant="text" size="small" @click.stop="openEdit(node.data)">编辑</t-button>
            <t-button variant="text" size="small" theme="danger" @click.stop="handleDelete(node.data)">删除</t-button>
          </div>
        </div>
      </template>
    </t-tree>

    <div v-if="!loading && filteredTree.length === 0" :class="$style.empty">
      暂无部门数据
    </div>
  </div>

  <!-- Create/Edit Dialog -->
  <t-dialog
    v-model:visible="dialogVisible"
    :header="dialogMode === 'create' ? '新增部门' : '编辑部门'"
    width="480px"
    destroy-on-close
  >
    <t-form label-width="80px">
      <t-form-item label="部门名称">
        <t-input v-model:value="form.name" placeholder="请输入部门名称" />
      </t-form-item>
      <t-form-item label="上级部门">
        <t-tree-select
          v-model="form.parentId"
          :data="deptTree"
          :keys="{ label: 'name', children: 'children', value: 'id' }"
          placeholder="选择上级部门（留空为顶级）"
          clearable
          check-strictly
          :style="{ width: '100%' }"
        />
      </t-form-item>
      <t-form-item label="负责人">
        <t-input v-model:value="form.leader" placeholder="部门负责人（可选）" />
      </t-form-item>
      <t-form-item label="排序">
        <t-input-number v-model:value="form.sort" :min="0" :max="9999" />
      </t-form-item>
      <t-form-item label="状态">
        <t-select v-model:value="form.status" :style="{ width: '100%' }">
          <t-option label="正常" value="active" />
          <t-option label="停用" value="inactive" />
        </t-select>
      </t-form-item>
    </t-form>
    <template #footer>
      <t-button @click="dialogVisible = false">取消</t-button>
      <t-button theme="primary" @click="handleSubmit">确定</t-button>
    </template>
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

.tree {
  border: 1px solid var(--td-border-level-2-color);
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
  color: var(--td-text-color-primary);
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
  color: var(--td-text-color-placeholder);
  font-size: 14px;
}
</style>
