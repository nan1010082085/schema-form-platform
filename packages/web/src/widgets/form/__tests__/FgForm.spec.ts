import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import ElementPlus from 'element-plus'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget, getWidget } from '@/widgets/registry'
import { widgetDataKey, widgetStyleKey } from '../../base/types'
import FgForm from '../FgForm.vue'

describe('FgForm', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountForm(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('form', 'test_form')!
    Object.assign(widget, overrides)
    store.addWidget(widget)
    return mount(FgForm, {
      global: {
        plugins: [ElementPlus],
        provide: {
          [widgetDataKey as symbol]: computed(() => store.findWidget('test_form')!),
          [widgetStyleKey as symbol]: computed(() => store.findWidget('test_form')!.style ?? {}),
        },
      },
    })
  }

  // Dimension 1: Store CRUD
  describe('Store CRUD', () => {
    it('创建后 store 中存在', () => {
      const widget = createWidget('form', 'test_form')
      store.addWidget(widget!)
      expect(store.findWidget('test_form')).toBeDefined()
    })

    it('可从 store 移除', () => {
      const widget = createWidget('form', 'test_form')
      store.addWidget(widget!)
      store.removeWidget('test_form')
      expect(store.findWidget('test_form')).toBeNull()
    })

    it('可更新属性', () => {
      const widget = createWidget('form', 'test_form')
      store.addWidget(widget!)
      store.updateWidget('test_form', { label: '新标签' })
      expect(store.findWidget('test_form')!.label).toBe('新标签')
    })
  })

  // Dimension 2: Props
  describe('Props', () => {
    it('默认 labelWidth 为 100px', () => {
      const widget = createWidget('form', 'test_form')!
      store.addWidget(widget)
      expect(widget.props?.labelWidth).toBe('100px')
    })

    it('默认 labelPosition 为 right', () => {
      const widget = createWidget('form', 'test_form')!
      store.addWidget(widget)
      expect(widget.props?.labelPosition).toBe('right')
    })

    it('labelWidth 可自定义', () => {
      const wrapper = mountForm({ props: { labelWidth: '120px' } })
      const elForm = wrapper.find('.el-form')
      expect(elForm.exists()).toBe(true)
    })

    it('labelPosition 可配置为 left', () => {
      const widget = createWidget('form', 'test_form')!
      widget.props = { ...widget.props, labelPosition: 'left' }
      store.addWidget(widget)
      expect(store.findWidget('test_form')!.props!.labelPosition).toBe('left')
    })

    it('labelPosition 可配置为 top', () => {
      const widget = createWidget('form', 'test_form')!
      widget.props = { ...widget.props, labelPosition: 'top' }
      store.addWidget(widget)
      expect(store.findWidget('test_form')!.props!.labelPosition).toBe('top')
    })
  })

  // Dimension 3: Container child management
  describe('容器子组件管理', () => {
    it('可容纳子组件', () => {
      const container = createWidget('form', 'container')
      const child = createWidget('input', 'child_1')
      store.addWidget(container!)
      store.addWidget(child!)
      store.addToContainer('child_1', 'container')
      expect(store.findWidget('container')!.children).toHaveLength(1)
    })

    it('可容纳多个子组件', () => {
      const container = createWidget('form', 'container')
      const child1 = createWidget('input', 'child_1')
      const child2 = createWidget('select', 'child_2')
      store.addWidget(container!)
      store.addWidget(child1!)
      store.addWidget(child2!)
      store.addToContainer('child_1', 'container')
      store.addToContainer('child_2', 'container')
      expect(store.findWidget('container')!.children).toHaveLength(2)
    })

    it('可移除子组件', () => {
      const container = createWidget('form', 'container')
      const child = createWidget('input', 'child_1')
      store.addWidget(container!)
      store.addWidget(child!)
      store.addToContainer('child_1', 'container')
      store.removeFromContainer('child_1')
      expect(store.isRootWidget('child_1')).toBe(true)
    })
  })

  // Dimension 4: Config panel
  describe('配置面板', () => {
    it('configPanels 为空（容器无事件/规则/数据源）', () => {
      const item = getWidget('form')
      expect(item?.config.configPanels).toBeUndefined()
    })
  })
})
