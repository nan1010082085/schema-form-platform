import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import TDesign from 'tdesign-vue-next'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget, getWidget } from '@/widgets/registry'
import { widgetDataKey, widgetStyleKey } from '../../base/types'
import FgCard from '../FgCard.vue'

describe('FgCard', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountCard(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('card', 'test_card')!
    Object.assign(widget, overrides)
    store.addWidget(widget)
    return mount(FgCard, {
      global: {
        plugins: [ElementPlus],
        provide: {
          [widgetDataKey as symbol]: computed(() => store.findWidget('test_card')!),
          [widgetStyleKey as symbol]: computed(() => store.findWidget('test_card')!.style ?? {}),
        },
      },
    })
  }

  // Dimension 1: Store CRUD
  describe('Store CRUD', () => {
    it('创建后 store 中存在', () => {
      const widget = createWidget('card', 'test_card')
      store.addWidget(widget!)
      expect(store.findWidget('test_card')).toBeDefined()
    })

    it('可从 store 移除', () => {
      const widget = createWidget('card', 'test_card')
      store.addWidget(widget!)
      store.removeWidget('test_card')
      expect(store.findWidget('test_card')).toBeNull()
    })

    it('可更新属性', () => {
      const widget = createWidget('card', 'test_card')
      store.addWidget(widget!)
      store.updateWidget('test_card', { label: '新标签' })
      expect(store.findWidget('test_card')!.label).toBe('新标签')
    })
  })

  // Dimension 2: Props
  describe('Props', () => {
    it('默认 title 属性', () => {
      const widget = createWidget('card', 'test_card')!
      store.addWidget(widget)
      expect(widget.props?.title).toBe('卡片标题')
    })

    it('title 属性可自定义', () => {
      const wrapper = mountCard({ props: { title: '自定义标题' } })
      expect(wrapper.text()).toContain('自定义标题')
    })

    it('默认 shadow 属性', () => {
      const widget = createWidget('card', 'test_card')!
      store.addWidget(widget)
      expect(widget.props?.shadow).toBe('hover')
    })

    it('shadow 属性可配置为 always', () => {
      const wrapper = mountCard({ props: { shadow: 'always' } })
      expect(wrapper.find('.el-card').exists()).toBe(true)
    })

    it('showHeader=false 时不渲染标题栏', () => {
      const wrapper = mountCard({ props: { showHeader: false } })
      expect(wrapper.find('.el-card__header').exists()).toBe(false)
    })

    it('showHeader=true 时渲染标题栏', () => {
      const wrapper = mountCard({ props: { showHeader: true, title: '标题' } })
      expect(wrapper.find('.el-card__header').exists()).toBe(true)
    })
  })

  // Dimension 3: Container child management
  describe('容器子组件管理', () => {
    it('可容纳子组件', () => {
      const container = createWidget('card', 'container')
      const child = createWidget('input', 'child_1')
      store.addWidget(container!)
      store.addWidget(child!)
      store.addToContainer('child_1', 'container')
      expect(store.findWidget('container')!.children).toHaveLength(1)
    })

    it('可容纳多个子组件', () => {
      const container = createWidget('card', 'container')
      const child1 = createWidget('input', 'child_1')
      const child2 = createWidget('input', 'child_2')
      store.addWidget(container!)
      store.addWidget(child1!)
      store.addWidget(child2!)
      store.addToContainer('child_1', 'container')
      store.addToContainer('child_2', 'container')
      expect(store.findWidget('container')!.children).toHaveLength(2)
    })

    it('可移除子组件', () => {
      const container = createWidget('card', 'container')
      const child = createWidget('input', 'child_1')
      store.addWidget(container!)
      store.addWidget(child!)
      store.addToContainer('child_1', 'container')
      store.removeFromContainer('child_1')
      expect(store.isRootWidget('child_1')).toBe(true)
    })

    it('容器内移除后 children 数量减少', () => {
      const container = createWidget('card', 'container')
      const child1 = createWidget('input', 'child_1')
      const child2 = createWidget('input', 'child_2')
      store.addWidget(container!)
      store.addWidget(child1!)
      store.addWidget(child2!)
      store.addToContainer('child_1', 'container')
      store.addToContainer('child_2', 'container')
      store.removeFromContainer('child_1')
      expect(store.findWidget('container')!.children).toHaveLength(1)
    })
  })

  // Dimension 4: Config panel
  describe('配置面板', () => {
    it('configPanels 包含 events', () => {
      const item = getWidget('card')
      expect(item?.config.configPanels).toContain('events')
    })
  })
})
