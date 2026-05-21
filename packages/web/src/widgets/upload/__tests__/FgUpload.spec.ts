import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'

describe('FgUpload', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
  })

  it('创建后 store 中存在', () => {
    const store = useWidgetStore()
    const widget = createWidget('upload', 'test_upload')
    store.addWidget(widget!)
    expect(store.findWidget('test_upload')).toBeDefined()
  })

  it('支持 accept/multiple/limit 配置', () => {
    const store = useWidgetStore()
    const widget = createWidget('upload', 'test_upload')!
    widget.props = { ...widget.props, accept: '.jpg,.png', multiple: true, limit: 10 }
    store.addWidget(widget)
    expect(store.findWidget('test_upload')!.props!.accept).toBe('.jpg,.png')
    expect(store.findWidget('test_upload')!.props!.multiple).toBe(true)
    expect(store.findWidget('test_upload')!.props!.limit).toBe(10)
  })

  it('支持 api 数据源', () => {
    const store = useWidgetStore()
    const widget = createWidget('upload', 'test_upload')!
    widget.api = { url: '/api/upload', method: 'post' }
    store.addWidget(widget)
    expect(store.findWidget('test_upload')!.api).toBeDefined()
  })
})
