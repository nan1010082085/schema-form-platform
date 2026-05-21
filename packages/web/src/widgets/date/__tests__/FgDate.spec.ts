import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'

describe('FgDate', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
  })

  it('创建后 store 中存在', () => {
    const store = useWidgetStore()
    const widget = createWidget('date', 'test_date')
    store.addWidget(widget!)
    expect(store.findWidget('test_date')).toBeDefined()
  })

  it('支持 format/type 配置', () => {
    const store = useWidgetStore()
    const widget = createWidget('date', 'test_date')!
    widget.props = { ...widget.props, type: 'datetime', format: 'yyyy-MM-dd HH:mm:ss' }
    store.addWidget(widget)
    expect(store.findWidget('test_date')!.props!.type).toBe('datetime')
    expect(store.findWidget('test_date')!.props!.format).toBe('yyyy-MM-dd HH:mm:ss')
  })

  it('支持 api 数据源', () => {
    const store = useWidgetStore()
    const widget = createWidget('date', 'test_date')!
    widget.api = { url: '/api/date-config', method: 'get' }
    store.addWidget(widget)
    expect(store.findWidget('test_date')!.api).toBeDefined()
  })
})
