<script setup lang="ts">
/**
 * SchemaRender — Schema 驱动的递归渲染引擎 (Phase 3)
 *
 * 职责：
 * - 接收 Widget[] 列表，委托 SchemaNode 渲染每个 Widget
 * - SchemaNode 负责 provide/inject 和组件解析
 * - 本组件仅负责列表遍历和 hidden 过滤
 *
 * 设计说明：
 * - provide/inject 需要每个 Widget 独立的组件实例作用域
 * - 因此 provide 逻辑放在 SchemaNode（每个 Widget 一个实例）
 * - 而非本组件（v-for 中 provide 会共享同一作用域）
 */
import type { Widget } from '../../widgets/base/types'
import type { FormSchemaItem, FormData } from './types'
import SchemaNode from './SchemaNode.vue'

defineProps<{
  /** Widget-based rendering (editor canvas) */
  widgets?: Widget[]
  mode?: 'edit' | 'preview'
  /** FormSchemaItem-based rendering (FormGrid form mode) */
  schema?: FormSchemaItem
  formData?: FormData
  editable?: boolean
  isDragging?: boolean
  readonly?: boolean
  path?: number[]
}>()
</script>

<template>
  <!-- Widget-based rendering (editor canvas) -->
  <template v-if="widgets" v-for="widget in widgets" :key="widget.id">
    <SchemaNode :widget="widget" :mode="mode" />
  </template>
</template>
