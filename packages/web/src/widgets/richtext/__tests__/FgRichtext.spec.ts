import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'

describe('FgRichtext', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
  })

  it('创建后 store 中存在', () => {
    const store = useWidgetStore()
    const widget = createWidget('richtext', 'test_richtext')
    store.addWidget(widget!)
    expect(store.findWidget('test_richtext')).toBeDefined()
  })

  it('支持 placeholder/readonly 配置', () => {
    const store = useWidgetStore()
    const widget = createWidget('richtext', 'test_richtext')!
    widget.props = { ...widget.props, placeholder: '请输入内容', readonly: true }
    store.addWidget(widget)
    expect(store.findWidget('test_richtext')!.props!.placeholder).toBe('请输入内容')
    expect(store.findWidget('test_richtext')!.props!.readonly).toBe(true)
  })

  it('支持 api 数据源', () => {
    const store = useWidgetStore()
    const widget = createWidget('richtext', 'test_richtext')!
    widget.api = { url: '/api/richtext-data', method: 'get' }
    store.addWidget(widget)
    expect(store.findWidget('test_richtext')!.api).toBeDefined()
  })
})
