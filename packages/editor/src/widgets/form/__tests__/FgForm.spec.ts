import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { computed, nextTick } from 'vue'
import TDesign from 'tdesign-vue-next'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget, getWidget } from '@/widgets/registry'
import { widgetDataKey, widgetStyleKey, formContextKey } from '../../base/types'
import FgForm from '../FgForm.vue'

vi.mock('@/composables/useWidgetLifecycle', () => ({
  useWidgetLifecycle: () => ({
    trigger: vi.fn().mockResolvedValue(undefined),
    isRunning: { value: false },
    lastError: { value: null },
  }),
}))

vi.mock('@/composables/useWorkerRequest', () => ({
  useWorkerRequest: () => ({
    request: vi.fn().mockResolvedValue({ name: 'test', age: 25 }),
    cancel: vi.fn(),
    cancelAll: vi.fn(),
    pendingCount: { value: 0 },
    isReady: { value: true },
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

describe('FgForm', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountForm(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('form', 'test_form')!
    Object.assign(widget, overrides)
    store.addWidget(widget)
    return mount(FgForm, {
      global: {
        plugins: [ElementPlus],
        provide: {
          [widgetDataKey as symbol]: computed(() => store.findWidget('test_form')!),
          [widgetStyleKey as symbol]: computed(() => store.findWidget('test_form')!.style ?? {}),
        },
      },
    })
  }

  // ---- Dimension 1: Store CRUD ----
  describe('Store CRUD', () => {
    it('创建后 store 中存在', () => {
      const widget = createWidget('form', 'test_form')
      store.addWidget(widget!)
      expect(store.findWidget('test_form')).toBeDefined()
    })

    it('可从 store 移除', () => {
      const widget = createWidget('form', 'test_form')
      store.addWidget(widget!)
      store.removeWidget('test_form')
      expect(store.findWidget('test_form')).toBeNull()
    })

    it('可更新属性', () => {
      const widget = createWidget('form', 'test_form')
      store.addWidget(widget!)
      store.updateWidget('test_form', { label: '新标签' })
      expect(store.findWidget('test_form')!.label).toBe('新标签')
    })
  })

  // ---- Dimension 2: Props ----
  describe('Props', () => {
    it('默认 labelWidth 为 100px', () => {
      const wrapper = mountForm()
      const elForm = wrapper.find('.el-form')
      // Element Plus 渲染 label-width 为属性或 CSS 变量
      expect(elForm.exists()).toBe(true)
      const widget = store.findWidget('test_form')!
      expect(widget.props?.labelWidth).toBe('100px')
    })

    it('labelWidth 可自定义', () => {
      const wrapper = mountForm({ props: { labelWidth: '120px' } })
      const elForm = wrapper.find('.el-form')
      expect(elForm.exists()).toBe(true)
      const widget = store.findWidget('test_form')!
      expect(widget.props?.labelWidth).toBe('120px')
    })

    it('默认 labelPosition 为 right', () => {
      const wrapper = mountForm()
      const elForm = wrapper.find('.el-form')
      expect(elForm.classes()).toContain('el-form--label-right')
    })

    it('labelPosition 可配置为 left', () => {
      const wrapper = mountForm({ props: { labelPosition: 'left' } })
      const elForm = wrapper.find('.el-form')
      expect(elForm.classes()).toContain('el-form--label-left')
    })
  })

  // ---- Dimension 3: Container child management ----
  describe('容器子组件管理', () => {
    it('可容纳子组件', () => {
      const container = createWidget('form', 'container')
      const child = createWidget('input', 'child_1')
      store.addWidget(container!)
      store.addWidget(child!)
      store.addToContainer('child_1', 'container')
      expect(store.findWidget('container')!.children).toHaveLength(1)
    })

    it('可容纳多个子组件', () => {
      const container = createWidget('form', 'container')
      const child1 = createWidget('input', 'child_1')
      const child2 = createWidget('select', 'child_2')
      store.addWidget(container!)
      store.addWidget(child1!)
      store.addWidget(child2!)
      store.addToContainer('child_1', 'container')
      store.addToContainer('child_2', 'container')
      expect(store.findWidget('container')!.children).toHaveLength(2)
    })

    it('可移除子组件', () => {
      const container = createWidget('form', 'container')
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
    it('暴露 validate 方法', () => {
      const wrapper = mountForm()
      expect(wrapper.vm.validate).toBeDefined()
      expect(typeof wrapper.vm.validate).toBe('function')
    })

    it('暴露 validateField 方法', () => {
      const wrapper = mountForm()
      expect(wrapper.vm.validateField).toBeDefined()
    })

    it('暴露 clearValidate 方法', () => {
      const wrapper = mountForm()
      expect(wrapper.vm.clearValidate).toBeDefined()
    })

    it('暴露 resetFields 方法', () => {
      const wrapper = mountForm()
      expect(wrapper.vm.resetFields).toBeDefined()
    })

    it('暴露 scrollToField 方法', () => {
      const wrapper = mountForm()
      expect(wrapper.vm.scrollToField).toBeDefined()
    })

    it('暴露 getFormData 方法', () => {
      const wrapper = mountForm()
      expect(wrapper.vm.getFormData).toBeDefined()
      const data = wrapper.vm.getFormData()
      expect(typeof data).toBe('object')
    })

    it('暴露 setFormData 方法', () => {
      const wrapper = mountForm()
      expect(wrapper.vm.setFormData).toBeDefined()
    })

    it('暴露 submit 方法', () => {
      const wrapper = mountForm()
      expect(wrapper.vm.submit).toBeDefined()
      expect(typeof wrapper.vm.submit).toBe('function')
    })

    it('getFormData 返回当前 formModel 副本', () => {
      const wrapper = mountForm()
      const data = wrapper.vm.getFormData()
      expect(data).toEqual({})
    })

    it('setFormData 合并数据到 formModel', async () => {
      const wrapper = mountForm()
      wrapper.vm.setFormData({ name: 'test' })
      await nextTick()
      const data = wrapper.vm.getFormData()
      expect(data.name).toBe('test')
    })
  })

  // ---- Dimension 5: Events ----
  describe('事件系统', () => {
    it('submit 可调用并触发事件', async () => {
      const wrapper = mountForm()
      await wrapper.vm.submit()
      // submit 内部调用 el-form validate，结果决定 emit submit 或 validate-error
      const hasSubmit = wrapper.emitted('submit') !== undefined
      const hasValidateError = wrapper.emitted('validate-error') !== undefined
      expect(hasSubmit || hasValidateError).toBe(true)
    })

    it('resetFields 触发 reset 事件', async () => {
      const wrapper = mountForm()
      wrapper.vm.resetFields()
      await nextTick()
      expect(wrapper.emitted('reset')).toBeDefined()
    })
  })

  // ---- Dimension 6: FormContext provide ----
  describe('FormContext provide', () => {
    it('provide 包含 formRef', () => {
      const wrapper = mountForm()
      const provides = (wrapper.vm.$ as unknown as Record<string, Record<symbol, unknown> | undefined>)?.provides
      expect(provides?.[formContextKey]).toBeDefined()
    })

    it('provide 包含 updateField 方法', () => {
      const wrapper = mountForm()
      const provides = (wrapper.vm.$ as unknown as Record<string, Record<symbol, unknown> | undefined>)?.provides
      const ctx = provides?.[formContextKey] as Record<string, unknown> | undefined
      expect(ctx?.updateField).toBeDefined()
      expect(typeof ctx?.updateField).toBe('function')
    })
  })

  // ---- Dimension 7: Config panel ----
  describe('配置面板', () => {
    it('configPanels 包含 events', () => {
      const item = getWidget('form')
      expect(item?.config.configPanels).toContain('events')
    })

    it('configPanels 包含 api（数据源）', () => {
      const item = getWidget('form')
      expect(item?.config.configPanels).toContain('api')
    })
  })
})
