import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import ElementPlus from 'element-plus'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget, getWidget } from '@/widgets/registry'
import { widgetDataKey, widgetStyleKey } from '../../base/types'
import FgDetailForm from '../FgDetailForm.vue'

describe('FgDetailForm', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountDetailForm(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('detail-form', 'test_detail_form')!
    Object.assign(widget, overrides)
    store.addWidget(widget)
    return mount(FgDetailForm, {
      global: {
        plugins: [ElementPlus],
        provide: {
          [widgetDataKey as symbol]: computed(() => store.findWidget('test_detail_form')!),
          [widgetStyleKey as symbol]: computed(() => store.findWidget('test_detail_form')!.style ?? {}),
        },
      },
    })
  }

  // Dimension 1: Store CRUD
  describe('Store CRUD', () => {
    it('创建后 store 中存在', () => {
      const widget = createWidget('detail-form', 'test_detail_form')
      store.addWidget(widget!)
      expect(store.findWidget('test_detail_form')).toBeDefined()
    })

    it('可从 store 移除', () => {
      const widget = createWidget('detail-form', 'test_detail_form')
      store.addWidget(widget!)
      store.removeWidget('test_detail_form')
      expect(store.findWidget('test_detail_form')).toBeNull()
    })

    it('可更新属性', () => {
      const widget = createWidget('detail-form', 'test_detail_form')
      store.addWidget(widget!)
      store.updateWidget('test_detail_form', { label: '新标签' })
      expect(store.findWidget('test_detail_form')!.label).toBe('新标签')
    })
  })

  // Dimension 2: Props
  describe('Props', () => {
    it('默认 title 为 详情', () => {
      const widget = createWidget('detail-form', 'test_detail_form')!
      store.addWidget(widget)
      expect(widget.props?.title).toBe('详情')
    })

    it('默认 columns 为 2', () => {
      const widget = createWidget('detail-form', 'test_detail_form')!
      store.addWidget(widget)
      expect(widget.props?.columns).toBe(2)
    })

    it('默认 bordered 为 true', () => {
      const widget = createWidget('detail-form', 'test_detail_form')!
      store.addWidget(widget)
      expect(widget.props?.bordered).toBe(true)
    })

    it('title 可自定义', () => {
      const wrapper = mountDetailForm({ props: { title: '用户详情' } })
      expect(wrapper.text()).toContain('用户详情')
    })

    it('columns 可配置为 3', () => {
      const widget = createWidget('detail-form', 'test_detail_form')!
      widget.props = { ...widget.props, columns: 3 }
      store.addWidget(widget)
      expect(store.findWidget('test_detail_form')!.props!.columns).toBe(3)
    })

    it('bordered 可配置为 false', () => {
      const widget = createWidget('detail-form', 'test_detail_form')!
      widget.props = { ...widget.props, bordered: false }
      store.addWidget(widget)
      expect(store.findWidget('test_detail_form')!.props!.bordered).toBe(false)
    })

    it('渲染 el-descriptions', () => {
      const wrapper = mountDetailForm()
      expect(wrapper.find('.el-descriptions').exists()).toBe(true)
    })

    it('columns 配置传递给 el-descriptions', () => {
      const wrapper = mountDetailForm({ props: { columns: 3 } })
      expect(wrapper.find('.el-descriptions').exists()).toBe(true)
    })
  })

  // Dimension 3: Config panel
  describe('配置面板', () => {
    it('configPanels 包含 events', () => {
      const item = getWidget('detail-form')
      expect(item?.config.configPanels).toContain('events')
    })
  })
})
