import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import ElementPlus from 'element-plus'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget, getWidget } from '@/widgets/registry'
import { widgetDataKey, widgetStyleKey } from '../../base/types'
import FgDescriptions from '../FgDescriptions.vue'

// Mock global fetch for API data source tests
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock useExposeWidget
vi.mock('@/composables/useExposeWidget', () => ({
  useExposeWidget: (getter: () => Record<string, unknown>) => {
    getter()
  },
}))

describe('FgDescriptions', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
    mockFetch.mockReset()
  })

  function mountDescriptions(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('descriptions', 'test_desc')!
    if (overrides.props) {
      widget.props = { ...widget.props, ...overrides.props }
      delete overrides.props
    }
    Object.assign(widget, overrides)
    store.addWidget(widget)
    return mount(FgDescriptions, {
      global: {
        plugins: [ElementPlus],
        provide: {
          [widgetDataKey as symbol]: computed(() => store.findWidget('test_desc')!),
          [widgetStyleKey as symbol]: computed(() => store.findWidget('test_desc')!.style ?? {}),
        },
      },
    })
  }

  // Dimension 1: Store CRUD
  describe('Store CRUD', () => {
    it('创建后 store 中存在', () => {
      const widget = createWidget('descriptions', 'test_desc')
      store.addWidget(widget!)
      expect(store.findWidget('test_desc')).toBeDefined()
    })

    it('可从 store 移除', () => {
      const widget = createWidget('descriptions', 'test_desc')
      store.addWidget(widget!)
      store.removeWidget('test_desc')
      expect(store.findWidget('test_desc')).toBeNull()
    })

    it('可更新属性', () => {
      const widget = createWidget('descriptions', 'test_desc')
      store.addWidget(widget!)
      store.updateWidget('test_desc', { label: '新标签' })
      expect(store.findWidget('test_desc')!.label).toBe('新标签')
    })
  })

  // Dimension 2: Props defaults and customization
  describe('Props 默认值与自定义', () => {
    it('默认 title 为 详情', () => {
      const widget = createWidget('descriptions', 'test_desc')!
      store.addWidget(widget)
      expect(widget.props?.title).toBe('详情')
    })

    it('默认 column 为 2', () => {
      const widget = createWidget('descriptions', 'test_desc')!
      store.addWidget(widget)
      expect(widget.props?.column).toBe(2)
    })

    it('默认 border 为 true', () => {
      const widget = createWidget('descriptions', 'test_desc')!
      store.addWidget(widget)
      expect(widget.props?.border).toBe(true)
    })

    it('默认 items 包含 2 个字段', () => {
      const widget = createWidget('descriptions', 'test_desc')!
      store.addWidget(widget)
      const items = widget.props?.items as Array<{ field: string }>
      expect(items).toHaveLength(2)
      expect(items[0].field).toBe('field1')
      expect(items[1].field).toBe('field2')
    })

    it('title 可自定义', () => {
      const wrapper = mountDescriptions({ props: { title: '用户详情' } })
      expect(wrapper.text()).toContain('用户详情')
    })

    it('column 可配置为 3', () => {
      const widget = createWidget('descriptions', 'test_desc')!
      widget.props = { ...widget.props, column: 3 }
      store.addWidget(widget)
      expect(store.findWidget('test_desc')!.props!.column).toBe(3)
    })

    it('border 可配置为 false', () => {
      const widget = createWidget('descriptions', 'test_desc')!
      widget.props = { ...widget.props, border: false }
      store.addWidget(widget)
      expect(store.findWidget('test_desc')!.props!.border).toBe(false)
    })

    it('渲染 el-descriptions', () => {
      const wrapper = mountDescriptions()
      expect(wrapper.find('.el-descriptions').exists()).toBe(true)
    })

    it('items 配置包含 2 个字段', () => {
      const widget = createWidget('descriptions', 'test_desc')!
      store.addWidget(widget)
      const items = store.findWidget('test_desc')!.props!.items as Array<{ field: string }>
      expect(items).toHaveLength(2)
    })
  })

  // Dimension 3: 5 value types configuration
  describe('值类型配置', () => {
    it('text 类型可配置', () => {
      const widget = createWidget('descriptions', 'test_desc')!
      widget.props = {
        ...widget.props,
        items: [{ label: '姓名', field: 'name', type: 'text' }],
      }
      store.addWidget(widget)
      const items = store.findWidget('test_desc')!.props!.items as Array<{ type: string }>
      expect(items[0].type).toBe('text')
    })

    it('tag 类型可配置（含 options）', () => {
      const widget = createWidget('descriptions', 'test_desc')!
      widget.props = {
        ...widget.props,
        items: [{
          label: '状态',
          field: 'status',
          type: 'tag',
          options: [
            { label: '启用', value: 'active', color: 'success' },
            { label: '禁用', value: 'inactive', color: 'danger' },
          ],
        }],
      }
      store.addWidget(widget)
      const items = store.findWidget('test_desc')!.props!.items as Array<{ type: string; options: unknown[] }>
      expect(items[0].type).toBe('tag')
      expect(items[0].options).toHaveLength(2)
    })

    it('link 类型可配置（含 href）', () => {
      const widget = createWidget('descriptions', 'test_desc')!
      widget.props = {
        ...widget.props,
        items: [{
          label: '链接',
          field: 'url',
          type: 'link',
          href: 'https://example.com',
        }],
      }
      store.addWidget(widget)
      const items = store.findWidget('test_desc')!.props!.items as Array<{ type: string; href: string }>
      expect(items[0].type).toBe('link')
      expect(items[0].href).toBe('https://example.com')
    })

    it('image 类型可配置（含 imageWidth/imageHeight）', () => {
      const widget = createWidget('descriptions', 'test_desc')!
      widget.props = {
        ...widget.props,
        items: [{
          label: '头像',
          field: 'avatar',
          type: 'image',
          imageWidth: 100,
          imageHeight: 100,
        }],
      }
      store.addWidget(widget)
      const items = store.findWidget('test_desc')!.props!.items as Array<{ type: string; imageWidth: number }>
      expect(items[0].type).toBe('image')
      expect(items[0].imageWidth).toBe(100)
    })

    it('date 类型可配置（含 format）', () => {
      const widget = createWidget('descriptions', 'test_desc')!
      widget.props = {
        ...widget.props,
        items: [{ label: '创建时间', field: 'createdAt', type: 'date', format: 'YYYY-MM-DD HH:mm:ss' }],
      }
      store.addWidget(widget)
      const items = store.findWidget('test_desc')!.props!.items as Array<{ type: string; format: string }>
      expect(items[0].type).toBe('date')
      expect(items[0].format).toBe('YYYY-MM-DD HH:mm:ss')
    })
  })

  // Dimension 4: API data source
  describe('API 数据源', () => {
    it('dataSource type=api 时 onMounted 触发 fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { name: '张三' } }),
      })
      mountDescriptions({
        props: {
          dataSource: { type: 'api', url: '/api/user/1' },
          items: [{ label: '姓名', field: 'name', type: 'text' }],
        },
      })
      // Wait for async onMounted
      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/user/1')
      })
    })

    it('dataSource 无 url 时不发起请求', () => {
      mountDescriptions({
        props: {
          dataSource: { type: 'api' },
        },
      })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('dataSource 未配置时不发起请求', () => {
      mountDescriptions()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  // Dimension 5: Exposed Values
  describe('Exposed Values', () => {
    it('exposedValues 包含 data', () => {
      const item = getWidget('descriptions')
      const keys = item?.config.exposedValues?.map(v => v.key)
      expect(keys).toContain('data')
    })

    it('exposedValues 声明 data 类型为 object', () => {
      const item = getWidget('descriptions')
      const dataEv = item?.config.exposedValues?.find(v => v.key === 'data')
      expect(dataEv?.type).toBe('object')
    })
  })

  // Dimension 6: Config panel
  describe('配置面板', () => {
    it('configPanels 包含 api', () => {
      const item = getWidget('descriptions')
      expect(item?.config.configPanels).toContain('api')
    })

    it('configPanels 包含 events', () => {
      const item = getWidget('descriptions')
      expect(item?.config.configPanels).toContain('events')
    })

    it('configPanels 包含 variables', () => {
      const item = getWidget('descriptions')
      expect(item?.config.configPanels).toContain('variables')
    })
  })
})
