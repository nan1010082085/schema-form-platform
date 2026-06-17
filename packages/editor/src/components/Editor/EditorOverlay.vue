<script setup lang="ts">
/**
 * EditorOverlay — 编辑器附加层
 *
 * 包裹 SchemaRender，在渲染层上方叠加编辑 UI：
 * - 选中框（蓝色边框）
 * - 缩放手柄（8个方向）
 * - 容器拖放高亮（蓝色虚线）
 * - 辅助线层（灰色虚线）
 * - 交互事件（选中、拖拽、缩放）
 */
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useWidgetStore } from '../../stores/widget'
import { useEditorStore } from '../../stores/editor'
import { useDragStore } from '../../stores/drag'
import { useBoardStore } from '../../stores/board'
import { useDrag } from '../../composables/useDrag'
import { useResize } from '../../composables/useResize'
import { useClipboard } from '../../composables/useClipboard'
import { useSnapshot } from '../../composables/useSnapshot'
import { applyTemplate } from '../../utils/apiClient'
import { viewportToCanvas, constrainToCanvasBounds } from '../../utils/coordinate'
import { collectAllContainers } from '../../utils/collision'
import type { Widget, SchemaType } from '../../widgets/base/types'
import type { ResizeHandle } from '../../composables/useResize'
import SchemaRender from '../WidgetRenderer/SchemaRender.vue'
import WidgetContextMenu from './WidgetContextMenu.vue'
import styles from './EditorOverlay.module.scss'

// ================================================================
// 递归展开 Widget 树，子组件坐标转为画布绝对坐标
// ================================================================

interface FlatWidget {
  widget: Widget
  canvasX: number
  canvasY: number
  depth: number
}

function flattenWidgets(widgets: Widget[], offsetX = 0, offsetY = 0, depth = 0): FlatWidget[] {
  const result: FlatWidget[] = []
  for (const w of widgets) {
    // 跳过无效的 widget
    if (!w || !w.position) continue
    result.push({
      widget: w,
      canvasX: offsetX + (w.position.x || 0),
      canvasY: offsetY + (w.position.y || 0),
      depth,
    })
    // 自渲染容器内部是流式布局，子组件绝对坐标与实际位置不匹配，跳过递归
    if (w.children?.length && !SELF_RENDERING_CONTAINERS.has(w.type)) {
      result.push(...flattenWidgets(w.children, offsetX + (w.position.x || 0), offsetY + (w.position.y || 0), depth + 1))
    }
  }
  return result
}

const emit = defineEmits<{
  openEvent: [widget: Widget]
  openRule: [widget: Widget]
  openApi: [widget: Widget]
  openVariables: [widget: Widget]
  savePreview: [dataUrl: string]
}>()

const widgetStore = useWidgetStore()
const editorStore = useEditorStore()
const dragStore = useDragStore()
const boardStore = useBoardStore()

const { startDragFromPanel, startDragOnCanvas, updateDrag, endDrag, cancelDrag } = useDrag()
const { copy } = useClipboard()
const { captureElement } = useSnapshot()

// ---- ESC 键取消拖拽 ----

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && dragStore.isDragging) {
    e.preventDefault()
    cancelDrag()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})

/** 自渲染容器：children 在组件内部渲染，flattenWidgets 跳过其子组件 */
const SELF_RENDERING_CONTAINERS: ReadonlySet<SchemaType> = new Set()

/** 交互式容器：hitArea 设为 pointer-events:none，点击穿透到实际 UI */
const INTERACTIVE_CONTAINER_TYPES: ReadonlySet<SchemaType> = new Set(['tabs', 'dialog'])
const { startResize, updateResize, endResize } = useResize()

const overlayRef = ref<HTMLElement>()

// ================================================================
// 右键上下文菜单
// ================================================================

const contextMenu = ref({ visible: false, x: 0, y: 0, widget: null as Widget | null })

function showContextMenu(e: MouseEvent, widget: Widget) {
  contextMenu.value = { visible: true, x: e.clientX, y: e.clientY, widget }
}

function handleCopyWidget(widget: Widget) {
  const copy = JSON.parse(JSON.stringify(widget)) as Widget
  copy.id = `${widget.type}_${Date.now()}`
  copy.name = `${widget.name}_copy`
  if (copy.position) {
    copy.position.x += 20
    copy.position.y += 20
  }
  widgetStore.addWidget(copy)
}

