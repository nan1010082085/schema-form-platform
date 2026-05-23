<script setup lang="ts">
/**
 * FgRowCol — 行列容器 Widget
 *
 * 职责：
 * - el-row + el-col 布局
 * - 按 colIndex 分组渲染子组件
 * - 支持 1-4 列布局
 *
 * 说明：
 * - 通过 widgetData.children 按 colIndex 分组
 * - 使用 SchemaRender 渲染每列的子组件
 */
import { inject, computed } from 'vue'
import { widgetDataKey } from '../base/types'
import type { Widget } from '../base/types'
import SchemaRender from '../../components/WidgetRenderer/SchemaRender.vue'
import styles from './style.module.scss'

const widgetData = inject(widgetDataKey)!

const columns = computed(() => (widgetData.value.props?.columns as number) || 2)
const span = computed(() => Math.floor(24 / columns.value))
const gutter = computed(() => (widgetData.value.props?.gutter as number) || 16)

/**
 * 获取指定列的子组件。
 * 子组件通过 colIndex 属性绑定到对应列，
 * 未设置 colIndex 的子组件归入第 0 列。
 */
function getChildrenByCol(colIndex: number): Widget[] {
  return widgetData.value.children?.filter(
    (c) => (c.colIndex ?? 0) === colIndex,
  ) || []
}
</script>

<template>
  <el-row :class="styles.rowContainer" :gutter="gutter">
    <el-col
      v-for="col in columns"
      :key="col"
      :span="span"
      :class="styles.col"
    >
      <SchemaRender :widgets="getChildrenByCol(col - 1)" />
    </el-col>
  </el-row>
</template>
