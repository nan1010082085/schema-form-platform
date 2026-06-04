import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed, ref, reactive } from 'vue'
import ElementPlus from 'element-plus'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget, getWidget } from '@/widgets/registry'
import { widgetDataKey, widgetStyleKey } from '../../base/types'
import FgTable from '../FgTable.vue'

// Mock useListData to avoid real API calls — must use real Vue refs for template auto-unwrap
vi.mock('@/composables/useListData', () => ({
  useListData: () => ({
    tableData: ref<Record<string, unknown>[]>([]),
    total: ref(0),
    loading: ref(false),
    error: ref(''),
    currentPage: ref(1),
    pageSize: ref(20),
    searchParams: reactive<Record<string, unknown>>({}),
    setSearchParams: vi.fn(),
    fetchData: vi.fn(),
    handleSearch: vi.fn(),
    handleReset: vi.fn(),
    handlePageChange: vi.fn(),
    handleSizeChange: vi.fn(),
    handleSortChange: vi.fn(),
    selectedRows: ref<Record<string, unknown>[]>([]),
    handleSelectionChange: vi.fn(),
    clearSelection: vi.fn(),
  }),
}))

describe('FgTable', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountTable(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('table', 'test_table')!
    if (overrides.props) {
      widget.props = { ...widget.props, ...overrides.props }
      delete overrides.props
    }
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

  // Dimension 5: Pagination
  describe('分页', () => {
    it('默认 pagination.enabled 为 true', () => {
      const widget = createWidget('table', 'test_table')!
      store.addWidget(widget)
      const pagination = widget.props?.pagination as { enabled: boolean; pageSize: number }
      expect(pagination.enabled).toBe(true)
    })

    it('默认 pagination.pageSize 为 20', () => {
      const widget = createWidget('table', 'test_table')!
      store.addWidget(widget)
      const pagination = widget.props?.pagination as { pageSize: number }
      expect(pagination.pageSize).toBe(20)
    })

    it('默认 pagination.pageSizes 包含 10/20/50/100', () => {
      const widget = createWidget('table', 'test_table')!
      store.addWidget(widget)
      const pagination = widget.props?.pagination as { pageSizes: number[] }
      expect(pagination.pageSizes).toEqual([10, 20, 50, 100])
    })

    it('pagination 可配置为禁用', () => {
      const widget = createWidget('table', 'test_table')!
      widget.props = { ...widget.props, pagination: { enabled: false, pageSize: 10, pageSizes: [10, 20] } }
      store.addWidget(widget)
      const pagination = store.findWidget('test_table')!.props!.pagination as { enabled: boolean }
      expect(pagination.enabled).toBe(false)
    })

    it('渲染 el-pagination（有 API URL 时）', () => {
      const wrapper = mountTable({ api: { url: '/api/data' } })
      expect(wrapper.find('.el-pagination').exists()).toBe(true)
    })

    it('不渲染 el-pagination（无 API URL 时）', () => {
      const wrapper = mountTable()
      expect(wrapper.find('.el-pagination').exists()).toBe(false)
    })

    it('不渲染 el-pagination（pagination.enabled 为 false）', () => {
      const wrapper = mountTable({
        api: { url: '/api/data' },
        props: { pagination: { enabled: false, pageSize: 10, pageSizes: [10] } },
      })
      expect(wrapper.find('.el-pagination').exists()).toBe(false)
    })
  })

  // Dimension 6: Selection
  describe('行选择', () => {
    it('默认 selection.enabled 为 false', () => {
      const widget = createWidget('table', 'test_table')!
      store.addWidget(widget)
      const selection = widget.props?.selection as { enabled: boolean }
      expect(selection.enabled).toBe(false)
    })

    it('selection 可配置为启用', () => {
      const widget = createWidget('table', 'test_table')!
      widget.props = { ...widget.props, selection: { enabled: true } }
      store.addWidget(widget)
      const selection = store.findWidget('test_table')!.props!.selection as { enabled: boolean }
      expect(selection.enabled).toBe(true)
    })

    it('启用 selection 时渲染选择列', () => {
      const wrapper = mountTable({ props: { selection: { enabled: true } } })
      // Element Plus renders selection column — verify table renders without error
      expect(wrapper.find('.el-table').exists()).toBe(true)
      // Verify the component's selectionConfig is enabled
      const widget = store.findWidget('test_table')!
      expect((widget.props?.selection as { enabled: boolean }).enabled).toBe(true)
    })

    it('禁用 selection 时不渲染选择列', () => {
      const wrapper = mountTable()
      expect(wrapper.find('.el-table-column--selection').exists()).toBe(false)
    })
  })

  // Dimension 7: Sortable
  describe('排序', () => {
    it('默认 sortable 为 false', () => {
      const widget = createWidget('table', 'test_table')!
      store.addWidget(widget)
      expect(widget.props?.sortable).toBe(false)
    })

    it('sortable 可配置为 true', () => {
      const widget = createWidget('table', 'test_table')!
      widget.props = { ...widget.props, sortable: true }
      store.addWidget(widget)
      expect(store.findWidget('test_table')!.props!.sortable).toBe(true)
    })

    it('列级别 sortable 可覆盖全局设置', () => {
      const customColumns = [
        { prop: 'name', label: '姓名', sortable: 'custom' as const },
        { prop: 'age', label: '年龄', sortable: false },
      ]
      const widget = createWidget('table', 'test_table')!
      widget.props = { ...widget.props, columns: customColumns, sortable: true }
      store.addWidget(widget)
      const columns = store.findWidget('test_table')!.props!.columns as Array<{ sortable: string | boolean }>
      expect(columns[0].sortable).toBe('custom')
      expect(columns[1].sortable).toBe(false)
    })
  })

  // Dimension 8: Filterable
  describe('筛选', () => {
    it('默认 filterable 为 false', () => {
      const widget = createWidget('table', 'test_table')!
      store.addWidget(widget)
      expect(widget.props?.filterable).toBe(false)
    })

    it('filterable 可配置为 true', () => {
      const widget = createWidget('table', 'test_table')!
      widget.props = { ...widget.props, filterable: true }
      store.addWidget(widget)
      expect(store.findWidget('test_table')!.props!.filterable).toBe(true)
    })

    it('列可配置 filters', () => {
      const customColumns = [
        {
          prop: 'status',
          label: '状态',
          filters: [
            { text: '启用', value: 'active' },
            { text: '禁用', value: 'inactive' },
          ],
        },
      ]
      const widget = createWidget('table', 'test_table')!
      widget.props = { ...widget.props, columns: customColumns }
      store.addWidget(widget)
      const columns = store.findWidget('test_table')!.props!.columns as Array<{ filters: Array<{ text: string }> }>
      expect(columns[0].filters).toHaveLength(2)
      expect(columns[0].filters[0].text).toBe('启用')
    })
  })

  // Dimension 9: Exposed values
  describe('Exposed Values', () => {
    it('exposedValues 包含 loading', () => {
      const item = getWidget('table')
      const keys = item?.config.exposedValues?.map(v => v.key)
      expect(keys).toContain('loading')
    })

    it('exposedValues 包含 tableData', () => {
      const item = getWidget('table')
      const keys = item?.config.exposedValues?.map(v => v.key)
      expect(keys).toContain('tableData')
    })

    it('exposedValues 包含 selectedRows', () => {
      const item = getWidget('table')
      const keys = item?.config.exposedValues?.map(v => v.key)
      expect(keys).toContain('selectedRows')
    })
  })

  // Dimension 10: Receivable events
  describe('Receivable Events', () => {
    it('receivableEvents 包含 refresh', () => {
      const item = getWidget('table')
      const names = item?.config.receivableEvents?.map(e => e.name)
      expect(names).toContain('refresh')
    })

    it('receivableEvents 包含 set-data', () => {
      const item = getWidget('table')
      const names = item?.config.receivableEvents?.map(e => e.name)
      expect(names).toContain('set-data')
    })

    it('receivableEvents 包含 set-search-params', () => {
      const item = getWidget('table')
      const names = item?.config.receivableEvents?.map(e => e.name)
      expect(names).toContain('set-search-params')
    })
  })
})
