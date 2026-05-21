import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'

describe('FgSearchList', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
  })

  it('创建后 store 中存在', () => {
    const store = useWidgetStore()
    const widget = createWidget('search-list', 'test_search_list')
    store.addWidget(widget!)
    expect(store.findWidget('test_search_list')).toBeDefined()
  })

  it('支持 props 配置', () => {
    const store = useWidgetStore()
    const widget = createWidget('search-list', 'test_search_list')!
    widget.props = { ...widget.props, stripe: true, border: true }
    store.addWidget(widget)
    expect(store.findWidget('test_search_list')!.props!.stripe).toBe(true)
  })

  it('支持 api 数据源', () => {
    const store = useWidgetStore()
    const widget = createWidget('search-list', 'test_search_list')!
    widget.api = { url: '/api/search-list-data', method: 'get' }
    store.addWidget(widget)
    expect(store.findWidget('test_search_list')!.api).toBeDefined()
  })
})
