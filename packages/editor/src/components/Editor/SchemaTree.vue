<script setup lang="ts">
/**
 * SchemaTree — Schema 结构树面板
 *
 * 树形展示 schema 结构，支持：
 * - 容器节点可展开/折叠
 * - 点击节点选中对应画布组件
 * - 双向同步选中状态
 * - 可见性/锁定快捷操作（hover 显示）
 * - 拖拽排序
 */
import { computed, watch, ref } from 'vue'
import type { PartialWidget, SchemaType } from '@/components/WidgetRenderer/types'
import { buildSchemaTree } from '@/utils/schemaTransform'
import type { SchemaTreeNode } from '@/utils/schemaTransform'
import { BASIC_TYPES, BUSINESS_TYPES } from '@/composables/useConstant'

const props = defineProps<{
  schema: PartialWidget[]
  selectedPath: number[] | null
}>()

const emit = defineEmits<{
  'select': [path: number[]]
  'reorder': [payload: { sourcePath: number[]; targetPath: number[]; position: 'before' | 'after' | 'inside' }]
  'toggle-hidden': [path: number[], hidden: boolean]
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
  return true
}

/** Get the category of a component type for nesting validation */
function getCategory(type: SchemaType): 'basic' | 'business' | 'layout' {
  if (BASIC_TYPES.has(type)) return 'basic'
  if (BUSINESS_TYPES.has(type)) return 'business'
  return 'layout'
}

function allowDrop(draggingNode: SchemaTreeNode, dropNode: SchemaTreeNode, type: 'prev' | 'next' | 'inner'): boolean {
  const dragPath = draggingNode.path.join(',')
  const dropPath = dropNode.path.join(',')
  if (dragPath === dropPath) return false
  if (dropPath.startsWith(dragPath + ',')) return false
  if (type === 'inner') {
    if (!dropNode.isContainer) return false
    // Nesting rule: basic/business components cannot nest inside each other
    const dragCat = getCategory(draggingNode.type)
    const dropCat = getCategory(dropNode.type)
    if (dragCat !== 'layout' && dropCat !== 'layout' && dragCat !== dropCat) return false
    return true
  }
  // For 'prev'/'after' drops, the parent of dropNode is the container
  // Find the parent node from the tree data
  const parentPath = dropNode.path.slice(0, -1)
  if (parentPath.length === 0) return true // dropping at root level
  const parentNode = findNodeByPath(treeData.value, parentPath)
  if (!parentNode) return true
  const dragCat = getCategory(draggingNode.type)
  const parentCat = getCategory(parentNode.type)
  if (dragCat !== 'layout' && parentCat !== 'layout' && dragCat !== parentCat) return false
  return true
}

/** Find a node in the tree by its path */
function findNodeByPath(nodes: SchemaTreeNode[], path: number[]): SchemaTreeNode | null {
  let current: SchemaTreeNode | undefined = nodes[path[0]]
  for (let i = 1; i < path.length; i++) {
    if (!current?.children) return null
    current = current.children[path[i]]
  }
  return current ?? null
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
    'card': '卡片', 'title': '标题', 'divider': '分割线', 'spacer': '间距',
    'tabs': '标签页',
    'input': '输入框', 'number': '数字', 'select': '下拉选择', 'radio': '单选',
    'checkbox': '多选', 'date': '日期',
    'textarea': '多行文本', 'richtext': '富文本',
    'button-list': '按钮', 'toolbar-buttons': '工具栏按钮', 'upload': '上传',
    'table': '表格', 'file-list': '文件列表',
    'transfer': '穿梭框',
    'banner': '横幅', 'tree-layout': '树形',
    'date-time-slot': '日期时段', 'dialog': '弹窗', 'search-list': '搜索列表',
  }
  return map[type] ?? type
}

// ---- Tree data ----
const treeData = computed(() => buildSchemaTree(props.schema))

// ---- Track expanded state ----
const expandedKeys = ref<Set<string>>(new Set())

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

// ---- Locked state (editor-only, not persisted in schema) ----
const lockedNodes = ref<Set<string>>(new Set())

function isLocked(nodeId: string): boolean {
  return lockedNodes.value.has(nodeId)
}

function toggleLock(nodeId: string) {
  const next = new Set(lockedNodes.value)
  if (next.has(nodeId)) {
    next.delete(nodeId)
  } else {
    next.add(nodeId)
  }
  lockedNodes.value = next
}

// ---- Hidden state helpers ----
function isHidden(data: SchemaTreeNode): boolean {
  // Walk the schema to find the hidden flag
  const item = getSchemaItemByPath(props.schema, data.path)
  return item?.hidden === true
}

function getSchemaItemByPath(items: PartialWidget[], path: number[]): PartialWidget | undefined {
  if (path.length === 0) return undefined
  let current: PartialWidget | undefined = items[path[0]]
  for (let i = 1; i < path.length; i++) {
    if (!current?.children) return undefined
    current = current.children[path[i]]
  }
  return current
}

function handleToggleHidden(data: SchemaTreeNode, e: Event) {
  e.stopPropagation()
  const currentlyHidden = isHidden(data)
  emit('toggle-hidden', data.path, !currentlyHidden)
}

