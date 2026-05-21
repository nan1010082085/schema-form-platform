import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import ElementPlus from 'element-plus'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'
import { computeWidgetRenderState } from '@/engine/ruleEngine'
import { widgetDataKey, widgetStyleKey } from '../../base/types'
import FgRadio from '../FgRadio.vue'

describe('FgRadio', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountWidget(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('radio', 'test_widget')!
    Object.assign(widget, overrides)
    store.addWidget(widget)

    return mount(FgRadio, {
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
      const widget = createWidget('radio', 'test_widget')
      store.addWidget(widget!)
      expect(store.findWidget('test_widget')).toBeDefined()
    })

    it('可更新属性', () => {
      const widget = createWidget('radio', 'test_widget')!
      store.addWidget(widget)
      store.updateWidget('test_widget', { props: { disabled: true } })
      expect(store.findWidget('test_widget')!.props!.disabled).toBe(true)
    })

    it('可删除', () => {
      const widget = createWidget('radio', 'test_widget')!
      store.addWidget(widget)
      store.removeWidget('test_widget')
      expect(store.findWidget('test_widget')).toBeNull()
    })
  })

  // Properties
  describe('属性', () => {
    it('disabled 生效', () => {
      const widget = createWidget('radio', 'test_widget')!
      widget.props = { ...widget.props, disabled: true }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.disabled).toBe(true)
    })

    it('支持 options 配置', () => {
      const widget = createWidget('radio', 'test_widget')!
      widget.options = [
        { label: '选项A', value: 'a' },
        { label: '选项B', value: 'b' },
      ]
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.options).toHaveLength(2)
    })
  })

  // Events
  describe('事件', () => {
    it('支持 change 事件配置', () => {
      const widget = createWidget('radio', 'test_widget')!
      widget.events = [{ trigger: 'change', actions: [{ type: 'show', target: 'w2' }] }]
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.events).toHaveLength(1)
    })
  })

  // Rules/Linkage
  describe('规则联动', () => {
    it('visible=false 隐藏', () => {
      const widget = createWidget('radio', 'test_widget')!
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
      const widget = createWidget('radio', 'test_widget')!
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
      const widget = createWidget('radio', 'test_widget')!
      widget.api = { url: '/api/radio-options', method: 'get' }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.api!.url).toBe('/api/radio-options')
    })
  })
})
