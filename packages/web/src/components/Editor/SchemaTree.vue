<script setup lang="ts">
/**
 * SchemaTree — Schema 结构树面板 (Sprint 10)
 *
 * 树形展示 schema 结构，支持：
 * - 容器节点可展开/折叠
 * - 点击节点选中对应画布组件
 * - 双向同步选中状态
 * - 显示节点类型标识、标签、字段名
 */
import { computed, watch, ref } from 'vue'
import type { FormSchemaItem, SchemaType } from '@/components/FormGrid/types'
import { buildSchemaTree } from '@/utils/schemaTransform'
import type { SchemaTreeNode } from '@/utils/schemaTransform'

const props = defineProps<{
  schema: FormSchemaItem[]
  selectedPath: number[] | null
}>()

const emit = defineEmits<{
  'select': [path: number[]]
  'reorder': [payload: { sourcePath: number[]; targetPath: number[]; position: 'before' | 'after' | 'inside' }]
}>()

// ---- Drag state ----
const dragNodePath = ref<number[] | null>(null)

function handleNodeDragStart(node: SchemaTreeNode) {
  dragNodePath.value = node.path
}

function handleNodeDragEnd() {
  dragNodePath.value = null
}

function allowDrag(_node: SchemaTreeNode): boolean {
  // 允许拖拽所有节点
  return true
}

function allowDrop(draggingNode: SchemaTreeNode, dropNode: SchemaTreeNode, type: 'prev' | 'next' | 'inner'): boolean {
  // 禁止拖入自身或其子节点
  const dragPath = draggingNode.path.join(',')
  const dropPath = dropNode.path.join(',')
  if (dragPath === dropPath) return false
  if (dropPath.startsWith(dragPath + ',')) return false
  // 仅容器节点允许拖入内部(inner)
  if (type === 'inner') return dropNode.isContainer
  return true
}

function handleNodeDrop(draggingNode: SchemaTreeNode, dropNode: SchemaTreeNode, dropType: 'before' | 'after' | 'inner', _event: DragEvent) {
  const sourcePath = draggingNode.path
  let targetPath: number[]
  let position: 'before' | 'after' | 'inside'

  if (dropType === 'inner') {
    targetPath = [...dropNode.path, 0]
    position = 'inside'
  } else if (dropType === 'before') {
    targetPath = [...dropNode.path]
    // adjust: insert at the position, shift dropNode down
    const last = targetPath[targetPath.length - 1]
    targetPath[targetPath.length - 1] = last
    position = 'before'
  } else {
    targetPath = [...dropNode.path]
    targetPath[targetPath.length - 1] = dropNode.path[dropNode.path.length - 1] + 1
    position = 'after'
  }

  emit('reorder', { sourcePath, targetPath, position })
  dragNodePath.value = null
}

function getTypeZh(type: string): string {
  const map: Record<string, string> = {
    'grid-row': '行', 'grid-col': '列', 'page': '页', 'card': '卡片',
    'toolbar': '工具栏', 'title': '标题', 'divider': '分割线', 'spacer': '间距',
    'steps': '步骤条', 'tabs': '标签页',
    'input': '输入框', 'number': '数字', 'select': '下拉选择', 'radio': '单选',
    'checkbox': '多选', 'date': '日期', 'date-range': '日期范围',
    'textarea': '多行文本', 'richtext': '富文本',
    'button-list': '按钮', 'toolbar-buttons': '工具栏按钮', 'upload': '上传',
    'table': '表格', 'pagination': '分页', 'file-list': '文件列表',
    'person-select': '人员', 'dept-select': '部门', 'transfer': '穿梭框',
    'detail-form': '详情', 'banner': '横幅', 'tree-layout': '树形',
    'date-time-slot': '日期时段', 'dialog': '弹窗', 'search-list': '搜索列表',
  }
  return map[type] ?? type
}

// ---- Tree data ----
const treeData = computed(() => buildSchemaTree(props.schema))

// ---- Track expanded state ----
const expandedKeys = ref<Set<string>>(new Set())

// When schema changes, expand all container nodes
watch(
  () => treeData.value,
  (nodes) => {
    const newExpanded = new Set<string>()
    function expandContainers(items: SchemaTreeNode[]) {
      for (const node of items) {
        if (node.isContainer && node.children.length > 0) {
          newExpanded.add(node.id)
          expandContainers(node.children)
        }
      }
    }
    expandContainers(nodes)
    // Keep previously expanded nodes that still exist
    expandedKeys.value = newExpanded
  },
  { immediate: true },
)