// ---- Node icon mapping ----
const NODE_ICONS: Record<string, string> = {
  'card': '🃏', 'title': 'T', 'divider': '—', 'spacer': '␣',
  'tabs': '📑', 'input': '✏️', 'number': '#',
  'select': '▼', 'radio': '◉', 'checkbox': '☑', 'date': '📅',
  'textarea': '📝', 'richtext': '📰',
  'toolbar-buttons': '🔧', 'upload': '📤', 'table': '📊',
}

function getNodeIcon(type: SchemaType): string {
  return NODE_ICONS[type] ?? '▪'
}

// ---- Event handlers ----
function handleNodeClick(node: SchemaTreeNode) {
  if (isLocked(node.id)) return
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
  <div class="schema-tree" style="overflow: auto; height: 100%;">
    <div v-if="treeData.length === 0" class="schema-tree__empty">
      <p>暂无组件</p>
    </div>
    <t-tree
      v-else
      :data="treeData"
      :keys="{ label: 'label', children: 'children', value: 'id' }"
      :expanded="expandedArray"
      :expand-on-click-node="false"
      activable
      :actived="[selectedKey]"
      draggable
      :allow-drop="allowDrop"
      @active="handleNodeClick"
      @drag-start="handleNodeDragStart"
      @drag-end="handleNodeDragEnd"
      @drop="handleNodeDrop"
    >
      <template #label="{ data }">
        <div
          class="schema-tree__node"
          :class="{
            'schema-tree__node--selected': selectedKey === data.id,
            'schema-tree__node--container': data.isContainer,
            'schema-tree__node--hidden': isHidden(data),
            'schema-tree__node--locked': isLocked(data.id),
          }"
        >
          <span
            v-if="data.isContainer && data.children.length > 0"
            class="schema-tree__expand-icon"
            @mousedown.stop
            @click.stop="handleToggleExpand(data)"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path v-if="expandedKeys.has(data.id)" d="M2 3.5l3 3 3-3z"/>
              <path v-else d="M3.5 2l3 3-3 3z"/>
            </svg>
          </span>
          <span v-else class="schema-tree__expand-icon schema-tree__expand-icon--placeholder" />

          <span class="schema-tree__type-icon">{{ getNodeIcon(data.type) }}</span>

          <span class="schema-tree__type-badge">{{ getTypeZh(data.type) }}</span>

          <span v-if="data.field" class="schema-tree__field">{{ data.field }}</span>

          <!-- Hover actions -->
          <span class="schema-tree__actions">
            <button
              class="schema-tree__action-btn"
              title="切换可见性"
              @click="handleToggleHidden(data, $event)"
            >
              <svg v-if="isHidden(data)" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 8s3-5.5 7-5.5S15 8 15 8s-3 5.5-7 5.5S1 8 1 8z"/>
                <circle cx="8" cy="8" r="2.5"/>
                <line x1="2" y1="14" x2="14" y2="2"/>
              </svg>
              <svg v-else width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 8s3-5.5 7-5.5S15 8 15 8s-3 5.5-7 5.5S1 8 1 8z"/>
                <circle cx="8" cy="8" r="2.5"/>
              </svg>
            </button>
            <button
              class="schema-tree__action-btn"
              :class="{ 'schema-tree__action-btn--locked': isLocked(data.id) }"
              title="切换锁定"
              @mousedown.stop
              @click.stop="toggleLock(data.id)"
            >
              <svg v-if="isLocked(data.id)" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="7" width="10" height="7" rx="1.5"/>
                <path d="M5 7V5a3 3 0 016 0v2"/>
              </svg>
              <svg v-else width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="7" width="10" height="7" rx="1.5"/>
                <path d="M5 7V5a3 3 0 016 0v2"/>
                <line x1="8" y1="10" x2="8" y2="12"/>
              </svg>
            </button>
          </span>
        </div>
      </template>
    </t-tree>
  </div>
</template>

<style scoped lang="scss">
.schema-tree {
  width: 100%;
  height: 100%;
  padding: 4px 0;

  &__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 80px;
    color: #c0c4cc;
    font-size: 12px;
  }

  :deep(.t-tree) {
    background: transparent;

    .t-tree__item {
      height: auto;
      padding: 3px 8px 3px 0;
    }

    .t-tree__icon {
      display: none !important;
      width: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
    }

    .t-tree__item--active > .t-tree__item-content {
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
    position: relative;

    &--selected {
      color: var(--td-brand-color);
    }

    &--container {
      font-weight: 500;
    }

    &--hidden {
      opacity: 0.45;
    }

    &--locked {
      cursor: not-allowed;
    }
  }

  &__expand-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    color: #909399;
    cursor: pointer;
    flex-shrink: 0;
    user-select: none;

    &:hover { color: var(--td-brand-color); }

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
    padding: 1px 5px;
    font-size: 11px;
    background: #f0f2f5;
    border-radius: 3px;
    color: #606266;
    white-space: nowrap;
    max-width: 80px;
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
    flex: 1;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 2px;
    opacity: 0;
    transition: opacity 0.15s;
    flex-shrink: 0;
    margin-left: auto;
  }

  &__node:hover &__actions {
    opacity: 1;
  }

  &__action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border: none;
    background: transparent;
    color: #909399;
    cursor: pointer;
    border-radius: 3px;
    transition: all 0.15s;

    &:hover {
      background: #f0f2f5;
      color: #606266;
    }

    &--locked {
      color: #e6a23c;
    }
  }
}
</style>
