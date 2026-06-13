import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import TDesign from 'tdesign-vue-next'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'
import { computeWidgetRenderState } from '@/__tests__/widgetTestHarness'
import { widgetDataKey, widgetStyleKey } from '../../base/types'

vi.mock('../../base/echarts', () => ({
  echarts: {
    init: vi.fn(() => ({
      setOption: vi.fn(),
      resize: vi.fn(),
      dispose: vi.fn(),
    })),
  },
}))

import FgGauge from '../FgGauge.vue'

describe('FgGauge', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountChart(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('gauge', 'test_gauge')!
    Object.assign(widget, overrides)
    store.addWidget(widget)

    return mount(FgGauge, {
      global: {
        plugins: [ElementPlus],
        provide: {
          [widgetDataKey as symbol]: computed(() => store.findWidget('test_gauge')!),
          [widgetStyleKey as symbol]: computed(() => store.findWidget('test_gauge')!.style ?? {}),
        },
      },
    })
  }

  // Dimension 1: Drag & Drop
  describe('拖放', () => {
    it('创建后 store 中存在', () => {
      const widget = createWidget('gauge', 'test_gauge')
      store.addWidget(widget!)
      expect(store.findWidget('test_gauge')).toBeDefined()
    })

    it('拖入 card 容器', () => {
      const widget = createWidget('gauge', 'test_gauge')
      const card = createWidget('card', 'test_card')
      store.addWidget(card!)
      store.addWidget(widget!)
      store.addToContainer('test_gauge', 'test_card')
      expect(store.findWidget('test_card')!.children).toHaveLength(1)
    })

    it('从容器拖出', () => {
      const widget = createWidget('gauge', 'test_gauge')
      const card = createWidget('card', 'test_card')
      store.addWidget(card!)
      store.addWidget(widget!)
      store.addToContainer('test_gauge', 'test_card')
      store.removeFromContainer('test_gauge')
      expect(store.isRootWidget('test_gauge')).toBe(true)
    })
  })

  // Dimension 2: Properties
  describe('属性', () => {
    it('默认 staticData 有 1 条', () => {
      const widget = createWidget('gauge', 'test_gauge')!
      expect(widget.props?.staticData).toHaveLength(1)
    })

    it('默认 valueField 为 value', () => {
      const widget = createWidget('gauge', 'test_gauge')!
      expect(widget.props?.valueField).toBe('value')
    })

    it('默认 min 为 0', () => {
      const widget = createWidget('gauge', 'test_gauge')!
      expect(widget.props?.min).toBe(0)
    })

    it('默认 max 为 100', () => {
      const widget = createWidget('gauge', 'test_gauge')!
      expect(widget.props?.max).toBe(100)
    })

    it('props 可覆盖', () => {
      const widget = createWidget('gauge', 'test_gauge')!
      store.addWidget(widget)
      store.updateWidget('test_gauge', { props: { valueField: 'score', min: 0, max: 200, unit: '%' } })
      const found = store.findWidget('test_gauge')!
      expect(found.props?.valueField).toBe('score')
      expect(found.props?.min).toBe(0)
      expect(found.props?.max).toBe(200)
      expect(found.props?.unit).toBe('%')
    })
  })

  // Dimension 3: Events
  describe('事件', () => {
    it('支持 refresh 事件配置', () => {
      const widget = createWidget('gauge', 'test_gauge')!
      widget.events = [{ trigger: 'refresh', actions: [{ type: 'show', target: 'w2' }] }]
      store.addWidget(widget)
      expect(store.findWidget('test_gauge')!.events).toHaveLength(1)
    })

    it('支持 set-data 事件配置', () => {
      const widget = createWidget('gauge', 'test_gauge')!
      widget.events = [{ trigger: 'set-data', actions: [{ type: 'show', target: 'w3' }] }]
      store.addWidget(widget)
      expect(store.findWidget('test_gauge')!.events).toHaveLength(1)
      expect(store.findWidget('test_gauge')!.events![0].trigger).toBe('set-data')
    })
  })

  // Dimension 4: Rules
  describe('规则', () => {
    it('visible=false 隐藏', () => {
      const widget = createWidget('gauge', 'test_gauge')!
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
      const widget = createWidget('gauge', 'test_gauge')!
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

  // Dimension 5: Datasource
  describe('数据源', () => {
    it('支持 api 配置', () => {
      const widget = createWidget('gauge', 'test_gauge')!
      widget.api = { url: '/api/gauge-data', method: 'get' }
      store.addWidget(widget)
      expect(store.findWidget('test_gauge')!.api!.url).toBe('/api/gauge-data')
    })
  })

  // Dimension 6: Component mount
  describe('组件挂载', () => {
    it('挂载不抛异常', () => {
      const wrapper = mountChart()
      expect(wrapper.find('div').exists()).toBe(true)
    })
  })
})
