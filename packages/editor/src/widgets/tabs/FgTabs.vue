<script setup lang="ts">
/**
 * FgTabs — 页签容器 Widget
 *
 * 职责：
 * - el-tabs 包裹，支持多标签页
 * - 渲染 tab headers（标签头）
 * - 子组件由 SchemaNode 的 childrenLayer 渲染（绝对定位，位置正确）
 *
 * 说明：
 * - FgTabs 只渲染 tab 结构，不渲染子组件
 * - 子组件通过 SchemaNode 的 childrenLayer 以绝对坐标定位
 */
import { inject, ref, computed } from 'vue'
import { widgetDataKey } from '../base/types'
import { useExposeWidget } from '../../composables/useExposeWidget'
import styles from './style.module.scss'

const widgetData = inject(widgetDataKey)!
useExposeWidget(() => ({
  get activeKey() { return activeKey.value },
}))

interface TabItem {
  key: string
  label: string
}

const tabs = computed<TabItem[]>(() => {
  const raw = widgetData.value.props?.tabs
  return Array.isArray(raw) ? raw as TabItem[] : []
})

const activeKey = ref((widgetData.value.props?.activeKey as string) || tabs.value[0]?.key || 'tab1')

const tabType = computed(() => {
  const t = widgetData.value.props?.type as string
  return t === 'card' ? 'card' : undefined
})

const tabPosition = computed(() => {
  const pos = widgetData.value.props?.tabPosition as string
  return ['top', 'right', 'bottom', 'left'].includes(pos)
    ? pos as 'top' | 'right' | 'bottom' | 'left'
    : 'top'
})

defineExpose({ activeKey })
</script>

<template>
  <el-tabs
    :class="styles.tabsContainer"
    v-model="activeKey"
    :type="tabType"
    :tab-position="tabPosition"
  >
    <el-tab-pane
      v-for="tab in tabs"
      :key="tab.key"
      :label="tab.label"
      :name="tab.key"
    />
  </el-tabs>
</template>
