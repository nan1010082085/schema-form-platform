<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { apiClient } from '@/utils/apiClient'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import { AddIcon, SearchIcon } from 'tdesign-icons-vue-next'

interface Menu {
  id: string
  name: string
  parentId: string | null
  path: string
  icon: string
  type: 'menu' | 'button'
  permission: string
  sort: number
  status: string
  component: string
  microAppId: string | null
  target: '_self' | '_blank'
  children?: Menu[]
}

interface AppInfo {
  id: string
  name: string
  url: string
  status: string
}

const menuTree = ref<Menu[]>([])
const microApps = ref<AppInfo[]>([])
const loading = ref(false)
const searchQuery = ref('')

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const form = ref({
  name: '',
  parentId: null as string | null,
  path: '',
  icon: '',
  type: 'menu' as 'menu' | 'button',
  permission: '',
  sort: 0,
  status: 'active',
  component: '',
  microAppId: null as string | null,
  target: '_self' as '_self' | '_blank',
})
const editingId = ref('')

const filteredTree = computed(() => {
  if (!searchQuery.value) return menuTree.value
  const keyword = searchQuery.value.toLowerCase()
  function filter(nodes: Menu[]): Menu[] {
    const result: Menu[] = []
    for (const node of nodes) {
      const matchedChildren = node.children?.length ? filter(node.children) : []
      if (node.name.toLowerCase().includes(keyword) || matchedChildren.length > 0) {
        result.push({ ...node, children: matchedChildren })
      }
    }
    return result
  }
  return filter(menuTree.value)
})

const expandedKeys = ref<string[]>([])

const microAppMap = computed(() => {
  const map: Record<string, string> = {}
  for (const app of microApps.value) {
    map[app.id] = app.name
  }
  return map
})

async function fetchMenus() {
  loading.value = true
  try {
    const data = await apiClient.get<Menu[]>('/menus?tree=true')
    menuTree.value = Array.isArray(data) ? data : []
    expandedKeys.value = menuTree.value.map(m => m.id)
  } finally {
    loading.value = false
  }
}

async function fetchMicroApps() {
  const res = await apiClient.get<{ items: AppInfo[] }>('/micro-apps')
  microApps.value = res.items
}

function openCreate(parentId: string | null = null) {
  dialogMode.value = 'create'
  form.value = {
    name: '',
    parentId,
    path: '',
    icon: '',
    type: 'menu',
    permission: '',
    sort: 0,
    status: 'active',
    component: '',
    microAppId: null,
    target: '_self',
  }
  dialogVisible.value = true
}

function openEdit(menu: Menu) {
  dialogMode.value = 'edit'
  editingId.value = menu.id
  form.value = {
    name: menu.name,
    parentId: menu.parentId,
    path: menu.path || '',
    icon: menu.icon || '',
    type: menu.type || 'menu',
    permission: menu.permission || '',
    sort: menu.sort ?? 0,
    status: menu.status || 'active',
    component: menu.component || '',
    microAppId: menu.microAppId || null,
    target: menu.target || '_self',
  }
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!form.value.name.trim()) {
    MessagePlugin.warning('请输入菜单名称')
    return
  }

  if (dialogMode.value === 'create') {
    await apiClient.post('/menus', form.value)
    MessagePlugin.success('菜单创建成功')
  } else {
    await apiClient.put(`/menus/${editingId.value}`, form.value)
    MessagePlugin.success('菜单更新成功')
  }
  dialogVisible.value = false
  fetchMenus()
}

async function handleDelete(menu: Menu) {
  const confirmDia = DialogPlugin.confirm({
    header: '删除确认',
    body: `确认删除菜单「${menu.name}」？如有子菜单需先删除。`,
    confirmBtn: '删除',
    cancelBtn: '取消',
    onConfirm: async () => {
      await apiClient.delete(`/menus/${menu.id}`)
      MessagePlugin.success('菜单已删除')
      fetchMenus()
      confirmDia.destroy()
    },
    onClose: () => {
      confirmDia.destroy()
    },
  })
}

function getMicroAppName(id: string | null): string {
  if (!id) return ''
  return microAppMap.value[id] || id
}

const typeLabel: Record<string, string> = {
  menu: '菜单',
  button: '按钮',
}

onMounted(async () => {
  await Promise.all([fetchMenus(), fetchMicroApps()])
})
</script>

