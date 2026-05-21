import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import ElementPlus from 'element-plus'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget, getWidget } from '@/widgets/registry'
import { widgetDataKey, widgetStyleKey } from '../../base/types'
import FgTable from '../FgTable.vue'

describe('FgTable', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountTable(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('table', 'test_table')!
    Object.assign(widget, overrides)
    store.addWidget(widget)
    return mount(FgTable, {
      global: {
        plugins: [ElementPlus],
        provide: {
          [widgetDataKey as symbol]: computed(() => store.findWidget('test_table')!),
          [widgetStyleKey as symbol]: computed(() => store.findWidget('test_table')!.style ?? {}),
        },
      },
    })
  }

  // Dimension 1: Store CRUD
  describe('Store CRUD', () => {
    it('创建后 store 中存在', () => {
      const widget = createWidget('table', 'test_table')
      store.addWidget(widget!)
      expect(store.findWidget('test_table')).toBeDefined()
    })

    it('可从 store 移除', () => {
      const widget = createWidget('table', 'test_table')
      store.addWidget(widget!)
      store.removeWidget('test_table')
      expect(store.findWidget('test_table')).toBeNull()
    })

    it('可更新属性', () => {
      const widget = createWidget('table', 'test_table')
      store.addWidget(widget!)
      store.updateWidget('test_table', { label: '新标签' })
      expect(store.findWidget('test_table')!.label).toBe('新标签')
    })
  })

  // Dimension 2: Props
  describe('Props', () => {
    it('默认 columns 配置包含两个列', () => {
      const widget = createWidget('table', 'test_table')!
      store.addWidget(widget)
      const columns = widget.props?.columns as Array<{ prop: string; label: string }>
      expect(columns).toHaveLength(2)
      expect(columns[0].prop).toBe('name')
      expect(columns[1].prop).toBe('age')
    })

    it('默认 stripe 为 true', () => {
      const widget = createWidget('table', 'test_table')!
      store.addWidget(widget)
      expect(widget.props?.stripe).toBe(true)
    })

    it('默认 border 为 true', () => {
      const widget = createWidget('table', 'test_table')!
      store.addWidget(widget)
      expect(widget.props?.border).toBe(true)
    })

    it('默认 height 为 280', () => {
      const widget = createWidget('table', 'test_table')!
      store.addWidget(widget)
      expect(widget.props?.height).toBe(280)
    })

    it('stripe 可配置为 false', () => {
      const widget = createWidget('table', 'test_table')!
      widget.props = { ...widget.props, stripe: false }
      store.addWidget(widget)
      expect(store.findWidget('test_table')!.props!.stripe).toBe(false)
    })

    it('border 可配置为 false', () => {
      const widget = createWidget('table', 'test_table')!
      widget.props = { ...widget.props, border: false }
      store.addWidget(widget)
      expect(store.findWidget('test_table')!.props!.border).toBe(false)
    })

    it('height 可自定义', () => {
      const widget = createWidget('table', 'test_table')!
      widget.props = { ...widget.props, height: 400 }
      store.addWidget(widget)
      expect(store.findWidget('test_table')!.props!.height).toBe(400)
    })

    it('自定义 columns 配置', () => {
      const customColumns = [
        { prop: 'id', label: 'ID', width: 60 },
        { prop: 'name', label: '姓名', width: 120 },
        { prop: 'status', label: '状态', width: 80, fixed: 'right' as const },
      ]
      const widget = createWidget('table', 'test_table')!
      widget.props = { ...widget.props, columns: customColumns }
      store.addWidget(widget)
      expect(store.findWidget('test_table')!.props!.columns).toHaveLength(3)
    })

    it('渲染 el-table', () => {
      const wrapper = mountTable()
      expect(wrapper.find('.el-table').exists()).toBe(true)
    })

    it('渲染正确的列数', () => {
      const widget = createWidget('table', 'test_table')!
      store.addWidget(widget)
      const columns = store.findWidget('test_table')!.props!.columns as Array<{ prop: string }>
      expect(columns).toHaveLength(2)
    })
  })

  // Dimension 3: API datasource
  describe('API 数据源', () => {
    it('支持 api 配置', () => {
      const widget = createWidget('table', 'test_table')!
      widget.api = { url: '/api/table-data', method: 'get' }
      store.addWidget(widget)
      expect(store.findWidget('test_table')!.api).toBeDefined()
    })

    it('api url 可自定义', () => {
      const widget = createWidget('table', 'test_table')!
      widget.api = { url: '/api/custom-data', method: 'post' }
      store.addWidget(widget)
      expect(store.findWidget('test_table')!.api!.url).toBe('/api/custom-data')
    })

    it('props 中 apiUrl 可配置', () => {
      const widget = createWidget('table', 'test_table')!
      widget.props = { ...widget.props, apiUrl: '/api/table-list', apiMethod: 'get' }
      store.addWidget(widget)
      expect(store.findWidget('test_table')!.props!.apiUrl).toBe('/api/table-list')
    })

    it('props 中 responseDataPath 可配置', () => {
      const widget = createWidget('table', 'test_table')!
      widget.props = { ...widget.props, responseDataPath: 'result.records' }
      store.addWidget(widget)
      expect(store.findWidget('test_table')!.props!.responseDataPath).toBe('result.records')
    })
  })

  // Dimension 4: Config panel
  describe('配置面板', () => {
    it('configPanels 包含 api', () => {
      const item = getWidget('table')
      expect(item?.config.configPanels).toContain('api')
    })
  })
})
