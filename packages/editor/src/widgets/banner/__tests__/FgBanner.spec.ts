import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import ElementPlus from 'element-plus'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'
import { widgetDataKey, widgetStyleKey } from '../../base/types'
import FgBanner from '../FgBanner.vue'
import { bannerConfig } from '../config'

describe('FgBanner', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountWidget(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('banner', 'test_widget')!
    Object.assign(widget, overrides)
    store.addWidget(widget)
    return mount(FgBanner, {
      global: {
        plugins: [ElementPlus],
        provide: {
          [widgetDataKey as symbol]: computed(() => store.findWidget('test_widget')!),
          [widgetStyleKey as symbol]: computed(() => store.findWidget('test_widget')!.style ?? {}),
        },
      },
    })
  }

  // Store CRUD
  describe('store CRUD', () => {
    it('创建后 store 中存在', () => {
      const widget = createWidget('banner', 'test_banner')
      store.addWidget(widget!)
      expect(store.findWidget('test_banner')).toBeDefined()
    })

    it('更新 text 后 store 中同步', () => {
      const widget = createWidget('banner', 'test_banner')!
      store.addWidget(widget)
      store.updateWidget('test_banner', { props: { ...widget.props, text: '新通知' } })
      expect(store.findWidget('test_banner')!.props!.text).toBe('新通知')
    })

    it('删除后 store 中不存在', () => {
      const widget = createWidget('banner', 'test_banner')!
      store.addWidget(widget)
      store.removeWidget('test_banner')
      expect(store.findWidget('test_banner')).toBeNull()
    })
  })

  // Text prop
  describe('text 属性', () => {
    it('默认显示提示信息', () => {
      const wrapper = mountWidget()
      expect(wrapper.find('.el-alert__title').text()).toBe('提示信息')
    })

    it('自定义文本', () => {
      const wrapper = mountWidget({ props: { text: '自定义通知' } })
      expect(wrapper.find('.el-alert__title').text()).toBe('自定义通知')
    })
  })

  // Type prop
  describe('type 属性', () => {
    it('默认类型为 info', () => {
      const wrapper = mountWidget()
      expect(wrapper.find('.el-alert').classes()).toContain('el-alert--info')
    })

    it('type=success', () => {
      const wrapper = mountWidget({ props: { type: 'success' } })
      expect(wrapper.find('.el-alert').classes()).toContain('el-alert--success')
    })

    it('type=warning', () => {
      const wrapper = mountWidget({ props: { type: 'warning' } })
      expect(wrapper.find('.el-alert').classes()).toContain('el-alert--warning')
    })

    it('type=error', () => {
      const wrapper = mountWidget({ props: { type: 'error' } })
      expect(wrapper.find('.el-alert').classes()).toContain('el-alert--error')
    })
  })

  // Closable prop — store level
  describe('closable 属性', () => {
    it('默认 closable=true', () => {
      const widget = createWidget('banner', 'test_widget')!
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.closable).toBe(true)
    })

    it('可设置 closable=false', () => {
      const widget = createWidget('banner', 'test_widget')!
      widget.props = { ...widget.props, closable: false }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.closable).toBe(false)
    })
  })

  // Config panels
  describe('配置面板声明', () => {
    it('configPanels 包含 events', () => {
      expect(bannerConfig.configPanels).toContain('events')
    })
  })
})
