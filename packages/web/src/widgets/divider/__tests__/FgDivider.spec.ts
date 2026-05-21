import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'

describe('FgDivider', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
  })

  it('创建后 store 中存在', () => {
    const store = useWidgetStore()
    const widget = createWidget('divider', 'test_divider')
    store.addWidget(widget!)
    expect(store.findWidget('test_divider')).toBeDefined()
  })

  it('支持 props 配置', () => {
    const store = useWidgetStore()
    const widget = createWidget('divider', 'test_divider')!
    widget.props = { ...widget.props, direction: 'horizontal', contentPosition: 'left' }
    store.addWidget(widget)
    expect(store.findWidget('test_divider')!.props!.direction).toBe('horizontal')
  })

  it('支持 api 数据源', () => {
    const store = useWidgetStore()
    const widget = createWidget('divider', 'test_divider')!
    widget.api = { url: '/api/divider-config', method: 'get' }
    store.addWidget(widget)
    expect(store.findWidget('test_divider')!.api).toBeDefined()
  })
})
