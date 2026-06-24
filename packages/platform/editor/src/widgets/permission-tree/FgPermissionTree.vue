<script setup lang="ts">
import { inject, computed, ref } from 'vue'
import { widgetDataKey, widgetStyleKey } from '../base/types'
import { useWidgetRenderState } from '../../composables/useWidgetRenderState'
import { useExposeWidget } from '../../composables/useExposeWidget'
import { Menu, Setting } from '@element-plus/icons-vue'
import styles from './style.module.scss'

const widgetData = inject(widgetDataKey)!
const widgetStyle = inject(widgetStyleKey)!
const { isDisabled } = useWidgetRenderState()

const treeRef = ref()

// 暴露 checkedKeys 给联动系统
useExposeWidget(() => ({
  get checkedKeys() {
    return treeRef.value?.getCheckedKeys() ?? []
  },
}))

// 节点数据
const treeData = computed(() => {
  const data = widgetData.value.props?.data
  if (Array.isArray(data) && data.length > 0) return data
  // 编辑器模式：展示示例数据
  return [
    {
      id: 'system',
      label: '系统管理',
      type: 'menu',
      children: [
        { id: 'user', label: '用户管理', type: 'menu' },
        { id: 'role', label: '角色管理', type: 'menu' },
        { id: 'menu', label: '菜单管理', type: 'menu' },
      ],
    },
    {
      id: 'form',
      label: '表单管理',
      type: 'menu',
      children: [
        { id: 'form_list', label: '表单列表', type: 'menu' },
        { id: 'form_create', label: '新建表单', type: 'button' },
        { id: 'form_edit', label: '编辑表单', type: 'button' },
        { id: 'form_delete', label: '删除表单', type: 'button' },
      ],
    },
  ]
})

// 树配置
const treeProps = computed(() => {
  const props = widgetData.value.props?.props
  return {
    children: (props?.children as string) || 'children',
    label: (props?.label as string) || 'label',
  }
})

const nodeKey = computed(() => (widgetData.value.props?.nodeKey as string) || 'id')
const showCheckbox = computed(() => Boolean(widgetData.value.props?.showCheckbox))
const checkStrictly = computed(() => Boolean(widgetData.value.props?.checkStrictly))
const defaultExpandAll = computed(() => Boolean(widgetData.value.props?.defaultExpandAll ?? true))

// 动态样式
const dynamicStyle = computed(() => {
  const s: Record<string, string> = {}
  if (widgetStyle.value?.fontSize) s.fontSize = widgetStyle.value.fontSize as string
  if (widgetStyle.value?.color) s.color = widgetStyle.value.color as string
  if (widgetStyle.value?.backgroundColor) s.backgroundColor = widgetStyle.value.backgroundColor as string
  return s
})

// 节点图标
function getNodeIcon(data: { type?: string }) {
  return data.type === 'button' ? Setting : Menu
}

function getNodeIconClass(data: { type?: string }) {
  return data.type === 'button' ? styles.buttonIcon : styles.menuIcon
}
</script>

<template>
  <div :class="styles.container" :style="dynamicStyle">
    <el-tree
      ref="treeRef"
      :data="treeData"
      :props="treeProps"
      :node-key="nodeKey"
      :show-checkbox="showCheckbox"
      :check-strictly="checkStrictly"
      :default-expand-all="defaultExpandAll"
      :disabled="isDisabled"
      highlight-current
    >
      <template #default="{ data }">
        <span :class="styles.nodeContent">
          <el-icon :class="[styles.nodeIcon, getNodeIconClass(data)]">
            <component :is="getNodeIcon(data)" />
          </el-icon>
          <span :class="styles.label">{{ data.label }}</span>
        </span>
      </template>
    </el-tree>
  </div>
</template>
