<script setup lang="ts">
/**
 * WidgetTree — Widget 结构树面板
 *
 * 树形展示画布内所有 Widget 的层级结构，支持：
 * - 容器节点可展开/折叠
 * - 点击节点选中对应画布部件
 * - 双向同步选中状态
 */
import { computed, ref, watch } from 'vue'
import { useWidgetStore } from '../../stores/widget'
import { useEditorStore } from '../../stores/editor'
import type { Widget } from '../../widgets/base/types'
import { getWidget } from '../../widgets/registry'

const widgetStore = useWidgetStore()
const editorStore = useEditorStore()

// ---- 树节点类型 ----

interface TreeNode {
  id: string
  label: string
  type: string
  isContainer: boolean
  children: TreeNode[]
  widget: Widget
}

// ---- 构建树 ----

function buildTree(widgets: Widget[]): TreeNode[] {
  return widgets.map(w => ({
    id: w.id,
    label: w.label || getWidget(w.type)?.displayName || w.type,
    type: w.type,
    isContainer: ['form', 'card', 'row-col', 'tabs', 'dialog'].includes(w.type),
    children: w.children?.length ? buildTree(w.children) : [],
    widget: w,
  }))
}

const treeData = computed(() => buildTree(widgetStore.widgets))

// ---- 展开状态 ----

const expandedKeys = ref<Set<string>>(new Set())

watch(treeData, (nodes) => {
  const keys = new Set<string>()
  function expandAll(items: TreeNode[]) {
    for (const n of items) {
      if (n.isContainer && n.children.length) {
        keys.add(n.id)
        expandAll(n.children)
      }
    }
  }
  expandAll(nodes)
  expandedKeys.value = keys
}, { immediate: true })

const expandedArray = computed(() => Array.from(expandedKeys.value))

function toggleExpand(node: TreeNode) {
  if (expandedKeys.value.has(node.id)) {
    expandedKeys.value.delete(node.id)
  } else {
    expandedKeys.value.add(node.id)
  }
}

// ---- 选中 ----

const selectedId = computed(() => editorStore.selectedId || '')

function handleNodeClick(node: TreeNode) {
  editorStore.select(node.id)
}

// ---- 类型图标 ----

const TYPE_ICONS: Record<string, string> = {
  form: '📋', card: '🃏', 'row-col': '▥', tabs: '📑', dialog: '💬',
  input: '✏️', select: '▼', number: '#', radio: '◉', checkbox: '☑',
  date: '📅', textarea: '📝', 'button-list': '🔘', title: 'T',
  divider: '—', spacer: '␣', 'toolbar-buttons': '🔧', table: '📊', button: '🖱️',
}

function getIcon(type: string): string {
  return TYPE_ICONS[type] ?? '▪'
}
</script>

<template>
  <div :class="$style.tree">
    <div v-if="treeData.length === 0" :class="$style.empty">
      暂无部件
    </div>
    <el-tree
      v-else
      :data="treeData"
      :props="{ label: 'label', children: 'children' }"
      node-key="id"
      :default-expanded-keys="expandedArray"
      :highlight-current="true"
      :current-node-key="selectedId"
      :expand-on-click-node="false"
    >
      <template #default="{ data }">
        <div
          :class="[
            $style.node,
            { [$style.nodeSelected]: selectedId === data.id },
          ]"
          @click="handleNodeClick(data)"
        >
          <!-- 展开箭头 -->
          <span
            v-if="data.isContainer && data.children.length"
            :class="$style.expandBtn"
            @click.stop="toggleExpand(data)"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path v-if="expandedKeys.has(data.id)" d="M2 3.5l3 3 3-3z"/>
              <path v-else d="M3.5 2l3 3-3 3z"/>
            </svg>
          </span>
          <span v-else :class="[$style.expandBtn, $style.expandPlaceholder]" />

          <!-- 图标 -->
          <span :class="$style.icon">{{ getIcon(data.type) }}</span>

          <!-- 类型标签 -->
          <span :class="$style.badge">{{ data.label }}</span>

          <!-- 字段名 -->
          <span v-if="data.widget.field" :class="$style.field">{{ data.widget.field }}</span>
        </div>
      </template>
    </el-tree>
  </div>
</template>

<style module>
.tree {
  width: 100%;
  height: 100%;

  :deep(.el-tree) {
    background: transparent;

    .el-tree-node__content {
      height: auto;
      padding: 3px 8px 3px 0;
    }

    /* 隐藏 el-tree 自带展开图标 */
    .el-tree-node__expand-icon {
      display: none;
    }

    .el-tree-node.is-current > .el-tree-node__content {
      background-color: var(--el-color-primary-light-9);
    }
  }
}

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80px;
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}

.node {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 0;
  min-width: 0;
  width: 100%;
  cursor: pointer;
}

.nodeSelected {
  color: var(--el-color-primary);
}

.expandBtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.expandPlaceholder {
  visibility: hidden;
}

.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  font-size: 12px;
  flex-shrink: 0;
}

.badge {
  display: inline-block;
  padding: 1px 5px;
  font-size: 11px;
  background: var(--el-fill-color-light);
  border-radius: 3px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}

.field {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
}
</style>
