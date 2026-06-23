import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import ElementPlus from 'element-plus'
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

import FgScatterChart from '../FgScatterChart.vue'

describe('FgScatterChart', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountChart(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('scatter-chart', 'test_scatter_chart')!
    Object.assign(widget, overrides)
    store.addWidget(widget)

    return mount(FgScatterChart, {
      global: {
        plugins: [ElementPlus],
        provide: {
          [widgetDataKey as symbol]: computed(() => store.findWidget('test_scatter_chart')!),
          [widgetStyleKey as symbol]: computed(() => store.findWidget('test_scatter_chart')!.style ?? {}),
        },
      },
    })
  }

  // Dimension 1: Drag & Drop
  describe('拖放', () => {
    it('创建后 store 中存在', () => {
      const widget = createWidget('scatter-chart', 'test_scatter_chart')
      store.addWidget(widget!)
      expect(store.findWidget('test_scatter_chart')).toBeDefined()
    })

    it('拖入 card 容器', () => {
      const widget = createWidget('scatter-chart', 'test_scatter_chart')
      const card = createWidget('card', 'test_card')
      store.addWidget(card!)
      store.addWidget(widget!)
      store.addToContainer('test_scatter_chart', 'test_card')
      expect(store.findWidget('test_card')!.children).toHaveLength(1)
    })

    it('从容器拖出', () => {
      const widget = createWidget('scatter-chart', 'test_scatter_chart')
      const card = createWidget('card', 'test_card')
      store.addWidget(card!)
      store.addWidget(widget!)
      store.addToContainer('test_scatter_chart', 'test_card')
      store.removeFromContainer('test_scatter_chart')
      expect(store.isRootWidget('test_scatter_chart')).toBe(true)
    })
  })

  // Dimension 2: Properties
  describe('属性', () => {
    it('默认 staticData 有 11 条', () => {
      const widget = createWidget('scatter-chart', 'test_scatter_chart')!
      expect(widget.props?.staticData).toHaveLength(11)
    })

    it('默认 xField 为 x', () => {
      const widget = createWidget('scatter-chart', 'test_scatter_chart')!
      expect(widget.props?.xField).toBe('x')
    })

    it('默认 yField 为 y', () => {
      const widget = createWidget('scatter-chart', 'test_scatter_chart')!
      expect(widget.props?.yField).toBe('y')
    })

    it('props 可覆盖', () => {
      const widget = createWidget('scatter-chart', 'test_scatter_chart')!
      store.addWidget(widget)
      store.updateWidget('test_scatter_chart', { props: { xField: 'price', yField: 'sales', title: 'Scatter' } })
      const found = store.findWidget('test_scatter_chart')!
      expect(found.props?.xField).toBe('price')
      expect(found.props?.yField).toBe('sales')
      expect(found.props?.title).toBe('Scatter')
    })
  })

  // Dimension 3: Events
  describe('事件', () => {
    it('支持 refresh 事件配置', () => {
      const widget = createWidget('scatter-chart', 'test_scatter_chart')!
      widget.events = [{ trigger: 'refresh', actions: [{ type: 'show', target: 'w2' }] }]
      store.addWidget(widget)
      expect(store.findWidget('test_scatter_chart')!.events).toHaveLength(1)
    })

    it('支持 set-data 事件配置', () => {
      const widget = createWidget('scatter-chart', 'test_scatter_chart')!
      widget.events = [{ trigger: 'set-data', actions: [{ type: 'show', target: 'w3' }] }]
      store.addWidget(widget)
      expect(store.findWidget('test_scatter_chart')!.events).toHaveLength(1)
      expect(store.findWidget('test_scatter_chart')!.events![0].trigger).toBe('set-data')
    })
  })

  // Dimension 4: Rules
  describe('规则', () => {
    it('visible=false 隐藏', () => {
      const widget = createWidget('scatter-chart', 'test_scatter_chart')!
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
      const widget = createWidget('scatter-chart', 'test_scatter_chart')!
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
      const widget = createWidget('scatter-chart', 'test_scatter_chart')!
      widget.api = { url: '/api/scatter-data', method: 'get' }
      store.addWidget(widget)
      expect(store.findWidget('test_scatter_chart')!.api!.url).toBe('/api/scatter-data')
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
