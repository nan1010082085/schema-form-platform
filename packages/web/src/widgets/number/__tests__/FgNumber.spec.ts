import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'

describe('FgNumber', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
  })

  it('创建后 store 中存在', () => {
    const store = useWidgetStore()
    const widget = createWidget('number', 'test_number')
    store.addWidget(widget!)
    expect(store.findWidget('test_number')).toBeDefined()
  })

  it('支持 min/max/step 配置', () => {
    const store = useWidgetStore()
    const widget = createWidget('number', 'test_number')!
    widget.props = { ...widget.props, min: 0, max: 100, step: 5 }
    store.addWidget(widget)
    expect(store.findWidget('test_number')!.props!.min).toBe(0)
    expect(store.findWidget('test_number')!.props!.max).toBe(100)
    expect(store.findWidget('test_number')!.props!.step).toBe(5)
  })

  it('支持 api 数据源', () => {
    const store = useWidgetStore()
    const widget = createWidget('number', 'test_number')!
    widget.api = { url: '/api/number-options', method: 'get' }
    store.addWidget(widget)
    expect(store.findWidget('test_number')!.api).toBeDefined()
  })
})
