import type { Widget } from '../widgets/base/types'

export interface GuideLine {
  type: 'horizontal' | 'vertical'
  position: number
  start: number
  end: number
}

const SNAP_THRESHOLD = 5 // ±5px 吸附阈值
const GUIDE_EXTENSION = 20 // 超出对齐边缘 20px

interface Rect {
  left: number
  right: number
  top: number
  bottom: number
  centerX: number
  centerY: number
}

/**
 * 计算对齐辅助线
 */
export function calculateGuideLines(
  draggingWidget: Widget,
  allWidgets: Widget[],
  canvasWidth: number,
  canvasHeight: number,
): { lines: GuideLine[]; snapX: number | null; snapY: number | null } {
  const lines: GuideLine[] = []
  let snapX: number | null = null
  let snapY: number | null = null

  const dragRect: Rect = {
    left: draggingWidget.position.x,
    right: draggingWidget.position.x + draggingWidget.position.w,
    top: draggingWidget.position.y,
    bottom: draggingWidget.position.y + draggingWidget.position.h,
    centerX: draggingWidget.position.x + draggingWidget.position.w / 2,
    centerY: draggingWidget.position.y + draggingWidget.position.h / 2,
  }

  // 画布边界对齐
  const canvasEdges: Rect = {
    left: 0,
    right: canvasWidth,
    top: 0,
    bottom: canvasHeight,
    centerX: canvasWidth / 2,
    centerY: canvasHeight / 2,
  }

  // 检查与画布边界的对齐
  checkAlignment(dragRect, canvasEdges, lines, (snap) => {
    if (snap.x !== null) snapX = snap.x
    if (snap.y !== null) snapY = snap.y
  })

  // 检查与其他 widget 的对齐
  for (const other of allWidgets) {
    if (other.id === draggingWidget.id) continue

    const otherRect: Rect = {
      left: other.position.x,
      right: other.position.x + other.position.w,
      top: other.position.y,
      bottom: other.position.y + other.position.h,
      centerX: other.position.x + other.position.w / 2,
      centerY: other.position.y + other.position.h / 2,
    }

    checkAlignment(dragRect, otherRect, lines, (snap) => {
      if (snap.x !== null) snapX = snap.x
      if (snap.y !== null) snapY = snap.y
    })
  }

  return { lines, snapX, snapY }
}

function checkAlignment(
  dragRect: Rect,
  targetRect: Rect,
  lines: GuideLine[],
  onSnap: (snap: { x: number | null; y: number | null }) => void,
): void {
  // 垂直对齐检查（左右边线 + 中心线）
  const verticalChecks = [
    { drag: dragRect.left, target: targetRect.left },
    { drag: dragRect.left, target: targetRect.right },
    { drag: dragRect.right, target: targetRect.left },
    { drag: dragRect.right, target: targetRect.right },
    { drag: dragRect.centerX, target: targetRect.centerX },
  ]

  for (const check of verticalChecks) {
    if (Math.abs(check.drag - check.target) <= SNAP_THRESHOLD) {
      lines.push({
        type: 'vertical',
        position: check.target,
        start: Math.min(dragRect.top, targetRect.top) - GUIDE_EXTENSION,
        end: Math.max(dragRect.bottom, targetRect.bottom) + GUIDE_EXTENSION,
      })
      onSnap({ x: check.target - (check.drag - dragRect.left), y: null })
    }
  }

  // 水平对齐检查（上下边线 + 中心线）
  const horizontalChecks = [
    { drag: dragRect.top, target: targetRect.top },
    { drag: dragRect.top, target: targetRect.bottom },
    { drag: dragRect.bottom, target: targetRect.top },
    { drag: dragRect.bottom, target: targetRect.bottom },
    { drag: dragRect.centerY, target: targetRect.centerY },
  ]

  for (const check of horizontalChecks) {
    if (Math.abs(check.drag - check.target) <= SNAP_THRESHOLD) {
      lines.push({
        type: 'horizontal',
        position: check.target,
        start: Math.min(dragRect.left, targetRect.left) - GUIDE_EXTENSION,
        end: Math.max(dragRect.right, targetRect.right) + GUIDE_EXTENSION,
      })
      onSnap({ x: null, y: check.target - (check.drag - dragRect.top) })
    }
  }
}
