import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'

describe('FgEditableTable', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
  })

  it('创建后 store 中存在', () => {
    const store = useWidgetStore()
    const widget = createWidget('editable-table', 'test_editable_table')
    store.addWidget(widget!)
    expect(store.findWidget('test_editable_table')).toBeDefined()
  })

  it('支持 props 配置', () => {
    const store = useWidgetStore()
    const widget = createWidget('editable-table', 'test_editable_table')!
    widget.props = { ...widget.props, maxRows: 10, addButtonText: '新增行' }
    store.addWidget(widget)
    expect(store.findWidget('test_editable_table')!.props!.maxRows).toBe(10)
  })

  it('支持 api 数据源', () => {
    const store = useWidgetStore()
    const widget = createWidget('editable-table', 'test_editable_table')!
    widget.api = { url: '/api/editable-table-data', method: 'get' }
    store.addWidget(widget)
    expect(store.findWidget('test_editable_table')!.api).toBeDefined()
  })
})
