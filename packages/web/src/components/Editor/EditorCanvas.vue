<script setup lang="ts">
/**
 * EditorCanvas — 画布引擎 (Phase 2)
 *
 * 新架构：
 * - 渲染层：复用 CanvasNode 渲染所有 ComponentNode
 * - 交互层：选中框 + 8 个缩放手柄
 * - 支持拖拽放置新组件、选中、移动、缩放
 */
import { computed, ref } from 'vue'
import CanvasNode from './CanvasNode.vue'
import type { ComponentNode, CanvasConfig, Transform, SchemaType } from '@/components/FormGrid/types'

const props = defineProps<{
  schema: ComponentNode[]
  canvasConfig: CanvasConfig
  selectedId: string | null
  mode: 'edit' | 'preview' | 'publish-interactive' | 'publish-readonly'
}>()

const emit = defineEmits<{
  'select': [id: string | null]
  'toggle-select': [id: string]
  'move': [id: string, transform: Transform]
  'resize': [id: string, w: number, h: number]
  'drop-new': [type: SchemaType, x: number, y: number, parentId: string | null]
  'update:schema': [schema: ComponentNode[]]
}>()

// ---- Layout container types that can accept children ----
const LAYOUT_CONTAINER_TYPES = new Set([
  'grid-row', 'grid-col', 'card', 'tabs',
  'page', 'toolbar', 'steps', 'dialog',
])

// ---- Canvas style ----
const canvasStyle = computed(() => ({
  width: `${props.canvasConfig.width}px`,
  height: `${props.canvasConfig.height}px`,
  backgroundColor: props.canvasConfig.backgroundColor,
  padding: props.canvasConfig.padding,
  position: 'relative' as const,
  overflow: 'hidden',
}))

// ---- Selected node lookup ----
const selectedNode = computed(() => {
  if (!props.selectedId) return null
  return findNodeById(props.schema, props.selectedId)
})

function findNodeById(nodes: ComponentNode[], id: string): ComponentNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNodeById(node.children, id)
      if (found) return found
    }
  }
  return null
}

// ---- Selection box style ----
const selectionStyle = computed(() => {
  if (!selectedNode.value) return { display: 'none' }
  const t = selectedNode.value.transform
  return {
    left: `${t.x}px`,
    top: `${t.y}px`,
    width: `${t.w}px`,
    height: `${t.h}px`,
  }
})

// ---- Is edit mode ----
const isEditMode = computed(() => props.mode === 'edit')

// ---- Drag state for move ----
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const dragNodeStartX = ref(0)
const dragNodeStartY = ref(0)

// ---- Resize state ----
const isResizing = ref(false)
const resizeHandle = ref<string | null>(null)
const resizeStartX = ref(0)
const resizeStartY = ref(0)
const resizeStartW = ref(0)
const resizeStartH = ref(0)
const resizeStartNodeX = ref(0)
const resizeStartNodeY = ref(0)

// ---- Container hit-test result ----
interface ContainerHit {
  node: ComponentNode
  absX: number
  absY: number
}

const dragOverTarget = ref<ContainerHit | null>(null)

const dropHighlightStyle = computed(() => {
  if (!dragOverTarget.value) return { display: 'none' }
  const { node, absX, absY } = dragOverTarget.value
  return {
    left: `${absX}px`,
    top: `${absY}px`,
    width: `${node.transform.w}px`,
    height: `${node.transform.h}px`,
  }
})

/**
 * Find the deepest layout container whose bounds contain the given canvas point.
 * Accumulates parent offsets so nested node coordinates resolve correctly.
 */
function findDeepestContainer(
  nodes: ComponentNode[],
  canvasX: number,
  canvasY: number,
  offsetX = 0,
  offsetY = 0,
): ContainerHit | null {
  for (const node of nodes) {
    const absX = offsetX + node.transform.x
    const absY = offsetY + node.transform.y
    const { w, h } = node.transform

    if (canvasX < absX || canvasX > absX + w || canvasY < absY || canvasY > absY + h) {
      continue
    }

    // Recurse into children first — deeper match wins
    if (node.children?.length) {
      const childHit = findDeepestContainer(node.children, canvasX, canvasY, absX, absY)
      if (childHit) return childHit
    }

    // No deeper match — return this container if it qualifies
    if (LAYOUT_CONTAINER_TYPES.has(node.type)) {
      return { node, absX, absY }
    }
  }
  return null
}

// ---- Event handlers ----
function handleSelect(id: string | null) {
  emit('select', id)
}

