import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import ElementPlus from 'element-plus'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget, getWidget } from '@/widgets/registry'
import { widgetDataKey, widgetStyleKey } from '../../base/types'
import FgSearchList from '../FgSearchList.vue'

// Mock apiClient for useListData
vi.mock('@/utils/apiClient', () => {
  const mockRequestUrl = vi.fn()
  return {
    apiClient: {
      requestUrl: mockRequestUrl,
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      configure: vi.fn(),
      isMockEnabled: vi.fn(() => false),
    },
    ApiError: class ApiError extends Error {
      status?: number
      constructor(msg: string, status?: number) {
        super(msg)
        this.status = status
      }
    },
  }
})

describe('FgSearchList', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountSearchList(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('search-list', 'test_search_list')!
    Object.assign(widget, overrides)
    store.addWidget(widget)
    return mount(FgSearchList, {
      global: {
        plugins: [ElementPlus],
        provide: {
          [widgetDataKey as symbol]: computed(() => store.findWidget('test_search_list')!),
          [widgetStyleKey as symbol]: computed(() => store.findWidget('test_search_list')!.style ?? {}),
        },
      },
    })
  }

  // Dimension 1: Store CRUD
  describe('Store CRUD', () => {
    it('创建后 store 中存在', () => {
      const widget = createWidget('search-list', 'test_search_list')
      store.addWidget(widget!)
      expect(store.findWidget('test_search_list')).toBeDefined()
    })

    it('可从 store 移除', () => {
      const widget = createWidget('search-list', 'test_search_list')
      store.addWidget(widget!)
      store.removeWidget('test_search_list')
      expect(store.findWidget('test_search_list')).toBeNull()
    })

    it('可更新属性', () => {
      const widget = createWidget('search-list', 'test_search_list')
      store.addWidget(widget!)
      store.updateWidget('test_search_list', { label: '新标签' })
      expect(store.findWidget('test_search_list')!.label).toBe('新标签')
    })
  })

  // Dimension 2: Props
  describe('Props', () => {
    it('默认 title 为 列表', () => {
      const widget = createWidget('search-list', 'test_search_list')!
      store.addWidget(widget)
      expect(widget.props?.title).toBe('列表')
    })

    it('默认 pageSize 为 10', () => {
      const widget = createWidget('search-list', 'test_search_list')!
      store.addWidget(widget)
      expect(widget.props?.pageSize).toBe(10)
    })

    it('默认 showPagination 为 true', () => {
      const widget = createWidget('search-list', 'test_search_list')!
      store.addWidget(widget)
      expect(widget.props?.showPagination).toBe(true)
    })

    it('默认 stripe 为 true', () => {
      const widget = createWidget('search-list', 'test_search_list')!
      store.addWidget(widget)
      expect(widget.props?.stripe).toBe(true)
    })

    it('默认 border 为 true', () => {
      const widget = createWidget('search-list', 'test_search_list')!
      store.addWidget(widget)
      expect(widget.props?.border).toBe(true)
    })

    it('默认 sortable 为 false', () => {
      const widget = createWidget('search-list', 'test_search_list')!
      store.addWidget(widget)
      expect(widget.props?.sortable).toBe(false)
    })

    it('默认 selection.enabled 为 false', () => {
      const widget = createWidget('search-list', 'test_search_list')!
      store.addWidget(widget)
      const sel = widget.props?.selection as { enabled?: boolean }
      expect(sel?.enabled).toBe(false)
    })

    it('默认 batchActions 为空数组', () => {
      const widget = createWidget('search-list', 'test_search_list')!
      store.addWidget(widget)
      expect(widget.props?.batchActions).toEqual([])
    })

    it('title 可自定义', () => {
      const wrapper = mountSearchList({ props: { title: '用户列表' } })
      expect(wrapper.text()).toContain('用户列表')
    })

    it('pageSize 可配置为 20', () => {
      const widget = createWidget('search-list', 'test_search_list')!
      widget.props = { ...widget.props, pageSize: 20 }
      store.addWidget(widget)
      expect(store.findWidget('test_search_list')!.props!.pageSize).toBe(20)
    })

    it('showPagination 可配置为 false', () => {
      const widget = createWidget('search-list', 'test_search_list')!
      widget.props = { ...widget.props, showPagination: false }
      store.addWidget(widget)
      expect(store.findWidget('test_search_list')!.props!.showPagination).toBe(false)
    })

    it('stripe 可配置为 false', () => {
      const widget = createWidget('search-list', 'test_search_list')!
      widget.props = { ...widget.props, stripe: false }
      store.addWidget(widget)
      expect(store.findWidget('test_search_list')!.props!.stripe).toBe(false)
    })

    it('border 可配置为 false', () => {
      const widget = createWidget('search-list', 'test_search_list')!
      widget.props = { ...widget.props, border: false }
      store.addWidget(widget)
      expect(store.findWidget('test_search_list')!.props!.border).toBe(false)
    })

    it('columns 可配置', () => {
      const columns = [
        { field: 'name', label: '姓名', width: '120px' },
        { field: 'age', label: '年龄', width: '80px' },
      ]
      const widget = createWidget('search-list', 'test_search_list')!
      widget.props = { ...widget.props, columns }
      store.addWidget(widget)
      expect(store.findWidget('test_search_list')!.props!.columns).toHaveLength(2)
    })

    it('渲染 el-table 和 el-pagination', () => {
      const wrapper = mountSearchList()
      expect(wrapper.find('.el-table').exists()).toBe(true)
      expect(wrapper.find('.el-pagination').exists()).toBe(true)
    })

    it('showPagination=false 时隐藏分页', () => {
      const wrapper = mountSearchList({ props: { showPagination: false } })
      expect(wrapper.find('.el-pagination').exists()).toBe(false)
    })
  })

  // Dimension 3: API datasource
  describe('API 数据源', () => {
    it('支持 api 配置', () => {
      const widget = createWidget('search-list', 'test_search_list')!
      widget.api = { url: '/api/search-list-data', method: 'get' }
      store.addWidget(widget)
      expect(store.findWidget('test_search_list')!.api).toBeDefined()
    })

    it('api url 可自定义', () => {
      const widget = createWidget('search-list', 'test_search_list')!
      widget.api = { url: '/api/users', method: 'post' }
      store.addWidget(widget)
      expect(store.findWidget('test_search_list')!.api!.url).toBe('/api/users')
    })
  })

  // Dimension 4: Config panel
  describe('配置面板', () => {
    it('configPanels 包含 api', () => {
      const item = getWidget('search-list')
      expect(item?.config.configPanels).toContain('api')
    })
  })

  // Dimension 5: Selection
  describe('行选择', () => {
    it('selection.enabled=false 时不渲染 selection 列', () => {
      const wrapper = mountSearchList()
      expect(wrapper.find('.el-table__column--selection').exists()).toBe(false)
    })

    it('selection.enabled=true 时表格正常渲染', () => {
      const wrapper = mountSearchList({
        props: { selection: { enabled: true } },
      })
      expect(wrapper.find('.el-table').exists()).toBe(true)
    })

    it('selection 配置可持久化到 store', () => {
      const widget = createWidget('search-list', 'test_search_list')!
      widget.props = { ...widget.props, selection: { enabled: true } }
      store.addWidget(widget)
      const sel = store.findWidget('test_search_list')!.props?.selection as { enabled?: boolean }
      expect(sel?.enabled).toBe(true)
    })
  })

  // Dimension 6: Batch actions
  describe('批量操作', () => {
    it('无选中行时不显示批量操作栏', () => {
      const wrapper = mountSearchList({
        props: {
          selection: { enabled: true },
          batchActions: [{ label: '批量删除', action: 'batch-delete' }],
        },
      })
      expect(wrapper.text()).not.toContain('批量删除')
    })

    it('batchActions 配置可持久化到 store', () => {
      const widget = createWidget('search-list', 'test_search_list')!
      widget.props = {
        ...widget.props,
        batchActions: [
          { label: '批量删除', action: 'batch-delete' },
          { label: '批量导出', action: 'batch-export' },
        ],
      }
      store.addWidget(widget)
      const actions = store.findWidget('test_search_list')!.props?.batchActions as Array<{ label: string; action: string }>
      expect(actions).toHaveLength(2)
      expect(actions[0].label).toBe('批量删除')
      expect(actions[1].action).toBe('batch-export')
    })
  })

  // Dimension 7: Sortable
  describe('排序', () => {
    it('sortable 默认为 false', () => {
      const widget = createWidget('search-list', 'test_search_list')!
      store.addWidget(widget)
      expect(store.findWidget('test_search_list')!.props?.sortable).toBe(false)
    })

    it('sortable 可配置为 true', () => {
      const widget = createWidget('search-list', 'test_search_list')!
      widget.props = { ...widget.props, sortable: true }
      store.addWidget(widget)
      expect(store.findWidget('test_search_list')!.props?.sortable).toBe(true)
    })

    it('列级 sortable 配置可持久化', () => {
      const columns = [
        { field: 'name', label: '姓名', sortable: true },
        { field: 'age', label: '年龄', sortable: false },
      ]
      const widget = createWidget('search-list', 'test_search_list')!
      widget.props = { ...widget.props, columns }
      store.addWidget(widget)
      const cols = store.findWidget('test_search_list')!.props?.columns as Array<{ sortable?: boolean }>
      expect(cols[0].sortable).toBe(true)
      expect(cols[1].sortable).toBe(false)
    })
  })

  // Dimension 8: Search field types
  describe('搜索字段类型', () => {
    it('input 类型渲染 el-input', () => {
      const wrapper = mountSearchList({
        props: { searchFields: [{ field: 'name', label: '姓名', type: 'input' }] },
      })
      expect(wrapper.find('.el-input').exists()).toBe(true)
    })

    it('select 类型渲染 el-select', () => {
      const wrapper = mountSearchList({
        props: {
          searchFields: [{
            field: 'status', label: '状态', type: 'select',
            options: [{ label: '启用', value: 'active' }],
          }],
        },
      })
      expect(wrapper.find('.el-select').exists()).toBe(true)
    })

    it('number 类型渲染 el-input-number', () => {
      const wrapper = mountSearchList({
        props: { searchFields: [{ field: 'age', label: '年龄', type: 'number' }] },
      })
      expect(wrapper.find('.el-input-number').exists()).toBe(true)
    })

    it('date 类型渲染 el-date-picker', () => {
      const wrapper = mountSearchList({
        props: { searchFields: [{ field: 'date', label: '日期', type: 'date' }] },
      })
      expect(wrapper.find('.el-date-editor').exists()).toBe(true)
    })

    it('date-range 类型渲染 el-date-picker range', () => {
      const wrapper = mountSearchList({
        props: { searchFields: [{ field: 'range', label: '日期范围', type: 'date-range' }] },
      })
      expect(wrapper.find('.el-date-editor').exists()).toBe(true)
    })

    it('time-picker 类型渲染时间选择器', () => {
      const wrapper = mountSearchList({
        props: { searchFields: [{ field: 'time', label: '时间', type: 'time-picker' }] },
      })
      // Element Plus time-picker renders as .el-date-editor with time-related trigger
      expect(wrapper.find('.el-date-editor').exists()).toBe(true)
    })

    it('checkbox 类型渲染 el-checkbox-group', () => {
      const wrapper = mountSearchList({
        props: {
          searchFields: [{
            field: 'tags', label: '标签', type: 'checkbox',
            options: [{ label: 'A', value: 'a' }],
          }],
        },
      })
      expect(wrapper.find('.el-checkbox-group').exists()).toBe(true)
    })

    it('cascader 类型渲染 el-cascader', () => {
      const wrapper = mountSearchList({
        props: {
          searchFields: [{
            field: 'region', label: '地区', type: 'cascader',
            cascaderOptions: [{ label: '北京', value: 'beijing' }],
          }],
        },
      })
      expect(wrapper.find('.el-cascader').exists()).toBe(true)
    })
  })

  // Dimension 9: Exposed values
  describe('Exposed values', () => {
    it('config 中声明 selectedRows 和 selectedCount', () => {
      const item = getWidget('search-list')
      const keys = item?.config.exposedValues?.map(v => v.key)
      expect(keys).toContain('selectedRows')
      expect(keys).toContain('selectedCount')
    })

    it('receivableEvents 包含 clear-selection', () => {
      const item = getWidget('search-list')
      const names = item?.config.receivableEvents?.map(e => e.name)
      expect(names).toContain('clear-selection')
    })
  })

  // Dimension 10: Event targets
  describe('事件目标', () => {
    it('eventTargets 包含 selection-change 和 sort-change', () => {
      const item = getWidget('search-list')
      const ids = (Array.isArray(item?.config.eventTargets) ? item.config.eventTargets : [])?.map((t: { id: string }) => t.id)
      expect(ids).toContain('selection-change')
      expect(ids).toContain('sort-change')
    })
  })
})
