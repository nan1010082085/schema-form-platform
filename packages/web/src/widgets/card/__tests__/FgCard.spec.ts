import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'

describe('FgCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
  })

  it('创建后 store 中存在', () => {
    const store = useWidgetStore()
    const widget = createWidget('card', 'test_card')
    store.addWidget(widget!)
    expect(store.findWidget('test_card')).toBeDefined()
  })

  it('可容纳子组件', () => {
    const store = useWidgetStore()
    const card = createWidget('card', 'test_card')
    const input = createWidget('input', 'child_1')
    store.addWidget(card!)
    store.addWidget(input!)
    store.addToContainer('child_1', 'test_card')
    expect(store.findWidget('test_card')!.children).toHaveLength(1)
  })

  it('移除子组件', () => {
    const store = useWidgetStore()
    const card = createWidget('card', 'test_card')
    const input = createWidget('input', 'child_1')
    store.addWidget(card!)
    store.addWidget(input!)
    store.addToContainer('child_1', 'test_card')
    store.removeFromContainer('child_1')
    expect(store.isRootWidget('child_1')).toBe(true)
  })
})
