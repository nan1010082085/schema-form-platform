import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import ElementPlus from 'element-plus'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'
import { widgetDataKey, widgetStyleKey } from '../../base/types'
import FgDivider from '../FgDivider.vue'
import { dividerConfig } from '../config'

describe('FgDivider', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountWidget(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('divider', 'test_widget')!
    Object.assign(widget, overrides)
    store.addWidget(widget)
    return mount(FgDivider, {
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
      const widget = createWidget('divider', 'test_div')
      store.addWidget(widget!)
      expect(store.findWidget('test_div')).toBeDefined()
    })

    it('更新 direction 后 store 中同步', () => {
      const widget = createWidget('divider', 'test_div')!
      store.addWidget(widget)
      store.updateWidget('test_div', { props: { ...widget.props, direction: 'vertical' } })
      expect(store.findWidget('test_div')!.props!.direction).toBe('vertical')
    })

    it('删除后 store 中不存在', () => {
      const widget = createWidget('divider', 'test_div')!
      store.addWidget(widget)
      store.removeWidget('test_div')
      expect(store.findWidget('test_div')).toBeNull()
    })
  })

  // Direction prop — store level (template uses widgetData.props directly)
  describe('direction 属性', () => {
    it('默认 direction=horizontal', () => {
      const widget = createWidget('divider', 'test_widget')!
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.direction).toBe('horizontal')
    })

    it('可设置 direction=vertical', () => {
      const widget = createWidget('divider', 'test_widget')!
      widget.props = { ...widget.props, direction: 'vertical' }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.direction).toBe('vertical')
    })
  })

  // Content position — store level
  describe('contentPosition 属性', () => {
    it('默认 contentPosition=center', () => {
      const widget = createWidget('divider', 'test_widget')!
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.contentPosition).toBe('center')
    })

    it('可设置 contentPosition=left', () => {
      const widget = createWidget('divider', 'test_widget')!
      widget.props = { ...widget.props, contentPosition: 'left' }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.contentPosition).toBe('left')
    })

    it('可设置 contentPosition=right', () => {
      const widget = createWidget('divider', 'test_widget')!
      widget.props = { ...widget.props, contentPosition: 'right' }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.contentPosition).toBe('right')
    })
  })

  // Content prop
  describe('content 属性', () => {
    it('无 content 时分割线无文字', () => {
      const wrapper = mountWidget()
      expect(wrapper.find('.el-divider__text').text()).toBe('')
    })

    it('有 content 时显示文字', () => {
      const widget = createWidget('divider', 'test_widget')!
      widget.props = { ...widget.props, content: '分隔标题' }
      store.addWidget(widget)
      const wrapper = mount(FgDivider, {
        global: {
          plugins: [ElementPlus],
          provide: {
            [widgetDataKey as symbol]: computed(() => store.findWidget('test_widget')!),
            [widgetStyleKey as symbol]: computed(() => store.findWidget('test_widget')!.style ?? {}),
          },
        },
      })
      expect(wrapper.find('.el-divider__text').text()).toBe('分隔标题')
    })
  })

  // Config panels
  describe('配置面板声明', () => {
    it('无 events/rules/api 面板', () => {
      expect(dividerConfig.configPanels).toBeUndefined()
    })
  })
})
