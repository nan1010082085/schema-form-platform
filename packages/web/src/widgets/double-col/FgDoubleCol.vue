<script setup lang="ts">
/**
 * FgDoubleCol — 双列布局容器
 *
 * 纯布局容器，2 列，每列可放置 1 个组件。
 * 通过 CSS flexbox 实现，colIndex 0/1 绑定子组件。
 */
import { inject, computed } from 'vue'
import { widgetDataKey } from '../base/types'
import type { Widget } from '../base/types'
import SchemaRender from '../../components/WidgetRenderer/SchemaRender.vue'
import styles from './style.module.scss'

const widgetData = inject(widgetDataKey)!

const gutter = computed(() => (widgetData.value.props?.gutter as number) || 0)
const colWidths = computed(() => (widgetData.value.props?.colWidths as number[]) || [50, 50])
const columnCount = computed(() => colWidths.value.length)

function getChildrenByCol(colIndex: number): Widget[] {
  return widgetData.value.children?.filter(
    (c) => (c.colIndex ?? 0) === colIndex,
  ) || []
}
</script>

<template>
  <div :class="styles.colContainer" :style="{ gap: gutter + 'px' }">
    <div
      v-for="col in columnCount"
      :key="col"
      :class="styles.col"
      :style="{ flex: `0 0 calc(${colWidths[col - 1]}% - ${gutter * (columnCount - 1) / columnCount}px)` }"
    >
      <div :class="styles.colContent">
        <SchemaRender :widgets="getChildrenByCol(col - 1)" />
      </div>
    </div>
  </div>
</template>
