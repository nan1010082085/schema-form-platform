import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'

describe('FgCheckbox', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
  })

  it('创建后 store 中存在', () => {
    const store = useWidgetStore()
    const widget = createWidget('checkbox', 'test_checkbox')
    store.addWidget(widget!)
    expect(store.findWidget('test_checkbox')).toBeDefined()
  })

  it('支持 options 配置', () => {
    const store = useWidgetStore()
    const widget = createWidget('checkbox', 'test_checkbox')!
    widget.options = [{ label: '选项A', value: 'a' }, { label: '选项B', value: 'b' }]
    store.addWidget(widget)
    expect(store.findWidget('test_checkbox')!.options).toHaveLength(2)
  })

  it('支持 api 数据源', () => {
    const store = useWidgetStore()
    const widget = createWidget('checkbox', 'test_checkbox')!
    widget.api = { url: '/api/checkbox-options', method: 'get' }
    store.addWidget(widget)
    expect(store.findWidget('test_checkbox')!.api).toBeDefined()
  })
})
