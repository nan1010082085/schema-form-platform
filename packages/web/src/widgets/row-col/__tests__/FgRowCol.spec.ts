import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import ElementPlus from 'element-plus'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget, getWidget } from '@/widgets/registry'
import { widgetDataKey, widgetStyleKey } from '../../base/types'
import FgRowCol from '../FgRowCol.vue'

describe('FgRowCol', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountRowCol(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('row-col', 'test_row_col')!
    Object.assign(widget, overrides)
    store.addWidget(widget)
    return mount(FgRowCol, {
      global: {
        plugins: [ElementPlus],
        provide: {
          [widgetDataKey as symbol]: computed(() => store.findWidget('test_row_col')!),
          [widgetStyleKey as symbol]: computed(() => store.findWidget('test_row_col')!.style ?? {}),
        },
      },
    })
  }

  // Dimension 1: Store CRUD
  describe('Store CRUD', () => {
    it('创建后 store 中存在', () => {
      const widget = createWidget('row-col', 'test_row_col')
      store.addWidget(widget!)
      expect(store.findWidget('test_row_col')).toBeDefined()
    })

    it('可从 store 移除', () => {
      const widget = createWidget('row-col', 'test_row_col')
      store.addWidget(widget!)
      store.removeWidget('test_row_col')
      expect(store.findWidget('test_row_col')).toBeNull()
    })

    it('可更新属性', () => {
      const widget = createWidget('row-col', 'test_row_col')
      store.addWidget(widget!)
      store.updateWidget('test_row_col', { label: '新标签' })
      expect(store.findWidget('test_row_col')!.label).toBe('新标签')
    })
  })

  // Dimension 2: Props
  describe('Props', () => {
    it('默认 columns 为 2', () => {
      const widget = createWidget('row-col', 'test_row_col')!
      store.addWidget(widget)
      expect(widget.props?.columns).toBe(2)
    })

    it('默认 gutter 为 16', () => {
      const widget = createWidget('row-col', 'test_row_col')!
      store.addWidget(widget)
      expect(widget.props?.gutter).toBe(16)
    })

    it('columns 可配置为 3', () => {
      const widget = createWidget('row-col', 'test_row_col')!
      widget.props = { ...widget.props, columns: 3 }
      store.addWidget(widget)
      expect(store.findWidget('test_row_col')!.props!.columns).toBe(3)
    })

    it('columns 可配置为 4', () => {
      const widget = createWidget('row-col', 'test_row_col')!
      widget.props = { ...widget.props, columns: 4 }
      store.addWidget(widget)
      expect(store.findWidget('test_row_col')!.props!.columns).toBe(4)
    })

    it('gutter 可自定义', () => {
      const widget = createWidget('row-col', 'test_row_col')!
      widget.props = { ...widget.props, gutter: 24 }
      store.addWidget(widget)
      expect(store.findWidget('test_row_col')!.props!.gutter).toBe(24)
    })

    it('渲染 el-row 和 el-col', () => {
      const wrapper = mountRowCol()
      expect(wrapper.find('.el-row').exists()).toBe(true)
      expect(wrapper.findAll('.el-col')).toHaveLength(2)
    })

    it('3 列渲染 3 个 el-col', () => {
      const wrapper = mountRowCol({ props: { columns: 3 } })
      expect(wrapper.findAll('.el-col')).toHaveLength(3)
    })
  })

  // Dimension 3: Container child management
  describe('容器子组件管理', () => {
    it('可容纳子组件', () => {
      const container = createWidget('row-col', 'container')
      const child = createWidget('input', 'child_1')
      store.addWidget(container!)
      store.addWidget(child!)
      store.addToContainer('child_1', 'container')
      expect(store.findWidget('container')!.children).toHaveLength(1)
    })

    it('可容纳多个子组件', () => {
      const container = createWidget('row-col', 'container')
      const child1 = createWidget('input', 'child_1')
      const child2 = createWidget('input', 'child_2')
      store.addWidget(container!)
      store.addWidget(child1!)
      store.addWidget(child2!)
      store.addToContainer('child_1', 'container')
      store.addToContainer('child_2', 'container')
      expect(store.findWidget('container')!.children).toHaveLength(2)
    })

    it('可移除子组件', () => {
      const container = createWidget('row-col', 'container')
      const child = createWidget('input', 'child_1')
      store.addWidget(container!)
      store.addWidget(child!)
      store.addToContainer('child_1', 'container')
      store.removeFromContainer('child_1')
      expect(store.isRootWidget('child_1')).toBe(true)
    })

    it('row-col 容器自动分配 colIndex', () => {
      const container = createWidget('row-col', 'container')
      const child = createWidget('input', 'child_1')
      store.addWidget(container!)
      store.addWidget(child!)
      store.addToContainer('child_1', 'container')
      const childWidget = store.findWidget('child_1')!
      expect(childWidget.colIndex).toBeDefined()
    })
  })

  // Dimension 4: Config panel
  describe('配置面板', () => {
    it('configPanels 为空（容器无事件/规则/数据源）', () => {
      const item = getWidget('row-col')
      expect(item?.config.configPanels).toBeUndefined()
    })
  })
})
