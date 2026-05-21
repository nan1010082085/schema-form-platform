import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'

describe('FgDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
  })

  it('创建后 store 中存在', () => {
    const store = useWidgetStore()
    const widget = createWidget('dialog', 'test_dialog')
    store.addWidget(widget!)
    expect(store.findWidget('test_dialog')).toBeDefined()
  })

  it('可容纳子组件', () => {
    const store = useWidgetStore()
    const dialog = createWidget('dialog', 'test_dialog')
    const input = createWidget('input', 'child_1')
    store.addWidget(dialog!)
    store.addWidget(input!)
    store.addToContainer('child_1', 'test_dialog')
    expect(store.findWidget('test_dialog')!.children).toHaveLength(1)
  })

  it('移除子组件', () => {
    const store = useWidgetStore()
    const dialog = createWidget('dialog', 'test_dialog')
    const input = createWidget('input', 'child_1')
    store.addWidget(dialog!)
    store.addWidget(input!)
    store.addToContainer('child_1', 'test_dialog')
    store.removeFromContainer('child_1')
    expect(store.isRootWidget('child_1')).toBe(true)
  })
})
