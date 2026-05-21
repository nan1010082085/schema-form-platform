import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'

describe('FgBanner', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
  })

  it('创建后 store 中存在', () => {
    const store = useWidgetStore()
    const widget = createWidget('banner', 'test_banner')
    store.addWidget(widget!)
    expect(store.findWidget('test_banner')).toBeDefined()
  })

  it('支持 props 配置', () => {
    const store = useWidgetStore()
    const widget = createWidget('banner', 'test_banner')!
    widget.props = { ...widget.props, title: '系统通知', type: 'warning' }
    store.addWidget(widget)
    expect(store.findWidget('test_banner')!.props!.title).toBe('系统通知')
  })

  it('支持 api 数据源', () => {
    const store = useWidgetStore()
    const widget = createWidget('banner', 'test_banner')!
    widget.api = { url: '/api/banner-config', method: 'get' }
    store.addWidget(widget)
    expect(store.findWidget('test_banner')!.api).toBeDefined()
  })
})
