import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import ElementPlus from 'element-plus'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'
import { widgetDataKey, widgetStyleKey } from '../../base/types'
import FgTitle from '../FgTitle.vue'
import { titleConfig } from '../config'

describe('FgTitle', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountWidget(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('title', 'test_widget')!
    Object.assign(widget, overrides)
    store.addWidget(widget)
    return mount(FgTitle, {
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
      const widget = createWidget('title', 'test_title')
      store.addWidget(widget!)
      expect(store.findWidget('test_title')).toBeDefined()
    })

    it('更新 content 后 store 中同步', () => {
      const widget = createWidget('title', 'test_title')!
      store.addWidget(widget)
      store.updateWidget('test_title', { props: { ...widget.props, content: '新标题' } })
      expect(store.findWidget('test_title')!.props!.content).toBe('新标题')
    })

    it('删除后 store 中不存在', () => {
      const widget = createWidget('title', 'test_title')!
      store.addWidget(widget)
      store.removeWidget('test_title')
      expect(store.findWidget('test_title')).toBeNull()
    })
  })

  // Content prop
  describe('content 属性', () => {
    it('默认显示标题文字', () => {
      const wrapper = mountWidget()
      expect(wrapper.text()).toBe('标题文字')
    })

    it('自定义 content', () => {
      const wrapper = mountWidget({ props: { content: '我的标题' } })
      expect(wrapper.text()).toBe('我的标题')
    })

    it('content 为空时显示默认文字', () => {
      const wrapper = mountWidget({ props: { content: '' } })
      expect(wrapper.text()).toBe('标题文字')
    })
  })

  // Level prop
  describe('level 属性', () => {
    it('默认渲染 h3 标签', () => {
      const wrapper = mountWidget()
      expect(wrapper.find('h3').exists()).toBe(true)
    })

    it('level=1 渲染 h1', () => {
      const wrapper = mountWidget({ props: { level: 1 } })
      expect(wrapper.find('h1').exists()).toBe(true)
    })

    it('level=2 渲染 h2', () => {
      const wrapper = mountWidget({ props: { level: 2 } })
      expect(wrapper.find('h2').exists()).toBe(true)
    })

    it('level=4 渲染 h4', () => {
      const wrapper = mountWidget({ props: { level: 4 } })
      expect(wrapper.find('h4').exists()).toBe(true)
    })

    it('非法 level 降级为 h3', () => {
      const wrapper = mountWidget({ props: { level: 5 } })
      expect(wrapper.find('h3').exists()).toBe(true)
    })
  })

  // Align prop
  describe('align 属性', () => {
    it('默认左对齐', () => {
      const wrapper = mountWidget()
      const el = wrapper.find('h3')
      expect((el.element as HTMLElement).style.textAlign).toBe('left')
    })

    it('居中对齐', () => {
      const wrapper = mountWidget({ props: { align: 'center' } })
      const el = wrapper.find('h3')
      expect((el.element as HTMLElement).style.textAlign).toBe('center')
    })

    it('右对齐', () => {
      const wrapper = mountWidget({ props: { align: 'right' } })
      const el = wrapper.find('h3')
      expect((el.element as HTMLElement).style.textAlign).toBe('right')
    })
  })

  // Style
  describe('样式', () => {
    it('支持 fontSize 样式', () => {
      const widget = createWidget('title', 'test_widget')!
      widget.style = { fontSize: '24px' }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.style!.fontSize).toBe('24px')
    })
  })

  // Config panels
  describe('配置面板声明', () => {
    it('无 events/rules/api 面板', () => {
      expect(titleConfig.configPanels).toBeUndefined()
    })
  })
})
