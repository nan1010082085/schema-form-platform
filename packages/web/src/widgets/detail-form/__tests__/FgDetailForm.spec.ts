import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'

describe('FgDetailForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
  })

  it('创建后 store 中存在', () => {
    const store = useWidgetStore()
    const widget = createWidget('detail-form', 'test_detail_form')
    store.addWidget(widget!)
    expect(store.findWidget('test_detail_form')).toBeDefined()
  })

  it('支持 props 配置', () => {
    const store = useWidgetStore()
    const widget = createWidget('detail-form', 'test_detail_form')!
    widget.props = { ...widget.props, labelWidth: '120px', border: true }
    store.addWidget(widget)
    expect(store.findWidget('test_detail_form')!.props!.labelWidth).toBe('120px')
  })

  it('支持 api 数据源', () => {
    const store = useWidgetStore()
    const widget = createWidget('detail-form', 'test_detail_form')!
    widget.api = { url: '/api/detail-data', method: 'get' }
    store.addWidget(widget)
    expect(store.findWidget('test_detail_form')!.api).toBeDefined()
  })
})
