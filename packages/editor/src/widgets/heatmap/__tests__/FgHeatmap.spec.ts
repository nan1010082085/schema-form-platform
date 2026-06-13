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

import FgHeatmap from '../FgHeatmap.vue'

describe('FgHeatmap', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountChart(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('heatmap', 'test_heatmap')!
    Object.assign(widget, overrides)
    store.addWidget(widget)

    return mount(FgHeatmap, {
      global: {
        plugins: [ElementPlus],
        provide: {
          [widgetDataKey as symbol]: computed(() => store.findWidget('test_heatmap')!),
          [widgetStyleKey as symbol]: computed(() => store.findWidget('test_heatmap')!.style ?? {}),
        },
      },
    })
  }

  // Dimension 1: Drag & Drop
  describe('拖放', () => {
    it('创建后 store 中存在', () => {
      const widget = createWidget('heatmap', 'test_heatmap')
      store.addWidget(widget!)
      expect(store.findWidget('test_heatmap')).toBeDefined()
    })

    it('拖入 card 容器', () => {
      const widget = createWidget('heatmap', 'test_heatmap')
      const card = createWidget('card', 'test_card')
      store.addWidget(card!)
      store.addWidget(widget!)
      store.addToContainer('test_heatmap', 'test_card')
      expect(store.findWidget('test_card')!.children).toHaveLength(1)
    })

    it('从容器拖出', () => {
      const widget = createWidget('heatmap', 'test_heatmap')
      const card = createWidget('card', 'test_card')
      store.addWidget(card!)
      store.addWidget(widget!)
      store.addToContainer('test_heatmap', 'test_card')
      store.removeFromContainer('test_heatmap')
      expect(store.isRootWidget('test_heatmap')).toBe(true)
    })
  })

  // Dimension 2: Properties
  describe('属性', () => {
    it('默认 staticData 有 9 条', () => {
      const widget = createWidget('heatmap', 'test_heatmap')!
      expect(widget.props?.staticData).toHaveLength(9)
    })

    it('默认 xField 为 x', () => {
      const widget = createWidget('heatmap', 'test_heatmap')!
      expect(widget.props?.xField).toBe('x')
    })

    it('默认 yField 为 y', () => {
      const widget = createWidget('heatmap', 'test_heatmap')!
      expect(widget.props?.yField).toBe('y')
    })

    it('默认 valueField 为 value', () => {
      const widget = createWidget('heatmap', 'test_heatmap')!
      expect(widget.props?.valueField).toBe('value')
    })

    it('props 可覆盖', () => {
      const widget = createWidget('heatmap', 'test_heatmap')!
      store.addWidget(widget)
      store.updateWidget('test_heatmap', { props: { xField: 'col', yField: 'row', valueField: 'intensity', title: 'Heatmap' } })
      const found = store.findWidget('test_heatmap')!
      expect(found.props?.xField).toBe('col')
      expect(found.props?.yField).toBe('row')
      expect(found.props?.valueField).toBe('intensity')
      expect(found.props?.title).toBe('Heatmap')
    })
  })

  // Dimension 3: Events
  describe('事件', () => {
    it('支持 refresh 事件配置', () => {
      const widget = createWidget('heatmap', 'test_heatmap')!
      widget.events = [{ trigger: 'refresh', actions: [{ type: 'show', target: 'w2' }] }]
      store.addWidget(widget)
      expect(store.findWidget('test_heatmap')!.events).toHaveLength(1)
    })

    it('支持 set-data 事件配置', () => {
      const widget = createWidget('heatmap', 'test_heatmap')!
      widget.events = [{ trigger: 'set-data', actions: [{ type: 'show', target: 'w3' }] }]
      store.addWidget(widget)
      expect(store.findWidget('test_heatmap')!.events).toHaveLength(1)
      expect(store.findWidget('test_heatmap')!.events![0].trigger).toBe('set-data')
    })
  })

  // Dimension 4: Rules
  describe('规则', () => {
    it('visible=false 隐藏', () => {
      const widget = createWidget('heatmap', 'test_heatmap')!
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
      const widget = createWidget('heatmap', 'test_heatmap')!
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
      const widget = createWidget('heatmap', 'test_heatmap')!
      widget.api = { url: '/api/heatmap-data', method: 'get' }
      store.addWidget(widget)
      expect(store.findWidget('test_heatmap')!.api!.url).toBe('/api/heatmap-data')
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
