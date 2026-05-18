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
}>()

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
      @node-click="handleNodeClick"
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

          <span class="schema-tree__type-badge">{{ data.type }}</span>

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
