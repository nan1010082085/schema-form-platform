import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import TDesign from 'tdesign-vue-next'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget, getWidget } from '@/widgets/registry'
import { widgetDataKey, widgetStyleKey } from '../../base/types'
import FgTabs from '../FgTabs.vue'

describe('FgTabs', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountTabs(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('tabs', 'test_tabs')!
    Object.assign(widget, overrides)
    store.addWidget(widget)
    return mount(FgTabs, {
      global: {
        plugins: [ElementPlus],
        provide: {
          [widgetDataKey as symbol]: computed(() => store.findWidget('test_tabs')!),
          [widgetStyleKey as symbol]: computed(() => store.findWidget('test_tabs')!.style ?? {}),
        },
      },
    })
  }

  // Dimension 1: Store CRUD
  describe('Store CRUD', () => {
    it('创建后 store 中存在', () => {
      const widget = createWidget('tabs', 'test_tabs')
      store.addWidget(widget!)
      expect(store.findWidget('test_tabs')).toBeDefined()
    })

    it('可从 store 移除', () => {
      const widget = createWidget('tabs', 'test_tabs')
      store.addWidget(widget!)
      store.removeWidget('test_tabs')
      expect(store.findWidget('test_tabs')).toBeNull()
    })

    it('可更新属性', () => {
      const widget = createWidget('tabs', 'test_tabs')
      store.addWidget(widget!)
      store.updateWidget('test_tabs', { label: '新标签' })
      expect(store.findWidget('test_tabs')!.label).toBe('新标签')
    })
  })

  // Dimension 2: Props
  describe('Props', () => {
    it('默认 tabs 配置包含两个标签', () => {
      const widget = createWidget('tabs', 'test_tabs')!
      store.addWidget(widget)
      const tabs = widget.props?.tabs as Array<{ key: string; label: string }>
      expect(tabs).toHaveLength(2)
      expect(tabs[0].key).toBe('tab1')
      expect(tabs[1].key).toBe('tab2')
    })

    it('默认 activeKey 为 tab1', () => {
      const widget = createWidget('tabs', 'test_tabs')!
      store.addWidget(widget)
      expect(widget.props?.activeKey).toBe('tab1')
    })

    it('默认 type 为 border-card', () => {
      const widget = createWidget('tabs', 'test_tabs')!
      store.addWidget(widget)
      expect(widget.props?.type).toBe('border-card')
    })

    it('默认 tabPosition 为 top', () => {
      const widget = createWidget('tabs', 'test_tabs')!
      store.addWidget(widget)
      expect(widget.props?.tabPosition).toBe('top')
    })

    it('自定义 tabs 配置', () => {
      const wrapper = mountTabs({
        props: {
          tabs: [
            { key: 'info', label: '基本信息' },
            { key: 'detail', label: '详细信息' },
          ],
          activeKey: 'info',
        },
      })
      expect(wrapper.text()).toContain('基本信息')
      expect(wrapper.text()).toContain('详细信息')
    })

    it('tabPosition 可配置为 left', () => {
      const widget = createWidget('tabs', 'test_tabs')!
      widget.props = { ...widget.props, tabPosition: 'left' }
      store.addWidget(widget)
      expect(store.findWidget('test_tabs')!.props!.tabPosition).toBe('left')
    })
  })

  // Dimension 3: Container child management
  describe('容器子组件管理', () => {
    it('可容纳子组件', () => {
      const container = createWidget('tabs', 'container')
      const child = createWidget('input', 'child_1')
      store.addWidget(container!)
      store.addWidget(child!)
      store.addToContainer('child_1', 'container')
      expect(store.findWidget('container')!.children).toHaveLength(1)
    })

    it('可容纳多个子组件', () => {
      const container = createWidget('tabs', 'container')
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
      const container = createWidget('tabs', 'container')
      const child = createWidget('input', 'child_1')
      store.addWidget(container!)
      store.addWidget(child!)
      store.addToContainer('child_1', 'container')
      store.removeFromContainer('child_1')
      expect(store.isRootWidget('child_1')).toBe(true)
    })

    it('tabs 容器自动分配 tabKey', () => {
      const container = createWidget('tabs', 'container')
      const child = createWidget('input', 'child_1')
      store.addWidget(container!)
      store.addWidget(child!)
      store.addToContainer('child_1', 'container')
      const childWidget = store.findWidget('child_1')!
      expect(childWidget.tabKey).toBeDefined()
    })
  })

  // Dimension 4: Config panel
  describe('配置面板', () => {
    it('configPanels 包含 events', () => {
      const item = getWidget('tabs')
      expect(item?.config.configPanels).toContain('events')
    })
  })
})
