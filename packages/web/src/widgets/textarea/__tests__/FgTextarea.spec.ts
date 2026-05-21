import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'

describe('FgTextarea', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
  })

  it('创建后 store 中存在', () => {
    const store = useWidgetStore()
    const widget = createWidget('textarea', 'test_textarea')
    store.addWidget(widget!)
    expect(store.findWidget('test_textarea')).toBeDefined()
  })

  it('支持 rows/placeholder 配置', () => {
    const store = useWidgetStore()
    const widget = createWidget('textarea', 'test_textarea')!
    widget.props = { ...widget.props, rows: 5, placeholder: '请输入描述' }
    store.addWidget(widget)
    expect(store.findWidget('test_textarea')!.props!.rows).toBe(5)
    expect(store.findWidget('test_textarea')!.props!.placeholder).toBe('请输入描述')
  })

  it('支持 api 数据源', () => {
    const store = useWidgetStore()
    const widget = createWidget('textarea', 'test_textarea')!
    widget.api = { url: '/api/textarea-data', method: 'get' }
    store.addWidget(widget)
    expect(store.findWidget('test_textarea')!.api).toBeDefined()
  })
})