function handleCanvasClick(event: MouseEvent) {
  // Click on canvas background deselects
  const target = event.target as HTMLElement
  if (target === event.currentTarget || target.classList.contains('canvas__render-layer')) {
    emit('select', null)
  }
}

function handleNodeMouseDown(id: string, event: MouseEvent) {
  if (!isEditMode.value) return
  // Only left mouse button
  if (event.button !== 0) return

  // Ctrl+Click: toggle multi-select
  if (event.ctrlKey || event.metaKey) {
    emit('toggle-select', id)
  } else {
    emit('select', id)
  }

  const node = findNodeById(props.schema, id)
  if (!node) return

  isDragging.value = true
  dragStartX.value = event.clientX
  dragStartY.value = event.clientY
  dragNodeStartX.value = node.transform.x
  dragNodeStartY.value = node.transform.y

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging.value) return
    const dx = e.clientX - dragStartX.value
    const dy = e.clientY - dragStartY.value
    const newX = clampX(dragNodeStartX.value + dx, node!.transform.w)
    const newY = clampY(dragNodeStartY.value + dy, node!.transform.h)
    emit('move', id, { x: newX, y: newY, w: node!.transform.w, h: node!.transform.h })
  }

  const onMouseUp = () => {
    isDragging.value = false
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

function handleResizeStart(handle: string, event: MouseEvent) {
  if (!isEditMode.value || !selectedNode.value) return
  event.preventDefault()
  event.stopPropagation()

  isResizing.value = true
  resizeHandle.value = handle
  resizeStartX.value = event.clientX
  resizeStartY.value = event.clientY
  resizeStartW.value = selectedNode.value.transform.w
  resizeStartH.value = selectedNode.value.transform.h
  resizeStartNodeX.value = selectedNode.value.transform.x
  resizeStartNodeY.value = selectedNode.value.transform.y

  const onMouseMove = (e: MouseEvent) => {
    if (!isResizing.value || !selectedNode.value) return
    const dx = e.clientX - resizeStartX.value
    const dy = e.clientY - resizeStartY.value

    let newW = resizeStartW.value
    let newH = resizeStartH.value
    let newX = resizeStartNodeX.value
    let newY = resizeStartNodeY.value

    // Calculate new dimensions based on handle direction
    if (handle.includes('e')) newW = Math.max(20, resizeStartW.value + dx)
    if (handle.includes('w')) {
      newW = Math.max(20, resizeStartW.value - dx)
      newX = resizeStartNodeX.value + dx
    }
    if (handle.includes('s')) newH = Math.max(20, resizeStartH.value + dy)
    if (handle.includes('n')) {
      newH = Math.max(20, resizeStartH.value - dy)
      newY = resizeStartNodeY.value + dy
    }

    // Clamp to canvas bounds
    newX = clampX(newX, newW)
    newY = clampY(newY, newH)
    newW = Math.min(newW, props.canvasConfig.width)
    newH = Math.min(newH, props.canvasConfig.height)

    emit('resize', selectedNode.value!.id, newW, newH)
    if (handle.includes('w') || handle.includes('n')) {
      emit('move', selectedNode.value!.id, { x: newX, y: newY, w: newW, h: newH })
    }
  }

  const onMouseUp = () => {
    isResizing.value = false
    resizeHandle.value = null
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

// ---- Drop handling ----
function handleDragOver(event: DragEvent) {
  event.preventDefault()
  event.dataTransfer!.dropEffect = 'copy'
  if (!isEditMode.value) return

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  dragOverTarget.value = findDeepestContainer(props.schema, x, y)
}

function handleDragLeave(event: DragEvent) {
  // Only clear when the cursor truly leaves the canvas (not when entering a child element)
  const related = event.relatedTarget as HTMLElement | null
  if (related && (event.currentTarget as HTMLElement).contains(related)) return
  dragOverTarget.value = null
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()

  // Extract SchemaType from dataTransfer
  let type: SchemaType | undefined
  const raw = event.dataTransfer?.getData('application/schema-drag')
  if (raw) {
    try {
      const data = JSON.parse(raw) as { source: 'panel'; type: SchemaType }
      if (data.source === 'panel') type = data.type
    } catch { /* ignore malformed data */ }
  }
  if (!type) {
    type = event.dataTransfer?.getData('schema-type') as SchemaType | undefined
  }
  if (!type) { dragOverTarget.value = null; return }

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  // Detect deepest container at drop point
  const container = findDeepestContainer(props.schema, x, y)

  if (container) {
    // Convert canvas coords to container-local coords
    emit('drop-new', type, x - container.absX, y - container.absY, container.node.id)
  } else {
    emit('drop-new', type, x, y, null)
  }

  dragOverTarget.value = null
}

// ---- Boundary clamping ----
function clampX(x: number, w: number): number {
  return Math.max(0, Math.min(x, props.canvasConfig.width - w))
}

function clampY(y: number, h: number): number {
  return Math.max(0, Math.min(y, props.canvasConfig.height - h))
}
</script>

<template>
  <div
    :class="$style.canvas"
    :style="canvasStyle"
    @click="handleCanvasClick"
    @dragover="isEditMode ? handleDragOver($event) : undefined"
    @dragleave="isEditMode ? handleDragLeave($event) : undefined"
    @drop="isEditMode ? handleDrop($event) : undefined"
  >
    <!-- Render layer: all nodes -->
    <div :class="$style.renderLayer">
      <CanvasNode
        v-for="node in schema"
        :key="node.id"
        :node="node"
        :disabled="isEditMode"
        @select="handleSelect"
        @mousedown="handleNodeMouseDown"
      />

      <!-- Empty state -->
      <div v-if="schema.length === 0 && isEditMode" :class="$style.empty">
        拖拽组件到此处构建表单
      </div>
    </div>

    <!-- Drop target highlight overlay -->
    <div
      v-if="isEditMode && dragOverTarget"
      :class="$style.dropHighlight"
      :style="dropHighlightStyle"
    />

    <!-- Interaction layer: selection box + resize handles -->
    <div
      v-if="isEditMode && selectedNode"
      :class="$style.interactionLayer"
    >
      <div :class="$style.selectionBox" :style="selectionStyle">
        <!-- 8 resize handles -->
        <div
          :class="[$style.handle, $style.handleNw]"
          @mousedown.stop="handleResizeStart('nw', $event)"
        />
        <div
          :class="[$style.handle, $style.handleN]"
          @mousedown.stop="handleResizeStart('n', $event)"
        />
        <div
          :class="[$style.handle, $style.handleNe]"
          @mousedown.stop="handleResizeStart('ne', $event)"
        />
        <div
          :class="[$style.handle, $style.handleE]"
          @mousedown.stop="handleResizeStart('e', $event)"
        />
        <div
          :class="[$style.handle, $style.handleSe]"
          @mousedown.stop="handleResizeStart('se', $event)"
        />
        <div
          :class="[$style.handle, $style.handleS]"
          @mousedown.stop="handleResizeStart('s', $event)"
        />
        <div
          :class="[$style.handle, $style.handleSw]"
          @mousedown.stop="handleResizeStart('sw', $event)"
        />
        <div
          :class="[$style.handle, $style.handleW]"
          @mousedown.stop="handleResizeStart('w', $event)"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" module>
.canvas {
  box-sizing: border-box;
}

.renderLayer {
  position: relative;
  width: 100%;
  height: 100%;
}

.interactionLayer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
}

.selectionBox {
  position: absolute;
  border: 2px solid #409eff;
  pointer-events: none;
}

.dropHighlight {
  position: absolute;
  border: 2px dashed #409eff;
  background: rgba(64, 158, 255, 0.08);
  border-radius: 4px;
  pointer-events: none;
  z-index: 999;
  transition: left 0.08s ease, top 0.08s ease, width 0.08s ease, height 0.08s ease;
}

.handle {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #fff;
  border: 1.5px solid #409eff;
  border-radius: 2px;
  pointer-events: auto;
  z-index: 1001;
}

// NW handle
.handleNw {
  top: -4px;
  left: -4px;
  cursor: nw-resize;
}

// N handle
.handleN {
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  cursor: n-resize;
}

// NE handle
.handleNe {
  top: -4px;
  right: -4px;
  cursor: ne-resize;
}

// E handle
.handleE {
  top: 50%;
  right: -4px;
  transform: translateY(-50%);
  cursor: e-resize;
}

// SE handle
.handleSe {
  bottom: -4px;
  right: -4px;
  cursor: se-resize;
}

// S handle
.handleS {
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  cursor: s-resize;
}

// SW handle
.handleSw {
  bottom: -4px;
  left: -4px;
  cursor: sw-resize;
}

// W handle
.handleW {
  top: 50%;
  left: -4px;
  transform: translateY(-50%);
  cursor: w-resize;
}

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  color: #909399;
  font-size: 14px;
  user-select: none;
}
</style>
