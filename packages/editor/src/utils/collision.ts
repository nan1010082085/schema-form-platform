import type { Widget } from '../widgets/base/types'
import { getAllContainerTypes } from '../composables/useConstant'

/**
 * 碰撞检测
 * 判断组件与容器的重叠面积是否超过 50%
 */

/** 获取容器组件类型集合（动态） */
function getContainerTypesSet() {
  return getAllContainerTypes()
}

/** 计算两个矩形的重叠面积 */
function overlapArea(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): number {
  const xOverlap = Math.max(0, Math.min(ax + aw, bx + bw) - Math.max(ax, bx))
  const yOverlap = Math.max(0, Math.min(ay + ah, by + bh) - Math.max(ay, by))
  return xOverlap * yOverlap
}

/**
 * 检测 widget 是否拖入了某个容器。
 * 判定条件：widget 与容器的重叠面积 >= widget 面积的 50%。
 * 避免仅中心点在容器内就吸附的问题。
 */
export function detectContainerCollision(
  widget: Widget,
  containers: Widget[],
): Widget | null {
  const wp = widget.position ?? { x: 0, y: 0, w: 0, h: 0 }
  const wx = wp.x
  const wy = wp.y
  const ww = wp.w
  const wh = wp.h
  const widgetArea = ww * wh

  for (const container of containers) {
    if (container.id === widget.id) continue
    if (!container.position) continue
    const cp = container.position
    const area = overlapArea(wx, wy, ww, wh, cp.x, cp.y, cp.w, cp.h)
    if (area >= widgetArea * 0.5) {
      return container
    }
  }
  return null
}

/**
 * 检测 widget 是否拖入了某个容器（支持嵌套容器的画布绝对坐标碰撞检测）。
 *
 * 与 detectContainerCollision 不同，此函数接收的 containers 已带有画布绝对坐标，
 * 可用于深层嵌套容器的碰撞检测。
 */
export function detectNestedContainerCollision(
  widget: Widget,
  containers: Array<Widget & { _canvasX: number; _canvasY: number }>,
): (Widget & { _canvasX: number; _canvasY: number }) | null {
  const wp = widget.position ?? { x: 0, y: 0, w: 0, h: 0 }
  const wx = wp.x
  const wy = wp.y
  const ww = wp.w
  const wh = wp.h
  const widgetArea = ww * wh

  // 优先匹配最深层的容器（后遍历的通常是更深层的子容器）
  let best: (Widget & { _canvasX: number; _canvasY: number }) | null = null
  let bestDepth = -1

  for (const container of containers) {
    if (container.id === widget.id) continue
    if (!container.position) continue
    const cx = container._canvasX
    const cy = container._canvasY
    const cw = container.position.w
    const ch = container.position.h
    const area = overlapArea(wx, wy, ww, wh, cx, cy, cw, ch)
    if (area >= widgetArea * 0.5) {
      const depth = (container as { _depth?: number })._depth ?? 0
      if (depth > bestDepth) {
        best = container
        bestDepth = depth
      }
    }
  }
  return best
}

/** 获取所有根级容器（排除 widget 自身） */
export function getRootContainers(widgets: Widget[], excludeId?: string): Widget[] {
  const containerTypes = getContainerTypesSet()
  return widgets.filter(
    (w) => containerTypes.has(w.type) && w.id !== excludeId,
  )
}

/**
 * 递归收集所有容器（含嵌套），并计算其画布绝对坐标。
 * 返回的 Widget 对象附加了 _canvasX、_canvasY、_depth 属性。
 *
 * 用于深层嵌套拖拽碰撞检测：当组件需要拖入第 3+ 层容器时，
 * 必须用画布绝对坐标做碰撞判定。
 *
 * @param widgets    当前层级的 Widget 列表
 * @param offsetX    当前层级的 X 偏移（画布坐标）
 * @param offsetY    当前层级的 Y 偏移（画布坐标）
 * @param depth      当前嵌套深度
 * @param excludeId  需要排除的 Widget ID（通常为正在拖拽的组件）
 */
export function collectAllContainers(
  widgets: Widget[],
  offsetX = 0,
  offsetY = 0,
  depth = 0,
  excludeId?: string,
): Array<Widget & { _canvasX: number; _canvasY: number; _depth: number }> {
  const result: Array<Widget & { _canvasX: number; _canvasY: number; _depth: number }> = []
  const containerTypes = getContainerTypesSet()
  for (const w of widgets) {
    if (w.id === excludeId) continue
    if (!w.position) continue
    if (containerTypes.has(w.type)) {
      const canvasX = offsetX + w.position.x
      const canvasY = offsetY + w.position.y
      result.push({ ...w, _canvasX: canvasX, _canvasY: canvasY, _depth: depth })
      // 自渲染容器（多列布局）的子组件坐标系由容器内部管理，
      // 但其 children 仍需递归收集以支持深层嵌套碰撞
      if (w.children?.length) {
        result.push(...collectAllContainers(
          w.children.filter((c): c is Widget => c != null && c.position != null) as Widget[],
          canvasX,
          canvasY,
          depth + 1,
          excludeId,
        ))
      }
    }
  }
  return result
}
