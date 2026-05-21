<script setup lang="ts">
/**
 * EditorCanvas — 编辑器画布 (Phase 3)
 *
 * 简化版画布引擎，包裹 SchemaRender，提供画布上下文。
 * 画布配置从 boardStore 读取，Widget 数据从 widgetStore 读取。
 *
 * 职责：
 * - 渲染画布容器（尺寸、背景、缩放）
 * - 委托 SchemaRender 渲染 Widget 树
 * - 画布交互（选中、拖拽、缩放）后续迭代接入
 */
import { computed } from 'vue'
import { useBoardStore } from '../../stores/board'
import { useEditorStore } from '../../stores/editor'
import EditorOverlay from './EditorOverlay.vue'
import SchemaRender from '../FormGrid/SchemaRender.vue'
import { useWidgetStore } from '../../stores/widget'
import type { Widget } from '../../widgets/base/types'

const emit = defineEmits<{
  openEvent: [widget: Widget]
  openRule: [widget: Widget]
  openApi: [widget: Widget]
}>()

const boardStore = useBoardStore()
const editorStore = useEditorStore()
const widgetStore = useWidgetStore()

const isPreview = computed(() => editorStore.mode === 'preview')

/** 画布容器样式：尺寸、背景、内边距、缩放 */
const canvasStyle = computed(() => ({
  width: `${boardStore.canvas.width}px`,
  height: `${boardStore.canvas.height}px`,
  backgroundColor: boardStore.canvas.backgroundColor,
  padding: boardStore.canvas.padding,
  transform: `scale(${boardStore.canvas.zoom / 100})`,
  transformOrigin: 'top left',
  position: 'relative' as const,
}))
</script>

<template>
  <div :class="[$style.canvas, { [$style.canvasGrid]: !isPreview }]" :style="canvasStyle">
    <!-- 预览模式：纯净渲染，无编辑交互层 -->
    <SchemaRender v-if="isPreview" :widgets="widgetStore.widgets" />
    <!-- 编辑模式：带选中、拖拽、缩放的交互层 -->
    <EditorOverlay
      v-else
      @open-event="emit('openEvent', $event)"
      @open-rule="emit('openRule', $event)"
      @open-api="emit('openApi', $event)"
    />
  </div>
</template>

<style module>
.canvas {
  position: relative;
  overflow: auto;
}

.canvasGrid {
  background-image:
    radial-gradient(circle, #d0d5dd 0.8px, transparent 0.8px);
  background-size: 20px 20px;
}
</style>
