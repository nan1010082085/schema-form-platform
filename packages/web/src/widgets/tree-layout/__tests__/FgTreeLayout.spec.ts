import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import ElementPlus from 'element-plus'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'
import { widgetDataKey, widgetStyleKey } from '../../base/types'
import FgTreeLayout from '../FgTreeLayout.vue'
import { treeLayoutConfig } from '../config'

describe('FgTreeLayout', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountWidget(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('tree-layout', 'test_widget')!
    Object.assign(widget, overrides)
    store.addWidget(widget)
    return mount(FgTreeLayout, {
      global: {
        plugins: [ElementPlus],
        provide: {
          [widgetDataKey as symbol]: computed(() => store.findWidget('test_widget')!),
          [widgetStyleKey as symbol]: computed(() => store.findWidget('test_widget')!.style ?? {}),
        },
      },
    })
  }

  // Store CRUD
  describe('store CRUD', () => {
    it('创建后 store 中存在', () => {
      const widget = createWidget('tree-layout', 'test_tree')
      store.addWidget(widget!)
      expect(store.findWidget('test_tree')).toBeDefined()
    })

    it('更新 title 后 store 中同步', () => {
      const widget = createWidget('tree-layout', 'test_tree')!
      store.addWidget(widget)
      store.updateWidget('test_tree', { props: { ...widget.props, title: '组织架构' } })
      expect(store.findWidget('test_tree')!.props!.title).toBe('组织架构')
    })

    it('删除后 store 中不存在', () => {
      const widget = createWidget('tree-layout', 'test_tree')!
      store.addWidget(widget)
      store.removeWidget('test_tree')
      expect(store.findWidget('test_tree')).toBeNull()
    })
  })

  // Title prop
  describe('title 属性', () => {
    it('默认显示树形布局', () => {
      const wrapper = mountWidget()
      expect(wrapper.text()).toContain('树形布局')
    })

    it('自定义标题', () => {
      const wrapper = mountWidget({ props: { title: '部门列表' } })
      expect(wrapper.text()).toContain('部门列表')
    })
  })

  // ShowSearch prop
  describe('showSearch 属性', () => {
    it('默认显示搜索框', () => {
      const wrapper = mountWidget()
      expect(wrapper.find('input').exists()).toBe(true)
    })

    it('showSearch=false 隐藏搜索框', () => {
      const wrapper = mountWidget({ props: { showSearch: false } })
      expect(wrapper.find('input').exists()).toBe(false)
    })
  })

  // Container — child management
  describe('容器子组件管理', () => {
    it('支持容纳子组件', () => {
      const tree = createWidget('tree-layout', 'test_tree')
      const input = createWidget('input', 'child_1')
      store.addWidget(tree!)
      store.addWidget(input!)
      store.addToContainer('child_1', 'test_tree')
      expect(store.findWidget('test_tree')!.children).toHaveLength(1)
    })

    it('支持移除子组件', () => {
      const tree = createWidget('tree-layout', 'test_tree')
      const input = createWidget('input', 'child_1')
      store.addWidget(tree!)
      store.addWidget(input!)
      store.addToContainer('child_1', 'test_tree')
      store.removeFromContainer('child_1')
      expect(store.isRootWidget('child_1')).toBe(true)
      expect(store.findWidget('test_tree')!.children).toHaveLength(0)
    })

    it('支持多个子组件', () => {
      const tree = createWidget('tree-layout', 'test_tree')
      const input = createWidget('input', 'child_1')
      const btn = createWidget('button', 'child_2')
      store.addWidget(tree!)
      store.addWidget(input!)
      store.addWidget(btn!)
      store.addToContainer('child_1', 'test_tree')
      store.addToContainer('child_2', 'test_tree')
      expect(store.findWidget('test_tree')!.children).toHaveLength(2)
    })
  })

  // Style
  describe('样式', () => {
    it('默认高度 400px', () => {
      const widget = createWidget('tree-layout', 'test_widget')!
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.style!.height).toBe('400px')
    })
  })

  // Config panels
  describe('配置面板声明', () => {
    it('无 configPanels', () => {
      expect(treeLayoutConfig.configPanels).toBeUndefined()
    })
  })
})