function handleDeleteWidget(widget: Widget) {
  widgetStore.removeWidget(widget.id)
  editorStore.select(null)
}

function handleCopyId(id: string) {
  copy(id, '已复制部件 ID')
}

function handleOpenEvent(widget: Widget) { emit('openEvent', widget) }
function handleOpenRule(widget: Widget) { emit('openRule', widget) }
function handleOpenApi(widget: Widget) { emit('openApi', widget) }
function handleOpenVariables(widget: Widget) { emit('openVariables', widget) }

async function handleSavePreview(widget: Widget) {
  const el = document.querySelector(`[data-widget-id="${widget.id}"]`) as HTMLElement | null
  if (!el) return
  const dataUrl = await captureElement(el)
  if (dataUrl) emit('savePreview', dataUrl)
}

// ================================================================
// 选中 Widget
// ================================================================

const selectedWidget = computed(() => {
  if (!editorStore.selectedId) return null
  return widgetStore.findWidget(editorStore.selectedId)
})

const selectionStyle = computed(() => {
  const w = selectedWidget.value
  if (!w) return { display: 'none' as const }
  // 递归查找子组件的画布绝对坐标（跳过自渲染容器内部）
  const findCanvasPos = (widgets: Widget[], targetId: string, ox = 0, oy = 0): { x: number; y: number } | null => {
    for (const widget of widgets) {
      if (widget.id === targetId) return { x: ox + widget.position.x, y: oy + widget.position.y }
      if (widget.children?.length && !SELF_RENDERING_CONTAINERS.has(widget.type)) {
        const found = findCanvasPos(widget.children, targetId, ox + widget.position.x, oy + widget.position.y)
        if (found) return found
      }
    }
    return null
  }
  const pos = findCanvasPos(widgetStore.widgets, w.id)
  const x = pos?.x ?? w.position.x
  const y = pos?.y ?? w.position.y
  const delta = getStyleSizeDelta(w)
  return {
    position: 'absolute' as const,
    left: `${x + delta.mx}px`,
    top: `${y + delta.my}px`,
    width: `${w.position.w + delta.bw}px`,
    height: `${w.position.h + delta.bh}px`,
    border: '2px solid var(--color-primary)',
    pointerEvents: 'none' as const,
    zIndex: 9999,
  }
})

/** 扁平化所有 Widget（含容器内子组件），坐标转为画布绝对坐标 */
const flatWidgets = computed(() => flattenWidgets(widgetStore.widgets))

// ---- 样式尺寸辅助 ----

function parsePxVal(val?: string): number {
  if (!val) return 0
  const m = val.match(/^(\d+(?:\.\d+)?)/)
  return m ? parseFloat(m[1]) : 0
}

function getStyleNum(style: Record<string, unknown> | undefined, key: string): number {
  return parsePxVal(style?.[key] as string | undefined)
}

/** 计算 widget 的 margin 偏移和 border/padding 扩展尺寸 */
function getStyleSizeDelta(widget: Widget): { mx: number; my: number; bw: number; bh: number } {
  const s = widget.style as Record<string, unknown> | undefined
  if (!s) return { mx: 0, my: 0, bw: 0, bh: 0 }

  const mt = getStyleNum(s, 'marginTop') || getStyleNum(s, 'margin')
  const mr = getStyleNum(s, 'marginRight') || getStyleNum(s, 'margin')
  const mb = getStyleNum(s, 'marginBottom') || getStyleNum(s, 'margin')
  const ml = getStyleNum(s, 'marginLeft') || getStyleNum(s, 'margin')

  // margin 偏移（左上角位移）
  const mx = ml - mr
  const my = mt - mb

  // margin 增量（总宽度 = 左margin + 右margin）
  const marginW = ml + mr
  const marginH = mt + mb

  return { mx, my, bw: marginW, bh: marginH }
}
// ================================================================

