import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'

describe('FgTransfer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
  })

  it('创建后 store 中存在', () => {
    const store = useWidgetStore()
    const widget = createWidget('transfer', 'test_transfer')
    store.addWidget(widget!)
    expect(store.findWidget('test_transfer')).toBeDefined()
  })

  it('支持 titles/filterable 配置', () => {
    const store = useWidgetStore()
    const widget = createWidget('transfer', 'test_transfer')!
    widget.props = { ...widget.props, titles: ['可选', '已选'], filterable: false }
    store.addWidget(widget)
    expect(store.findWidget('test_transfer')!.props!.titles).toEqual(['可选', '已选'])
    expect(store.findWidget('test_transfer')!.props!.filterable).toBe(false)
  })

  it('支持 api 数据源', () => {
    const store = useWidgetStore()
    const widget = createWidget('transfer', 'test_transfer')!
    widget.api = { url: '/api/transfer-data', method: 'get' }
    store.addWidget(widget)
    expect(store.findWidget('test_transfer')!.api).toBeDefined()
  })
})
