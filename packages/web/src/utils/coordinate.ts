/**
 * 坐标系工具
 * viewport -> canvas 内容坐标 -> 容器本地坐标
 */

/** viewport 坐标转 canvas 内容坐标 */
export function viewportToCanvas(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  scrollLeft: number,
  scrollTop: number,
  zoom: number,
): { x: number; y: number } {
  return {
    x: (clientX - canvasRect.left + scrollLeft) / (zoom / 100),
    y: (clientY - canvasRect.top + scrollTop) / (zoom / 100),
  }
}

/** canvas 坐标转容器本地坐标 */
export function canvasToLocal(
  canvasX: number,
  canvasY: number,
  containerX: number,
  containerY: number,
): { x: number; y: number } {
  return {
    x: canvasX - containerX,
    y: canvasY - containerY,
  }
}

/** 容器本地坐标转 canvas 坐标 */
export function localToCanvas(
  localX: number,
  localY: number,
  containerX: number,
  containerY: number,
): { x: number; y: number } {
  return {
    x: localX + containerX,
    y: localY + containerY,
  }
}

/** 根级组件边界约束 */
export function constrainToCanvasBounds(
  x: number,
  y: number,
  w: number,
  h: number,
  canvasWidth: number,
  canvasHeight: number,
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(x, canvasWidth - w)),
    y: Math.max(0, Math.min(y, canvasHeight - h)),
  }
}

/** 拖拽 delta 缩放补偿 */
export function scaleDelta(
  deltaX: number,
  deltaY: number,
  zoom: number,
): { dx: number; dy: number } {
  return {
    dx: deltaX / (zoom / 100),
    dy: deltaY / (zoom / 100),
  }
}