const handles: { type: ResizeHandle; style: Record<string, string> }[] = [
  { type: 'nw', style: { left: '-4px', top: '-4px', cursor: 'nw-resize' } },
  { type: 'n', style: { left: '50%', top: '-4px', transform: 'translateX(-50%)', cursor: 'n-resize' } },
  { type: 'ne', style: { right: '-4px', top: '-4px', cursor: 'ne-resize' } },
  { type: 'e', style: { right: '-4px', top: '50%', transform: 'translateY(-50%)', cursor: 'e-resize' } },
  { type: 'se', style: { right: '-4px', bottom: '-4px', cursor: 'se-resize' } },
  { type: 's', style: { left: '50%', bottom: '-4px', transform: 'translateX(-50%)', cursor: 's-resize' } },
  { type: 'sw', style: { left: '-4px', bottom: '-4px', cursor: 'sw-resize' } },
  { type: 'w', style: { left: '-4px', top: '50%', transform: 'translateY(-50%)', cursor: 'w-resize' } },
]

// ================================================================
// 辅助线
// ================================================================

const guideLines = computed(() => dragStore.guideLines)

// ================================================================
// 容器高亮（拖拽悬停时，支持嵌套容器的画布绝对坐标）
// ================================================================

const hoveredContainer = computed(() => {
  if (!dragStore.isDragging || !dragStore.hoveredContainerId) return null
  return widgetStore.findWidget(dragStore.hoveredContainerId)
})

/** 计算嵌套容器的画布绝对坐标（递归累加父容器偏移） */
function getContainerCanvasPosition(containerId: string): { x: number; y: number } {
  const allContainers = collectAllContainers(widgetStore.widgets)
  const found = allContainers.find(c => c.id === containerId)
  if (found && '_canvasX' in found) {
    return { x: (found as Widget & { _canvasX: number })._canvasX, y: (found as Widget & { _canvasY: number })._canvasY }
  }
  // 回退到根级坐标
  const widget = widgetStore.findWidget(containerId)
  return { x: widget?.position.x ?? 0, y: widget?.position.y ?? 0 }
}

const containerHighlightStyle = computed(() => {
  const c = hoveredContainer.value
  if (!c) return { display: 'none' as const }
  const canvasPos = getContainerCanvasPosition(c.id)
  return {
    position: 'absolute' as const,
    left: `${canvasPos.x}px`,
    top: `${canvasPos.y}px`,
    width: `${c.position.w}px`,
    height: `${c.position.h}px`,
    border: '2px dashed var(--color-primary)',
    backgroundColor: 'rgba(64, 158, 255, 0.1)',
    pointerEvents: 'none' as const,
    zIndex: 9998,
  }
})

// ================================================================
// 放置预览线（指示新组件的插入位置）
// ================================================================

const dropPreviewLine = computed(() => dragStore.dropPreviewLine)

const dropPreviewLineStyle = computed(() => {
  const line = dropPreviewLine.value
  if (!line) return { display: 'none' as const }

  if (line.orientation === 'horizontal') {
    return {
      position: 'absolute' as const,
      left: `${line.start}px`,
      top: `${line.position - 1}px`,
      width: `${line.end - line.start}px`,
      height: '2px',
      backgroundColor: 'var(--color-primary)',
      pointerEvents: 'none' as const,
      zIndex: 9999,
      boxShadow: '0 0 4px var(--color-primary)',
    }
  }

  return {
    position: 'absolute' as const,
    left: `${line.position - 1}px`,
    top: `${line.start}px`,
    width: '2px',
    height: `${line.end - line.start}px`,
    backgroundColor: 'var(--color-primary)',
    pointerEvents: 'none' as const,
    zIndex: 9999,
    boxShadow: '0 0 4px var(--color-primary)',
  }
})

// ================================================================
// 事件处理
// ================================================================

/** 点击空白区域取消选中 */
function handleOverlayClick(e: MouseEvent) {
  if (e.target === overlayRef.value) {
    editorStore.clearSelection()
  }
}

/**
 * 交互式容器 hitArea click — 将点击穿透到实际 UI（tab headers 等）。
 * hitArea 拦截了 mousedown（用于拖拽检测），click 事件需要手动转发给底层 UI。
 */
function handleInteractiveClick(e: MouseEvent, _widget: Widget) {
  const hitArea = e.currentTarget as HTMLElement
  hitArea.style.pointerEvents = 'none'
  const target = document.elementFromPoint(e.clientX, e.clientY)
  hitArea.style.pointerEvents = ''
  if (target && target !== hitArea) {
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  }
}

