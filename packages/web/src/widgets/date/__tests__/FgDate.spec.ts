import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'
import { computeWidgetRenderState } from '@/__tests__/widgetTestHarness'
describe('FgDate', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })
  // Store CRUD
  describe('Store CRUD', () => {
    it('创建后 store 中存在', () => {
      const widget = createWidget('date', 'test_widget')
      store.addWidget(widget!)
      expect(store.findWidget('test_widget')).toBeDefined()
    })

    it('可更新属性', () => {
      const widget = createWidget('date', 'test_widget')!
      store.addWidget(widget)
      store.updateWidget('test_widget', { props: { type: 'datetime', format: 'yyyy-MM-dd HH:mm:ss' } })
      expect(store.findWidget('test_widget')!.props!.type).toBe('datetime')
      expect(store.findWidget('test_widget')!.props!.format).toBe('yyyy-MM-dd HH:mm:ss')
    })

    it('可删除', () => {
      const widget = createWidget('date', 'test_widget')!
      store.addWidget(widget)
      store.removeWidget('test_widget')
      expect(store.findWidget('test_widget')).toBeNull()
    })
  })

  // Properties
  describe('属性', () => {
    it('placeholder 生效', () => {
      const widget = createWidget('date', 'test_widget')!
      widget.props = { ...widget.props, placeholder: '选择日期' }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.placeholder).toBe('选择日期')
    })

    it('clearable 生效', () => {
      const widget = createWidget('date', 'test_widget')!
      widget.props = { ...widget.props, clearable: false }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.clearable).toBe(false)
    })

    it('disabled 生效', () => {
      const widget = createWidget('date', 'test_widget')!
      widget.props = { ...widget.props, disabled: true }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.disabled).toBe(true)
    })

    it('type 生效', () => {
      const widget = createWidget('date', 'test_widget')!
      widget.props = { ...widget.props, type: 'datetime' }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.type).toBe('datetime')
    })

    it('format 生效', () => {
      const widget = createWidget('date', 'test_widget')!
      widget.props = { ...widget.props, format: 'yyyy/MM/dd' }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.format).toBe('yyyy/MM/dd')
    })
  })

  // Events
  describe('事件', () => {
    it('支持 change 事件配置', () => {
      const widget = createWidget('date', 'test_widget')!
      widget.events = [{ trigger: 'change', actions: [{ type: 'show', target: 'w2' }] }]
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.events).toHaveLength(1)
    })
  })

  // Rules/Linkage
  describe('规则联动', () => {
    it('visible=false 隐藏', () => {
      const widget = createWidget('date', 'test_widget')!
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
      const widget = createWidget('date', 'test_widget')!
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
})
