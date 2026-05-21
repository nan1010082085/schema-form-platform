import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'

describe('FgRadio', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
  })

  it('创建后 store 中存在', () => {
    const store = useWidgetStore()
    const widget = createWidget('radio', 'test_radio')
    store.addWidget(widget!)
    expect(store.findWidget('test_radio')).toBeDefined()
  })

  it('支持 options 配置', () => {
    const store = useWidgetStore()
    const widget = createWidget('radio', 'test_radio')!
    widget.options = [{ label: '选项A', value: 'a' }, { label: '选项B', value: 'b' }]
    store.addWidget(widget)
    expect(store.findWidget('test_radio')!.options).toHaveLength(2)
  })

  it('支持 api 数据源', () => {
    const store = useWidgetStore()
    const widget = createWidget('radio', 'test_radio')!
    widget.api = { url: '/api/radio-options', method: 'get' }
    store.addWidget(widget)
    expect(store.findWidget('test_radio')!.api).toBeDefined()
  })
})
