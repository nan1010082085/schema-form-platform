/**
 * useDragStore — 拖拽状态管理
 *
 * 职责：
 * - 拖拽状态（是否拖拽中、拖拽来源、拖拽目标 ID/类型）
 * - 拖拽位置（当前坐标、增量）
 * - 碰撞状态（悬停的容器 ID、是否在容器内）
 * - 辅助线（对齐参考线、吸附坐标）
 *
 * 变化频率最高，独立管理，与 Widget 数据和编辑器状态解耦。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

// ================================================================
// 类型定义
// ================================================================

interface GuideLine {
  type: 'horizontal' | 'vertical'
  position: number
  start: number
  end: number
}

export type { GuideLine }

export const useDragStore = defineStore('drag', () => {
  // ================================================================
  // 拖拽状态
  // ================================================================

  const isDragging = ref(false)
  const dragSource = ref<'panel' | 'canvas' | null>(null)
  const dragWidgetId = ref<string | null>(null)
  const dragWidgetType = ref<string | null>(null)

  // ================================================================
  // 拖拽位置
  // ================================================================

  const dragX = ref(0)
  const dragY = ref(0)
  const dragDeltaX = ref(0)
  const dragDeltaY = ref(0)

  // 拖拽起点（用于 delta 计算，实现实时跟随）
  const initialCursorX = ref(0)
  const initialCursorY = ref(0)
  const initialWidgetX = ref(0)
  const initialWidgetY = ref(0)

  // ================================================================
  // 碰撞状态
  // ================================================================

  const hoveredContainerId = ref<string | null>(null)
  const isInContainer = ref(false)

  // ================================================================
  // 辅助线
  // ================================================================

  const guideLines = ref<GuideLine[]>([])
  const snapX = ref<number | null>(null)
  const snapY = ref<number | null>(null)

  // ================================================================
  // 方法
  // ================================================================

  /**
   * 开始拖拽。
   *
   * @param source - 拖拽来源：'panel'（组件面板拖入）或 'canvas'（画布内拖动）
   * @param id     - 被拖拽的 Widget ID（canvas 拖动时必传）
   * @param type   - 组件类型（panel 拖入时必传）
   */
  function startDrag(
    source: 'panel' | 'canvas',
    id?: string,
    type?: string,
    opts?: { cursorX?: number; cursorY?: number; widgetX?: number; widgetY?: number },
  ): void {
    isDragging.value = true
    dragSource.value = source
    dragWidgetId.value = id ?? null
    dragWidgetType.value = type ?? null
    dragX.value = 0
    dragY.value = 0
    dragDeltaX.value = 0
    dragDeltaY.value = 0
    initialCursorX.value = opts?.cursorX ?? 0
    initialCursorY.value = opts?.cursorY ?? 0
    initialWidgetX.value = opts?.widgetX ?? 0
    initialWidgetY.value = opts?.widgetY ?? 0
    hoveredContainerId.value = null
    isInContainer.value = false
    guideLines.value = []
    snapX.value = null
    snapY.value = null
  }

  /**
   * 更新拖拽位置。
   *
   * @param x - 当前鼠标 X 坐标
   * @param y - 当前鼠标 Y 坐标
   */
  function updateDragPosition(x: number, y: number): void {
    dragDeltaX.value = x - dragX.value
    dragDeltaY.value = y - dragY.value
    dragX.value = x
    dragY.value = y
  }

  /**
   * 更新碰撞状态。
   *
   * @param containerId - 鼠标悬停的容器 ID，不在容器内时传 null
   */
  function updateCollision(containerId: string | null): void {
    hoveredContainerId.value = containerId
    isInContainer.value = containerId !== null
  }

  /**
   * 更新辅助线。
   */
  function updateGuideLines(lines: GuideLine[]): void {
    guideLines.value = lines
  }

  /**
   * 更新吸附坐标。
   *
   * @param x - 吸附 X 坐标，不吸附时传 null
   * @param y - 吸附 Y 坐标，不吸附时传 null
   */
  function updateSnap(x: number | null, y: number | null): void {
    snapX.value = x
    snapY.value = y
  }

  /**
   * 结束拖拽，重置所有状态。
   */
  function endDrag(): void {
    isDragging.value = false
    dragSource.value = null
    dragWidgetId.value = null
    dragWidgetType.value = null
    dragX.value = 0
    dragY.value = 0
    dragDeltaX.value = 0
    dragDeltaY.value = 0
    initialCursorX.value = 0
    initialCursorY.value = 0
    initialWidgetX.value = 0
    initialWidgetY.value = 0
    hoveredContainerId.value = null
    isInContainer.value = false
    guideLines.value = []
    snapX.value = null
    snapY.value = null
  }

  // ================================================================
  // 导出
  // ================================================================

  return {
    // 拖拽状态
    isDragging,
    dragSource,
    dragWidgetId,
    dragWidgetType,
    // 拖拽位置
    dragX,
    dragY,
    dragDeltaX,
    dragDeltaY,
    // 拖拽起点
    initialCursorX,
    initialCursorY,
    initialWidgetX,
    initialWidgetY,
    // 碰撞状态
    hoveredContainerId,
    isInContainer,
    // 辅助线
    guideLines,
    snapX,
    snapY,
    // 方法
    startDrag,
    updateDragPosition,
    updateCollision,
    updateGuideLines,
    updateSnap,
    endDrag,
  }
})
