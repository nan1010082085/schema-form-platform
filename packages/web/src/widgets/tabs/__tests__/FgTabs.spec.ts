import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'

describe('FgTabs', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
  })

  it('创建后 store 中存在', () => {
    const store = useWidgetStore()
    const widget = createWidget('tabs', 'test_tabs')
    store.addWidget(widget!)
    expect(store.findWidget('test_tabs')).toBeDefined()
  })

  it('可容纳子组件', () => {
    const store = useWidgetStore()
    const tabs = createWidget('tabs', 'test_tabs')
    const input = createWidget('input', 'child_1')
    store.addWidget(tabs!)
    store.addWidget(input!)
    store.addToContainer('child_1', 'test_tabs')
    expect(store.findWidget('test_tabs')!.children).toHaveLength(1)
  })

  it('移除子组件', () => {
    const store = useWidgetStore()
    const tabs = createWidget('tabs', 'test_tabs')
    const input = createWidget('input', 'child_1')
    store.addWidget(tabs!)
    store.addWidget(input!)
    store.addToContainer('child_1', 'test_tabs')
    store.removeFromContainer('child_1')
    expect(store.isRootWidget('child_1')).toBe(true)
  })
})
