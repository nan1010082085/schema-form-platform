import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import ElementPlus from 'element-plus'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'
import { computeWidgetRenderState } from '@/engine/ruleEngine'
import { widgetDataKey, widgetStyleKey } from '../../base/types'
import FgInput from '../FgInput.vue'

describe('FgInput', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountInput(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('input', 'test_input')!
    Object.assign(widget, overrides)
    store.addWidget(widget)

    return mount(FgInput, {
      global: {
        plugins: [ElementPlus],
        provide: {
          [widgetDataKey as symbol]: computed(() => store.findWidget('test_input')!),
          [widgetStyleKey as symbol]: computed(() => store.findWidget('test_input')!.style ?? {}),
        },
      },
    })
  }

  // Dimension 1: Drag & Drop
  describe('拖放', () => {
    it('创建后 store 中存在', () => {
      const widget = createWidget('input', 'test_input')
      store.addWidget(widget!)
      expect(store.findWidget('test_input')).toBeDefined()
    })

    it('拖入 card 容器', () => {
      const widget = createWidget('input', 'test_input')
      const card = createWidget('card', 'test_card')
      store.addWidget(card!)
      store.addWidget(widget!)
      store.addToContainer('test_input', 'test_card')
      expect(store.findWidget('test_card')!.children).toHaveLength(1)
    })

    it('从容器拖出', () => {
      const widget = createWidget('input', 'test_input')
      const card = createWidget('card', 'test_card')
      store.addWidget(card!)
      store.addWidget(widget!)
      store.addToContainer('test_input', 'test_card')
      store.removeFromContainer('test_input')
      expect(store.isRootWidget('test_input')).toBe(true)
    })
  })

  // Dimension 2: Properties
  describe('属性', () => {
    it('placeholder 生效', () => {
      const wrapper = mountInput({ props: { placeholder: '请输入姓名' } })
      expect(wrapper.find('input').attributes('placeholder')).toBe('请输入姓名')
    })

    it('disabled 生效', () => {
      const wrapper = mountInput({ props: { disabled: true } })
      expect(wrapper.find('input').attributes('disabled')).toBeDefined()
    })
  })

  // Dimension 3: Events
  describe('事件', () => {
    it('支持 change 事件配置', () => {
      const widget = createWidget('input', 'test_input')!
      widget.events = [{ trigger: 'change', actions: [{ type: 'show', target: 'w2' }] }]
      store.addWidget(widget)
      expect(store.findWidget('test_input')!.events).toHaveLength(1)
    })

    it('支持 blur/focus 事件配置', () => {
      const widget = createWidget('input', 'test_input')!
      widget.events = [
        { trigger: 'blur', actions: [{ type: 'hide', target: 'w2' }] },
        { trigger: 'focus', actions: [{ type: 'show', target: 'w3' }] },
      ]
      store.addWidget(widget)
      expect(store.findWidget('test_input')!.events).toHaveLength(2)
    })
  })

  // Dimension 4: Rules/Linkage
  describe('规则', () => {
    it('visible=false 隐藏', () => {
      const widget = createWidget('input', 'test_input')!
      widget.rules = [{
        watches: [{ type: 'field', source: 'status' }],
        condition: 'status === "hide"',
        actions: [{ type: 'hide', config: {} }],
      }]
      store.addWidget(widget)
      const state = computeWidgetRenderState(widget, { status: 'hide' })
      expect(state.visible).toBe(false)
    })

    it('disabled=true 禁用', () => {
      const widget = createWidget('input', 'test_input')!
      widget.rules = [{
        watches: [{ type: 'field', source: 'lock' }],
        condition: 'lock === true',
        actions: [{ type: 'disabled', config: {} }],
      }]
      store.addWidget(widget)
      const state = computeWidgetRenderState(widget, { lock: true })
      expect(state.disabled).toBe(true)
    })
  })

  // Dimension 5: Datasource
  describe('数据源', () => {
    it('支持 api 配置', () => {
      const widget = createWidget('input', 'test_input')!
      widget.api = { url: '/api/users', method: 'get' }
      store.addWidget(widget)
      expect(store.findWidget('test_input')!.api!.url).toBe('/api/users')
    })
  })
})
