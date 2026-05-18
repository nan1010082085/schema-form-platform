<script setup lang="ts">
/**
 * FgDeptSelect — 部门选择组件
 * 支持单选/多选，树形展示，搜索过滤
 */
import { ref, computed, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'

export interface DeptNode {
  id: string
  name: string
  children?: DeptNode[]
  [key: string]: any
}

/** Mock department tree — 3-level structure */

const props = defineProps<{
  modelValue?: string | string[]
  visible: boolean
  data: DeptNode[]
  multiple?: boolean
  title?: string
  defaultProps?: {
    label?: string
    children?: string
  }
}>()

/** Fall back to mock department tree when props.data is empty */

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'update:modelValue': [value: string | string[]]
  'confirm': [value: string | string[], node: DeptNode | DeptNode[]]
  'close': []
}>()

const searchText = ref('')
const selectedKeys = ref<string[]>([])
const treeRef = ref<any>(null)

const defaultProps = computed(() => ({
  label: props.defaultProps?.label ?? 'name',
  children: props.defaultProps?.children ?? 'children'
}))

const filteredData = computed(() => {
  if (!searchText.value) return props.data
  return filterTree(props.data, searchText.value.toLowerCase())
})

function filterTree(nodes: DeptNode[], keyword: string): DeptNode[] {
  return nodes.reduce<DeptNode[]>((acc, node) => {
    const children = node.children ? filterTree(node.children, keyword) : []
    if (node.name.toLowerCase().includes(keyword) || children.length > 0) {
      acc.push({ ...node, children: children.length ? children : undefined })
    }
    return acc
  }, [])
}

watch(() => props.visible, (val) => {
  if (val) {
    searchText.value = ''
    if (props.modelValue) {
      selectedKeys.value = Array.isArray(props.modelValue) ? [...props.modelValue] : [props.modelValue]
    } else {
      selectedKeys.value = []
    }
  }
})

function handleConfirm() {
  if (props.multiple) {
    emit('update:modelValue', selectedKeys.value)
    const nodes = findNodesByKeys(props.data, selectedKeys.value)
    emit('confirm', selectedKeys.value, nodes)
  } else {
    const key = selectedKeys.value[0] ?? ''
    emit('update:modelValue', key)
    const node = findNodeByKey(props.data, key)
    emit('confirm', key, node!)
  }
  emit('update:visible', false)
}

function handleClose() {
  emit('update:visible', false)
  emit('close')
}

function handleCheck() {
  if (treeRef.value) {
    selectedKeys.value = props.multiple
      ? treeRef.value.getCheckedKeys()
      : treeRef.value.getCurrentKey() ? [treeRef.value.getCurrentKey()] : []
  }
}

function handleCurrentChange(_data: unknown, node: { key: string }) {
  if (!props.multiple) selectedKeys.value = [node.key]
}

function findNodeByKey(nodes: DeptNode[], key: string): DeptNode | undefined {
  for (const node of nodes) {
    if (node.id === key) return node
    if (node.children) {
      const found = findNodeByKey(node.children, key)
      if (found) return found
    }
  }
  return undefined
}

function findNodesByKeys(nodes: DeptNode[], keys: string[]): DeptNode[] {
  const result: DeptNode[] = []
  for (const node of nodes) {
    if (keys.includes(node.id)) result.push(node)
    if (node.children) result.push(...findNodesByKeys(node.children, keys))
  }
  return result
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="title ?? '选择部门'"
    width="480px"
    class="fg-dialog"
    @close="handleClose"
  >
    <div class="fg-dept-select">
      <!-- 搜索 -->
      <div class="fg-dept-select__search">
        <el-input
          v-model="searchText"
          placeholder="搜索部门"
          clearable
          :prefix-icon="Search"
        />
      </div>

      <!-- 部门树 -->
      <div class="fg-dept-select__tree">
        <el-tree
          ref="treeRef"
          :data="filteredData"
          :props="defaultProps"
          node-key="id"
          :show-checkbox="multiple"
          :check-strictly="true"
          :highlight-current="!multiple"
          :default-expand-all="true"
          @check="handleCheck"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleConfirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.fg-dept-select {
  &__search {
    margin-bottom: 12px;
  }

  &__tree {
    max-height: 400px;
    overflow-y: auto;
    border: 1px solid #d5dde3;
    border-radius: 2px;
    padding: 8px;
  }
}
</style>
