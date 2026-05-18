<script setup lang="ts">
/**
 * FgTreeLayout — 树形+内容双栏布局
 * 左侧树导航，右侧内容区，支持搜索过滤
 */
import { ref, computed } from 'vue'
import { Search } from '@element-plus/icons-vue'

export interface TreeNode {
  id: string
  name: string
  children?: TreeNode[]
  [key: string]: any
}

const props = defineProps<{
  data: TreeNode[]
  title?: string
  width?: string
  showSearch?: boolean
  defaultExpandAll?: boolean
  defaultProps?: {
    label?: string
    children?: string
  }
}>()

const emit = defineEmits<{
  'node-click': [data: TreeNode, node: any]
}>()

const searchText = ref('')
const treeRef = ref<any>(null)

const defaultProps = computed(() => ({
  label: props.defaultProps?.label ?? 'name',
  children: props.defaultProps?.children ?? 'children'
}))

const filteredData = computed(() => {
  if (!searchText.value) return props.data
  return filterTree(props.data, searchText.value.toLowerCase())
})

function filterTree(nodes: TreeNode[], keyword: string): TreeNode[] {
  return nodes.reduce<TreeNode[]>((acc, node) => {
    const children = node.children ? filterTree(node.children, keyword) : []
    if (node.name.toLowerCase().includes(keyword) || children.length > 0) {
      acc.push({ ...node, children: children.length ? children : undefined })
    }
    return acc
  }, [])
}

function handleNodeClick(data: TreeNode, node: any) {
  emit('node-click', data, node)
}
</script>

<template>
  <div class="fg-tree-layout">
    <!-- 左侧树面板 -->
    <div class="fg-tree-layout__sidebar" :style="{ width: width ?? '240px' }">
      <div v-if="title" class="fg-tree-layout__header">{{ title }}</div>

      <div v-if="showSearch !== false" class="fg-tree-layout__search">
        <el-input
          v-model="searchText"
          placeholder="搜索"
          clearable
          :prefix-icon="Search"
        />
      </div>

      <div class="fg-tree-layout__tree">
        <el-tree
          ref="treeRef"
          :data="filteredData"
          :props="defaultProps"
          node-key="id"
          :highlight-current="true"
          :default-expand-all="defaultExpandAll ?? true"
          @node-click="handleNodeClick"
        />
      </div>
    </div>

    <!-- 右侧内容区 -->
    <div class="fg-tree-layout__content">
      <slot />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.fg-tree-layout {
  display: flex;
  height: 100%;
  min-height: 0;

  &__sidebar {
    flex: 0 0 auto;
    border-right: 1px solid #d5dde3;
    display: flex;
    flex-direction: column;
    background: #fff;
  }

  &__header {
    padding: 12px 16px;
    font-size: 15px;
    font-weight: 500;
    color: #333;
    border-bottom: 1px solid #d5dde3;
  }

  &__search {
    padding: 12px 16px;
  }

  &__tree {
    flex: 1;
    overflow-y: auto;
    padding: 0 8px 8px;
  }

  &__content {
    flex: 1;
    min-width: 0;
    padding: 16px;
    background: #f5f7fa;
  }
}
</style>
