import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'

describe('FgPersonSelect', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
  })

  it('创建后 store 中存在', () => {
    const store = useWidgetStore()
    const widget = createWidget('person-select', 'test_person_select')
    store.addWidget(widget!)
    expect(store.findWidget('test_person_select')).toBeDefined()
  })

  it('支持 props 配置', () => {
    const store = useWidgetStore()
    const widget = createWidget('person-select', 'test_person_select')!
    widget.props = { ...widget.props, multiple: true, placeholder: '请选择人员' }
    store.addWidget(widget)
    expect(store.findWidget('test_person_select')!.props!.multiple).toBe(true)
  })

  it('支持 api 数据源', () => {
    const store = useWidgetStore()
    const widget = createWidget('person-select', 'test_person_select')!
    widget.api = { url: '/api/persons', method: 'get' }
    store.addWidget(widget)
    expect(store.findWidget('test_person_select')!.api).toBeDefined()
  })
})
