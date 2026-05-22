import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'
import { computeWidgetRenderState } from '@/__tests__/widgetTestHarness'
describe('FgDateTimeSlot', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })
  // Store CRUD
  describe('Store CRUD', () => {
    it('创建后 store 中存在', () => {
      const widget = createWidget('date-time-slot', 'test_widget')
      store.addWidget(widget!)
      expect(store.findWidget('test_widget')).toBeDefined()
    })

    it('可更新属性', () => {
      const widget = createWidget('date-time-slot', 'test_widget')!
      store.addWidget(widget)
      store.updateWidget('test_widget', { props: { startPlaceholder: '开始', endPlaceholder: '结束' } })
      expect(store.findWidget('test_widget')!.props!.startPlaceholder).toBe('开始')
      expect(store.findWidget('test_widget')!.props!.endPlaceholder).toBe('结束')
    })

    it('可删除', () => {
      const widget = createWidget('date-time-slot', 'test_widget')!
      store.addWidget(widget)
      store.removeWidget('test_widget')
      expect(store.findWidget('test_widget')).toBeNull()
    })
  })

  // Properties
  describe('属性', () => {
    it('startPlaceholder 生效', () => {
      const widget = createWidget('date-time-slot', 'test_widget')!
      widget.props = { ...widget.props, startPlaceholder: '开始时间' }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.startPlaceholder).toBe('开始时间')
    })

    it('endPlaceholder 生效', () => {
      const widget = createWidget('date-time-slot', 'test_widget')!
      widget.props = { ...widget.props, endPlaceholder: '结束时间' }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.endPlaceholder).toBe('结束时间')
    })

    it('format 生效', () => {
      const widget = createWidget('date-time-slot', 'test_widget')!
      widget.props = { ...widget.props, format: 'YYYY/MM/DD HH:mm' }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.format).toBe('YYYY/MM/DD HH:mm')
    })

    it('rangeSeparator 生效', () => {
      const widget = createWidget('date-time-slot', 'test_widget')!
      widget.props = { ...widget.props, rangeSeparator: '-' }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.rangeSeparator).toBe('-')
    })
  })

  // Events
  describe('事件', () => {
    it('支持 change 事件配置', () => {
      const widget = createWidget('date-time-slot', 'test_widget')!
      widget.events = [{ trigger: 'change', actions: [{ type: 'show', target: 'w2' }] }]
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.events).toHaveLength(1)
    })
  })

  // Rules/Linkage
  describe('规则联动', () => {
    it('visible=false 隐藏', () => {
      const widget = createWidget('date-time-slot', 'test_widget')!
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
      const widget = createWidget('date-time-slot', 'test_widget')!
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
