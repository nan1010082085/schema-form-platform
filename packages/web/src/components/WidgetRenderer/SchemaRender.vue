<script setup lang="ts">
/**
 * SchemaRender — Widget 递归渲染引擎
 *
 * 两条渲染路径：
 * 1. widgets prop → SchemaNode（绝对定位，编辑器画布）
 * 2. schema prop → WidgetNode（流式布局，WidgetRenderer 预览/发布/运行时）
 */
import type { Widget, PartialWidget } from '../../widgets/base/types'
import type { FormData } from './types'
import SchemaNode from './SchemaNode.vue'
import WidgetNode from './WidgetNode.vue'

defineProps<{
  /** Widget-based absolute rendering (editor canvas) */
  widgets?: Widget[]
  mode?: 'edit' | 'preview'
  /** Single Widget flow rendering (WidgetRenderer) */
  schema?: PartialWidget
  formData?: FormData
  editable?: boolean
  isDragging?: boolean
  readonly?: boolean
  path?: number[]
}>()
</script>

<template>
  <!-- Editor canvas: absolute positioning via SchemaNode -->
  <template v-if="widgets" v-for="widget in widgets" :key="widget.id">
    <SchemaNode :widget="widget" :mode="mode" />
  </template>

  <!-- WidgetRenderer: flow layout via WidgetNode -->
  <WidgetNode
    v-else-if="schema"
    :widget="schema"
    :form-data="formData"
    :readonly="readonly"
  />
</template>
