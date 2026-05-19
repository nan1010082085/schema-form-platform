<script setup lang="ts">
/**
 * CanvasNode — 单个画布节点渲染
 *
 * 根据 ComponentNode 的 type 选择对应组件渲染。
 * - grid-row / grid-col: flex 布局，子节点自动排列
 * - 其他容器: 子节点绝对定位
 * - 基础/业务组件: 直接渲染
 */
import { computed } from 'vue'
import { compMap } from '@/components/FormGrid/compMap'
import type { ComponentNode, ComponentStyle } from '@/components/FormGrid/types'

const props = defineProps<{
  node: ComponentNode
  /** 编辑模式下组件禁用交互 */
  disabled?: boolean
}>()

const emit = defineEmits<{
  'select': [id: string]
  'mousedown': [id: string, event: MouseEvent]
}>()

// ---- Grid layout detection ----
const GRID_TYPES = new Set(['grid-row', 'grid-col'])
const isGridComponent = computed(() => GRID_TYPES.has(props.node.type))

// ---- Node absolute positioning ----
const nodeStyle = computed(() => {
  const t = props.node.transform
  const style: Record<string, string> = {
    position: 'absolute',
    left: `${t.x}px`,
    top: `${t.y}px`,
    width: `${t.w}px`,
    height: `${t.h}px`,
    zIndex: String(props.node.zIndex),
  }
  // Merge ComponentStyle CSS properties
  Object.assign(style, cssStyleFromNode(props.node.style))
  return style
})

// ---- Grid container inner style (flex layout for children) ----
const containerStyle = computed(() => {
  if (!isGridComponent.value) return {}
  return {
    display: 'flex',
    flexDirection: props.node.type === 'grid-row' ? 'row' : 'column',
    flexWrap: 'wrap',
    gap: '8px',
    width: '100%',
    height: '100%',
    position: 'relative' as const,
  }
})

// ---- Resolve Vue component from compMap ----
const component = computed(() => compMap[props.node.type])

// ---- Build component props ----
const componentProps = computed(() => {
  const p: Record<string, unknown> = { ...props.node.props }
  // Options-based components
  if (props.node.data.options?.length) {
    p.options = props.node.data.options
  }
  // Disabled in edit mode
  if (props.disabled) {
    p.disabled = true
  }
  return p
})

// ---- Event handlers ----
function handleClick(event: MouseEvent) {
  event.stopPropagation()
  emit('select', props.node.id)
}

function handleMouseDown(event: MouseEvent) {
  event.stopPropagation()
  emit('mousedown', props.node.id, event)
}

// ---- Style conversion utility ----
function cssStyleFromNode(style: ComponentStyle): Record<string, string> {
  const css: Record<string, string> = {}
  if (style.width) css.width = style.width
  if (style.height) css.height = style.height
  if (style.margin) css.margin = style.margin
  if (style.padding) css.padding = style.padding
  if (style.textAlign) css.textAlign = style.textAlign
  if (style.backgroundColor) css.backgroundColor = style.backgroundColor
  if (style.borderRadius) css.borderRadius = style.borderRadius
  if (style.boxShadow) css.boxShadow = style.boxShadow
  if (style.border) css.border = style.border
  if (style.borderTop) css.borderTop = style.borderTop
  if (style.borderRight) css.borderRight = style.borderRight
  if (style.borderBottom) css.borderBottom = style.borderBottom
  if (style.borderLeft) css.borderLeft = style.borderLeft
  if (style.opacity !== undefined) css.opacity = String(style.opacity)
  if (style.fontSize) css.fontSize = style.fontSize
  if (style.fontWeight) css.fontWeight = style.fontWeight
  if (style.color) css.color = style.color
  return css
}
</script>

<template>
  <div
    :class="$style.node"
    :style="nodeStyle"
    @click.stop="handleClick"
    @mousedown.stop="handleMouseDown"
  >
    <!-- Grid container: children rendered as flex items -->
    <template v-if="isGridComponent">
      <div :style="containerStyle">
        <CanvasNode
          v-for="child in node.children"
          :key="child.id"
          :node="child"
          :disabled="disabled"
          @select="emit('select', $event)"
          @mousedown="(id, e) => emit('mousedown', id, e)"
        />
      </div>
    </template>

    <!-- Other container with children: children are absolutely positioned -->
    <template v-else-if="node.children?.length">
      <component
        :is="component"
        v-bind="componentProps"
      />
      <CanvasNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :disabled="disabled"
        @select="emit('select', $event)"
        @mousedown="(id, e) => emit('mousedown', id, e)"
      />
    </template>

    <!-- Leaf component: direct render -->
    <template v-else>
      <component
        :is="component"
        v-bind="componentProps"
      />
    </template>
  </div>
</template>

<style lang="scss" module>
.node {
  box-sizing: border-box;
  pointer-events: auto;

  // Prevent text selection during drag
  user-select: none;
}
</style>
