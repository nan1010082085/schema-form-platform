import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'

describe('FgTreeLayout', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
  })

  it('创建后 store 中存在', () => {
    const store = useWidgetStore()
    const widget = createWidget('tree-layout', 'test_tree_layout')
    store.addWidget(widget!)
    expect(store.findWidget('test_tree_layout')).toBeDefined()
  })

  it('支持 props 配置', () => {
    const store = useWidgetStore()
    const widget = createWidget('tree-layout', 'test_tree_layout')!
    widget.props = { ...widget.props, showCheckbox: true, defaultExpandAll: true }
    store.addWidget(widget)
    expect(store.findWidget('test_tree_layout')!.props!.showCheckbox).toBe(true)
  })

  it('支持 api 数据源', () => {
    const store = useWidgetStore()
    const widget = createWidget('tree-layout', 'test_tree_layout')!
    widget.api = { url: '/api/tree-data', method: 'get' }
    store.addWidget(widget)
    expect(store.findWidget('test_tree_layout')!.api).toBeDefined()
  })
})
