import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'

describe('FgFileList', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
  })

  it('创建后 store 中存在', () => {
    const store = useWidgetStore()
    const widget = createWidget('file-list', 'test_file_list')
    store.addWidget(widget!)
    expect(store.findWidget('test_file_list')).toBeDefined()
  })

  it('支持 props 配置', () => {
    const store = useWidgetStore()
    const widget = createWidget('file-list', 'test_file_list')!
    widget.props = { ...widget.props, showUpload: true, maxCount: 5 }
    store.addWidget(widget)
    expect(store.findWidget('test_file_list')!.props!.showUpload).toBe(true)
  })

  it('支持 api 数据源', () => {
    const store = useWidgetStore()
    const widget = createWidget('file-list', 'test_file_list')!
    widget.api = { url: '/api/file-list', method: 'get' }
    store.addWidget(widget)
    expect(store.findWidget('test_file_list')!.api).toBeDefined()
  })
})
