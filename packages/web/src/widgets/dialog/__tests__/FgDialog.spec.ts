import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed, nextTick } from 'vue'
import ElementPlus from 'element-plus'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget, getWidget } from '@/widgets/registry'
import { widgetDataKey, widgetStyleKey, formContextKey } from '../../base/types'
import FgDialog from '../FgDialog.vue'

vi.mock('@/composables/useWidgetLifecycle', () => ({
  useWidgetLifecycle: () => ({
    trigger: vi.fn().mockResolvedValue(undefined),
    isRunning: { value: false },
    lastError: { value: null },
  }),
}))

vi.mock('@/composables/useLogger', () => ({
  useLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    event: vi.fn(),
    rule: vi.fn(),
    api: vi.fn(),
    lifecycle: vi.fn(),
    child: vi.fn(),
  }),
}))

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

  // ---- Dimension 1: Store CRUD ----
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

  // ---- Dimension 2: Props ----
  describe('Props', () => {
    it('默认 title 属性', () => {
      const widget = createWidget('dialog', 'test_dialog')!
      store.addWidget(widget)
      expect(widget.props?.title).toBe('弹窗标题')
    })

    it('默认 width 为 600px', () => {
      const widget = createWidget('dialog', 'test_dialog')!
      store.addWidget(widget)
      expect(widget.props?.width).toBe('600px')
    })

    it('默认 draggable 为 true', () => {
      const widget = createWidget('dialog', 'test_dialog')!
      store.addWidget(widget)
      expect(widget.props?.draggable).toBe(true)
    })

    it('默认 destroyOnClose 为 true', () => {
      const widget = createWidget('dialog', 'test_dialog')!
      store.addWidget(widget)
      expect(widget.props?.destroyOnClose).toBe(true)
    })

    it('默认 showFooter 为 true', () => {
      const widget = createWidget('dialog', 'test_dialog')!
      store.addWidget(widget)
      expect(widget.props?.showFooter).toBe(true)
    })
  })

  // ---- Dimension 3: Container child management ----
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

  // ---- Dimension 4: defineExpose ----
  describe('defineExpose', () => {
    it('暴露 open 方法', () => {
      const wrapper = mountDialog()
      expect(wrapper.vm.open).toBeDefined()
      expect(typeof wrapper.vm.open).toBe('function')
    })

    it('暴露 close 方法', () => {
      const wrapper = mountDialog()
      expect(wrapper.vm.close).toBeDefined()
      expect(typeof wrapper.vm.close).toBe('function')
    })

    it('暴露 validate 方法', () => {
      const wrapper = mountDialog()
      expect(wrapper.vm.validate).toBeDefined()
      expect(typeof wrapper.vm.validate).toBe('function')
    })

    it('暴露 getDialogData 方法', () => {
      const wrapper = mountDialog()
      expect(wrapper.vm.getDialogData).toBeDefined()
    })

    it('暴露 setDialogData 方法', () => {
      const wrapper = mountDialog()
      expect(wrapper.vm.setDialogData).toBeDefined()
    })

    it('open 显示弹窗并触发 open 事件', async () => {
      const wrapper = mountDialog()
      wrapper.vm.open()
      await nextTick()
      expect(wrapper.emitted('open')).toBeDefined()
    })

    it('open 可传入初始数据', async () => {
      const wrapper = mountDialog()
      wrapper.vm.open({ name: 'test' })
      await nextTick()
      const data = wrapper.vm.getDialogData()
      expect(data.name).toBe('test')
    })

    it('close 关闭弹窗并触发 close 事件', async () => {
      const wrapper = mountDialog()
      wrapper.vm.open()
      await nextTick()
      wrapper.vm.close()
      await nextTick()
      expect(wrapper.emitted('close')).toBeDefined()
    })
  })

  // ---- Dimension 5: Events ----
  describe('事件系统', () => {
    it('确认按钮触发 confirm 事件', async () => {
      const wrapper = mountDialog()
      wrapper.vm.open()
      await nextTick()
      const confirmBtn = wrapper.findAll('.el-button').find(b => b.text() === '确定')
      await confirmBtn?.trigger('click')
      expect(wrapper.emitted('confirm')).toBeDefined()
    })

    it('取消按钮触发 cancel 事件', async () => {
      const wrapper = mountDialog()
      wrapper.vm.open()
      await nextTick()
      const cancelBtn = wrapper.findAll('.el-button').find(b => b.text() === '取消')
      await cancelBtn?.trigger('click')
      expect(wrapper.emitted('cancel')).toBeDefined()
    })

    it('confirm 事件携带 dialogModel 数据', async () => {
      const wrapper = mountDialog()
      wrapper.vm.open({ status: 'active' })
      await nextTick()
      const confirmBtn = wrapper.findAll('.el-button').find(b => b.text() === '确定')
      await confirmBtn?.trigger('click')
      const emitted = wrapper.emitted('confirm')
      expect(emitted).toBeDefined()
      expect(emitted![0][0]).toEqual(expect.objectContaining({ status: 'active' }))
    })
  })

  // ---- Dimension 6: FormContext provide ----
  describe('FormContext provide', () => {
    it('provide 包含 updateField 方法', () => {
      const wrapper = mountDialog()
      const ctx = wrapper.vm.$?.provides?.[formContextKey as symbol] as Record<string, unknown>
      expect(ctx?.updateField).toBeDefined()
      expect(typeof ctx?.updateField).toBe('function')
    })

    it('provide 包含独立的 formModel', () => {
      const wrapper = mountDialog()
      const ctx = wrapper.vm.$?.provides?.[formContextKey as symbol] as Record<string, unknown>
      expect(ctx?.formModel).toBeDefined()
      expect(typeof ctx?.formModel).toBe('object')
    })
  })

  // ---- Dimension 7: destroyOnClose ----
  describe('destroyOnClose', () => {
    it('关闭时清空 dialogModel（destroyOnClose=true）', async () => {
      const wrapper = mountDialog({ props: { destroyOnClose: true } })
      wrapper.vm.open({ name: 'test', age: 25 })
      await nextTick()
      wrapper.vm.close()
      await nextTick()
      const data = wrapper.vm.getDialogData()
      expect(data.name).toBeUndefined()
      expect(data.age).toBeUndefined()
    })

    it('关闭时保留 dialogModel（destroyOnClose=false）', async () => {
      const widget = createWidget('dialog', 'test_dialog')!
      widget.props = { ...widget.props, destroyOnClose: false }
      store.addWidget(widget)
      const wrapper = mount(FgDialog, {
        global: {
          plugins: [ElementPlus],
          provide: {
            [widgetDataKey as symbol]: computed(() => store.findWidget('test_dialog')!),
            [widgetStyleKey as symbol]: computed(() => store.findWidget('test_dialog')!.style ?? {}),
          },
        },
      })
      wrapper.vm.open({ name: 'test' })
      await nextTick()
      wrapper.vm.close()
      await nextTick()
      const data = wrapper.vm.getDialogData()
      expect(data.name).toBe('test')
    })
  })

  // ---- Dimension 8: Config panel ----
  describe('配置面板', () => {
    it('configPanels 包含 events', () => {
      const item = getWidget('dialog')
      expect(item?.config.configPanels).toContain('events')
    })
  })

  // ---- Dimension 9: Microapp mode ----
  describe('微应用模式', () => {
    it('contentMode=microapp 时不显示 EnhancedDialog', async () => {
      const widget = createWidget('dialog', 'test_dialog')!
      widget.props = { ...widget.props, contentMode: 'microapp', publishId: 'pub_123' }
      store.addWidget(widget)
      const wrapper = mount(FgDialog, {
        global: {
          plugins: [ElementPlus],
          provide: {
            [widgetDataKey as symbol]: computed(() => store.findWidget('test_dialog')!),
            [widgetStyleKey as symbol]: computed(() => store.findWidget('test_dialog')!.style ?? {}),
          },
        },
      })
      expect(wrapper.find('.el-dialog').exists()).toBe(false)
    })
  })
})
