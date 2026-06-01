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

import FgPieChart from '../FgPieChart.vue'

describe('FgPieChart', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountChart(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('pie-chart', 'test_pie_chart')!
    Object.assign(widget, overrides)
    store.addWidget(widget)

    return mount(FgPieChart, {
      global: {
        plugins: [ElementPlus],
        provide: {
          [widgetDataKey as symbol]: computed(() => store.findWidget('test_pie_chart')!),
          [widgetStyleKey as symbol]: computed(() => store.findWidget('test_pie_chart')!.style ?? {}),
        },
      },
    })
  }

  // Dimension 1: Drag & Drop
  describe('拖放', () => {
    it('创建后 store 中存在', () => {
      const widget = createWidget('pie-chart', 'test_pie_chart')
      store.addWidget(widget!)
      expect(store.findWidget('test_pie_chart')).toBeDefined()
    })

    it('拖入 card 容器', () => {
      const widget = createWidget('pie-chart', 'test_pie_chart')
      const card = createWidget('card', 'test_card')
      store.addWidget(card!)
      store.addWidget(widget!)
      store.addToContainer('test_pie_chart', 'test_card')
      expect(store.findWidget('test_card')!.children).toHaveLength(1)
    })

    it('从容器拖出', () => {
      const widget = createWidget('pie-chart', 'test_pie_chart')
      const card = createWidget('card', 'test_card')
      store.addWidget(card!)
      store.addWidget(widget!)
      store.addToContainer('test_pie_chart', 'test_card')
      store.removeFromContainer('test_pie_chart')
      expect(store.isRootWidget('test_pie_chart')).toBe(true)
    })
  })

  // Dimension 2: Properties
  describe('属性', () => {
    it('默认 staticData 有 5 条', () => {
      const widget = createWidget('pie-chart', 'test_pie_chart')!
      expect(widget.props?.staticData).toHaveLength(5)
    })

    it('默认 nameField 为 name', () => {
      const widget = createWidget('pie-chart', 'test_pie_chart')!
      expect(widget.props?.nameField).toBe('name')
    })

    it('默认 valueField 为 value', () => {
      const widget = createWidget('pie-chart', 'test_pie_chart')!
      expect(widget.props?.valueField).toBe('value')
    })

    it('props 可覆盖', () => {
      const widget = createWidget('pie-chart', 'test_pie_chart')!
      store.addWidget(widget)
      store.updateWidget('test_pie_chart', { props: { nameField: 'label', valueField: 'count', title: 'Pie' } })
      const found = store.findWidget('test_pie_chart')!
      expect(found.props?.nameField).toBe('label')
      expect(found.props?.valueField).toBe('count')
      expect(found.props?.title).toBe('Pie')
    })
  })

  // Dimension 3: Events
  describe('事件', () => {
    it('支持 refresh 事件配置', () => {
      const widget = createWidget('pie-chart', 'test_pie_chart')!
      widget.events = [{ trigger: 'refresh', actions: [{ type: 'show', target: 'w2' }] }]
      store.addWidget(widget)
      expect(store.findWidget('test_pie_chart')!.events).toHaveLength(1)
    })

    it('支持 set-data 事件配置', () => {
      const widget = createWidget('pie-chart', 'test_pie_chart')!
      widget.events = [{ trigger: 'set-data', actions: [{ type: 'show', target: 'w3' }] }]
      store.addWidget(widget)
      expect(store.findWidget('test_pie_chart')!.events).toHaveLength(1)
      expect(store.findWidget('test_pie_chart')!.events![0].trigger).toBe('set-data')
    })
  })

  // Dimension 4: Rules
  describe('规则', () => {
    it('visible=false 隐藏', () => {
      const widget = createWidget('pie-chart', 'test_pie_chart')!
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
      const widget = createWidget('pie-chart', 'test_pie_chart')!
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
      const widget = createWidget('pie-chart', 'test_pie_chart')!
      widget.api = { url: '/api/pie-data', method: 'get' }
      store.addWidget(widget)
      expect(store.findWidget('test_pie_chart')!.api!.url).toBe('/api/pie-data')
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
