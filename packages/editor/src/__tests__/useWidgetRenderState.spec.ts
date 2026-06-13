import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, provide, computed } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useWidgetRenderState } from '../composables/useWidgetRenderState'
import { widgetDataKey, widgetRenderStateKey } from '../widgets/base/types'
import type { Widget, WidgetRenderState } from '../widgets/base/types'
import {
  FORM_GRID_READONLY_KEY,
  FORM_GRID_READONLY_FIELDS_KEY,
  FORM_GRID_EDITABLE_FIELDS_KEY,
} from '../components/WidgetRenderer/types'

/**
 * 创建测试用的包装组件，提供所有必要的 injection
 */
function createTestHarness(options: {
  widgetField?: string
  widgetDisabled?: boolean
  renderState?: WidgetRenderState
  globalReadonly?: boolean
  readonlyFields?: string[]
  editableFields?: string[]
}) {
  // 子组件：消费 composable
  const Consumer = defineComponent({
    name: 'RenderStateConsumer',
    setup() {
      const { isDisabled, isRequired } = useWidgetRenderState()
      return { isDisabled, isRequired }
    },
    template: '<div>{{ isDisabled ? "disabled" : "enabled" }}</div>',
  })

  // 父组件：提供 injection
  return defineComponent({
    name: 'TestHarness',
    components: { Consumer },
    setup() {
      const widgetData = computed(() => ({
        id: 'test-widget',
        type: 'input',
        field: options.widgetField ?? 'name',
        props: { disabled: options.widgetDisabled ?? false },
        defaultValue: '',
      } as unknown as Widget))
      provide(widgetDataKey, widgetData)

      const renderState = computed(() =>
        options.renderState ?? { visible: true, disabled: false, required: false },
      )
      provide(widgetRenderStateKey, renderState)

      provide(FORM_GRID_READONLY_KEY, computed(() => options.globalReadonly ?? false))
      provide(FORM_GRID_READONLY_FIELDS_KEY, computed(() => options.readonlyFields))
      provide(FORM_GRID_EDITABLE_FIELDS_KEY, computed(() => options.editableFields))

      return {}
    },
    template: '<Consumer />',
  })
}

describe('useWidgetRenderState', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('returns disabled=false when no restrictions', () => {
    const wrapper = mount(createTestHarness({ widgetField: 'name' }))
    const consumer = wrapper.findComponent({ name: 'RenderStateConsumer' }) // find Consumer
    expect(consumer.vm.isDisabled).toBe(false)
  })

  it('returns disabled=true when widget props.disabled is true', () => {
    const wrapper = mount(createTestHarness({ widgetField: 'name', widgetDisabled: true }))
    const consumer = wrapper.findComponent({ name: 'RenderStateConsumer' })
    expect(consumer.vm.isDisabled).toBe(true)
  })

  it('returns disabled=true when linkage disables field', () => {
    const wrapper = mount(createTestHarness({
      widgetField: 'name',
      renderState: { visible: true, disabled: true, required: false },
    }))
    const consumer = wrapper.findComponent({ name: 'RenderStateConsumer' })
    expect(consumer.vm.isDisabled).toBe(true)
  })

  it('returns disabled=true when globalReadonly is true', () => {
    const wrapper = mount(createTestHarness({
      widgetField: 'name',
      globalReadonly: true,
    }))
    const consumer = wrapper.findComponent({ name: 'RenderStateConsumer' })
    expect(consumer.vm.isDisabled).toBe(true)
  })

  describe('partial mode with editableFields', () => {
    it('disables field not in editableFields list', () => {
      const wrapper = mount(createTestHarness({
        widgetField: 'name',
        editableFields: ['comment', 'amount'],
      }))
      const consumer = wrapper.findComponent({ name: 'RenderStateConsumer' })
      expect(consumer.vm.isDisabled).toBe(true)
    })

    it('enables field in editableFields list', () => {
      const wrapper = mount(createTestHarness({
        widgetField: 'comment',
        editableFields: ['comment', 'amount'],
      }))
      const consumer = wrapper.findComponent({ name: 'RenderStateConsumer' })
      expect(consumer.vm.isDisabled).toBe(false)
    })

    it('disables all fields when editableFields is empty', () => {
      const wrapper = mount(createTestHarness({
        widgetField: 'name',
        editableFields: [],
      }))
      const consumer = wrapper.findComponent({ name: 'RenderStateConsumer' })
      expect(consumer.vm.isDisabled).toBe(true)
    })
  })

  describe('partial mode with readonlyFields', () => {
    it('disables field in readonlyFields list', () => {
      const wrapper = mount(createTestHarness({
        widgetField: 'name',
        readonlyFields: ['name', 'date'],
      }))
      const consumer = wrapper.findComponent({ name: 'RenderStateConsumer' })
      expect(consumer.vm.isDisabled).toBe(true)
    })

    it('enables field not in readonlyFields list', () => {
      const wrapper = mount(createTestHarness({
        widgetField: 'comment',
        readonlyFields: ['name', 'date'],
      }))
      const consumer = wrapper.findComponent({ name: 'RenderStateConsumer' })
      expect(consumer.vm.isDisabled).toBe(false)
    })
  })

  it('globalReadonly takes priority over editableFields', () => {
    const wrapper = mount(createTestHarness({
      widgetField: 'comment',
      globalReadonly: true,
      editableFields: ['comment'],
    }))
    const consumer = wrapper.findComponent({ name: 'RenderStateConsumer' })
    expect(consumer.vm.isDisabled).toBe(true)
  })

  it('does not affect widgets without a field name', () => {
    // When widget has no field (e.g. layout widgets), partial mode should not disable
    // We use empty string to simulate no field, since the harness defaults to 'name'
    const wrapper = mount(createTestHarness({
      widgetField: '',
      editableFields: ['comment'],
    }))
    const consumer = wrapper.findComponent({ name: 'RenderStateConsumer' })
    expect(consumer.vm.isDisabled).toBe(false)
  })
})
