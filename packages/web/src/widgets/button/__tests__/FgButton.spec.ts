import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import ElementPlus from 'element-plus'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'
import { widgetDataKey, widgetStyleKey } from '../../base/types'
import FgButton from '../FgButton.vue'
import { buttonConfig } from '../config'

describe('FgButton', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountWidget(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('button', 'test_widget')!
    Object.assign(widget, overrides)
    store.addWidget(widget)
    return mount(FgButton, {
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
      const widget = createWidget('button', 'test_btn')
      store.addWidget(widget!)
      expect(store.findWidget('test_btn')).toBeDefined()
    })

    it('更新 props 后 store 中同步', () => {
      const widget = createWidget('button', 'test_btn')!
      store.addWidget(widget)
      store.updateWidget('test_btn', { props: { ...widget.props, text: '提交' } })
      expect(store.findWidget('test_btn')!.props!.text).toBe('提交')
    })

    it('删除后 store 中不存在', () => {
      const widget = createWidget('button', 'test_btn')!
      store.addWidget(widget)
      store.removeWidget('test_btn')
      expect(store.findWidget('test_btn')).toBeNull()
    })
  })

  // Button type prop
  describe('button type', () => {
    it('默认按钮类型为 primary', () => {
      const wrapper = mountWidget()
      expect(wrapper.find('.el-button').classes()).toContain('el-button--primary')
    })

    it('可设置为 success', () => {
      const wrapper = mountWidget({ props: { type: 'success', text: '确认' } })
      expect(wrapper.find('.el-button').classes()).toContain('el-button--success')
    })

    it('可设置为 warning', () => {
      const wrapper = mountWidget({ props: { type: 'warning', text: '警告' } })
      expect(wrapper.find('.el-button').classes()).toContain('el-button--warning')
    })

    it('可设置为 danger', () => {
      const wrapper = mountWidget({ props: { type: 'danger', text: '删除' } })
      expect(wrapper.find('.el-button').classes()).toContain('el-button--danger')
    })

    it('可设置为 info', () => {
      const wrapper = mountWidget({ props: { type: 'info', text: '信息' } })
      expect(wrapper.find('.el-button').classes()).toContain('el-button--info')
    })
  })

  // Button size prop
  describe('button size', () => {
    it('默认尺寸为 default', () => {
      const wrapper = mountWidget()
      expect(wrapper.find('.el-button').classes()).toContain('el-button--default')
    })

    it('可设置为 large', () => {
      const wrapper = mountWidget({ props: { size: 'large' } })
      expect(wrapper.find('.el-button').classes()).toContain('el-button--large')
    })

    it('可设置为 small', () => {
      const wrapper = mountWidget({ props: { size: 'small' } })
      expect(wrapper.find('.el-button').classes()).toContain('el-button--small')
    })
  })

  // Plain / Round / Circle props
  describe('样式属性', () => {
    it('plain 模式生效', () => {
      const wrapper = mountWidget({ props: { plain: true } })
      expect(wrapper.find('.el-button').classes()).toContain('is-plain')
    })

    it('round 模式生效', () => {
      const wrapper = mountWidget({ props: { round: true } })
      expect(wrapper.find('.el-button').classes()).toContain('is-round')
    })

    it('circle 模式生效', () => {
      const wrapper = mountWidget({ props: { circle: true } })
      expect(wrapper.find('.el-button').classes()).toContain('is-circle')
    })
  })

  // Button text
  describe('按钮文本', () => {
    it('默认显示 label', () => {
      const wrapper = mountWidget({ label: '提交' })
      expect(wrapper.find('.el-button').text()).toBe('提交')
    })

    it('label 为空时使用 props.text', () => {
      const wrapper = mountWidget({ label: undefined, props: { text: '确认' } })
      expect(wrapper.find('.el-button').text()).toBe('确认')
    })

    it('两者都无时显示默认文本', () => {
      const wrapper = mountWidget({ label: undefined, props: { text: undefined } })
      expect(wrapper.find('.el-button').text()).toBe('按钮')
    })
  })

  // Events
  describe('事件', () => {
    it('支持 click 事件配置', () => {
      const widget = createWidget('button', 'test_widget')!
      widget.events = [{ trigger: 'click', actions: [{ type: 'show', target: 'w2' }] }]
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.events).toHaveLength(1)
      expect(store.findWidget('test_widget')!.events![0].trigger).toBe('click')
    })

    it('支持多个 click action', () => {
      const widget = createWidget('button', 'test_widget')!
      widget.events = [{
        trigger: 'click',
        actions: [
          { type: 'show', target: 'w1' },
          { type: 'hide', target: 'w2' },
          { type: 'set-value', target: 'w3', value: 'done' },
        ],
      }]
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.events![0].actions).toHaveLength(3)
    })

    it('支持带 confirm 的 click 事件', () => {
      const widget = createWidget('button', 'test_widget')!
      widget.events = [{ trigger: 'click', confirm: '确认提交？', actions: [{ type: 'submit', target: '' }] }]
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.events![0].confirm).toBe('确认提交？')
    })
  })

  // Style
  describe('样式', () => {
    it('支持 backgroundColor 样式', () => {
      const widget = createWidget('button', 'test_widget')!
      widget.style = { backgroundColor: '#ff0000' }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.style!.backgroundColor).toBe('#ff0000')
    })
  })

  // Config panels
  describe('配置面板声明', () => {
    it('声明 events 面板', () => {
      expect(buttonConfig.configPanels).toContain('events')
    })

    it('无 rules 和 api 面板', () => {
      expect(buttonConfig.configPanels).not.toContain('rules')
      expect(buttonConfig.configPanels).not.toContain('api')
    })
  })
})
