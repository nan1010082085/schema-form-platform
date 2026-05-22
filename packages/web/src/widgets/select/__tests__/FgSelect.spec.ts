import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import ElementPlus from 'element-plus'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'
import { computeWidgetRenderState } from '@/__tests__/widgetTestHarness'
import { widgetDataKey, widgetStyleKey } from '../../base/types'
import FgSelect from '../FgSelect.vue'

describe('FgSelect', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountWidget(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('select', 'test_widget')!
    Object.assign(widget, overrides)
    store.addWidget(widget)

    return mount(FgSelect, {
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
  describe('Store CRUD', () => {
    it('创建后 store 中存在', () => {
      const widget = createWidget('select', 'test_widget')
      store.addWidget(widget!)
      expect(store.findWidget('test_widget')).toBeDefined()
    })

    it('可更新属性', () => {
      const widget = createWidget('select', 'test_widget')!
      store.addWidget(widget)
      store.updateWidget('test_widget', { props: { placeholder: '请选择类型' } })
      expect(store.findWidget('test_widget')!.props!.placeholder).toBe('请选择类型')
    })

    it('可删除', () => {
      const widget = createWidget('select', 'test_widget')!
      store.addWidget(widget)
      store.removeWidget('test_widget')
      expect(store.findWidget('test_widget')).toBeNull()
    })
  })

  // Properties
  describe('属性', () => {
    it('placeholder 生效', () => {
      const widget = createWidget('select', 'test_widget')!
      widget.props = { ...widget.props, placeholder: '请选择' }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.placeholder).toBe('请选择')
    })

    it('clearable 生效', () => {
      const widget = createWidget('select', 'test_widget')!
      widget.props = { ...widget.props, clearable: false }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.clearable).toBe(false)
    })

    it('disabled 生效', () => {
      const widget = createWidget('select', 'test_widget')!
      widget.props = { ...widget.props, disabled: true }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.disabled).toBe(true)
    })

    it('multiple 生效', () => {
      const widget = createWidget('select', 'test_widget')!
      widget.props = { ...widget.props, multiple: true }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.multiple).toBe(true)
    })

    it('filterable 生效', () => {
      const widget = createWidget('select', 'test_widget')!
      widget.props = { ...widget.props, filterable: true }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.filterable).toBe(true)
    })

    it('支持 options 配置', () => {
      const widget = createWidget('select', 'test_widget')!
      widget.options = [{ label: 'A', value: 'a' }]
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.options).toHaveLength(1)
    })
  })

  // Events
  describe('事件', () => {
    it('支持 change 事件配置', () => {
      const widget = createWidget('select', 'test_widget')!
      widget.events = [{ trigger: 'change', actions: [{ type: 'show', target: 'w2' }] }]
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.events).toHaveLength(1)
    })

    it('支持 blur 事件配置', () => {
      const widget = createWidget('select', 'test_widget')!
      widget.events = [{ trigger: 'blur', actions: [{ type: 'hide', target: 'w2' }] }]
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.events).toHaveLength(1)
    })

    it('支持 focus 事件配置', () => {
      const widget = createWidget('select', 'test_widget')!
      widget.events = [{ trigger: 'focus', actions: [{ type: 'show', target: 'w3' }] }]
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.events).toHaveLength(1)
    })
  })

  // Rules/Linkage
  describe('规则联动', () => {
    it('visible=false 隐藏', () => {
      const widget = createWidget('select', 'test_widget')!
      widget.rules = [{
        watches: [{ type: 'field', source: 'status' }],
        condition: 'status === "hide"',
        actions: [{ type: 'hide', config: {} }],
      }]
      store.addWidget(widget)
      const state = computeWidgetRenderState(widget, { status: 'hide' })
      expect(state.visible).toBe(false)
    })

    it('disabled=true 禁用', () => {
      const widget = createWidget('select', 'test_widget')!
      widget.rules = [{
        watches: [{ type: 'field', source: 'lock' }],
        condition: 'lock === true',
        actions: [{ type: 'disabled', config: {} }],
      }]
      store.addWidget(widget)
      const state = computeWidgetRenderState(widget, { lock: true })
      expect(state.disabled).toBe(true)
    })
  })

  // Datasource
  describe('数据源', () => {
    it('支持 api 配置', () => {
      const widget = createWidget('select', 'test_widget')!
      widget.api = { url: '/api/options', method: 'get' }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.api!.url).toBe('/api/options')
    })
  })
})
