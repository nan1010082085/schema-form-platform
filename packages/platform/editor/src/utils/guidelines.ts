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

/** 预计算的对齐目标矩形（画布坐标系） */
export interface AlignTarget {
  left: number
  right: number
  top: number
  bottom: number
}

function toRect(r: AlignTarget): Rect {
  return {
    left: r.left,
    right: r.right,
    top: r.top,
    bottom: r.bottom,
    centerX: (r.left + r.right) / 2,
    centerY: (r.top + r.bottom) / 2,
  }
}

function widgetToAlignTarget(w: Widget, offsetX = 0, offsetY = 0): AlignTarget {
  const pos = w.position ?? { x: 0, y: 0, w: 0, h: 0 }
  return {
    left: offsetX + pos.x,
    right: offsetX + pos.x + pos.w,
    top: offsetY + pos.y,
    bottom: offsetY + pos.y + pos.h,
  }
}

/**
 * 计算对齐辅助线（全局模式 — 检查画布边界 + 所有 widget）
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

  const dPos = draggingWidget.position ?? { x: 0, y: 0, w: 0, h: 0 }
  const dragRect: Rect = {
    left: dPos.x,
    right: dPos.x + dPos.w,
    top: dPos.y,
    bottom: dPos.y + dPos.h,
    centerX: dPos.x + dPos.w / 2,
    centerY: dPos.y + dPos.h / 2,
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

  checkAlignment(dragRect, canvasEdges, lines, (snap) => {
    if (snap.x !== null) snapX = snap.x
    if (snap.y !== null) snapY = snap.y
  })

  // 检查与其他 widget 的对齐
  for (const other of allWidgets) {
    if (other.id === draggingWidget.id) continue
    checkAlignment(dragRect, toRect(widgetToAlignTarget(other)), lines, (snap) => {
      if (snap.x !== null) snapX = snap.x
      if (snap.y !== null) snapY = snap.y
    })
  }

  return { lines, snapX, snapY }
}

/**
 * 计算容器内对齐辅助线（容器作用域 — 检查容器边界 + 同级 widget）
 *
 * @param dragRect      拖拽中的 widget 在**画布坐标系**中的矩形
 * @param siblings      同容器内其他 widget 的对齐目标（画布坐标系）
 * @param containerRect 容器在**画布坐标系**中的矩形
 */
export function calculateContainerGuides(
  dragRect: { x: number; y: number; w: number; h: number },
  siblings: AlignTarget[],
  containerRect: { x: number; y: number; w: number; h: number },
): { lines: GuideLine[]; snapX: number | null; snapY: number | null } {
  const lines: GuideLine[] = []
  let snapX: number | null = null
  let snapY: number | null = null

  const drag: Rect = {
    left: dragRect.x,
    right: dragRect.x + dragRect.w,
    top: dragRect.y,
    bottom: dragRect.y + dragRect.h,
    centerX: dragRect.x + dragRect.w / 2,
    centerY: dragRect.y + dragRect.h / 2,
  }

  // 容器边界对齐
  const container: Rect = {
    left: containerRect.x,
    right: containerRect.x + containerRect.w,
    top: containerRect.y,
    bottom: containerRect.y + containerRect.h,
    centerX: containerRect.x + containerRect.w / 2,
    centerY: containerRect.y + containerRect.h / 2,
  }

  checkAlignment(drag, container, lines, (snap) => {
    if (snap.x !== null) snapX = snap.x
    if (snap.y !== null) snapY = snap.y
  })

  // 同级 widget 对齐
  for (const sibling of siblings) {
    checkAlignment(drag, toRect(sibling), lines, (snap) => {
      if (snap.x !== null) snapX = snap.x
      if (snap.y !== null) snapY = snap.y
    })
  }

  return { lines, snapX, snapY }
}

/** 收集容器内子 widget 的对齐目标（画布坐标系） */
export function collectSiblingTargets(
  container: Widget,
  excludeId: string,
  containerCanvasX: number,
  containerCanvasY: number,
): AlignTarget[] {
  if (!container.children) return []
  const targets: AlignTarget[] = []
  for (const child of container.children) {
    if (child.id === excludeId) continue
    targets.push(widgetToAlignTarget(child, containerCanvasX, containerCanvasY))
  }
  return targets
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
