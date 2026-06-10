<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { apiClient } from '@/utils/apiClient'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'

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
  children?: Menu[]
}

interface MicroApp {
  id: string
  name: string
  url: string
  status: string
}

const menuTree = ref<Menu[]>([])
const microApps = ref<MicroApp[]>([])
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
  const res = await apiClient.get<{ items: MicroApp[] }>('/micro-apps')
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
  }
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入菜单名称')
    return
  }

  if (dialogMode.value === 'create') {
    await apiClient.post('/menus', form.value)
    ElMessage.success('菜单创建成功')
  } else {
    await apiClient.put(`/menus/${editingId.value}`, form.value)
    ElMessage.success('菜单更新成功')
  }
  dialogVisible.value = false
  fetchMenus()
}

async function handleDelete(menu: Menu) {
  await ElMessageBox.confirm(`确认删除菜单「${menu.name}」？如有子菜单需先删除。`, '删除确认', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  })
  await apiClient.delete(`/menus/${menu.id}`)
  ElMessage.success('菜单已删除')
  fetchMenus()
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
      <el-input
        v-model="searchQuery"
        placeholder="搜索菜单名称"
        :prefix-icon="Search"
        clearable
        :class="$style.search"
      />
      <el-button type="primary" :icon="Plus" @click="openCreate(null)">
        新增菜单
      </el-button>
    </div>

    <el-tree
      :data="filteredTree"
      node-key="id"
      :props="{ label: 'name', children: 'children' }"
      :default-expanded-keys="expandedKeys"
      :expand-on-click-node="false"
      :class="$style.tree"
      v-loading="loading"
    >
      <template #default="{ data }">
        <div :class="$style.nodeRow">
          <div :class="$style.nodeInfo">
            <span :class="$style.nodeName">{{ data.name }}</span>
            <el-tag size="small" :type="data.type === 'menu' ? '' : 'warning'" :class="$style.nodeTag">
              {{ typeLabel[data.type] || data.type }}
            </el-tag>
            <el-tag v-if="data.microAppId" size="small" type="success" :class="$style.nodeTag">
              {{ getMicroAppName(data.microAppId) }}
            </el-tag>
            <el-tag v-if="data.permission" size="small" type="info" :class="$style.nodeTag">
              {{ data.permission }}
            </el-tag>
            <el-tag v-if="data.path" size="small" type="info" :class="$style.nodeTag">
              {{ data.path }}
            </el-tag>
            <el-tag v-if="data.status === 'inactive'" size="small" type="warning" :class="$style.nodeTag">
              停用
            </el-tag>
          </div>
          <div :class="$style.nodeActions">
            <el-button text size="small" @click.stop="openCreate(data.id)">添加子菜单</el-button>
            <el-button text size="small" @click.stop="openEdit(data)">编辑</el-button>
            <el-button text size="small" type="danger" @click.stop="handleDelete(data)">删除</el-button>
          </div>
        </div>
      </template>
    </el-tree>

    <div v-if="!loading && filteredTree.length === 0" :class="$style.empty">
      暂无菜单数据
    </div>
  </div>

  <!-- Create/Edit Dialog -->
  <el-dialog
    v-model="dialogVisible"
    :title="dialogMode === 'create' ? '新增菜单' : '编辑菜单'"
    width="520px"
    destroy-on-close
  >
    <el-form label-width="80px">
      <el-form-item label="菜单名称">
        <el-input v-model="form.name" placeholder="请输入菜单名称" />
      </el-form-item>
      <el-form-item label="上级菜单">
        <el-tree-select
          v-model="form.parentId"
          :data="menuTree"
          :props="{ label: 'name', children: 'children', value: 'id' }"
          placeholder="选择上级菜单（留空为顶级）"
          clearable
          check-strictly
          :render-after-expand="false"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="菜单类型">
        <el-radio-group v-model="form.type">
          <el-radio value="menu">菜单</el-radio>
          <el-radio value="button">按钮</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="关联微应用">
        <el-select
          v-model="form.microAppId"
          placeholder="选择微应用（可选）"
          clearable
          style="width: 100%"
        >
          <el-option
            v-for="app in microApps"
            :key="app.id"
            :label="app.name"
            :value="app.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="路由路径">
        <el-input v-model="form.path" placeholder="如：/users、/roles" />
      </el-form-item>
      <el-form-item label="组件路径">
        <el-input v-model="form.component" placeholder="如：views/UserManageView" />
      </el-form-item>
      <el-form-item label="图标">
        <el-input v-model="form.icon" placeholder="图标名称（可选）" />
      </el-form-item>
      <el-form-item label="权限编码">
        <el-input v-model="form.permission" placeholder="如：system:user:list" />
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
  gap: 6px;
  flex-wrap: wrap;
}

.nodeName {
  font-size: 14px;
  color: var(--el-text-color-primary);
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
  color: var(--el-text-color-placeholder);
  font-size: 14px;
}
</style>
