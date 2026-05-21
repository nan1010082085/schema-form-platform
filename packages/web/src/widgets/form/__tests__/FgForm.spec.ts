import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'

describe('FgForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
  })

  it('创建后 store 中存在', () => {
    const store = useWidgetStore()
    const widget = createWidget('form', 'test_form')
    store.addWidget(widget!)
    expect(store.findWidget('test_form')).toBeDefined()
  })

  it('可容纳子组件', () => {
    const store = useWidgetStore()
    const form = createWidget('form', 'test_form')
    const input = createWidget('input', 'child_1')
    store.addWidget(form!)
    store.addWidget(input!)
    store.addToContainer('child_1', 'test_form')
    expect(store.findWidget('test_form')!.children).toHaveLength(1)
  })

  it('移除子组件', () => {
    const store = useWidgetStore()
    const form = createWidget('form', 'test_form')
    const input = createWidget('input', 'child_1')
    store.addWidget(form!)
    store.addWidget(input!)
    store.addToContainer('child_1', 'test_form')
    store.removeFromContainer('child_1')
    expect(store.isRootWidget('child_1')).toBe(true)
  })
})
