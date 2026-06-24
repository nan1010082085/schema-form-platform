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
import { ref, computed, shallowRef } from 'vue'
import type { Widget, ContainerType } from '../widgets/base/types'
import { getAllContainerTypes } from '../composables/useConstant'

/** 获取容器组件类型集合（动态） */
function getContainerTypes(): Set<string> {
  return getAllContainerTypes() as Set<string>
}

/** 默认 position */
const DEFAULT_POSITION = { x: 0, y: 0, w: 240, h: 40, zIndex: 1 }

/**
 * 递归补全 widget 的 position 字段。
 * 数据库中的旧数据可能缺少 position，导致渲染崩溃。
 */
function normalizePosition(widgets: Widget[]): Widget[] {
  return widgets.map((w) => {
    if (!w.position || typeof w.position !== 'object') {
      w.position = { ...DEFAULT_POSITION }
    } else {
      w.position.x = w.position.x ?? 0
      w.position.y = w.position.y ?? 0
      w.position.w = w.position.w ?? 240
      w.position.h = w.position.h ?? 40
      if (w.position.zIndex === undefined) w.position.zIndex = 1
    }
    if (w.children?.length) {
      w.children = normalizePosition(w.children) as Widget[]
    }
    return w
  })
}

/**
 * 列容器容量检查与自动分配 colIndex
 * 返回 true 表示容量已满，无法添加
 */
function checkAndAssignColIndex(
  widget: Widget,
  container: Widget,
  colContainerColumns: number,
): boolean {
  if (widget.colIndex === undefined) {
    const colCounts = new Array(colContainerColumns).fill(0)
    for (const child of container.children ?? []) {
      const ci = (child as Widget).colIndex ?? 0
      if (ci < colContainerColumns) colCounts[ci]++
    }
    widget.colIndex = colCounts.indexOf(Math.min(...colCounts))
  }
  const targetCol = widget.colIndex ?? 0
  const existing = container.children?.filter(c => (c as Widget).colIndex === targetCol) ?? []
  return existing.length >= 1
}

/**
 * 计算列容器中子部件的位置和尺寸
 */
function calculateColPosition(
  widget: Widget,
  container: Widget,
  colContainerColumns: number,
): void {
  const colWidths = (container.props?.colWidths as number[]) || []
  const gutter = (container.props?.gutter as number) || 0
  const colCount = colContainerColumns
  const colIdx = widget.colIndex ?? 0
  const colPercent = (colWidths[colIdx] ?? (100 / colCount)) / 100
  const gutterAdj = gutter * (colCount - 1) / colCount
  let xOffset = 0
  for (let j = 0; j < colIdx; j++) {
    const prevPercent = (colWidths[j] ?? (100 / colCount)) / 100
    xOffset += container.position.w * prevPercent - gutterAdj + gutter
  }
  widget.position.x = xOffset
  widget.position.y = 0
  widget.position.w = container.position.w * colPercent - gutterAdj
  widget.position.h = container.position.h
}

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

/**
 * 清理非法容器嵌套：将嵌套在其他容器内的容器提升到根级。
 * 容器之间不允许互相嵌套（只允许嵌套在布局组件内的普通部件）。
 *
 * 策略：遇到"容器内嵌套容器"时，将内层容器从原位置移除并追加到根级末尾。
 */
function sanitizeContainerNesting(widgets: Widget[]): Widget[] {
  const promoted: Widget[] = []

  function walk(list: Widget[]): Widget[] {
    return list.reduce<Widget[]>((acc, w) => {
      if (w.children?.length) {
        // 先递归清理子节点
        w.children = walk(w.children)
        // 再把子节点中的容器提升到根级
        const kept: Widget[] = []
        const containerTypes = getContainerTypes()
        for (const child of w.children) {
          if (containerTypes.has(child.type)) {
            // 容器禁止嵌套 — 提升到根级
            delete child.colIndex
            delete child.tabKey
            promoted.push(child)
          } else {
            kept.push(child)
          }
        }
        w.children = kept
      }
      acc.push(w)
      return acc
    }, [])
  }

  const cleaned = walk(widgets)
  return [...cleaned, ...promoted]
}

