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

import FgLineChart from '../FgLineChart.vue'

describe('FgLineChart', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountChart(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('line-chart', 'test_line_chart')!
    Object.assign(widget, overrides)
    store.addWidget(widget)

    return mount(FgLineChart, {
      global: {
        plugins: [ElementPlus],
        provide: {
          [widgetDataKey as symbol]: computed(() => store.findWidget('test_line_chart')!),
          [widgetStyleKey as symbol]: computed(() => store.findWidget('test_line_chart')!.style ?? {}),
        },
      },
    })
  }

  // Dimension 1: Drag & Drop
  describe('拖放', () => {
    it('创建后 store 中存在', () => {
      const widget = createWidget('line-chart', 'test_line_chart')
      store.addWidget(widget!)
      expect(store.findWidget('test_line_chart')).toBeDefined()
    })

    it('拖入 card 容器', () => {
      const widget = createWidget('line-chart', 'test_line_chart')
      const card = createWidget('card', 'test_card')
      store.addWidget(card!)
      store.addWidget(widget!)
      store.addToContainer('test_line_chart', 'test_card')
      expect(store.findWidget('test_card')!.children).toHaveLength(1)
    })

    it('从容器拖出', () => {
      const widget = createWidget('line-chart', 'test_line_chart')
      const card = createWidget('card', 'test_card')
      store.addWidget(card!)
      store.addWidget(widget!)
      store.addToContainer('test_line_chart', 'test_card')
      store.removeFromContainer('test_line_chart')
      expect(store.isRootWidget('test_line_chart')).toBe(true)
    })
  })

  // Dimension 2: Properties
  describe('属性', () => {
    it('默认 staticData 有 5 条', () => {
      const widget = createWidget('line-chart', 'test_line_chart')!
      expect(widget.props?.staticData).toHaveLength(5)
    })

    it('默认 xField 为 category', () => {
      const widget = createWidget('line-chart', 'test_line_chart')!
      expect(widget.props?.xField).toBe('category')
    })

    it('默认 yField 为 value', () => {
      const widget = createWidget('line-chart', 'test_line_chart')!
      expect(widget.props?.yField).toBe('value')
    })

    it('props 可覆盖', () => {
      const widget = createWidget('line-chart', 'test_line_chart')!
      store.addWidget(widget)
      store.updateWidget('test_line_chart', { props: { xField: 'date', yField: 'amount', title: 'Trend' } })
      const found = store.findWidget('test_line_chart')!
      expect(found.props?.xField).toBe('date')
      expect(found.props?.yField).toBe('amount')
      expect(found.props?.title).toBe('Trend')
    })
  })

  // Dimension 3: Events
  describe('事件', () => {
    it('支持 refresh 事件配置', () => {
      const widget = createWidget('line-chart', 'test_line_chart')!
      widget.events = [{ trigger: 'refresh', actions: [{ type: 'show', target: 'w2' }] }]
      store.addWidget(widget)
      expect(store.findWidget('test_line_chart')!.events).toHaveLength(1)
    })

    it('支持 set-data 事件配置', () => {
      const widget = createWidget('line-chart', 'test_line_chart')!
      widget.events = [{ trigger: 'set-data', actions: [{ type: 'show', target: 'w3' }] }]
      store.addWidget(widget)
      expect(store.findWidget('test_line_chart')!.events).toHaveLength(1)
      expect(store.findWidget('test_line_chart')!.events![0].trigger).toBe('set-data')
    })
  })

  // Dimension 4: Rules
  describe('规则', () => {
    it('visible=false 隐藏', () => {
      const widget = createWidget('line-chart', 'test_line_chart')!
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
      const widget = createWidget('line-chart', 'test_line_chart')!
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
      const widget = createWidget('line-chart', 'test_line_chart')!
      widget.api = { url: '/api/line-data', method: 'get' }
      store.addWidget(widget)
      expect(store.findWidget('test_line_chart')!.api!.url).toBe('/api/line-data')
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