/** Widget 上 mousedown — 区分点击和拖拽 */
function handleWidgetMouseDown(e: MouseEvent, widget: Widget) {
  e.stopPropagation()
  editorStore.select(widget.id)

  const startX = e.clientX
  const startY = e.clientY
  let dragging = false
  const DRAG_THRESHOLD = 3

  const onMouseMove = (me: MouseEvent) => {
    const dx = me.clientX - startX
    const dy = me.clientY - startY

    if (!dragging && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
      dragging = true
      if (overlayRef.value) {
        startDragOnCanvas(widget.id, startX, startY, overlayRef.value)
      }
    }

    if (dragging && overlayRef.value) {
      updateDrag(me.clientX, me.clientY, overlayRef.value)
    }
  }

  const onMouseUp = () => {
    if (dragging) {
      endDrag()
    }
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

/** 缩放手柄 mousedown 开始缩放 */
function handleHandleMouseDown(e: MouseEvent, handle: ResizeHandle) {
  e.stopPropagation()
  if (!editorStore.selectedId) return
  startResize(editorStore.selectedId, handle, e.clientX, e.clientY)

  const onMouseMove = (me: MouseEvent) => {
    updateResize(me.clientX, me.clientY)
  }

  const onMouseUp = () => {
    endResize()
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

/** 拖拽悬停（从面板拖入时更新位置） */
function handleDragOver(e: DragEvent) {
  e.preventDefault()
  // 面板拖入：首次 dragover 时启动拖拽跟踪，使碰撞检测和预览线在悬停阶段生效
  if (!dragStore.isDragging) {
    const hasSchemaType = e.dataTransfer?.types.includes('schema-type') || e.dataTransfer?.types.includes('application/schema-drag')
    if (hasSchemaType && overlayRef.value) {
      // dragover 阶段无法读取 data，用临时 type 启动跟踪
      dragStore.startDrag('panel', `preview_${Date.now()}`, 'input')
    }
  }
  if (dragStore.isDragging && overlayRef.value) {
    updateDrag(e.clientX, e.clientY, overlayRef.value)
  }
}

/** 拖拽离开画布区域时清理预览状态 */
function handleDragLeave(e: DragEvent) {
  // 只在真正离开 overlay 区域时清理（避免子元素触发的 leave 事件）
  const relatedTarget = e.relatedTarget as HTMLElement | null
  if (relatedTarget && overlayRef.value?.contains(relatedTarget)) return
  if (dragStore.isDragging && dragStore.dragSource === 'panel') {
    dragStore.endDrag()
  }
}

/** 放置（从面板拖入结束） */
function handleDrop(e: DragEvent) {
  e.preventDefault()
  const templateId = e.dataTransfer?.getData('template-id')
  if (templateId) {
    dragStore.endDrag()
    handleTemplateDrop(templateId, e.clientX, e.clientY)
    return
  }
  const schemaType = e.dataTransfer?.getData('schema-type') as import('../../widgets/base/types').SchemaType | undefined
  if (schemaType) {
    // 如果 dragover 阶段已经启动了拖拽跟踪，先结束再用正确的类型重新开始
    if (dragStore.isDragging) {
      dragStore.endDrag()
    }
    startDragFromPanel(schemaType)
    if (overlayRef.value) {
      updateDrag(e.clientX, e.clientY, overlayRef.value)
    }
  }
  endDrag()
}

/** 处理模板拖放到画布 */
async function handleTemplateDrop(templateId: string, clientX: number, clientY: number) {
  try {
    const result = await applyTemplate(templateId)
    const widgets = result.widgets as unknown as Widget[]

    // 计算放置位置（画布坐标系）
    let dropX = 0
    let dropY = 0
    if (overlayRef.value) {
      const rect = overlayRef.value.getBoundingClientRect()
      const zoom = boardStore.canvas.zoom
      const canvasPos = viewportToCanvas(clientX, clientY, rect, overlayRef.value.scrollLeft, overlayRef.value.scrollTop, zoom)
      dropX = canvasPos.x
      dropY = canvasPos.y
    }

    // 计算模板 widgets 的包围盒，用于偏移到放置点
    if (widgets.length > 0) {
      const minX = Math.min(...widgets.map(w => w.position?.x ?? 0))
      const minY = Math.min(...widgets.map(w => w.position?.y ?? 0))
      const offsetX = dropX - minX
      const offsetY = dropY - minY

      for (const w of widgets) {
        if (w.position) {
          w.position.x += offsetX
          w.position.y += offsetY
          // 边界约束
          const constrained = constrainToCanvasBounds(
            w.position.x, w.position.y, w.position.w, w.position.h,
            boardStore.canvas.width, boardStore.canvas.height,
          )
          w.position.x = constrained.x
          w.position.y = constrained.y
        }
        widgetStore.addWidget(w)
      }
    } else {
      // 无位置信息的 widgets 直接添加
      for (const w of widgets) {
        widgetStore.addWidget(w)
      }
    }

    editorStore.pushHistory([...widgetStore.widgets])
    ElMessage.success(`已应用模板「${result.name}」`)
  } catch {
    ElMessage.error('应用模板失败')
  }
}
</script>

<template>
  <div
    ref="overlayRef"
    :class="styles.overlay"
    @click="handleOverlayClick"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <!-- 渲染层：事件穿透由 hitArea 层控制 -->
    <div :class="styles.renderLayer">
      <SchemaRender :widgets="widgetStore.widgets" mode="edit" />
    </div>

    <!-- 透明交互层：递归遍历所有 Widget（含容器子组件），捕获点击和拖拽 -->
    <div
      v-for="fw in flatWidgets"
      :key="fw.widget.id"
      :class="styles.hitArea"
      :style="(() => {
        const d = getStyleSizeDelta(fw.widget)
        return {
          position: 'absolute',
          left: `${fw.canvasX + d.mx}px`,
          top: `${fw.canvasY + d.my}px`,
          width: `${fw.widget.position.w + d.bw}px`,
          height: `${fw.widget.position.h + d.bh}px`,
          zIndex: (fw.widget.position.zIndex ?? 1) + 100 + fw.depth * 10,
        }
      })()"
      @dragover.stop.prevent="handleDragOver($event)"
      @drop.stop="handleDrop($event)"
      @mousedown.stop="handleWidgetMouseDown($event, fw.widget)"
      @click.stop="INTERACTIVE_CONTAINER_TYPES.has(fw.widget.type) && handleInteractiveClick($event, fw.widget)"
      @contextmenu.prevent="showContextMenu($event, fw.widget)"
    />

    <!-- 容器高亮 -->
    <div
      v-if="hoveredContainer"
      :style="containerHighlightStyle"
    />

    <!-- 放置预览线 -->
    <div
      v-if="dropPreviewLine"
      :style="dropPreviewLineStyle"
    />

    <!-- 选中框 -->
    <div v-if="selectedWidget" :style="selectionStyle">
      <!-- 缩放手柄 -->
      <div
        v-for="handle in handles"
        :key="handle.type"
        :class="styles.resizeHandle"
        :style="handle.style"
        @mousedown.stop="handleHandleMouseDown($event, handle.type)"
      />
    </div>

    <!-- 辅助线 -->
    <svg
      v-if="guideLines.length"
      :class="styles.guideLines"
      :width="boardStore.canvas.width"
      :height="boardStore.canvas.height"
    >
      <line
        v-for="(line, i) in guideLines"
        :key="i"
        :x1="line.type === 'vertical' ? line.position : line.start"
        :y1="line.type === 'horizontal' ? line.position : line.start"
        :x2="line.type === 'vertical' ? line.position : line.end"
        :y2="line.type === 'horizontal' ? line.position : line.end"
        stroke="#0060A2"
        stroke-width="1"
        stroke-opacity="0.6"
        stroke-dasharray="4,4"
      />
    </svg>

    <!-- 右键上下文菜单 -->
    <WidgetContextMenu
      :visible="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :widget="contextMenu.widget"
      @close="contextMenu.visible = false"
      @copy="handleCopyWidget"
      @copy-id="handleCopyId"
      @delete="handleDeleteWidget"
      @open-event="handleOpenEvent"
      @open-rule="handleOpenRule"
      @open-api="handleOpenApi"
      @open-variables="handleOpenVariables"
      @save-preview="handleSavePreview"
    />
  </div>
</template>