const expandedArray = computed(() => Array.from(expandedKeys.value))

// ---- Selected node key ----
const selectedKey = computed(() => {
  if (!props.selectedPath) return ''
  return props.selectedPath.join('-')
})

// ---- Node icon mapping ----
const NODE_ICONS: Record<string, string> = {
  'grid-row': '蔊',
  'grid-col': '▥',
  'page': '📄',
  'toolbar': '🔧',
  'card': '🃏',
  'title': 'T',
  'divider': '—',
  'spacer': '␣',
  'steps': '👣',
  'tabs': '📑',
  'input': '✏️',
  'number': '#',
  'select': '▼',
  'radio': '◉',
  'checkbox': '☑',
  'date': '📅',
  'date-range': '📅',
  'textarea': '📝',
  'richtext': '📰',
  'button-list': '🔘',
  'upload': '📤',
  'table': '📊',
  'pagination': '📑',
}

function getNodeIcon(type: SchemaType): string {
  return NODE_ICONS[type] ?? '▪'
}

// ---- Event handlers ----
function handleNodeClick(node: SchemaTreeNode) {
  emit('select', node.path)
}

function handleToggleExpand(node: SchemaTreeNode) {
  if (expandedKeys.value.has(node.id)) {
    expandedKeys.value.delete(node.id)
  } else {
    expandedKeys.value.add(node.id)
  }
}
</script>

<template>
  <el-scrollbar class="schema-tree">
    <div v-if="treeData.length === 0" class="schema-tree__empty">
      <p>暂无组件</p>
    </div>
    <el-tree
      v-else
      :data="treeData"
      :props="{ label: 'label', children: 'children' }"
      node-key="id"
      :default-expanded-keys="expandedArray"
      :highlight-current="true"
      :current-node-key="selectedKey"
      :expand-on-click-node="false"
      draggable
      :allow-drag="allowDrag"
      :allow-drop="allowDrop"
      @node-click="handleNodeClick"
      @node-drag-start="handleNodeDragStart"
      @node-drag-end="handleNodeDragEnd"
      @node-drop="handleNodeDrop"
    >
      <template #default="{ node: _node, data }">
        <div
          class="schema-tree__node"
          :class="{
            'schema-tree__node--selected': selectedKey === data.id,
            'schema-tree__node--container': data.isContainer,
          }"
        >
          <span
            v-if="data.isContainer && data.children.length > 0"
            class="schema-tree__expand-icon"
            @click.stop="handleToggleExpand(data)"
          >
            {{ expandedKeys.has(data.id) ? '▼' : '▶' }}
          </span>
          <span v-else class="schema-tree__expand-icon schema-tree__expand-icon--placeholder" />

          <span class="schema-tree__type-icon">{{ getNodeIcon(data.type) }}</span>

          <span class="schema-tree__type-badge">{{ getTypeZh(data.type) }}</span>

          <span v-if="data.field" class="schema-tree__field">{{ data.field }}</span>
        </div>
      </template>
    </el-tree>
  </el-scrollbar>
</template>

<style scoped lang="scss">
.schema-tree {
  width: 100%;
  height: 100%;
  padding: 8px 0;

  &__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100px;
    color: #909399;
    font-size: 13px;
  }

  :deep(.el-tree) {
    background: transparent;

    .el-tree-node__content {
      height: auto;
      padding: 4px 8px 4px 0;
    }

    .el-tree-node.is-current > .el-tree-node__content {
      background-color: #ecf5ff;
    }
  }

  &__node {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 0;
    min-width: 0;
    width: 100%;

    &--selected {
      color: #409eff;
    }

    &--container {
      font-weight: 500;
    }
  }

  &__expand-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    font-size: 10px;
    color: #909399;
    cursor: pointer;
    flex-shrink: 0;
    user-select: none;

    &:hover {
      color: #409eff;
    }

    &--placeholder {
      cursor: default;
      visibility: hidden;
    }
  }

  &__type-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    font-size: 12px;
    flex-shrink: 0;
  }

  &__type-badge {
    display: inline-block;
    padding: 1px 6px;
    font-size: 11px;
    background: #f0f2f5;
    border-radius: 3px;
    color: #606266;
    white-space: nowrap;
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    flex-shrink: 0;
  }

  &__field {
    font-size: 11px;
    color: #909399;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
}
</style>
