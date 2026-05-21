import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import ElementPlus from 'element-plus'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget, getWidget } from '@/widgets/registry'
import { widgetDataKey, widgetStyleKey } from '../../base/types'
import FgSearchList from '../FgSearchList.vue'

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
        { prop: 'name', label: '姓名', width: 120 },
        { prop: 'age', label: '年龄', width: 80 },
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
})
