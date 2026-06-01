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

import FgCandlestick from '../FgCandlestick.vue'

describe('FgCandlestick', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountChart(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('candlestick', 'test_candlestick')!
    Object.assign(widget, overrides)
    store.addWidget(widget)

    return mount(FgCandlestick, {
      global: {
        plugins: [ElementPlus],
        provide: {
          [widgetDataKey as symbol]: computed(() => store.findWidget('test_candlestick')!),
          [widgetStyleKey as symbol]: computed(() => store.findWidget('test_candlestick')!.style ?? {}),
        },
      },
    })
  }

  // Dimension 1: Drag & Drop
  describe('拖放', () => {
    it('创建后 store 中存在', () => {
      const widget = createWidget('candlestick', 'test_candlestick')
      store.addWidget(widget!)
      expect(store.findWidget('test_candlestick')).toBeDefined()
    })

    it('拖入 card 容器', () => {
      const widget = createWidget('candlestick', 'test_candlestick')
      const card = createWidget('card', 'test_card')
      store.addWidget(card!)
      store.addWidget(widget!)
      store.addToContainer('test_candlestick', 'test_card')
      expect(store.findWidget('test_card')!.children).toHaveLength(1)
    })

    it('从容器拖出', () => {
      const widget = createWidget('candlestick', 'test_candlestick')
      const card = createWidget('card', 'test_card')
      store.addWidget(card!)
      store.addWidget(widget!)
      store.addToContainer('test_candlestick', 'test_card')
      store.removeFromContainer('test_candlestick')
      expect(store.isRootWidget('test_candlestick')).toBe(true)
    })
  })

  // Dimension 2: Properties
  describe('属性', () => {
    it('默认 staticData 有 5 条', () => {
      const widget = createWidget('candlestick', 'test_candlestick')!
      expect(widget.props?.staticData).toHaveLength(5)
    })

    it('默认 dateField 为 date', () => {
      const widget = createWidget('candlestick', 'test_candlestick')!
      expect(widget.props?.dateField).toBe('date')
    })

    it('默认 openField 为 open', () => {
      const widget = createWidget('candlestick', 'test_candlestick')!
      expect(widget.props?.openField).toBe('open')
    })

    it('默认 closeField 为 close', () => {
      const widget = createWidget('candlestick', 'test_candlestick')!
      expect(widget.props?.closeField).toBe('close')
    })

    it('默认 lowField 为 low', () => {
      const widget = createWidget('candlestick', 'test_candlestick')!
      expect(widget.props?.lowField).toBe('low')
    })

    it('默认 highField 为 high', () => {
      const widget = createWidget('candlestick', 'test_candlestick')!
      expect(widget.props?.highField).toBe('high')
    })

    it('props 可覆盖', () => {
      const widget = createWidget('candlestick', 'test_candlestick')!
      store.addWidget(widget)
      store.updateWidget('test_candlestick', { props: { dateField: 'time', title: 'K-line' } })
      const found = store.findWidget('test_candlestick')!
      expect(found.props?.dateField).toBe('time')
      expect(found.props?.title).toBe('K-line')
    })
  })

  // Dimension 3: Events
  describe('事件', () => {
    it('支持 refresh 事件配置', () => {
      const widget = createWidget('candlestick', 'test_candlestick')!
      widget.events = [{ trigger: 'refresh', actions: [{ type: 'show', target: 'w2' }] }]
      store.addWidget(widget)
      expect(store.findWidget('test_candlestick')!.events).toHaveLength(1)
    })

    it('支持 set-data 事件配置', () => {
      const widget = createWidget('candlestick', 'test_candlestick')!
      widget.events = [{ trigger: 'set-data', actions: [{ type: 'show', target: 'w3' }] }]
      store.addWidget(widget)
      expect(store.findWidget('test_candlestick')!.events).toHaveLength(1)
      expect(store.findWidget('test_candlestick')!.events![0].trigger).toBe('set-data')
    })
  })

  // Dimension 4: Rules
  describe('规则', () => {
    it('visible=false 隐藏', () => {
      const widget = createWidget('candlestick', 'test_candlestick')!
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
      const widget = createWidget('candlestick', 'test_candlestick')!
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
      const widget = createWidget('candlestick', 'test_candlestick')!
      widget.api = { url: '/api/candlestick-data', method: 'get' }
      store.addWidget(widget)
      expect(store.findWidget('test_candlestick')!.api!.url).toBe('/api/candlestick-data')
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
