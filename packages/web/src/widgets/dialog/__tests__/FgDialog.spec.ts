import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import ElementPlus from 'element-plus'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget, getWidget } from '@/widgets/registry'
import { widgetDataKey, widgetStyleKey } from '../../base/types'
import FgDialog from '../FgDialog.vue'

describe('FgDialog', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountDialog(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('dialog', 'test_dialog')!
    Object.assign(widget, overrides)
    store.addWidget(widget)
    return mount(FgDialog, {
      global: {
        plugins: [ElementPlus],
        provide: {
          [widgetDataKey as symbol]: computed(() => store.findWidget('test_dialog')!),
          [widgetStyleKey as symbol]: computed(() => store.findWidget('test_dialog')!.style ?? {}),
        },
      },
    })
  }

  // Dimension 1: Store CRUD
  describe('Store CRUD', () => {
    it('创建后 store 中存在', () => {
      const widget = createWidget('dialog', 'test_dialog')
      store.addWidget(widget!)
      expect(store.findWidget('test_dialog')).toBeDefined()
    })

    it('可从 store 移除', () => {
      const widget = createWidget('dialog', 'test_dialog')
      store.addWidget(widget!)
      store.removeWidget('test_dialog')
      expect(store.findWidget('test_dialog')).toBeNull()
    })

    it('可更新属性', () => {
      const widget = createWidget('dialog', 'test_dialog')
      store.addWidget(widget!)
      store.updateWidget('test_dialog', { label: '新标签' })
      expect(store.findWidget('test_dialog')!.label).toBe('新标签')
    })
  })

  // Dimension 2: Props
  describe('Props', () => {
    it('默认 title 属性', () => {
      const widget = createWidget('dialog', 'test_dialog')!
      store.addWidget(widget)
      expect(widget.props?.title).toBe('弹窗标题')
    })

    it('默认 draggable 为 true', () => {
      const widget = createWidget('dialog', 'test_dialog')!
      store.addWidget(widget)
      expect(widget.props?.draggable).toBe(true)
    })

    it('默认 showFullscreenBtn 为 true', () => {
      const widget = createWidget('dialog', 'test_dialog')!
      store.addWidget(widget)
      expect(widget.props?.showFullscreenBtn).toBe(true)
    })

    it('draggable 属性可配置为 false', () => {
      const widget = createWidget('dialog', 'test_dialog')!
      widget.props = { ...widget.props, draggable: false }
      store.addWidget(widget)
      expect(store.findWidget('test_dialog')!.props!.draggable).toBe(false)
    })

    it('showFullscreenBtn 属性可配置为 false', () => {
      const widget = createWidget('dialog', 'test_dialog')!
      widget.props = { ...widget.props, showFullscreenBtn: false }
      store.addWidget(widget)
      expect(store.findWidget('test_dialog')!.props!.showFullscreenBtn).toBe(false)
    })

    it('默认 width 为 600px', () => {
      const widget = createWidget('dialog', 'test_dialog')!
      store.addWidget(widget)
      expect(widget.props?.width).toBe('600px')
    })

    it('默认 showFooter 为 true', () => {
      const widget = createWidget('dialog', 'test_dialog')!
      store.addWidget(widget)
      expect(widget.props?.showFooter).toBe(true)
    })

    it('默认 destroyOnClose 为 true', () => {
      const widget = createWidget('dialog', 'test_dialog')!
      store.addWidget(widget)
      expect(widget.props?.destroyOnClose).toBe(true)
    })

    it('contentMode 可配置为 microapp', () => {
      const widget = createWidget('dialog', 'test_dialog')!
      widget.props = { ...widget.props, contentMode: 'microapp' }
      store.addWidget(widget)
      expect(store.findWidget('test_dialog')!.props!.contentMode).toBe('microapp')
    })
  })

  // Dimension 3: Container child management
  describe('容器子组件管理', () => {
    it('可容纳子组件', () => {
      const container = createWidget('dialog', 'container')
      const child = createWidget('input', 'child_1')
      store.addWidget(container!)
      store.addWidget(child!)
      store.addToContainer('child_1', 'container')
      expect(store.findWidget('container')!.children).toHaveLength(1)
    })

    it('可容纳多个子组件', () => {
      const container = createWidget('dialog', 'container')
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
      const container = createWidget('dialog', 'container')
      const child = createWidget('input', 'child_1')
      store.addWidget(container!)
      store.addWidget(child!)
      store.addToContainer('child_1', 'container')
      store.removeFromContainer('child_1')
      expect(store.isRootWidget('child_1')).toBe(true)
    })
  })

  // Dimension 4: Config panel
  describe('配置面板', () => {
    it('configPanels 为空（容器无事件/规则/数据源）', () => {
      const item = getWidget('dialog')
      expect(item?.config.configPanels).toBeUndefined()
    })
  })
})
