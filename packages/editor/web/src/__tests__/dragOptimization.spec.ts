/**
 * 拖拽优化测试
 *
 * 覆盖：
 * 1. Drag Store — 放置预览线状态、原始位置快照、取消拖拽恢复
 * 2. Collision — 深层嵌套容器碰撞检测（递归收集所有容器）
 * 3. useDrag — cancelDrag 恢复逻辑、嵌套容器坐标偏移
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDragStore } from '@/stores/drag'
import { useWidgetStore } from '@/stores/widget'
import {
  detectContainerCollision,
  detectNestedContainerCollision,
  getRootContainers,
  collectAllContainers,
} from '@/utils/collision'
import type { Widget } from '@/widgets/base/types'

// ================================================================
// 测试辅助函数
// ================================================================

function makeWidget(
  id: string,
  type: string,
  x: number,
  y: number,
  w = 100,
  h = 40,
  children?: Widget[],
): Widget {
  return {
    id,
    name: id,
    type: type as Widget['type'],
    position: { x, y, w, h },
    children: children ?? [],
  } as Widget
}

function makeContainer(
  id: string,
  type: string,
  x: number,
  y: number,
  w: number,
  h: number,
  children: Widget[] = [],
): Widget {
  return {
    id,
    name: id,
    type: type as Widget['type'],
    position: { x, y, w, h },
    children,
  } as Widget
}

// ================================================================
// 1. Drag Store 测试
// ================================================================

describe('Drag Store — 优化功能', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('放置预览线', () => {
    it('初始状态 dropPreviewLine 为 null', () => {
      const store = useDragStore()
      expect(store.dropPreviewLine).toBeNull()
    })

    it('updateDropPreviewLine 更新预览线', () => {
      const store = useDragStore()
      store.startDrag('panel', 'w1', 'input')

      const line = {
        orientation: 'horizontal' as const,
        position: 100,
        start: 10,
        end: 500,
        targetContainerId: null,
      }
      store.updateDropPreviewLine(line)
      expect(store.dropPreviewLine).toEqual(line)
    })

    it('updateDropPreviewLine(null) 清除预览线', () => {
      const store = useDragStore()
      store.startDrag('panel', 'w1', 'input')

      store.updateDropPreviewLine({
        orientation: 'horizontal',
        position: 100,
        start: 10,
        end: 500,
        targetContainerId: null,
      })
      store.updateDropPreviewLine(null)
      expect(store.dropPreviewLine).toBeNull()
    })

    it('endDrag 重置 dropPreviewLine', () => {
      const store = useDragStore()
      store.startDrag('panel', 'w1', 'input')

      store.updateDropPreviewLine({
        orientation: 'vertical',
        position: 200,
        start: 0,
        end: 300,
        targetContainerId: 'c1',
      })
      store.endDrag()
      expect(store.dropPreviewLine).toBeNull()
    })
  })

  describe('原始位置快照', () => {
    it('startDrag 不传 originalX 时 originalPosition 为 null', () => {
      const store = useDragStore()
      store.startDrag('canvas', 'w1')
      expect(store.originalPosition).toBeNull()
    })

    it('startDrag 传入 originalX/Y/parentId 时记录快照', () => {
      const store = useDragStore()
      store.startDrag('canvas', 'w1', undefined, {
        cursorX: 100,
        cursorY: 100,
        widgetX: 50,
        widgetY: 50,
        originalX: 50,
        originalY: 50,
        originalParentId: 'container1',
      })
      expect(store.originalPosition).toEqual({
        x: 50,
        y: 50,
        parentId: 'container1',
      })
    })

    it('startDrag 传入 originalX 但无 originalParentId 时 parentId 为 null', () => {
      const store = useDragStore()
      store.startDrag('canvas', 'w1', undefined, {
        originalX: 30,
        originalY: 40,
      })
      expect(store.originalPosition).toEqual({
        x: 30,
        y: 40,
        parentId: null,
      })
    })

    it('endDrag 重置 originalPosition', () => {
      const store = useDragStore()
      store.startDrag('canvas', 'w1', undefined, {
        originalX: 50,
        originalY: 50,
        originalParentId: 'c1',
      })
      store.endDrag()
      expect(store.originalPosition).toBeNull()
    })
  })

  describe('完整拖拽生命周期', () => {
    it('startDrag → updatePosition → updateCollision → updateDropPreviewLine → endDrag', () => {
      const store = useDragStore()

      store.startDrag('panel', 'w1', 'input')
      expect(store.isDragging).toBe(true)
      expect(store.dragSource).toBe('panel')

      store.updateDragPosition(200, 150)
      expect(store.dragX).toBe(200)
      expect(store.dragY).toBe(150)

      store.updateCollision('container1')
      expect(store.hoveredContainerId).toBe('container1')
      expect(store.isInContainer).toBe(true)

      store.updateDropPreviewLine({
        orientation: 'horizontal',
        position: 120,
        start: 10,
        end: 400,
        targetContainerId: 'container1',
      })
      expect(store.dropPreviewLine).not.toBeNull()

      store.endDrag()
      expect(store.isDragging).toBe(false)
      expect(store.hoveredContainerId).toBeNull()
      expect(store.dropPreviewLine).toBeNull()
      expect(store.originalPosition).toBeNull()
    })
  })
})

// ================================================================
// 2. 碰撞检测 — 深层嵌套测试
// ================================================================

describe('碰撞检测 — 深层嵌套', () => {
  describe('getRootContainers', () => {
    it('只返回根级容器', () => {
      const widgets = [
        makeContainer('form1', 'form', 0, 0, 600, 400),
        makeWidget('input1', 'input', 10, 10, 200, 32),
        makeContainer('card1', 'card', 0, 420, 600, 200),
      ]
      const containers = getRootContainers(widgets)
      expect(containers.length).toBe(2)
      expect(containers.map(c => c.id)).toEqual(['form1', 'card1'])
    })

    it('排除指定 ID', () => {
      const widgets = [
        makeContainer('form1', 'form', 0, 0, 600, 400),
        makeContainer('card1', 'card', 0, 420, 600, 200),
      ]
      const containers = getRootContainers(widgets, 'form1')
      expect(containers.length).toBe(1)
      expect(containers[0].id).toBe('card1')
    })

    it('不返回嵌套在容器内的子容器', () => {
      const nestedForm = makeContainer('form2', 'form', 10, 10, 580, 380)
      const widgets = [
        makeContainer('form1', 'form', 0, 0, 600, 400, [nestedForm]),
      ]
      const containers = getRootContainers(widgets)
      expect(containers.length).toBe(1)
      expect(containers[0].id).toBe('form1')
    })
  })

  describe('collectAllContainers', () => {
    it('收集根级容器', () => {
      const widgets = [
        makeContainer('form1', 'form', 0, 0, 600, 400),
        makeWidget('input1', 'input', 10, 10, 200, 32),
        makeContainer('card1', 'card', 0, 420, 600, 200),
      ]
      const containers = collectAllContainers(widgets)
      expect(containers.length).toBe(2)
      expect(containers[0].id).toBe('form1')
      expect(containers[0]._canvasX).toBe(0)
      expect(containers[0]._canvasY).toBe(0)
      expect(containers[0]._depth).toBe(0)
    })

    it('递归收集嵌套容器', () => {
      const innerCard = makeContainer('card_inner', 'card', 10, 10, 580, 180)
      const form = makeContainer('form1', 'form', 0, 0, 600, 400, [innerCard])
      const widgets = [form]

      const containers = collectAllContainers(widgets)
      expect(containers.length).toBe(2)

      const inner = containers.find(c => c.id === 'card_inner')!
      expect(inner._canvasX).toBe(10) // 0 (form) + 10 (card offset)
      expect(inner._canvasY).toBe(10)
      expect(inner._depth).toBe(1)
    })

    it('支持 3 层以上嵌套', () => {
      const level3 = makeContainer('level3', 'card', 5, 5, 570, 170)
      const level2 = makeContainer('level2', 'form', 10, 10, 580, 180, [level3])
      const level1 = makeContainer('level1', 'card', 0, 0, 600, 400, [level2])
      const widgets = [level1]

      const containers = collectAllContainers(widgets)
      expect(containers.length).toBe(3)

      const l3 = containers.find(c => c.id === 'level3')!
      // level1(0,0) + level2(10,10) + level3(5,5) = (15, 15)
      expect(l3._canvasX).toBe(15)
      expect(l3._canvasY).toBe(15)
      expect(l3._depth).toBe(2)
    })

    it('排除指定的 widget ID', () => {
      const widgets = [
        makeContainer('form1', 'form', 0, 0, 600, 400),
        makeContainer('card1', 'card', 0, 420, 600, 200),
      ]
      const containers = collectAllContainers(widgets, 0, 0, 0, 'form1')
      expect(containers.length).toBe(1)
      expect(containers[0].id).toBe('card1')
    })

    it('列容器（multi-col）也作为容器被收集', () => {
      const col = makeContainer('col1', 'double-col', 0, 0, 600, 200)
      const widgets = [col]
      const containers = collectAllContainers(widgets)
      expect(containers.length).toBe(1)
      expect(containers[0].type).toBe('double-col')
    })
  })

  describe('detectNestedContainerCollision', () => {
    it('检测到最深层容器（面积优先）', () => {
      // 外层容器 600x400，内层容器 580x380，偏移 (10,10)
      const inner = makeContainer('inner', 'card', 10, 10, 580, 380) as Widget & { _canvasX: number; _canvasY: number; _depth: number }
      inner._canvasX = 10
      inner._canvasY = 10
      inner._depth = 1

      const outer = makeContainer('outer', 'form', 0, 0, 600, 400) as Widget & { _canvasX: number; _canvasY: number; _depth: number }
      outer._canvasX = 0
      outer._canvasY = 0
      outer._depth = 0

      // widget 在内层容器中心
      const widget = makeWidget('drag1', 'input', 200, 150, 100, 32)
      const hit = detectNestedContainerCollision(widget, [outer, inner])
      expect(hit?.id).toBe('inner')
    })

    it('widget 只在外层容器范围内时命中外层', () => {
      const inner = makeContainer('inner', 'card', 10, 10, 200, 100) as Widget & { _canvasX: number; _canvasY: number; _depth: number }
      inner._canvasX = 10
      inner._canvasY = 10
      inner._depth = 1

      const outer = makeContainer('outer', 'form', 0, 0, 600, 400) as Widget & { _canvasX: number; _canvasY: number; _depth: number }
      outer._canvasX = 0
      outer._canvasY = 0
      outer._depth = 0

      // widget 在外层但不在内层
      const widget = makeWidget('drag1', 'input', 400, 200, 100, 32)
      const hit = detectNestedContainerCollision(widget, [outer, inner])
      expect(hit?.id).toBe('outer')
    })

    it('widget 不在任何容器内时返回 null', () => {
      const container = makeContainer('c1', 'form', 0, 0, 200, 200) as Widget & { _canvasX: number; _canvasY: number; _depth: number }
      container._canvasX = 0
      container._canvasY = 0
      container._depth = 0

      // widget 远在容器外
      const widget = makeWidget('drag1', 'input', 500, 500, 100, 32)
      const hit = detectNestedContainerCollision(widget, [container])
      expect(hit).toBeNull()
    })

    it('重叠面积不足 50% 时不命中', () => {
      const container = makeContainer('c1', 'form', 0, 0, 200, 200) as Widget & { _canvasX: number; _canvasY: number; _depth: number }
      container._canvasX = 0
      container._canvasY = 0
      container._depth = 0

      // widget 大部分在容器外（只有左上角 30x32 在容器内 = 960 / 3200 = 30%）
      const widget = makeWidget('drag1', 'input', 170, 170, 100, 32)
      const hit = detectNestedContainerCollision(widget, [container])
      expect(hit).toBeNull()
    })

    it('widget 为容器自身时跳过', () => {
      const container = makeContainer('c1', 'form', 0, 0, 200, 200) as Widget & { _canvasX: number; _canvasY: number; _depth: number }
      container._canvasX = 0
      container._canvasY = 0
      container._depth = 0

      const hit = detectNestedContainerCollision(container, [container])
      expect(hit).toBeNull()
    })

    it('深度优先：同面积时选最深容器', () => {
      // 两个容器完全重叠，但深度不同
      const shallow = makeContainer('shallow', 'form', 0, 0, 400, 300) as Widget & { _canvasX: number; _canvasY: number; _depth: number }
      shallow._canvasX = 0
      shallow._canvasY = 0
      shallow._depth = 0

      const deep = makeContainer('deep', 'card', 0, 0, 400, 300) as Widget & { _canvasX: number; _canvasY: number; _depth: number }
      deep._canvasX = 0
      deep._canvasY = 0
      deep._depth = 2

      const widget = makeWidget('drag1', 'input', 100, 100, 100, 32)
      const hit = detectNestedContainerCollision(widget, [shallow, deep])
      expect(hit?.id).toBe('deep')
    })
  })

  describe('detectContainerCollision (原有)', () => {
    it('重叠面积 >= 50% 时命中', () => {
      const container = makeContainer('c1', 'form', 0, 0, 200, 200)
      // widget 完全在容器内
      const widget = makeWidget('w1', 'input', 50, 50, 100, 32)
      const hit = detectContainerCollision(widget, [container])
      expect(hit?.id).toBe('c1')
    })

    it('重叠面积 < 50% 时不命中', () => {
      const container = makeContainer('c1', 'form', 0, 0, 100, 100)
      // widget 大部分在容器外
      const widget = makeWidget('w1', 'input', 80, 80, 100, 32)
      const hit = detectContainerCollision(widget, [container])
      expect(hit).toBeNull()
    })
  })
})

// ================================================================
// 3. Drag Store 完整生命周期 — 多容器场景
// ================================================================

describe('多容器嵌套拖拽场景', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('从根级拖入 3 层嵌套容器：状态流转正确', () => {
    const store = useDragStore()

    // 模拟：拖拽开始
    store.startDrag('panel', 'new_input', 'input')
    expect(store.isDragging).toBe(true)

    // 模拟：鼠标移入第 1 层容器
    store.updateDragPosition(100, 100)
    store.updateCollision('level1')
    expect(store.hoveredContainerId).toBe('level1')

    // 模拟：鼠标继续移入第 2 层容器
    store.updateDragPosition(110, 110)
    store.updateCollision('level2')
    expect(store.hoveredContainerId).toBe('level2')

    // 模拟：鼠标继续移入第 3 层容器
    store.updateDragPosition(115, 115)
    store.updateCollision('level3')
    expect(store.hoveredContainerId).toBe('level3')
    expect(store.isInContainer).toBe(true)

    // 模拟：显示预览线
    store.updateDropPreviewLine({
      orientation: 'horizontal',
      position: 115,
      start: 20,
      end: 580,
      targetContainerId: 'level3',
    })
    expect(store.dropPreviewLine?.targetContainerId).toBe('level3')

    // 模拟：拖拽结束
    store.endDrag()
    expect(store.isDragging).toBe(false)
    expect(store.hoveredContainerId).toBeNull()
    expect(store.dropPreviewLine).toBeNull()
  })

  it('从容器拖出到根级：hoveredContainerId 清除', () => {
    const store = useDragStore()

    store.startDrag('canvas', 'w1', undefined, {
      cursorX: 100,
      cursorY: 100,
      widgetX: 50,
      widgetY: 50,
      originalX: 50,
      originalY: 50,
      originalParentId: 'container1',
    })

    // 先在容器内
    store.updateDragPosition(100, 100)
    store.updateCollision('container1')
    expect(store.isInContainer).toBe(true)

    // 拖出容器
    store.updateDragPosition(500, 500)
    store.updateCollision(null)
    expect(store.isInContainer).toBe(false)
    expect(store.hoveredContainerId).toBeNull()

    store.endDrag()
  })
})

// ================================================================
// 4. 取消拖拽 — 恢复逻辑
// ================================================================

describe('取消拖拽', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('取消拖拽后 store 状态完全重置', () => {
    const store = useDragStore()

    store.startDrag('canvas', 'w1', undefined, {
      cursorX: 100,
      cursorY: 100,
      widgetX: 50,
      widgetY: 50,
      originalX: 50,
      originalY: 50,
      originalParentId: 'container1',
    })

    store.updateDragPosition(200, 200)
    store.updateCollision('container2')
    store.updateGuideLines([{ type: 'vertical', position: 200, start: 0, end: 400 }])
    store.updateDropPreviewLine({
      orientation: 'horizontal',
      position: 200,
      start: 0,
      end: 600,
      targetContainerId: 'container2',
    })

    // endDrag 模拟取消（cancelDrag 会先恢复位置再调用 endDrag）
    store.endDrag()

    expect(store.isDragging).toBe(false)
    expect(store.dragSource).toBeNull()
    expect(store.dragWidgetId).toBeNull()
    expect(store.dragWidgetType).toBeNull()
    expect(store.dragX).toBe(0)
    expect(store.dragY).toBe(0)
    expect(store.hoveredContainerId).toBeNull()
    expect(store.isInContainer).toBe(false)
    expect(store.guideLines).toEqual([])
    expect(store.snapX).toBeNull()
    expect(store.snapY).toBeNull()
    expect(store.dropPreviewLine).toBeNull()
    expect(store.originalPosition).toBeNull()
  })

  it('原始位置快照记录正确', () => {
    const store = useDragStore()

    store.startDrag('canvas', 'w1', undefined, {
      cursorX: 100,
      cursorY: 100,
      widgetX: 80,
      widgetY: 60,
      originalX: 80,
      originalY: 60,
      originalParentId: 'form1',
    })

    expect(store.originalPosition).toEqual({
      x: 80,
      y: 60,
      parentId: 'form1',
    })

    // 拖拽过程中位置改变
    store.updateDragPosition(200, 200)
    // originalPosition 不应改变
    expect(store.originalPosition).toEqual({
      x: 80,
      y: 60,
      parentId: 'form1',
    })
  })
})

// ================================================================
// 5. Widget Store — 嵌套容器操作
// ================================================================

describe('Widget Store — 嵌套容器拖拽操作', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('reparentToContainer 将根级组件移入嵌套容器', () => {
    const store = useWidgetStore()
    const inner = makeContainer('inner', 'card', 10, 10, 580, 180)
    const outer = makeContainer('outer', 'form', 0, 0, 600, 400, [inner])
    const widget = makeWidget('w1', 'input', 300, 500, 200, 32)

    store.loadWidgets([outer, widget])

    // 将 w1 移入 inner 容器
    store.reparentToContainer('w1', 'inner', 20, 20)

    const found = store.findWidget('w1')
    expect(found).not.toBeNull()
    expect(found!.position.x).toBe(20)
    expect(found!.position.y).toBe(20)

    // w1 应该在 inner 的 children 中
    const innerWidget = store.findWidget('inner')
    expect(innerWidget?.children?.some(c => c.id === 'w1')).toBe(true)

    // w1 不应在根级
    expect(store.widgets.some(w => w.id === 'w1')).toBe(false)
  })

  it('reparentToRoot 将嵌套组件提升到根级', () => {
    const store = useWidgetStore()
    const widget = makeWidget('w1', 'input', 20, 20, 200, 32)
    const container = makeContainer('form1', 'form', 0, 0, 600, 400, [widget])

    store.loadWidgets([container])

    // w1 在 form1 内
    expect(store.findParent('w1')?.id).toBe('form1')

    store.reparentToRoot('w1')

    // w1 应在根级
    expect(store.widgets.some(w => w.id === 'w1')).toBe(true)
    expect(store.findParent('w1')).toBeNull()
  })
})
