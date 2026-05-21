import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'

describe('FgTitle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
  })

  it('创建后 store 中存在', () => {
    const store = useWidgetStore()
    const widget = createWidget('title', 'test_title')
    store.addWidget(widget!)
    expect(store.findWidget('test_title')).toBeDefined()
  })

  it('支持 props 配置', () => {
    const store = useWidgetStore()
    const widget = createWidget('title', 'test_title')!
    widget.props = { ...widget.props, level: 2, text: '标题文本' }
    store.addWidget(widget)
    expect(store.findWidget('test_title')!.props!.level).toBe(2)
  })

  it('支持 api 数据源', () => {
    const store = useWidgetStore()
    const widget = createWidget('title', 'test_title')!
    widget.api = { url: '/api/title-config', method: 'get' }
    store.addWidget(widget)
    expect(store.findWidget('test_title')!.api).toBeDefined()
  })
})
