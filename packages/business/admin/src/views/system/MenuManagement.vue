<script setup lang="ts">
/**
 * 菜单权限管理 — 左树右表布局
 *
 * 左侧：菜单树（目录 → 菜单 → 按钮）
 * 右侧：选中节点的编辑表单
 */
import { ref, onMounted, computed } from 'vue'
import { apiClient } from '@schema-form/platform-shared/utils/apiClient'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance } from 'element-plus'

interface MenuItem {
  id: string
  parentId: string | null
  name: string
  path: string
  icon: string
  type: 'menu' | 'button'
  permission: string
  sort: number
  status: string
  component: string
  microAppId: string | null
  target: '_self' | '_blank'
  routeType: 'schema' | 'micro-app' | 'link'
  schemaId: string | null
  url: string
  app: string
  children?: MenuItem[]
}

const menuTree = ref<MenuItem[]>([])
const loading = ref(false)
const selectedNode = ref<MenuItem | null>(null)
const isEditing = ref(false)
const formRef = ref<FormInstance>()
const searchQuery = ref('')

const formData = ref<Partial<MenuItem>>({})
const newChildType = ref<'menu' | 'button'>('menu')

const typeOptions = [
  { label: '目录', value: 'menu' },
  { label: '按钮', value: 'button' },
]

const routeTypeOptions = [
  { label: '微应用', value: 'micro-app' },
  { label: 'Schema 页面', value: 'schema' },
  { label: '外部链接', value: 'link' },
]

const appOptions = [
  { label: '通用', value: '' },
  { label: '主应用 (shell)', value: 'shell' },
  { label: '系统管理 (admin)', value: 'admin' },
]

const targetOptions = [
  { label: '当前窗口', value: '_self' },
  { label: '新窗口', value: '_blank' },
]

// 加载菜单树
async function loadMenus() {
  loading.value = true
  try {
    menuTree.value = await apiClient.get<MenuItem[]>('/menus?tree=true')
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '加载菜单失败')
  } finally {
    loading.value = false
  }
}

// 选中节点
function selectNode(node: MenuItem) {
  selectedNode.value = node
  formData.value = { ...node }
  isEditing.value = true
}

// 新增子节点
function addChild(parentNode: MenuItem | null) {
  selectedNode.value = null
  isEditing.value = true
  newChildType.value = parentNode?.type === 'menu' ? 'button' : 'menu'
  formData.value = {
    parentId: parentNode?.id || null,
    name: '',
    path: '',
    icon: '',
    type: newChildType.value,
    permission: '',
    sort: 0,
    status: 'active',
    component: '',
    microAppId: null,
    target: '_self',
    routeType: 'micro-app',
    schemaId: null,
    url: '',
    app: parentNode?.app || '',
  }
}

// 保存
async function handleSave() {
  if (!formData.value.name) {
    ElMessage.warning('请输入菜单名称')
    return
  }

  try {
    if (selectedNode.value) {
      // 更新
      await apiClient.put(`/menus/${selectedNode.value.id}`, formData.value)
      ElMessage.success('更新成功')
    } else {
      // 新增
      await apiClient.post('/menus', formData.value)
      ElMessage.success('创建成功')
    }
    await loadMenus()
    isEditing.value = false
    selectedNode.value = null
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  }
}

// 删除
async function handleDelete() {
  if (!selectedNode.value) return

  try {
    await ElMessageBox.confirm('确定删除该菜单吗？删除后不可恢复。', '确认删除', {
      type: 'warning',
    })
    await apiClient.delete(`/menus/${selectedNode.value.id}`)
    ElMessage.success('删除成功')
    await loadMenus()
    isEditing.value = false
    selectedNode.value = null
  } catch (e: unknown) {
    if (e !== 'cancel') {
      ElMessage.error(e instanceof Error ? e.message : '删除失败')
    }
  }
}

// 取消编辑
function cancelEdit() {
  isEditing.value = false
  selectedNode.value = null
}

// 图标列表（常用图标）
const iconOptions = [
  'Setting', 'User', 'Lock', 'Menu', 'Document', 'Folder',
  'EditPen', 'Connection', 'DataLine', 'List', 'Grid',
  'Bell', 'ChatDotRound', 'Monitor', 'Key', 'Tickets',
  'Management', 'OfficeBuilding', 'Postcard', 'Collection',
]

// 过滤树
const filteredTree = computed(() => {
  if (!searchQuery.value) return menuTree.value
  const query = searchQuery.value.toLowerCase()
  function filterNodes(nodes: MenuItem[]): MenuItem[] {
    return nodes.reduce<MenuItem[]>((acc, node) => {
      const children = node.children ? filterNodes(node.children) : []
      if (node.name.toLowerCase().includes(query) || node.permission.toLowerCase().includes(query)) {
        acc.push({ ...node, children })
      } else if (children.length > 0) {
        acc.push({ ...node, children })
      }
      return acc
    }, [])
  }
  return filterNodes(menuTree.value)
})

onMounted(loadMenus)
</script>

