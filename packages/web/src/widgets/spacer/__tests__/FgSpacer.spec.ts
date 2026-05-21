import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'

describe('FgSpacer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
  })

  it('创建后 store 中存在', () => {
    const store = useWidgetStore()
    const widget = createWidget('spacer', 'test_spacer')
    store.addWidget(widget!)
    expect(store.findWidget('test_spacer')).toBeDefined()
  })

  it('支持 props 配置', () => {
    const store = useWidgetStore()
    const widget = createWidget('spacer', 'test_spacer')!
    widget.props = { ...widget.props, height: 20 }
    store.addWidget(widget)
    expect(store.findWidget('test_spacer')!.props!.height).toBe(20)
  })

  it('支持 api 数据源', () => {
    const store = useWidgetStore()
    const widget = createWidget('spacer', 'test_spacer')!
    widget.api = { url: '/api/spacer-config', method: 'get' }
    store.addWidget(widget)
    expect(store.findWidget('test_spacer')!.api).toBeDefined()
  })
})
