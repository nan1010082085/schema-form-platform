/**
 * useWidgetStore — Widget 集合的 CRUD 和树结构操作
 *
 * 职责：
 * - Widget[] 的增删改查
 * - 树结构遍历（递归搜索、父节点查找）
 * - 位置操作（移动、缩放、层级）
 * - 容器操作（添加到容器、从容器移除、重新挂载）
 * - 表单容器绑定（formId）
 * - 页签绑定（tabKey）
 * - 行列绑定（colIndex）
 * - 表单值收集
 *
 * 这是 Widget 数据的唯一 source of truth。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Widget, ContainerType } from '../widgets/base/types'

/** 容器组件类型集合 — 这些组件禁止被拖入其他容器 */
const CONTAINER_TYPES: Set<string> = new Set<ContainerType>([
  'form', 'card', 'tabs', 'dialog',
  'single-col', 'double-col', 'triple-col', 'quad-col',
])

/** 列容器类型 → 列数映射 */
const COL_CONTAINER_COLUMNS: Record<string, number> = {
  'single-col': 1,
  'double-col': 2,
  'triple-col': 3,
  'quad-col': 4,
}

/** 获取列容器的列数，非列容器返回 0 */
function getColContainerColumns(type: string): number {
  return COL_CONTAINER_COLUMNS[type] ?? 0
}

