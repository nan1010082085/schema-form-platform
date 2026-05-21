import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import ElementPlus from 'element-plus'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'
import { widgetDataKey, widgetStyleKey } from '../../base/types'
import FgButtonList from '../FgButtonList.vue'
import { buttonListConfig } from '../config'

describe('FgButtonList', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountWidget(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('button-list', 'test_widget')!
    Object.assign(widget, overrides)
    store.addWidget(widget)
    return mount(FgButtonList, {
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
      const widget = createWidget('button-list', 'test_bl')
      store.addWidget(widget!)
      expect(store.findWidget('test_bl')).toBeDefined()
    })

    it('更新 buttons 后 store 中同步', () => {
      const widget = createWidget('button-list', 'test_bl')!
      store.addWidget(widget)
      const newButtons = [{ text: '新增', type: 'primary' }, { text: '删除', type: 'danger' }]
      store.updateWidget('test_bl', { props: { ...widget.props, buttons: newButtons } })
      expect(store.findWidget('test_bl')!.props!.buttons).toEqual(newButtons)
    })

    it('删除后 store 中不存在', () => {
      const widget = createWidget('button-list', 'test_bl')!
      store.addWidget(widget)
      store.removeWidget('test_bl')
      expect(store.findWidget('test_bl')).toBeNull()
    })
  })

  // Buttons array config
  describe('buttons 数组配置', () => {
    it('默认渲染两个按钮', () => {
      const wrapper = mountWidget()
      const buttons = wrapper.findAll('.el-button')
      expect(buttons.length).toBe(2)
    })

    it('显示默认按钮文本', () => {
      const wrapper = mountWidget()
      expect(wrapper.findAll('.el-button')[0].text()).toBe('按钮一')
      expect(wrapper.findAll('.el-button')[1].text()).toBe('按钮二')
    })

    it('自定义按钮列表渲染', () => {
      const customButtons = [
        { text: '查询', type: 'primary' },
        { text: '重置', type: '' },
        { text: '导出', type: 'success' },
      ]
      const widget = createWidget('button-list', 'test_widget')!
      widget.props = { ...widget.props, buttons: customButtons }
      store.addWidget(widget)
      const wrapper = mount(FgButtonList, {
        global: {
          plugins: [ElementPlus],
          provide: {
            [widgetDataKey as symbol]: computed(() => store.findWidget('test_widget')!),
            [widgetStyleKey as symbol]: computed(() => store.findWidget('test_widget')!.style ?? {}),
          },
        },
      })
      const buttons = wrapper.findAll('.el-button')
      expect(buttons.length).toBe(3)
      expect(buttons[0].text()).toBe('查询')
      expect(buttons[1].text()).toBe('重置')
      expect(buttons[2].text()).toBe('导出')
    })

    it('空按钮列表不报错', () => {
      const widget = createWidget('button-list', 'test_widget')!
      widget.props = { ...widget.props, buttons: [] }
      store.addWidget(widget)
      const wrapper = mount(FgButtonList, {
        global: {
          plugins: [ElementPlus],
          provide: {
            [widgetDataKey as symbol]: computed(() => store.findWidget('test_widget')!),
            [widgetStyleKey as symbol]: computed(() => store.findWidget('test_widget')!.style ?? {}),
          },
        },
      })
      expect(wrapper.findAll('.el-button').length).toBe(0)
    })

    it('按钮类型正确传递', () => {
      const customButtons = [
        { text: '主要', type: 'primary' },
        { text: '危险', type: 'danger' },
      ]
      const widget = createWidget('button-list', 'test_widget')!
      widget.props = { ...widget.props, buttons: customButtons }
      store.addWidget(widget)
      const wrapper = mount(FgButtonList, {
        global: {
          plugins: [ElementPlus],
          provide: {
            [widgetDataKey as symbol]: computed(() => store.findWidget('test_widget')!),
            [widgetStyleKey as symbol]: computed(() => store.findWidget('test_widget')!.style ?? {}),
          },
        },
      })
      const buttons = wrapper.findAll('.el-button')
      expect(buttons[0].classes()).toContain('el-button--primary')
      expect(buttons[1].classes()).toContain('el-button--danger')
    })
  })

  // Disabled prop
  describe('disabled 属性', () => {
    it('disabled=true 时所有按钮禁用', () => {
      const widget = createWidget('button-list', 'test_widget')!
      widget.props = { ...widget.props, disabled: true }
      store.addWidget(widget)
      const wrapper = mount(FgButtonList, {
        global: {
          plugins: [ElementPlus],
          provide: {
            [widgetDataKey as symbol]: computed(() => store.findWidget('test_widget')!),
            [widgetStyleKey as symbol]: computed(() => store.findWidget('test_widget')!.style ?? {}),
          },
        },
      })
      const buttons = wrapper.findAll('.el-button')
      buttons.forEach((btn) => {
        expect(btn.attributes('disabled')).toBeDefined()
      })
    })
  })

  // Events
  describe('事件', () => {
    it('支持 events 配置', () => {
      const widget = createWidget('button-list', 'test_widget')!
      widget.events = [{ trigger: 'click', actions: [{ type: 'submit', target: '' }] }]
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.events).toHaveLength(1)
    })
  })

  // Config panels
  describe('配置面板声明', () => {
    it('声明 events 面板', () => {
      expect(buttonListConfig.configPanels).toContain('events')
    })
  })
})
