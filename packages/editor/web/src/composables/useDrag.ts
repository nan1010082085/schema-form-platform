import { useDragStore } from '../stores/drag'
import { useWidgetStore } from '../stores/widget'
import { useEditorStore } from '../stores/editor'
import { useBoardStore } from '../stores/board'
import { viewportToCanvas, constrainToCanvasBounds } from '../utils/coordinate'
import { detectContainerCollision, getRootContainers, collectAllContainers, detectNestedContainerCollision } from '../utils/collision'
import { calculateGuideLines, calculateContainerGuides, collectSiblingTargets } from '../utils/guidelines'
import { createWidget, generateWidgetId } from '../widgets/registry'
import type { SchemaType, Widget } from '../widgets/base/types'
import type { DropPreviewLine } from '../stores/drag'

/** 容器组件类型集合 */
const CONTAINER_TYPE_SET = new Set([
  'form', 'card', 'tabs', 'dialog',
  'single-col', 'double-col', 'triple-col', 'quad-col',
])

/**
 * useDrag — 拖拽系统核心逻辑
 *
 * 处理从组件面板拖入画布、画布内拖拽移动、容器碰撞检测、辅助线吸附。
 * 优化项：
 * - 放置预览线（指示插入位置）
 * - 深层嵌套容器碰撞检测（递归收集所有容器）
 * - 拖拽取消恢复（ESC 键恢复原始位置）
 * - 面板拖入时实时预览放置位置
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

  /**
   * 计算嵌套容器内的画布绝对坐标偏移。
   * 递归向上查找所有父容器的 position 偏移之和。
   */
  function findContainerCanvasOffset(containerId: string): { x: number; y: number } {
    const offsets: { x: number; y: number }[] = []
    let currentId: string | null = containerId

    while (currentId) {
      const parent = findParentContainer(currentId)
      if (parent) {
        offsets.push({ x: parent.position.x, y: parent.position.y })
        currentId = parent.id
      } else {
        // currentId 是根级容器
        const rootWidget = widgetStore.findWidget(currentId)
        if (rootWidget) {
          offsets.push({ x: rootWidget.position.x, y: rootWidget.position.y })
        }
        break
      }
    }

    return offsets.reduce(
      (acc, o) => ({ x: acc.x + o.x, y: acc.y + o.y }),
      { x: 0, y: 0 },
    )
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

    // 记录原始位置，用于取消拖拽时恢复
    const parentContainer = findParentContainer(widgetId)

    dragStore.startDrag('canvas', widgetId, undefined, {
      cursorX: canvasPos.x,
      cursorY: canvasPos.y,
      widgetX: widgetCanvasX,
      widgetY: widgetCanvasY,
      originalX: widget?.position.x,
      originalY: widget?.position.y,
      originalParentId: parentContainer?.id ?? null,
    })
  }

  /**
   * 计算放置预览线。
   * 根据鼠标位置和最近的 widget 边缘，确定新组件的插入位置。
   */
  function computeDropPreviewLine(canvasX: number, canvasY: number, widgetW: number, widgetH: number): DropPreviewLine | null {
    const PREVIEW_THRESHOLD = 20 // 在 widget 边缘 20px 内显示预览线

    // 在容器内：根据鼠标相对子组件的位置决定插入到上方还是下方
    const hoveredId = dragStore.hoveredContainerId
    if (hoveredId) {
      const container = widgetStore.findWidget(hoveredId)
      if (container?.children?.length) {
        const containerOff = findContainerCanvasOffset(hoveredId)
        const cCanvasX = containerOff.x + container.position.x
        const cCanvasY = containerOff.y + container.position.y

        // 找到最近的子组件
        let closestChild: Widget | null = null
        let closestDist = Infinity
        let insertBefore = true

        for (const child of container.children) {
          const childCanvasY = cCanvasY + child.position.y
          const childBottom = childCanvasY + child.position.h
          const childCenterY = childCanvasY + child.position.h / 2

          // 鼠标在子组件上方区域
          const distAbove = Math.abs(canvasY - childCanvasY)
          // 鼠标在子组件下方区域
          const distBelow = Math.abs(canvasY - childBottom)

          if (distAbove < closestDist && distAbove < PREVIEW_THRESHOLD) {
            closestDist = distAbove
            closestChild = child as Widget
            insertBefore = true
          }
          if (distBelow < closestDist && distBelow < PREVIEW_THRESHOLD) {
            closestDist = distBelow
            closestChild = child as Widget
            insertBefore = false
          }

          // 鼠标在子组件区域内 — 靠近上半部分插入上方，下半部分插入下方
          if (canvasY >= childCanvasY && canvasY <= childBottom) {
            if (canvasY < childCenterY) {
              closestChild = child as Widget
              insertBefore = true
              closestDist = 0
            } else {
              closestChild = child as Widget
              insertBefore = false
              closestDist = 0
            }
          }
        }

        if (closestChild) {
          const child = closestChild as Widget
          const previewY = insertBefore
            ? cCanvasY + child.position.y
            : cCanvasY + child.position.y + child.position.h
          return {
            orientation: 'horizontal',
            position: previewY,
            start: cCanvasX + 4,
            end: cCanvasX + container.position.w - 4,
            targetContainerId: hoveredId,
          }
        }

        // 容器内无子组件 — 显示容器中心的预览线
        return {
          orientation: 'horizontal',
          position: cCanvasY + container.position.h / 2,
          start: cCanvasX + 4,
          end: cCanvasX + container.position.w - 4,
          targetContainerId: hoveredId,
        }
      }
    }

    // 根级：根据鼠标与最近 widget 的位置关系显示预览线
    let closestWidget: Widget | null = null
    let closestDist = Infinity
    let insertBefore = true

    for (const w of widgetStore.widgets) {
      if (w.id === dragStore.dragWidgetId) continue
      const wBottom = w.position.y + w.position.h

      const distAbove = Math.abs(canvasY - w.position.y)
      const distBelow = Math.abs(canvasY - wBottom)

      if (distAbove < closestDist && distAbove < PREVIEW_THRESHOLD) {
        closestDist = distAbove
        closestWidget = w
        insertBefore = true
      }
      if (distBelow < closestDist && distBelow < PREVIEW_THRESHOLD) {
        closestDist = distBelow
        closestWidget = w
        insertBefore = false
      }

      if (canvasY >= w.position.y && canvasY <= wBottom) {
        const centerY = w.position.y + w.position.h / 2
        if (canvasY < centerY) {
          closestWidget = w
          insertBefore = true
          closestDist = 0
        } else {
          closestWidget = w
          insertBefore = false
          closestDist = 0
        }
      }
    }

    if (closestWidget) {
      const previewY = insertBefore
        ? closestWidget.position.y
        : closestWidget.position.y + closestWidget.position.h
      return {
        orientation: 'horizontal',
        position: previewY,
        start: 4,
        end: boardStore.canvas.width - 4,
        targetContainerId: null,
      }
    }

    return null
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
    // 使用递归收集所有容器（含嵌套），支持深层嵌套拖拽
    const draggedType = dragStore.dragWidgetType || widgetStore.findWidget(dragStore.dragWidgetId || '')?.type
    const isContainerDrag = draggedType && CONTAINER_TYPE_SET.has(draggedType)

    if (isContainerDrag) {
      dragStore.updateCollision(null)
      dragStore.updateDropPreviewLine(null)
    } else {
      const tempWidget = {
        id: dragStore.dragWidgetId || '',
        name: '',
        type: (draggedType || 'input') as SchemaType,
        position: { x: canvasX, y: canvasY, w: widgetW, h: widgetH },
      }

      // 优先尝试递归碰撞检测（支持深层嵌套容器）
      const allContainers = collectAllContainers(
        widgetStore.widgets,
        0, 0, 0,
        dragStore.dragWidgetId || undefined,
      )

      if (allContainers.length > 0) {
        const hitContainer = detectNestedContainerCollision(
          tempWidget as Widget,
          allContainers,
        )
        dragStore.updateCollision(hitContainer?.id || null)
      } else {
        // 回退到根级容器检测
        const containers = getRootContainers(
          widgetStore.widgets,
          dragStore.dragWidgetId || undefined,
        )
        const hitContainer = detectContainerCollision(tempWidget as Widget, containers)
        dragStore.updateCollision(hitContainer?.id || null)
      }

      // 计算放置预览线
      const previewLine = computeDropPreviewLine(canvasX, canvasY, widgetW, widgetH)
      dragStore.updateDropPreviewLine(previewLine)
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

  /**
   * 取消拖拽 — 恢复到拖拽前的状态。
   * ESC 键触发，widget 位置回退到拖拽开始时的快照。
   */
  function cancelDrag() {
    if (!dragStore.isDragging) return

    const { dragSource, dragWidgetId, originalPosition } = dragStore

    // 画布内拖拽：恢复原始位置
    if (dragSource === 'canvas' && dragWidgetId && originalPosition) {
      widgetStore.moveWidget(dragWidgetId, originalPosition.x, originalPosition.y)

      // 如果拖拽过程中发生了 reparent，需要恢复原始父容器
      const currentParent = findParentContainer(dragWidgetId)
      const currentParentId = currentParent?.id ?? null

      if (currentParentId !== originalPosition.parentId) {
        if (originalPosition.parentId) {
          widgetStore.reparentToContainer(
            dragWidgetId,
            originalPosition.parentId,
            originalPosition.x,
            originalPosition.y,
          )
        } else {
          widgetStore.reparentToRoot(dragWidgetId)
        }
      }
    }

    dragStore.endDrag()
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
          // 对于嵌套容器，需要递归计算偏移
          const containerOffsets = findContainerCanvasOffset(hoveredContainerId)
          const container = widgetStore.findWidget(hoveredContainerId)
          const containerCanvasX = containerOffsets.x + (container?.position.x ?? 0)
          const containerCanvasY = containerOffsets.y + (container?.position.y ?? 0)
          x -= containerCanvasX
          y -= containerCanvasY
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
          // 对于嵌套容器，需要递归计算偏移
          const containerOffsets = findContainerCanvasOffset(hoveredContainerId)
          const container = widgetStore.findWidget(hoveredContainerId)
          const containerCanvasX = containerOffsets.x + (container?.position.x ?? 0)
          const containerCanvasY = containerOffsets.y + (container?.position.y ?? 0)
          const localX = finalCanvasX - containerCanvasX
          const localY = finalCanvasY - containerCanvasY
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
    cancelDrag,
    isDragging: dragStore.isDragging,
    dragSource: dragStore.dragSource,
  }
}