export const useWidgetStore = defineStore('widget', () => {
  // ================================================================
  // 数据
  // ================================================================

  const widgets = shallowRef<Widget[]>([])

  // ================================================================
  // Widget 索引（O(1) 查找，避免递归 DFS）
  // ================================================================

  /** 建立 id → Widget 的平坦索引 */
  function buildIndex(list: Widget[]): Map<string, Widget> {
    const index = new Map<string, Widget>()
    function walk(items: Widget[]) {
      for (const item of items) {
        index.set(item.id, item)
        if (item.children?.length) {
          walk(item.children as Widget[])
        }
      }
    }
    walk(list)
    return index
  }

  /** Widget 索引 — 每次 widgets 引用变化时重建 */
  const widgetIndex = computed(() => buildIndex(widgets.value))

  // ================================================================
  // 树结构遍历
  // ================================================================

  /**
   * 查找 Widget。优先 O(1) 索引查找，回退到递归 DFS。
   */
  function findWidget(id: string, list?: Widget[]): Widget | null {
    // 快速路径：使用索引（仅当从默认 widgets 查找时）
    if (!list) {
      return widgetIndex.value.get(id) ?? null
    }
    // 指定列表时回退到递归
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
    // 补全 position（模板或拖入的 widget 可能缺失）
    if (!widget.position || typeof widget.position !== 'object') {
      widget.position = { ...DEFAULT_POSITION }
    }
    const toAdd: Widget[] = [widget]
    let nextZ = getMaxZIndex() + 1
    widget.position.zIndex = nextZ++
    // 容器禁止嵌套：将被添加容器的子容器提升到根级
    if (widget.children?.length) {
      const promoted: Widget[] = []
      const kept: Widget[] = []
      const containerTypes = getContainerTypes()
      for (const child of widget.children) {
        if (containerTypes.has(child.type)) {
          delete child.colIndex
          delete child.tabKey
          promoted.push(child)
        } else {
          kept.push(child)
        }
      }
      widget.children = kept
      for (const p of promoted) {
        p.position.zIndex = nextZ++
        toAdd.push(p)
      }
    }
    widgets.value = [...widgets.value, ...toAdd]
  }

  function removeWidget(id: string): void {
    const newList = [...widgets.value]
    removeFromList(id, newList)
    widgets.value = newList
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
    if (getContainerTypes().has(widget.type)) return
    // 已经是目标容器的直接子节点
    if (container.children?.some((c) => c.id === widgetId)) return

    // tabs 容器：自动分配 tabKey
    if (container.type === 'tabs' && !widget.tabKey) {
      const tabs = container.props?.tabs as Array<{ key: string }> | undefined
      const activeKey = container.props?.activeKey as string | undefined
      widget.tabKey = activeKey || tabs?.[0]?.key || 'tab1'
    }

    // 列容器：容量检查必须在 removeFromList 之前，否则 widget 会从画布消失
    const colContainerColumns = getColContainerColumns(container.type)
    if (colContainerColumns > 0) {
      if (checkAndAssignColIndex(widget, container, colContainerColumns)) return
    }

    const newList = [...widgets.value]
    removeFromList(widgetId, newList)
    widgets.value = newList

    if (colContainerColumns > 0) {
      calculateColPosition(widget, container, colContainerColumns)
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
    widgets.value = [...widgets.value, widget]
  }

  /**
   * 将 Widget 重新挂载到根级。
   * 不修改坐标。
   */
  function reparentToRoot(id: string): void {
    const widget = findWidget(id)
    if (!widget) return
    if (isRootWidget(id)) return

    const newList = [...widgets.value]
    removeFromList(id, newList)
    newList.push(widget)
    widgets.value = newList
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
    if (getContainerTypes().has(widget.type)) return
    if (target.children?.some((c) => c.id === id)) return

    // tabs 容器：自动分配 tabKey
    if (target.type === 'tabs' && !widget.tabKey) {
      const tabs = target.props?.tabs as Array<{ key: string }> | undefined
      const activeKey = target.props?.activeKey as string | undefined
      widget.tabKey = activeKey || tabs?.[0]?.key || 'tab1'
    }

    // 列容器：容量检查必须在 removeFromList 之前，否则 widget 会从画布消失
    const colContainerColumns = getColContainerColumns(target.type)
    if (colContainerColumns > 0) {
      if (checkAndAssignColIndex(widget, target, colContainerColumns)) return
    }

    const newList = [...widgets.value]
    removeFromList(id, newList)
    widgets.value = newList

    widget.position.x = x
    widget.position.y = y

    if (colContainerColumns > 0) {
      calculateColPosition(widget, target, colContainerColumns)
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
    // 过滤掉 undefined 和 null 元素，确保数据干净
    const validWidgets = (data || []).filter((w): w is Widget => w != null && typeof w === 'object' && 'id' in w)
    // 补全 position 字段（旧数据可能缺失）
    const normalized = normalizePosition(validWidgets)
    widgets.value = sanitizeContainerNesting(normalized)
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
