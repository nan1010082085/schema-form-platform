import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'

describe('FgTable', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
  })

  it('创建后 store 中存在', () => {
    const store = useWidgetStore()
    const widget = createWidget('table', 'test_table')
    store.addWidget(widget!)
    expect(store.findWidget('test_table')).toBeDefined()
  })

  it('支持 columns 配置', () => {
    const store = useWidgetStore()
    const widget = createWidget('table', 'test_table')!
    widget.props = {
      ...widget.props,
      columns: [
        { prop: 'name', label: '姓名', width: 120 },
        { prop: 'age', label: '年龄', width: 80 },
      ],
    }
    store.addWidget(widget)
    expect(store.findWidget('test_table')!.props!.columns).toHaveLength(2)
  })

  it('支持 api 数据源', () => {
    const store = useWidgetStore()
    const widget = createWidget('table', 'test_table')!
    widget.api = { url: '/api/table-data', method: 'get' }
    store.addWidget(widget)
    expect(store.findWidget('test_table')!.api).toBeDefined()
  })
})
