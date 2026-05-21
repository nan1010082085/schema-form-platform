import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'

describe('FgSelect', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
  })

  it('创建后 store 中存在', () => {
    const store = useWidgetStore()
    const widget = createWidget('select', 'test_select')
    store.addWidget(widget!)
    expect(store.findWidget('test_select')).toBeDefined()
  })

  it('支持 options 配置', () => {
    const store = useWidgetStore()
    const widget = createWidget('select', 'test_select')!
    widget.options = [{ label: 'A', value: 'a' }]
    store.addWidget(widget)
    expect(store.findWidget('test_select')!.options).toHaveLength(1)
  })

  it('支持 api 数据源', () => {
    const store = useWidgetStore()
    const widget = createWidget('select', 'test_select')!
    widget.api = { url: '/api/options', method: 'get' }
    store.addWidget(widget)
    expect(store.findWidget('test_select')!.api).toBeDefined()
  })
})
