import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import TDesign from 'tdesign-vue-next'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'
import { widgetDataKey, widgetStyleKey } from '../../base/types'
import FgSpacer from '../FgSpacer.vue'
import { spacerConfig } from '../config'

describe('FgSpacer', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountWidget(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('spacer', 'test_widget')!
    Object.assign(widget, overrides)
    store.addWidget(widget)
    return mount(FgSpacer, {
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
      const widget = createWidget('spacer', 'test_spacer')
      store.addWidget(widget!)
      expect(store.findWidget('test_spacer')).toBeDefined()
    })

    it('更新 height 后 store 中同步', () => {
      const widget = createWidget('spacer', 'test_spacer')!
      store.addWidget(widget)
      store.updateWidget('test_spacer', { props: { height: 50 } })
      expect(store.findWidget('test_spacer')!.props!.height).toBe(50)
    })

    it('删除后 store 中不存在', () => {
      const widget = createWidget('spacer', 'test_spacer')!
      store.addWidget(widget)
      store.removeWidget('test_spacer')
      expect(store.findWidget('test_spacer')).toBeNull()
    })
  })

  // Height prop
  describe('height 属性', () => {
    it('渲染空 div 作为间距', () => {
      const wrapper = mountWidget()
      expect(wrapper.find('div').exists()).toBe(true)
    })

    it('默认 props.height 为 20', () => {
      const widget = createWidget('spacer', 'test_widget')!
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.height).toBe(20)
    })

    it('可自定义 height', () => {
      const widget = createWidget('spacer', 'test_widget')!
      widget.props = { ...widget.props, height: 50 }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.height).toBe(50)
    })
  })

  // Config panels
  describe('配置面板声明', () => {
    it('configPanels 包含 events', () => {
      expect(spacerConfig.configPanels).toContain('events')
    })
  })
})
