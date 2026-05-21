import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'

describe('FgButton', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
  })

  it('创建后 store 中存在', () => {
    const store = useWidgetStore()
    const widget = createWidget('button', 'test_button')
    store.addWidget(widget!)
    expect(store.findWidget('test_button')).toBeDefined()
  })

  it('支持 props 配置', () => {
    const store = useWidgetStore()
    const widget = createWidget('button', 'test_button')!
    widget.props = { ...widget.props, type: 'primary', text: '提交' }
    store.addWidget(widget)
    expect(store.findWidget('test_button')!.props!.type).toBe('primary')
  })

  it('支持 api 数据源', () => {
    const store = useWidgetStore()
    const widget = createWidget('button', 'test_button')!
    widget.api = { url: '/api/button-action', method: 'post' }
    store.addWidget(widget)
    expect(store.findWidget('test_button')!.api).toBeDefined()
  })
})