<template>
  <div :class="$style.wrapper">
    <div :class="$style.toolbar">
      <t-input
        v-model="searchQuery"
        placeholder="搜索菜单名称"
        :prefix-icon="SearchIcon"
        clearable
        :class="$style.search"
      />
      <t-button theme="primary" :icon="AddIcon" @click="openCreate(null)">
        新增菜单
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
    >
      <template #label="{ node }">
        <div :class="$style.nodeRow">
          <div :class="$style.nodeInfo">
            <span :class="$style.nodeName">{{ node.data.name }}</span>
            <t-tag size="small" :theme="node.data.type === 'menu' ? 'default' : 'warning'" :class="$style.nodeTag">
              {{ typeLabel[node.data.type] || node.data.type }}
            </t-tag>
            <t-tag v-if="node.data.microAppId" size="small" theme="success" :class="$style.nodeTag">
              {{ getMicroAppName(node.data.microAppId) }}
            </t-tag>
            <t-tag v-if="node.data.permission" size="small" theme="default" :class="$style.nodeTag">
              {{ node.data.permission }}
            </t-tag>
            <t-tag v-if="node.data.path" size="small" theme="default" :class="$style.nodeTag">
              {{ node.data.path }}
            </t-tag>
            <t-tag v-if="node.data.status === 'inactive'" size="small" theme="warning" :class="$style.nodeTag">
              停用
            </t-tag>
            <t-tag v-if="node.data.target === '_blank'" size="small" theme="danger" :class="$style.nodeTag">
              新页签
            </t-tag>
          </div>
          <div :class="$style.nodeActions">
            <t-button variant="text" size="small" @click.stop="openCreate(node.data.id)">添加子菜单</t-button>
            <t-button variant="text" size="small" @click.stop="openEdit(node.data)">编辑</t-button>
            <t-button variant="text" size="small" theme="danger" @click.stop="handleDelete(node.data)">删除</t-button>
          </div>
        </div>
      </template>
    </t-tree>

    <div v-if="!loading && filteredTree.length === 0" :class="$style.empty">
      暂无菜单数据
    </div>
  </div>

  <!-- Create/Edit Dialog -->
  <t-dialog
    v-model:visible="dialogVisible"
    :header="dialogMode === 'create' ? '新增菜单' : '编辑菜单'"
    width="520px"
    destroy-on-close
  >
    <t-form label-width="80px">
      <t-form-item label="菜单名称">
        <t-input v-model="form.name" placeholder="请输入菜单名称" />
      </t-form-item>
      <t-form-item label="上级菜单">
        <t-tree-select
          v-model="form.parentId"
          :data="menuTree"
          :keys="{ label: 'name', children: 'children', value: 'id' }"
          placeholder="选择上级菜单（留空为顶级）"
          clearable
          check-strictly
          :style="{ width: '100%' }"
        />
      </t-form-item>
      <t-form-item label="菜单类型">
        <t-radio-group v-model="form.type">
          <t-radio value="menu">菜单</t-radio>
          <t-radio value="button">按钮</t-radio>
        </t-radio-group>
      </t-form-item>
      <t-form-item label="关联微应用">
        <t-select
          v-model="form.microAppId"
          placeholder="选择微应用（可选）"
          clearable
          :style="{ width: '100%' }"
        >
          <t-option
            v-for="app in microApps"
            :key="app.id"
            :label="app.name"
            :value="app.id"
          />
        </t-select>
      </t-form-item>
      <t-form-item label="打开方式">
        <t-radio-group v-model="form.target">
          <t-radio value="_self">当前窗口</t-radio>
          <t-radio value="_blank">新页签</t-radio>
        </t-radio-group>
      </t-form-item>
      <t-form-item label="路由路径">
        <t-input v-model="form.path" placeholder="如：/users、/roles" />
      </t-form-item>
      <t-form-item label="组件路径">
        <t-input v-model="form.component" placeholder="如：views/UserManageView" />
      </t-form-item>
      <t-form-item label="图标">
        <t-input v-model="form.icon" placeholder="图标名称（可选）" />
      </t-form-item>
      <t-form-item label="权限编码">
        <t-input v-model="form.permission" placeholder="如：system:user:list" />
      </t-form-item>
      <t-form-item label="排序">
        <t-input-number v-model="form.sort" :min="0" :max="9999" />
      </t-form-item>
      <t-form-item label="状态">
        <t-select v-model="form.status" :style="{ width: '100%' }">
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
  gap: 6px;
  flex-wrap: wrap;
}

.nodeName {
  font-size: 14px;
  color: var(--td-text-color-primary);
  font-weight: 500;
}

.nodeTag {
  margin-left: 2px;
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