<template>
  <div :class="$style.container">
    <!-- 左侧：菜单树 -->
    <div :class="$style.treePanel">
      <div :class="$style.treeHeader">
        <el-input
          v-model="searchQuery"
          placeholder="搜索菜单..."
          clearable
          size="small"
          prefix-icon="Search"
        />
        <el-button size="small" type="primary" @click="addChild(null)">
          + 新增
        </el-button>
      </div>

      <div :class="$style.treeContent">
        <div v-if="loading" :class="$style.loading">加载中...</div>
        <div v-else-if="filteredTree.length === 0" :class="$style.empty">暂无菜单</div>
        <el-tree
          v-else
          :data="filteredTree"
          :props="{ children: 'children', label: 'name' }"
          node-key="id"
          default-expand-all
          highlight-current
          @node-click="selectNode"
        >
          <template #default="{ node, data }">
            <div :class="$style.treeNode">
              <el-tag v-if="data.type === 'button'" size="small" type="warning">按钮</el-tag>
              <el-tag v-else-if="!data.parentId" size="small" type="success">目录</el-tag>
              <el-tag v-else size="small">菜单</el-tag>
              <span :class="$style.treeLabel">{{ node.label }}</span>
              <span v-if="data.permission" :class="$style.treePerm">{{ data.permission }}</span>
            </div>
          </template>
        </el-tree>
      </div>
    </div>

    <!-- 右侧：编辑表单 -->
    <div :class="$style.formPanel">
      <template v-if="isEditing">
        <div :class="$style.formHeader">
          <h3>{{ selectedNode ? '编辑菜单' : '新增菜单' }}</h3>
          <div>
            <el-button size="small" @click="cancelEdit">取消</el-button>
            <el-button size="small" type="primary" @click="handleSave">保存</el-button>
            <el-button
              v-if="selectedNode"
              size="small"
              type="danger"
              @click="handleDelete"
            >
              删除
            </el-button>
          </div>
        </div>

        <el-form
          ref="formRef"
          :model="formData"
          label-width="100px"
          size="default"
          :class="$style.form"
        >
          <el-form-item label="菜单名称" required>
            <el-input v-model="formData.name" placeholder="请输入菜单名称" />
          </el-form-item>

          <el-form-item label="菜单类型">
            <el-radio-group v-model="formData.type">
              <el-radio value="menu">菜单</el-radio>
              <el-radio value="button">按钮</el-radio>
            </el-radio-group>
          </el-form-item>

          <template v-if="formData.type === 'menu'">
            <el-form-item label="路由路径">
              <el-input v-model="formData.path" placeholder="/admin/users" />
            </el-form-item>

            <el-form-item label="图标">
              <el-select v-model="formData.icon" placeholder="选择图标" clearable filterable>
                <el-option
                  v-for="icon in iconOptions"
                  :key="icon"
                  :label="icon"
                  :value="icon"
                >
                  <span style="display: flex; align-items: center; gap: 8px;">
                    <el-icon><component :is="icon" /></el-icon>
                    <span>{{ icon }}</span>
                  </span>
                </el-option>
              </el-select>
            </el-form-item>

            <el-form-item label="路由类型">
              <el-select v-model="formData.routeType">
                <el-option
                  v-for="opt in routeTypeOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>

            <el-form-item v-if="formData.routeType === 'schema'" label="Schema ID">
              <el-input v-model="formData.schemaId" placeholder="关联的 FormSchema ID" />
            </el-form-item>

            <el-form-item v-if="formData.routeType === 'link'" label="外部链接">
              <el-input v-model="formData.url" placeholder="https://example.com" />
            </el-form-item>

            <el-form-item label="打开方式">
              <el-select v-model="formData.target">
                <el-option
                  v-for="opt in targetOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
          </template>

          <el-form-item label="权限标识">
            <el-input
              v-model="formData.permission"
              :placeholder="formData.type === 'button' ? 'system:user:add' : '（可选）'"
            />
            <div :class="$style.formTip">
              {{ formData.type === 'button' ? '按钮权限标识，必填' : '菜单权限标识，留空则所有用户可见' }}
            </div>
          </el-form-item>

          <el-form-item label="显示排序">
            <el-input-number v-model="formData.sort" :min="0" :max="999" />
          </el-form-item>

          <el-form-item label="所属应用">
            <el-select v-model="formData.app" clearable>
              <el-option
                v-for="opt in appOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="状态">
            <el-radio-group v-model="formData.status">
              <el-radio value="active">启用</el-radio>
              <el-radio value="inactive">停用</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item v-if="!selectedNode" label="新增为">
            <el-button size="small" @click="addChild(selectedNode || undefined)">
              在当前节点下新增子菜单
            </el-button>
          </el-form-item>
        </el-form>
      </template>

      <template v-else>
        <div :class="$style.placeholder">
          <el-icon :size="48"><Management /></el-icon>
          <p>请从左侧选择菜单节点进行编辑</p>
          <p :class="$style.placeholderHint">或点击上方"新增"按钮创建新菜单</p>
        </div>
      </template>
    </div>
  </div>
</template>

<style module>
.container {
  display: flex;
  height: 100%;
  gap: 16px;
  padding: 16px;
  background: var(--bg-color-page);
}

.treePanel {
  width: 360px;
  flex-shrink: 0;
  background: var(--bg-color);
  border-radius: 8px;
  border: 1px solid var(--border-color-lighter);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.treeHeader {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid var(--border-color-lighter);
}

.treeContent {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.treeNode {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  overflow: hidden;
}

.treeLabel {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.treePerm {
  font-size: 11px;
  color: var(--text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
}

.formPanel {
  flex: 1;
  background: var(--bg-color);
  border-radius: 8px;
  border: 1px solid var(--border-color-lighter);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.formHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color-lighter);
}

.formHeader h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.form {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  max-width: 600px;
}

.formTip {
  font-size: 12px;
  color: var(--text-color-secondary);
  margin-top: 4px;
}

.placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-color-secondary);
  gap: 12px;
}

.placeholderHint {
  font-size: 13px;
  opacity: 0.6;
}

.loading, .empty {
  padding: 24px;
  text-align: center;
  color: var(--text-color-secondary);
  font-size: 13px;
}
</style>
