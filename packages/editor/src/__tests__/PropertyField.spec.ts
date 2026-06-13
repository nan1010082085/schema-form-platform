/**
 * PropertyField unit tests
 *
 * Covers:
 * - json type renders textarea and validates JSON on blur
 * - json type emits parsed object on valid input
 * - json type shows error message on invalid JSON
 * - json type emits null on empty input
 * - staticData array-editor renders correctly in PropertyPanel for chart widgets
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import PropertyField from '@/components/Editor/PropertyField.vue'
import PropertyPanel from '@/components/Editor/PropertyPanel.vue'
import { useEditorStore } from '@/stores/editor'
import { useWidgetStore } from '@/stores/widget'
import { registerWidget } from '@/widgets/registry'
import type { Widget } from '@/widgets/base/types'
import type { Component } from 'vue'

// ---- Stub Element Plus components ----

const elInputStub = {
  template: `<div>
    <input v-if="type !== 'textarea'" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />
    <textarea v-else :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" @focus="$emit('focus')" @blur="$emit('blur')" />
  </div>`,
  props: ['modelValue', 'size', 'placeholder', 'disabled', 'type', 'rows', 'readonly'],
  emits: ['update:modelValue', 'focus', 'blur'],
}

const elInputNumberStub = {
  template: '<input type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
  props: ['modelValue', 'min', 'max', 'size', 'controlsPosition'],
  emits: ['update:modelValue'],
}

const elSwitchStub = {
  template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
  props: ['modelValue'],
  emits: ['update:modelValue'],
}

const elSelectStub = {
  template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
  props: ['modelValue', 'size', 'style'],
  emits: ['update:modelValue'],
}

const elOptionStub = {
  template: '<option :value="value"><slot>{{ label }}</slot></option>',
  props: ['label', 'value'],
}

const elColorPickerStub = {
  template: '<input type="color" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  props: ['modelValue', 'size', 'showAlpha'],
  emits: ['update:modelValue'],
}

const elButtonStub = {
  template: '<button @click="$emit(\'click\')"><slot /></button>',
  props: ['size', 'plain', 'type', 'icon', 'text', 'disabled', 'danger'],
  emits: ['click'],
}

const elTooltipStub = {
  template: '<span><slot /></span>',
  props: ['content', 'placement', 'showAfter', 'disabled'],
}

const elIconStub = {
  template: '<span><slot /></span>',
  props: ['size', 'class'],
}

const elScrollbarStub = {
  template: '<div><slot /></div>',
  props: ['class'],
}

const elPopoverStub = {
  template: '<div><slot name="reference" /><slot /></div>',
  props: ['placement', 'width', 'trigger'],
}

const stubs = {
  ElInput: elInputStub,
  ElInputNumber: elInputNumberStub,
  ElSwitch: elSwitchStub,
  ElSelect: elSelectStub,
  ElOption: elOptionStub,
  ElColorPicker: elColorPickerStub,
  ElButton: elButtonStub,
  ElTooltip: elTooltipStub,
  ElIcon: elIconStub,
  ElScrollbar: elScrollbarStub,
  ElPopover: elPopoverStub,
}

// ---- Test widget factory ----

const stubComponent: Component = { template: '<div />' }

function createBarChartWidget(overrides: Partial<Widget> = {}): Widget {
  return {
    id: 'bar-chart_test1',
    name: 'FgBarChart',
    type: 'bar-chart',
    label: '柱状图',
    position: { x: 0, y: 0, w: 400, h: 400, zIndex: 1 },
    style: {},
    props: {
      staticData: [
        { category: '1月', value: 120 },
        { category: '2月', value: 200 },
      ],
      xField: 'category',
      yField: 'value',
      title: '测试图表',
      showLegend: true,
      showLabel: false,
      colorScheme: 'default',
      stack: false,
      horizontal: false,
      rawOption: null,
    },
    options: [],
    events: [],
    rules: [],
    validationRules: [],
    ...overrides,
  }
}

function registerBarChartWidget() {
  registerWidget({
    name: 'FgBarChart',
    displayName: '柱状图',
    type: 'bar-chart',
    group: 'chart',
    component: stubComponent,
    create: (id: string) => createBarChartWidget({ id }),
    config: {
      name: 'FgBarChart',
      displayName: '柱状图',
      description: '柱状图组件',
      configPanels: ['api', 'variables'],
      propertyPanel: {
        basic: ['label'],
        style: ['margin', 'padding', 'backgroundColor', 'borderRadius'],
        props: [
          { key: 'staticData', label: '静态数据', type: 'array-editor', fields: [
            { key: 'category', label: '分类', type: 'text' },
            { key: 'value', label: '值', type: 'number' },
          ]},
          { key: 'title', label: '图表标题', type: 'input' },
          { key: 'showLegend', label: '显示图例', type: 'switch', default: true },
          { key: 'rawOption', label: '高级配置 (JSON)', type: 'json' },
        ],
      },
    },
  })
}

// ---- Tests ----

describe('PropertyField - json type', () => {
  it('renders a textarea for json type', () => {
    const wrapper = mount(PropertyField, {
      props: { label: '配置', type: 'json', value: { foo: 'bar' } },
      global: { stubs },
    })
    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)
    expect(textarea.element.value).toContain('"foo"')
  })

  it('displays formatted JSON in textarea', () => {
    const data = { key: 'value', num: 42 }
    const wrapper = mount(PropertyField, {
      props: { label: '配置', type: 'json', value: data },
      global: { stubs },
    })
    const textarea = wrapper.find('textarea')
    expect(textarea.element.value).toBe(JSON.stringify(data, null, 2))
  })

  it('shows empty textarea when value is null', () => {
    const wrapper = mount(PropertyField, {
      props: { label: '配置', type: 'json', value: null },
      global: { stubs },
    })
    const textarea = wrapper.find('textarea')
    expect(textarea.element.value).toBe('')
  })

  it('emits parsed JSON object on blur with valid JSON', async () => {
    const wrapper = mount(PropertyField, {
      props: { label: '配置', type: 'json', value: null },
      global: { stubs },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('{"a": 1, "b": "test"}')
    await textarea.trigger('blur')
    await nextTick()

    expect(wrapper.emitted('update')).toBeTruthy()
    expect(wrapper.emitted('update')![0][0]).toEqual({ a: 1, b: 'test' })
  })

  it('shows error message on blur with invalid JSON', async () => {
    const wrapper = mount(PropertyField, {
      props: { label: '配置', type: 'json', value: null },
      global: { stubs },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('{invalid json}')
    await textarea.trigger('blur')
    await nextTick()

    expect(wrapper.text()).toContain('JSON 格式不正确')
    expect(wrapper.emitted('update')).toBeFalsy()
  })

  it('emits null on blur with empty textarea', async () => {
    const wrapper = mount(PropertyField, {
      props: { label: '配置', type: 'json', value: { foo: 'bar' } },
      global: { stubs },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('')
    await textarea.trigger('blur')
    await nextTick()

    expect(wrapper.emitted('update')).toBeTruthy()
    expect(wrapper.emitted('update')![0][0]).toBeNull()
  })

  it('clears error on focus after invalid input', async () => {
    const wrapper = mount(PropertyField, {
      props: { label: '配置', type: 'json', value: null },
      global: { stubs },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('{bad}')
    await textarea.trigger('blur')
    await nextTick()
    expect(wrapper.text()).toContain('JSON 格式不正确')

    await textarea.trigger('focus')
    await nextTick()
    expect(wrapper.text()).not.toContain('JSON 格式不正确')
  })

  it('emits parsed array on valid JSON array input', async () => {
    const wrapper = mount(PropertyField, {
      props: { label: '配置', type: 'json', value: null },
      global: { stubs },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('[1, 2, 3]')
    await textarea.trigger('blur')
    await nextTick()

    expect(wrapper.emitted('update')![0][0]).toEqual([1, 2, 3])
  })

  it('syncs textarea when value prop changes externally', async () => {
    const wrapper = mount(PropertyField, {
      props: { label: '配置', type: 'json', value: { a: 1 } },
      global: { stubs },
    })
    const textarea = wrapper.find('textarea')
    expect(textarea.element.value).toContain('"a"')

    await wrapper.setProps({ value: { b: 2 } })
    await nextTick()
    expect(textarea.element.value).toContain('"b"')
  })
})

describe('PropertyPanel - chart staticData array-editor', () => {
  let editorStore: ReturnType<typeof useEditorStore>
  let widgetStore: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    editorStore = useEditorStore()
    widgetStore = useWidgetStore()
    registerBarChartWidget()
  })

  it('renders staticData array-editor for bar-chart widget', () => {
    widgetStore.addWidget(createBarChartWidget())
    editorStore.select('bar-chart_test1')

    const wrapper = mount(PropertyPanel, {
      global: { stubs: { ...stubs, EventConfigDialog: { template: '<div />', props: ['visible', 'events'], emits: ['update:visible', 'save'] }, VariableConfigDialog: { template: '<div />', props: ['visible', 'variables', 'title'], emits: ['update:visible', 'save'] }, OptionsApiConfigDialog: { template: '<div />', props: ['visible', 'api'], emits: ['update:visible', 'save'] } } },
    })
    expect(wrapper.text()).toContain('静态数据')
  })

  it('renders staticData with existing data items', () => {
    widgetStore.addWidget(createBarChartWidget())
    editorStore.select('bar-chart_test1')

    const wrapper = mount(PropertyPanel, {
      global: { stubs: { ...stubs, EventConfigDialog: { template: '<div />', props: ['visible', 'events'], emits: ['update:visible', 'save'] }, VariableConfigDialog: { template: '<div />', props: ['visible', 'variables', 'title'], emits: ['update:visible', 'save'] }, OptionsApiConfigDialog: { template: '<div />', props: ['visible', 'api'], emits: ['update:visible', 'save'] } } },
    })
    // Should show array items with category/value fields
    expect(wrapper.text()).toContain('分类')
    expect(wrapper.text()).toContain('值')
  })

  it('renders rawOption as json textarea for chart widget', () => {
    widgetStore.addWidget(createBarChartWidget())
    editorStore.select('bar-chart_test1')

    const wrapper = mount(PropertyPanel, {
      global: { stubs: { ...stubs, EventConfigDialog: { template: '<div />', props: ['visible', 'events'], emits: ['update:visible', 'save'] }, VariableConfigDialog: { template: '<div />', props: ['visible', 'variables', 'title'], emits: ['update:visible', 'save'] }, OptionsApiConfigDialog: { template: '<div />', props: ['visible', 'api'], emits: ['update:visible', 'save'] } } },
    })
    // rawOption should render as a textarea
    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)
  })
})
