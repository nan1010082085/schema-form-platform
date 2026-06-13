import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import TDesign from 'tdesign-vue-next'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget, getWidget } from '@/widgets/registry'
import { widgetDataKey, widgetStyleKey } from '../../base/types'
import FgStatistic from '../FgStatistic.vue'

// Mock useApiRequest to avoid real API calls
vi.mock('@/composables/useApiRequest', () => ({
  useApiRequest: () => ({
    fetchApi: vi.fn().mockResolvedValue({}),
  }),
}))

// Mock useExposeWidget
vi.mock('@/composables/useExposeWidget', () => ({
  useExposeWidget: (getter: () => Record<string, unknown>) => {
    getter()
  },
}))

describe('FgStatistic', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountStatistic(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('statistic', 'test_statistic')!
    if (overrides.props) {
      widget.props = { ...widget.props, ...overrides.props }
      delete overrides.props
    }
    Object.assign(widget, overrides)
    store.addWidget(widget)
    return mount(FgStatistic, {
      global: {
        plugins: [ElementPlus],
        provide: {
          [widgetDataKey as symbol]: computed(() => store.findWidget('test_statistic')!),
          [widgetStyleKey as symbol]: computed(() => store.findWidget('test_statistic')!.style ?? {}),
        },
      },
    })
  }

  // Dimension 1: Store CRUD
  describe('Store CRUD', () => {
    it('创建后 store 中存在', () => {
      const widget = createWidget('statistic', 'test_statistic')
      store.addWidget(widget!)
      expect(store.findWidget('test_statistic')).toBeDefined()
    })

    it('可从 store 移除', () => {
      const widget = createWidget('statistic', 'test_statistic')
      store.addWidget(widget!)
      store.removeWidget('test_statistic')
      expect(store.findWidget('test_statistic')).toBeNull()
    })

    it('可更新属性', () => {
      const widget = createWidget('statistic', 'test_statistic')
      store.addWidget(widget!)
      store.updateWidget('test_statistic', { label: '新标签' })
      expect(store.findWidget('test_statistic')!.label).toBe('新标签')
    })
  })

  // Dimension 2: Props defaults and customization
  describe('Props 默认值与自定义', () => {
    it('默认 title 为 总用户数', () => {
      const widget = createWidget('statistic', 'test_statistic')!
      store.addWidget(widget)
      expect(widget.props?.title).toBe('总用户数')
    })

    it('默认 value 为 12345', () => {
      const widget = createWidget('statistic', 'test_statistic')!
      store.addWidget(widget)
      expect(widget.props?.value).toBe(12345)
    })

    it('默认 precision 为 0', () => {
      const widget = createWidget('statistic', 'test_statistic')!
      store.addWidget(widget)
      expect(widget.props?.precision).toBe(0)
    })

    it('默认 trend 为 up', () => {
      const widget = createWidget('statistic', 'test_statistic')!
      store.addWidget(widget)
      expect(widget.props?.trend).toBe('up')
    })

    it('默认 color 为 #409EFF', () => {
      const widget = createWidget('statistic', 'test_statistic')!
      store.addWidget(widget)
      expect(widget.props?.color).toBe('#409EFF')
    })

    it('title 可自定义', () => {
      const wrapper = mountStatistic({ props: { title: '月销售额' } })
      expect(wrapper.text()).toContain('月销售额')
    })

    it('prefix 和 suffix 渲染到 DOM', () => {
      const wrapper = mountStatistic({ props: { prefix: '¥', suffix: '万' } })
      expect(wrapper.text()).toContain('¥')
      expect(wrapper.text()).toContain('万')
    })

    it('precision 可配置为 2', () => {
      const widget = createWidget('statistic', 'test_statistic')!
      widget.props = { ...widget.props, precision: 2 }
      store.addWidget(widget)
      expect(store.findWidget('test_statistic')!.props!.precision).toBe(2)
    })
  })

  // Dimension 3: API data source
  describe('API 数据源', () => {
    it('支持 apiUrl 配置', () => {
      const widget = createWidget('statistic', 'test_statistic')!
      widget.props = { ...widget.props, apiUrl: '/api/stat' }
      store.addWidget(widget)
      expect(store.findWidget('test_statistic')!.props!.apiUrl).toBe('/api/stat')
    })

    it('apiMethod 可配置为 post', () => {
      const widget = createWidget('statistic', 'test_statistic')!
      widget.props = { ...widget.props, apiUrl: '/api/stat', apiMethod: 'post' }
      store.addWidget(widget)
      expect(store.findWidget('test_statistic')!.props!.apiMethod).toBe('post')
    })

    it('responseDataPath 可配置', () => {
      const widget = createWidget('statistic', 'test_statistic')!
      widget.props = { ...widget.props, apiUrl: '/api/stat', responseDataPath: 'data.total' }
      store.addWidget(widget)
      expect(store.findWidget('test_statistic')!.props!.responseDataPath).toBe('data.total')
    })
  })

  // Dimension 4: Thousand separator formatting
  describe('千分位格式化', () => {
    it('渲染格式化后的数值（含千分位）', () => {
      const wrapper = mountStatistic({ props: { value: 12345 } })
      // zh-CN locale uses full-width comma or regular comma
      expect(wrapper.text()).toMatch(/12.?345/)
    })

    it('小数精度正确', () => {
      const wrapper = mountStatistic({ props: { value: 99.9, precision: 2 } })
      expect(wrapper.text()).toMatch(/99[.,]90/)
    })
  })

  // Dimension 5: Trend display
  describe('趋势展示', () => {
    it('trendValue 为空时不渲染趋势区域', () => {
      const wrapper = mountStatistic({ props: { trendValue: '' } })
      const footer = wrapper.findAll('div').find(d => d.text().includes('+12%'))
      expect(footer).toBeUndefined()
    })

    it('trend=up 且 trendValue 非空时渲染趋势', () => {
      const wrapper = mountStatistic({ props: { trend: 'up', trendValue: '+12%' } })
      expect(wrapper.text()).toContain('+12%')
    })

    it('trend=down 时渲染下降趋势', () => {
      const wrapper = mountStatistic({ props: { trend: 'down', trendValue: '-5%' } })
      expect(wrapper.text()).toContain('-5%')
    })

    it('trend=flat 时渲染持平趋势', () => {
      const wrapper = mountStatistic({ props: { trend: 'flat', trendValue: '0%' } })
      expect(wrapper.text()).toContain('0%')
    })
  })

  // Dimension 6: Exposed Values
  describe('Exposed Values', () => {
    it('exposedValues 包含 loading', () => {
      const item = getWidget('statistic')
      const keys = item?.config.exposedValues?.map(v => v.key)
      expect(keys).toContain('loading')
    })

    it('exposedValues 包含 currentValue', () => {
      const item = getWidget('statistic')
      const keys = item?.config.exposedValues?.map(v => v.key)
      expect(keys).toContain('currentValue')
    })
  })

  // Dimension 7: Receivable Events
  describe('Receivable Events', () => {
    it('receivableEvents 包含 refresh', () => {
      const item = getWidget('statistic')
      const names = item?.config.receivableEvents?.map(e => e.name)
      expect(names).toContain('refresh')
    })

    it('receivableEvents 包含 set-value', () => {
      const item = getWidget('statistic')
      const names = item?.config.receivableEvents?.map(e => e.name)
      expect(names).toContain('set-value')
    })
  })

  // Dimension 8: Config panel
  describe('配置面板', () => {
    it('configPanels 包含 api', () => {
      const item = getWidget('statistic')
      expect(item?.config.configPanels).toContain('api')
    })

    it('configPanels 包含 variables', () => {
      const item = getWidget('statistic')
      expect(item?.config.configPanels).toContain('variables')
    })
  })
})
