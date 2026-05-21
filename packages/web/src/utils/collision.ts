import type { Widget } from '../widgets/base/types'

/**
 * 碰撞检测
 * 判断组件与容器的重叠面积是否超过 50%
 */

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
  const wx = widget.position.x
  const wy = widget.position.y
  const ww = widget.position.w
  const wh = widget.position.h
  const widgetArea = ww * wh

  for (const container of containers) {
    if (container.id === widget.id) continue
    const cp = container.position
    const area = overlapArea(wx, wy, ww, wh, cp.x, cp.y, cp.w, cp.h)
    if (area >= widgetArea * 0.5) {
      return container
    }
  }
  return null
}

/** 获取所有根级容器（排除 widget 自身） */
export function getRootContainers(widgets: Widget[], excludeId?: string): Widget[] {
  const containerTypes: string[] = ['form', 'card', 'row-col', 'tabs', 'dialog']
  return widgets.filter(
    (w) => containerTypes.includes(w.type) && w.id !== excludeId,
  )
}