export const useWidgetStore = defineStore('widget', () => {
  // ================================================================
  // 数据
  // ================================================================

  const widgets = ref<Widget[]>([])

  // ================================================================
  // 树结构遍历
  // ================================================================

  /**
   * 递归搜索 Widget（DFS）。
   */
  function findWidget(id: string, list: Widget[] = widgets.value): Widget | null {
    for (const widget of list) {
      if (widget.id === id) return widget
      if (widget.children) {
        const found = findWidget(id, widget.children)
        if (found) return found
      }
    }
    return null
  }

  /**
   * 查找包含目标 Widget 的父 Widget。
   * 目标在根级时返回 null。
   */
  function findParent(id: string, list: Widget[] = widgets.value): Widget | null {
    for (const widget of list) {
      if (widget.children?.some((c) => c.id === id)) return widget
      if (widget.children) {
        const found = findParent(id, widget.children)
        if (found) return found
      }
    }
    return null
  }

  /**
   * 判断目标是否在根级。
   */
  function isRootWidget(id: string): boolean {
    return widgets.value.some((w) => w.id === id)
  }

  /**
   * 从指定列表中按 ID 移除 Widget（递归）。
   * 返回是否成功移除。
   */
  function removeFromList(id: string, list: Widget[]): boolean {
    const idx = list.findIndex((w) => w.id === id)
    if (idx >= 0) {
      list.splice(idx, 1)
      return true
    }
    for (const widget of list) {
      if (widget.children && removeFromList(id, widget.children)) return true
    }
    return false
  }

  /**
   * 获取所有 Widget 的最大 zIndex（递归）。
   */
  function getMaxZIndex(list: Widget[] = widgets.value): number {
    let max = 0
    for (const widget of list) {
      if ((widget.position.zIndex ?? 0) > max) max = widget.position.zIndex ?? 0
      if (widget.children) {
        const childMax = getMaxZIndex(widget.children)
        if (childMax > max) max = childMax
      }
    }
    return max
  }

  // ================================================================
  // CRUD
  // ================================================================

  function addWidget(widget: Widget): void {
    widget.position.zIndex = getMaxZIndex() + 1
    widgets.value.push(widget)
  }

  function removeWidget(id: string): void {
    removeFromList(id, widgets.value)
  }

  function updateWidget(id: string, patch: Partial<Widget>): void {
    const widget = findWidget(id)
    if (widget) {
      Object.assign(widget, patch)
    }
  }

  // ================================================================
  // 位置操作
  // ================================================================

  function moveWidget(id: string, x: number, y: number): void {
    const widget = findWidget(id)
    if (widget) {
      widget.position.x = x
      widget.position.y = y
    }
  }

  function resizeWidget(id: string, w: number, h: number): void {
    const widget = findWidget(id)
    if (widget) {
      widget.position.w = Math.max(20, w)
      widget.position.h = Math.max(20, h)
    }
  }

  function setZIndex(id: string, zIndex: number): void {
    const widget = findWidget(id)
    if (widget) {
      widget.position.zIndex = Math.max(1, zIndex)
    }
  }

  // ================================================================
  // 容器操作
  // ================================================================

  /**
   * 将 Widget 从当前位置移除，添加到目标容器的 children。
   * 坐标保持不变（调用方负责坐标转换）。
   */
  function addToContainer(widgetId: string, containerId: string): void {
    const widget = findWidget(widgetId)
    const container = findWidget(containerId)
    if (!widget || !container) return
    if (widgetId === containerId) return
    // 容器禁止嵌套到其他容器中
    if (CONTAINER_TYPES.has(widget.type)) return
    // 已经是目标容器的直接子节点
    if (container.children?.some((c) => c.id === widgetId)) return

    removeFromList(widgetId, widgets.value)

    // tabs 容器：自动分配 tabKey
    if (container.type === 'tabs' && !widget.tabKey) {
      const tabs = container.props?.tabs as Array<{ key: string }> | undefined
      const activeKey = container.props?.activeKey as string | undefined
      widget.tabKey = activeKey || tabs?.[0]?.key || 'tab1'
    }

    // 列容器：自动分配 colIndex（放入列数最少的列）
    const colContainerColumns = getColContainerColumns(container.type)
    if (colContainerColumns > 0) {
      const targetCol = widget.colIndex ?? 0
      const existing = container.children?.filter(c => (c as Widget).colIndex === targetCol) ?? []
      if (existing.length >= 1) return // column full — 1 widget per column
      if (widget.colIndex === undefined) {
        const colCounts = new Array(colContainerColumns).fill(0)
        for (const child of container.children ?? []) {
          const ci = (child as Widget).colIndex ?? 0
          if (ci < colContainerColumns) colCounts[ci]++
        }
        widget.colIndex = colCounts.indexOf(Math.min(...colCounts))
      }
    }

    if (!container.children) container.children = []
    container.children.push(widget)
  }

  /**
   * 从容器的 children 中移除 Widget，放回根级。
   * 坐标保持不变。
   */
  function removeFromContainer(widgetId: string): void {
    const parent = findParent(widgetId)
    if (!parent) return
    const widget = findWidget(widgetId)
    if (!widget) return

    // 从父容器移除
    if (parent.children) {
      const idx = parent.children.findIndex((c) => c.id === widgetId)
      if (idx >= 0) {
        parent.children.splice(idx, 1)
      }
    }

    // 放回根级
    widgets.value.push(widget)
  }

  /**
   * 将 Widget 重新挂载到根级。
   * 不修改坐标。
   */
  function reparentToRoot(id: string): void {
    const widget = findWidget(id)
    if (!widget) return
    if (isRootWidget(id)) return

    removeFromList(id, widgets.value)
    widgets.value.push(widget)
  }

  /**
   * 将 Widget 重新挂载到目标容器。
   * x/y 为目标容器的局部坐标。
   */
  function reparentToContainer(id: string, targetId: string, x: number, y: number): void {
    const widget = findWidget(id)
    const target = findWidget(targetId)
    if (!widget || !target) return
    if (id === targetId) return
    // 容器禁止嵌套到其他容器中
    if (CONTAINER_TYPES.has(widget.type)) return
    if (target.children?.some((c) => c.id === id)) return

    removeFromList(id, widgets.value)

    widget.position.x = x
    widget.position.y = y

    // tabs 容器：自动分配 tabKey
    if (target.type === 'tabs' && !widget.tabKey) {
      const tabs = target.props?.tabs as Array<{ key: string }> | undefined
      const activeKey = target.props?.activeKey as string | undefined
      widget.tabKey = activeKey || tabs?.[0]?.key || 'tab1'
    }

    // 列容器：自动分配 colIndex（放入列数最少的列）
    const colContainerColumns = getColContainerColumns(target.type)
    if (colContainerColumns > 0) {
      const targetCol = widget.colIndex ?? 0
      const existing = target.children?.filter(c => (c as Widget).colIndex === targetCol) ?? []
      if (existing.length >= 1) return // column full — 1 widget per column
      if (widget.colIndex === undefined) {
        const colCounts = new Array(colContainerColumns).fill(0)
        for (const child of target.children ?? []) {
          const ci = (child as Widget).colIndex ?? 0
          if (ci < colContainerColumns) colCounts[ci]++
        }
        widget.colIndex = colCounts.indexOf(Math.min(...colCounts))
      }
    }

    if (!target.children) target.children = []
    target.children.push(widget)
  }

  // ================================================================
  // 表单容器绑定
  // ================================================================

  /**
   * 将 Widget 绑定到指定表单容器。
   */
  function bindToForm(widgetId: string, formId: string): void {
    const widget = findWidget(widgetId)
    if (widget) {
      widget.formId = formId
    }
  }

  /**
   * 解除 Widget 的表单容器绑定。
   */
  function unbindFromForm(widgetId: string): void {
    const widget = findWidget(widgetId)
    if (widget) {
      delete widget.formId
    }
  }

  /**
   * 收集指定表单容器下所有子 Widget 的字段值。
   * 只收集有 field 属性且在同一 formId 下的 Widget。
   */
  function collectFormValues(formId: string): Record<string, unknown> {
    const values: Record<string, unknown> = {}

    function walk(list: Widget[]): void {
      for (const widget of list) {
        if (widget.formId === formId && widget.field) {
          values[widget.field] = widget.defaultValue ?? null
        }
        if (widget.children) {
          walk(widget.children)
        }
      }
    }

    walk(widgets.value)
    return values
  }

  // ================================================================
  // 页签操作
  // ================================================================

  /**
   * 设置 Widget 绑定的页签 key。
   */
  function setTabKey(widgetId: string, tabKey: string): void {
    const widget = findWidget(widgetId)
    if (widget) {
      widget.tabKey = tabKey
    }
  }

  // ================================================================
  // 行列操作
  // ================================================================

  /**
   * 设置 Widget 绑定的列索引。
   */
  function setColIndex(widgetId: string, colIndex: number): void {
    const widget = findWidget(widgetId)
    if (widget) {
      widget.colIndex = colIndex
    }
  }

  // ================================================================
  // 批量操作
  // ================================================================

  /**
   * 批量替换所有 Widget（从 API 加载时使用）。
   */
  function loadWidgets(data: Widget[]): void {
    widgets.value = data
  }

  /**
   * 清空所有 Widget。
   */
  function clearWidgets(): void {
    widgets.value = []
  }

  // ================================================================
  // 导出
  // ================================================================

  return {
    // 数据
    widgets,
    // 树结构遍历
    findWidget,
    findParent,
    isRootWidget,
    // CRUD
    addWidget,
    removeWidget,
    updateWidget,
    // 位置操作
    moveWidget,
    resizeWidget,
    setZIndex,
    // 容器操作
    addToContainer,
    removeFromContainer,
    reparentToRoot,
    reparentToContainer,
    // 表单容器绑定
    bindToForm,
    unbindFromForm,
    collectFormValues,
    // 页签操作
    setTabKey,
    // 行列操作
    setColIndex,
    // 批量操作
    loadWidgets,
    clearWidgets,
  }
})
