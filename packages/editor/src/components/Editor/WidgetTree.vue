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
import styles from './WidgetTree.module.scss'

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
    isContainer: ['form', 'card', 'tabs', 'dialog', 'single-col', 'double-col', 'triple-col', 'quad-col'].includes(w.type),
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
  form: '📋', card: '🃏', tabs: '📑', dialog: '💬',
  'single-col': '▐', 'double-col': '▌▐', 'triple-col': '▌▐▌', 'quad-col': '▌▐▌▐',
  input: '✏️', select: '▼', number: '#', radio: '◉', checkbox: '☑',
  date: '📅', textarea: '📝', title: 'T',
  divider: '—', spacer: '␣', 'toolbar-buttons': '🔧', table: '📊', button: '🖱️',
}

function getIcon(type: string): string {
  return TYPE_ICONS[type] ?? '▪'
}
</script>

<template>
  <div :class="styles.tree" style="overflow: auto; height: 100%;">
    <div v-if="treeData.length === 0" :class="styles.empty">
      暂无部件
    </div>
    <t-tree
      v-else
      :data="treeData"
      :keys="{ label: 'label', children: 'children', value: 'id' }"
      :expanded="expandedArray"
      :expand-on-click-node="false"
      activable
      :actived="[selectedId]"
      @active="handleNodeClick"
    >
      <template #label="{ data }">
        <div
          :class="[
            styles.node,
            { [styles.nodeSelected]: selectedId === data.id },
          ]"
          @click="handleNodeClick(data)"
        >
          <!-- 展开箭头 -->
          <span
            v-if="data.isContainer && data.children.length"
            :class="styles.expandBtn"
            @click.stop="toggleExpand(data)"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path v-if="expandedKeys.has(data.id)" d="M2 3.5l3 3 3-3z"/>
              <path v-else d="M3.5 2l3 3-3 3z"/>
            </svg>
          </span>
          <span v-else :class="[styles.expandBtn, styles.expandPlaceholder]" />

          <!-- 图标 -->
          <span :class="styles.icon">{{ getIcon(data.type) }}</span>

          <!-- 类型标签 -->
          <span :class="styles.badge">{{ data.label }}</span>

          <!-- 字段名 -->
          <span v-if="data.widget.field" :class="styles.field">{{ data.widget.field }}</span>
        </div>
      </template>
    </t-tree>
  </div>
</template>

