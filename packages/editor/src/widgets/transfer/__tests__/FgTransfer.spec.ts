import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import TDesign from 'tdesign-vue-next'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'
import { widgetDataKey, widgetStyleKey } from '../../base/types'
import FgTransfer from '../FgTransfer.vue'
import { transferConfig } from '../config'

describe('FgTransfer', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountWidget(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('transfer', 'test_widget')!
    Object.assign(widget, overrides)
    store.addWidget(widget)
    return mount(FgTransfer, {
      global: {
        plugins: [ElementPlus],
        provide: {
          [widgetDataKey as symbol]: computed(() => store.findWidget('test_widget')!),
          [widgetStyleKey as symbol]: computed(() => store.findWidget('test_widget')!.style ?? {}),
        },
      },
    })
  }

  // Store CRUD
  describe('store CRUD', () => {
    it('创建后 store 中存在', () => {
      const widget = createWidget('transfer', 'test_transfer')
      store.addWidget(widget!)
      expect(store.findWidget('test_transfer')).toBeDefined()
    })

    it('更新标题后 store 中同步', () => {
      const widget = createWidget('transfer', 'test_transfer')!
      store.addWidget(widget)
      store.updateWidget('test_transfer', { props: { ...widget.props, leftTitle: '可选', rightTitle: '已选' } })
      expect(store.findWidget('test_transfer')!.props!.leftTitle).toBe('可选')
      expect(store.findWidget('test_transfer')!.props!.rightTitle).toBe('已选')
    })

    it('删除后 store 中不存在', () => {
      const widget = createWidget('transfer', 'test_transfer')!
      store.addWidget(widget)
      store.removeWidget('test_transfer')
      expect(store.findWidget('test_transfer')).toBeNull()
    })
  })

  // Titles prop
  describe('标题属性', () => {
    it('默认标题为待选/已选', () => {
      const wrapper = mountWidget()
      expect(wrapper.text()).toContain('待选')
      expect(wrapper.text()).toContain('已选')
    })

    it('自定义标题', () => {
      const wrapper = mountWidget({ props: { leftTitle: '可选项目', rightTitle: '已选项目' } })
      expect(wrapper.text()).toContain('可选项目')
      expect(wrapper.text()).toContain('已选项目')
    })
  })

  // Filterable prop
  describe('filterable 属性', () => {
    it('默认可搜索', () => {
      const widget = createWidget('transfer', 'test_widget')!
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.filterable).toBe(true)
    })

    it('filterable=false 关闭搜索', () => {
      const widget = createWidget('transfer', 'test_widget')!
      widget.props = { ...widget.props, filterable: false }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.filterable).toBe(false)
    })
  })

  // Events
  describe('事件', () => {
    it('支持 change 事件配置', () => {
      const widget = createWidget('transfer', 'test_widget')!
      widget.events = [{ trigger: 'change', actions: [{ type: 'set-value', target: 'form', value: {} }] }]
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.events).toHaveLength(1)
      expect(store.findWidget('test_widget')!.events![0].trigger).toBe('change')
    })

    it('支持 left-check-change 事件', () => {
      const widget = createWidget('transfer', 'test_widget')!
      widget.events = [{ trigger: 'left-check-change', actions: [{ type: 'emit', target: 'parent' }] }]
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.events![0].trigger).toBe('left-check-change')
    })
  })

  // Linkage / Rules
  describe('联动规则', () => {
    it('支持 linkage 配置', () => {
      const widget = createWidget('transfer', 'test_widget')!
      widget.linkages = [{
        type: 'disabled',
        watchFields: ['status'],
        condition: 'status === "readonly"',
      }]
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.linkages).toHaveLength(1)
    })

    it('支持 rules 配置', () => {
      const widget = createWidget('transfer', 'test_widget')!
      widget.rules = [{
        watches: [{ type: 'field', source: 'mode' }],
        condition: 'mode === "view"',
        actions: [{ type: 'disabled', config: {} }],
      }]
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.rules).toHaveLength(1)
      expect(store.findWidget('test_widget')!.rules![0].condition).toBe('mode === "view"')
    })
  })

  // Config panels
  describe('配置面板声明', () => {
    it('声明 events 和 rules 面板', () => {
      expect(transferConfig.configPanels).toContain('events')
      expect(transferConfig.configPanels).toContain('rules')
    })

    it('无 api 面板', () => {
      expect(transferConfig.configPanels).not.toContain('api')
    })
  })
})
