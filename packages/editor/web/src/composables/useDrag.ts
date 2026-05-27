import { useDragStore } from '../stores/drag'
import { useWidgetStore } from '../stores/widget'
import { useEditorStore } from '../stores/editor'
import { useBoardStore } from '../stores/board'
import { viewportToCanvas, constrainToCanvasBounds } from '../utils/coordinate'
import { detectContainerCollision, getRootContainers } from '../utils/collision'
import { calculateGuideLines, calculateContainerGuides, collectSiblingTargets } from '../utils/guidelines'
import { createWidget, generateWidgetId } from '../widgets/registry'
import type { SchemaType, Widget } from '../widgets/base/types'

/**
 * useDrag — 拖拽系统核心逻辑
 *
 * 处理从组件面板拖入画布、画布内拖拽移动、容器碰撞检测、辅助线吸附。
 */
export function useDrag() {
  const dragStore = useDragStore()
  const widgetStore = useWidgetStore()
  const editorStore = useEditorStore()
  const boardStore = useBoardStore()

  /** 从面板开始拖拽新组件 */
  function startDragFromPanel(type: SchemaType) {
    const id = generateWidgetId(type)
    dragStore.startDrag('panel', id, type)
  }

  /** 查找 widget 的父容器偏移量（子组件在容器本地坐标系中） */
  function findParentOffset(widgetId: string, widgets: Widget[] = widgetStore.widgets, ox = 0, oy = 0): { x: number; y: number } | null {
    for (const w of widgets) {
      if (w.children?.length) {
        for (const child of w.children) {
          if (child.id === widgetId) return { x: ox + w.position.x, y: oy + w.position.y }
          const found = findParentOffset(child.id, w.children, ox + w.position.x, oy + w.position.y)
          if (found) return found
        }
      }
    }
    return null
  }

  /** 查找 widget 的直接父容器 Widget */
  function findParentContainer(widgetId: string, widgets: Widget[] = widgetStore.widgets): Widget | null {
    for (const w of widgets) {
      if (w.children?.length) {
        for (const child of w.children) {
          if (child.id === widgetId) return w
        }
        const found = findParentContainer(widgetId, w.children)
        if (found) return found
      }
    }
    return null
  }

  /** 画布内开始拖拽已有组件（传入初始光标位置和画布元素） */
  function startDragOnCanvas(widgetId: string, clientX: number, clientY: number, canvasEl: HTMLElement) {
    const widget = widgetStore.findWidget(widgetId)
    const rect = canvasEl.getBoundingClientRect()
    const zoom = boardStore.canvas.zoom
    const canvasPos = viewportToCanvas(clientX, clientY, rect, canvasEl.scrollLeft, canvasEl.scrollTop, zoom)

    // 子组件的 position 是容器本地坐标，需要加上父容器偏移转为画布坐标
    const parentOffset = findParentOffset(widgetId)
    const widgetCanvasX = (parentOffset?.x ?? 0) + (widget?.position.x ?? 0)
    const widgetCanvasY = (parentOffset?.y ?? 0) + (widget?.position.y ?? 0)

    dragStore.startDrag('canvas', widgetId, undefined, {
      cursorX: canvasPos.x,
      cursorY: canvasPos.y,
      widgetX: widgetCanvasX,
      widgetY: widgetCanvasY,
    })
  }

  /** 更新拖拽位置（mousemove 时调用）— 实时移动 Widget */
  function updateDrag(clientX: number, clientY: number, canvasEl: HTMLElement) {
    if (!dragStore.isDragging) return

    const rect = canvasEl.getBoundingClientRect()
    const zoom = boardStore.canvas.zoom
    const canvasPos = viewportToCanvas(
      clientX,
      clientY,
      rect,
      canvasEl.scrollLeft,
      canvasEl.scrollTop,
      zoom,
    )

    dragStore.updateDragPosition(canvasPos.x, canvasPos.y)

    // 画布内拖拽：实时更新 Widget 位置（delta 模式）
    // canvasX/canvasY 是 widget 在画布坐标系中的位置（用于碰撞检测和辅助线）
    let canvasX = canvasPos.x
    let canvasY = canvasPos.y
    let widgetW = 100
    let widgetH = 32

    if (dragStore.dragSource === 'canvas' && dragStore.dragWidgetId) {
      canvasX = dragStore.initialWidgetX + (canvasPos.x - dragStore.initialCursorX)
      canvasY = dragStore.initialWidgetY + (canvasPos.y - dragStore.initialCursorY)
      // 子组件的 position 是容器本地坐标，需要减去父容器偏移
      const parentOffset = findParentOffset(dragStore.dragWidgetId)
      const localX = canvasX - (parentOffset?.x ?? 0)
      const localY = canvasY - (parentOffset?.y ?? 0)
      widgetStore.moveWidget(dragStore.dragWidgetId, localX, localY)

      const w = widgetStore.findWidget(dragStore.dragWidgetId)
      if (w) { widgetW = w.position.w; widgetH = w.position.h }
    }

    // 碰撞检测（容器组件禁止嵌套，跳过检测）
    // 必须使用画布坐标，因为容器位置是画布坐标
    const draggedType = dragStore.dragWidgetType || widgetStore.findWidget(dragStore.dragWidgetId || '')?.type
    const isContainerDrag = draggedType && ['form', 'card', 'tabs', 'dialog', 'single-col', 'double-col', 'triple-col', 'quad-col'].includes(draggedType)

    if (isContainerDrag) {
      dragStore.updateCollision(null)
    } else {
      const containers = getRootContainers(
        widgetStore.widgets,
        dragStore.dragWidgetId || undefined,
      )
      const tempWidget = {
        id: dragStore.dragWidgetId || '',
        name: '',
        type: (draggedType || 'input') as SchemaType,
        position: { x: canvasX, y: canvasY, w: widgetW, h: widgetH },
      }
      const hitContainer = detectContainerCollision(tempWidget as Widget, containers)
      dragStore.updateCollision(hitContainer?.id || null)
    }

    // 辅助线计算（仅画布内拖拽，使用画布坐标）
    if (dragStore.dragSource === 'canvas' && dragStore.dragWidgetId) {
      const draggingWidget = widgetStore.findWidget(dragStore.dragWidgetId)
      if (draggingWidget) {
        const dragRect = { x: canvasX, y: canvasY, w: widgetW, h: widgetH }

        // 查找父容器：如果拖拽中的 widget 是某容器的子组件，使用容器内对齐
        const parentContainer = findParentContainer(dragStore.dragWidgetId)
        if (parentContainer) {
          // 容器内拖拽：只与同级 widget 和容器边界对齐
          const parentOff = findParentOffset(parentContainer.id)
          const cx = parentOff?.x ?? 0
          const cy = parentOff?.y ?? 0
          const siblings = collectSiblingTargets(
            parentContainer,
            dragStore.dragWidgetId,
            cx + parentContainer.position.x,
            cy + parentContainer.position.y,
          )
          const containerRect = {
            x: cx + parentContainer.position.x,
            y: cy + parentContainer.position.y,
            w: parentContainer.position.w,
            h: parentContainer.position.h,
          }
          const { lines, snapX, snapY } = calculateContainerGuides(dragRect, siblings, containerRect)
          dragStore.updateGuideLines(lines)
          dragStore.updateSnap(snapX, snapY)
        } else {
          // 根级拖拽：与画布边界 + 所有根级 widget 对齐
          const movedWidget = {
            ...draggingWidget,
            position: { ...draggingWidget.position, x: canvasX, y: canvasY },
          }
          const { lines, snapX, snapY } = calculateGuideLines(
            movedWidget,
            widgetStore.widgets,
            boardStore.canvas.width,
            boardStore.canvas.height,
          )
          dragStore.updateGuideLines(lines)
          dragStore.updateSnap(snapX, snapY)
        }
      }
    }
  }

  /** 结束拖拽（mouseup 时调用） */
  function endDrag() {
    if (!dragStore.isDragging) return

    const { dragSource, dragWidgetId, dragWidgetType, hoveredContainerId, snapX, snapY } = dragStore

    if (dragSource === 'panel' && dragWidgetType) {
      // 从面板拖入：创建新 Widget
      const newWidget = createWidget(dragWidgetType as SchemaType, dragWidgetId!)
      if (newWidget) {
        let x = snapX ?? dragStore.dragX
        let y = snapY ?? dragStore.dragY

        if (hoveredContainerId) {
          // 拖入容器：画布坐标 → 容器本地坐标
          const container = widgetStore.findWidget(hoveredContainerId)
          x -= container?.position.x ?? 0
          y -= container?.position.y ?? 0
        } else {
          const constrained = constrainToCanvasBounds(
            x, y, newWidget.position.w, newWidget.position.h,
            boardStore.canvas.width, boardStore.canvas.height,
          )
          x = constrained.x
          y = constrained.y
        }

        newWidget.position.x = x
        newWidget.position.y = y

        widgetStore.addWidget(newWidget)
        if (hoveredContainerId) {
          widgetStore.addToContainer(newWidget.id, hoveredContainerId)
        }
        editorStore.pushHistory([...widgetStore.widgets])
      }
    } else if (dragSource === 'canvas' && dragWidgetId) {
      // 画布内移动 — 位置已在 updateDrag 中实时更新
      const widget = widgetStore.findWidget(dragWidgetId)
      if (widget) {
        // 先捕获旧父容器偏移（reparent 后就找不到了）
        const oldParentOff = findParentOffset(dragWidgetId)
        const canvasX = (oldParentOff?.x ?? 0) + widget.position.x
        const canvasY = (oldParentOff?.y ?? 0) + widget.position.y

        let finalCanvasX = snapX ?? canvasX
        let finalCanvasY = snapY ?? canvasY

        if (!hoveredContainerId) {
          // 拖到画布根级：边界约束 + 转为画布坐标
          const constrained = constrainToCanvasBounds(
            finalCanvasX, finalCanvasY, widget.position.w, widget.position.h,
            boardStore.canvas.width, boardStore.canvas.height,
          )
          finalCanvasX = constrained.x
          finalCanvasY = constrained.y
          widgetStore.moveWidget(dragWidgetId, finalCanvasX, finalCanvasY)
          widgetStore.reparentToRoot(dragWidgetId)
        } else {
          // 拖入容器：画布坐标 → 容器本地坐标
          const container = widgetStore.findWidget(hoveredContainerId)
          const localX = finalCanvasX - (container?.position.x ?? 0)
          const localY = finalCanvasY - (container?.position.y ?? 0)
          widgetStore.reparentToContainer(dragWidgetId, hoveredContainerId, localX, localY)
        }
      }
      editorStore.pushHistory([...widgetStore.widgets])
    }

    dragStore.endDrag()
  }

  return {
    startDragFromPanel,
    startDragOnCanvas,
    updateDrag,
    endDrag,
    isDragging: dragStore.isDragging,
    dragSource: dragStore.dragSource,
  }
}
