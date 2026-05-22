import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import ElementPlus from 'element-plus'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'
import { computeWidgetRenderState } from '@/__tests__/widgetTestHarness'
import { widgetDataKey, widgetStyleKey } from '../../base/types'
import FgUpload from '../FgUpload.vue'

describe('FgUpload', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountWidget(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('upload', 'test_widget')!
    Object.assign(widget, overrides)
    store.addWidget(widget)

    return mount(FgUpload, {
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
  describe('Store CRUD', () => {
    it('创建后 store 中存在', () => {
      const widget = createWidget('upload', 'test_widget')
      store.addWidget(widget!)
      expect(store.findWidget('test_widget')).toBeDefined()
    })

    it('可更新属性', () => {
      const widget = createWidget('upload', 'test_widget')!
      store.addWidget(widget)
      store.updateWidget('test_widget', { props: { accept: '.jpg,.png', multiple: true, limit: 10 } })
      expect(store.findWidget('test_widget')!.props!.accept).toBe('.jpg,.png')
      expect(store.findWidget('test_widget')!.props!.multiple).toBe(true)
      expect(store.findWidget('test_widget')!.props!.limit).toBe(10)
    })

    it('可删除', () => {
      const widget = createWidget('upload', 'test_widget')!
      store.addWidget(widget)
      store.removeWidget('test_widget')
      expect(store.findWidget('test_widget')).toBeNull()
    })
  })

  // Properties
  describe('属性', () => {
    it('accept 生效', () => {
      const widget = createWidget('upload', 'test_widget')!
      widget.props = { ...widget.props, accept: '.jpg,.png,.gif' }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.accept).toBe('.jpg,.png,.gif')
    })

    it('multiple 生效', () => {
      const widget = createWidget('upload', 'test_widget')!
      widget.props = { ...widget.props, multiple: true }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.multiple).toBe(true)
    })

    it('maxSize 生效', () => {
      const widget = createWidget('upload', 'test_widget')!
      widget.props = { ...widget.props, maxSize: 5 }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.maxSize).toBe(5)
    })

    it('limit 生效', () => {
      const widget = createWidget('upload', 'test_widget')!
      widget.props = { ...widget.props, limit: 3 }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.limit).toBe(3)
    })

    it('buttonText 生效', () => {
      const widget = createWidget('upload', 'test_widget')!
      widget.props = { ...widget.props, buttonText: '上传文件' }
      store.addWidget(widget)
      expect(store.findWidget('test_widget')!.props!.buttonText).toBe('上传文件')
    })
  })

  // Rules/Linkage
  describe('规则联动', () => {
    it('visible=false 隐藏', () => {
      const widget = createWidget('upload', 'test_widget')!
      widget.rules = [{
        watches: [{ type: 'field', source: 'status' }],
        condition: 'status === "hide"',
        actions: [{ type: 'hide', config: {} }],
      }]
      store.addWidget(widget)
      const state = computeWidgetRenderState(widget, { status: 'hide' })
      expect(state.visible).toBe(false)
    })

    it('disabled=true 禁用', () => {
      const widget = createWidget('upload', 'test_widget')!
      widget.rules = [{
        watches: [{ type: 'field', source: 'lock' }],
        condition: 'lock === true',
        actions: [{ type: 'disabled', config: {} }],
      }]
      store.addWidget(widget)
      const state = computeWidgetRenderState(widget, { lock: true })
      expect(state.disabled).toBe(true)
    })
  })
})
