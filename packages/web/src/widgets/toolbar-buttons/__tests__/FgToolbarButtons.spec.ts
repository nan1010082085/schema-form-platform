import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'

describe('FgToolbarButtons', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
  })

  it('创建后 store 中存在', () => {
    const store = useWidgetStore()
    const widget = createWidget('toolbar-buttons', 'test_toolbar_buttons')
    store.addWidget(widget!)
    expect(store.findWidget('test_toolbar_buttons')).toBeDefined()
  })

  it('支持 props 配置', () => {
    const store = useWidgetStore()
    const widget = createWidget('toolbar-buttons', 'test_toolbar_buttons')!
    widget.props = { ...widget.props, align: 'right' }
    store.addWidget(widget)
    expect(store.findWidget('test_toolbar_buttons')!.props!.align).toBe('right')
  })

  it('支持 api 数据源', () => {
    const store = useWidgetStore()
    const widget = createWidget('toolbar-buttons', 'test_toolbar_buttons')!
    widget.api = { url: '/api/toolbar-config', method: 'get' }
    store.addWidget(widget)
    expect(store.findWidget('test_toolbar_buttons')!.api).toBeDefined()
  })
})
