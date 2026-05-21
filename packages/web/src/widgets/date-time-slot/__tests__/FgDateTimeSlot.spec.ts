import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'

describe('FgDateTimeSlot', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
  })

  it('创建后 store 中存在', () => {
    const store = useWidgetStore()
    const widget = createWidget('date-time-slot', 'test_date_time_slot')
    store.addWidget(widget!)
    expect(store.findWidget('test_date_time_slot')).toBeDefined()
  })

  it('支持 props 配置', () => {
    const store = useWidgetStore()
    const widget = createWidget('date-time-slot', 'test_date_time_slot')!
    widget.props = { ...widget.props, startPlaceholder: '开始时间', endPlaceholder: '结束时间' }
    store.addWidget(widget)
    expect(store.findWidget('test_date_time_slot')!.props!.startPlaceholder).toBe('开始时间')
  })

  it('支持 api 数据源', () => {
    const store = useWidgetStore()
    const widget = createWidget('date-time-slot', 'test_date_time_slot')!
    widget.api = { url: '/api/time-slots', method: 'get' }
    store.addWidget(widget)
    expect(store.findWidget('test_date_time_slot')!.api).toBeDefined()
  })
})
