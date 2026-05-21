import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'

describe('FgButtonList', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
  })

  it('创建后 store 中存在', () => {
    const store = useWidgetStore()
    const widget = createWidget('button-list', 'test_button_list')
    store.addWidget(widget!)
    expect(store.findWidget('test_button_list')).toBeDefined()
  })

  it('支持 props 配置', () => {
    const store = useWidgetStore()
    const widget = createWidget('button-list', 'test_button_list')!
    widget.props = { ...widget.props, align: 'right', gap: 12 }
    store.addWidget(widget)
    expect(store.findWidget('test_button_list')!.props!.align).toBe('right')
  })

  it('支持 api 数据源', () => {
    const store = useWidgetStore()
    const widget = createWidget('button-list', 'test_button_list')!
    widget.api = { url: '/api/button-config', method: 'get' }
    store.addWidget(widget)
    expect(store.findWidget('test_button_list')!.api).toBeDefined()
  })
})
