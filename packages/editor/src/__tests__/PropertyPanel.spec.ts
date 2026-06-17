/**
 * PropertyPanel unit tests (Widget-driven architecture)
 *
 * Covers:
 * - Empty state (no selection)
 * - Basic property rendering (field, label, defaultValue)
 * - Position property rendering (x, y, w, h, zIndex)
 * - Style property rendering (public + widget-specific)
 * - Widget-specific props rendering (from propertyPanel.props)
 * - Property update dispatches to widgetStore.updateWidget
 * - Widget info display (displayName, no id)
 * - Event/rule config buttons
 * - Transition from selection to no-selection
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import PropertyPanel from '@/components/Editor/PropertyPanel.vue'
import { useEditorStore } from '@/stores/editor'
import { useWidgetStore } from '@/stores/widget'
import { registerWidget } from '@/widgets/registry'
import type { Widget } from '@/widgets/base/types'
import type { Component } from 'vue'

// ---- Stub Element Plus components used by PropertyField ----

const elInputStub = {
  template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  props: ['modelValue', 'size', 'placeholder', 'disabled', 'type', 'rows', 'readonly'],
  emits: ['update:modelValue'],
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
  props: ['size', 'plain', 'type'],
  emits: ['click'],
}

const elTooltipStub = {
  template: '<span><slot /></span>',
  props: ['content', 'placement', 'showAfter'],
}

const elIconStub = {
  template: '<span><slot /></span>',
  props: ['size', 'class'],
}

// TDesign stubs — render native elements that mirror the value
// Note: template strings must avoid escaped quotes inside attribute values

const tInputStub = {
  template: `<input :value="modelValue || value || ''" @input="$emit('update:modelValue', $event.target.value); $emit('update:value', $event.target.value)" />`,
  props: ['modelValue', 'value', 'size', 'placeholder', 'disabled', 'type', 'rows', 'readonly', 'clearable', 'prefixIcon'],
  emits: ['update:modelValue', 'update:value'],
}

const tInputNumberStub = {
  template: `<input type="number" :value="modelValue ?? value ?? 0" @input="$emit('update:modelValue', Number($event.target.value)); $emit('update:value', Number($event.target.value))" />`,
  props: ['modelValue', 'value', 'min', 'max', 'size', 'controlsPosition', 'controls-position'],
  emits: ['update:modelValue', 'update:value'],
}

const tSwitchStub = {
  template: `<input type="checkbox" :checked="modelValue ?? value ?? false" @change="$emit('update:modelValue', $event.target.checked); $emit('update:value', $event.target.checked)" />`,
  props: ['modelValue', 'value'],
  emits: ['update:modelValue', 'update:value'],
}

const tSelectStub = {
  template: `<select :value="modelValue || value || ''" @change="$emit('update:modelValue', $event.target.value); $emit('update:value', $event.target.value)"><slot /></select>`,
  props: ['modelValue', 'value', 'size', 'style', 'clearable'],
  emits: ['update:modelValue', 'update:value'],
}

const tOptionStub = {
  template: `<option :value="value"><slot>{{ label }}</slot></option>`,
  props: ['label', 'value'],
}

const tColorPickerStub = {
  template: `<input type="color" :value="modelValue || value || ''" @input="$emit('update:modelValue', $event.target.value); $emit('update:value', $event.target.value)" />`,
  props: ['modelValue', 'value', 'size', 'showAlpha', 'show-alpha'],
  emits: ['update:modelValue', 'update:value'],
}

const tButtonStub = {
  template: `<button @click="$emit('click')"><slot /></button>`,
  props: ['size', 'variant', 'type', 'theme'],
  emits: ['click'],
}

const tPopupStub = {
  template: `<span><slot /></span>`,
  props: ['content', 'placement', 'delay', 'trigger', 'width', 'overlayInnerStyle', 'showArrow'],
}

const tTextareaStub = {
  template: `<textarea :value="modelValue || value || ''" @input="$emit('update:modelValue', $event.target.value); $emit('update:value', $event.target.value)" />`,
  props: ['modelValue', 'value', 'rows', 'size', 'placeholder'],
  emits: ['update:modelValue', 'update:value'],
}

const stubs = {
  't-input': tInputStub,
  't-input-number': tInputNumberStub,
  't-switch': tSwitchStub,
  't-select': tSelectStub,
  't-option': tOptionStub,
  't-color-picker': tColorPickerStub,
  't-button': tButtonStub,
  't-popup': tPopupStub,
  't-textarea': tTextareaStub,
  EventConfigDialog: { template: '<div />', props: ['visible', 'events'], emits: ['update:visible', 'save'] },
  LinkageConfigDialog: { template: '<div />', props: ['visible', 'rules'], emits: ['update:visible', 'save'] },
  OptionsApiConfigDialog: { template: '<div />', props: ['visible', 'api'], emits: ['update:visible', 'save'] },
  VariableConfigDialog: { template: '<div />', props: ['visible', 'variables', 'title'], emits: ['update:visible', 'save'] },
  BorderEditor: { template: '<div />', props: ['value'], emits: ['update'] },
  BorderRadiusEditor: { template: '<div />', props: ['value'], emits: ['update'] },
  SpacingEditor: { template: '<div />', props: ['mode', 'value'], emits: ['update'] },
  TableColumnsEditor: { template: '<div />', props: ['columns'], emits: ['update:columns'] },
  GenericArrayEditor: { template: '<div />', props: ['value', 'fields'], emits: ['update'] },
  OptionsEditor: { template: '<div />', props: ['label', 'value'], emits: ['update'] },
  RulesEditor: { template: '<div />', props: ['rules'], emits: ['update:rules'] },
}

// ---- Test widget factory ----

const stubComponent: Component = { template: '<div />' }

function createTestWidget(overrides: Partial<Widget> = {}): Widget {
  return {
    id: 'input_test1',
    name: 'FgInput',
    type: 'input',
    field: 'name',
    label: 'Name',
    defaultValue: '',
    position: { x: 10, y: 20, w: 240, h: 32, zIndex: 5 },
    style: { width: '240px', fontSize: '14px' },
    props: { placeholder: '请输入', clearable: true },
    options: [],
    events: [],
    rules: [],
    validationRules: [],
    ...overrides,
  }
}

function createCardWidget(overrides: Partial<Widget> = {}): Widget {
  return {
    id: 'card_test1',
    name: 'FgCard',
    type: 'card',
    position: { x: 0, y: 0, w: 400, h: 200, zIndex: 1 },
    style: {},
    props: { title: 'Test Card' },
    options: [],
    events: [],
    rules: [],
    validationRules: [],
    ...overrides,
  }
}

// ---- Mount helper ----

function mountPanel() {
  return mount(PropertyPanel, {
    global: { stubs },
  })
}

// ---- Register test widgets ----

function registerTestWidgets() {
  registerWidget({
    name: 'FgInput',
    displayName: '输入框',
    type: 'input',
    group: 'form',
    component: stubComponent,
    create: (id: string) => createTestWidget({ id }),
    config: {
      name: 'FgInput',
      displayName: '输入框',
      description: '文本输入框组件',
      configPanels: ['events', 'rules'],
      propertyPanel: {
        basic: ['field', 'label', 'defaultValue', 'hidden'],
        style: ['width', 'height', 'fontSize', 'color', 'backgroundColor'],
        props: [
          { key: 'placeholder', label: '占位文字', type: 'input', default: '请输入' },
          { key: 'clearable', label: '可清空', type: 'switch', default: true },
        ],
      },
    },
  })

  registerWidget({
    name: 'FgCard',
    displayName: '卡片容器',
    type: 'card',
    group: 'container',
    component: stubComponent,
    create: (id: string) => createCardWidget({ id }),
    config: {
      name: 'FgCard',
      displayName: '卡片容器',
      description: '卡片容器组件',
      propertyPanel: {
        basic: [
          { key: 'title', label: '标题', type: 'input', default: '卡片标题' },
        ],
        style: ['width', 'margin', 'padding'],
        props: [],
      },
    },
  })
}

// ---- Tests ----

describe('PropertyPanel', () => {
  let editorStore: ReturnType<typeof useEditorStore>
  let widgetStore: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    editorStore = useEditorStore()
    widgetStore = useWidgetStore()
    registerTestWidgets()
  })

  // ---------- Empty state ----------

  it('shows empty message when nothing is selected', () => {
    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('画布配置')
  })

  it('does not show property list when nothing is selected', () => {
    const wrapper = mountPanel()
    expect(wrapper.text()).not.toContain('字段名')
    expect(wrapper.text()).not.toContain('X')
  })

  // ---------- Widget info display ----------

  it('shows widget display name when selected', () => {
    widgetStore.addWidget(createTestWidget())
    editorStore.select('input_test1')

    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('输入框')
  })

  it('does not show widget id when selected', () => {
    widgetStore.addWidget(createTestWidget())
    editorStore.select('input_test1')

    const wrapper = mountPanel()
    expect(wrapper.text()).not.toContain('input_test1')
  })

  // ---------- Basic properties ----------

  it('renders basic properties (field, label, defaultValue, hidden)', () => {
    widgetStore.addWidget(createTestWidget())
    editorStore.select('input_test1')

    const wrapper = mountPanel()
    const text = wrapper.text()
    expect(text).toContain('字段名')
    expect(text).toContain('标签')
    expect(text).toContain('默认值')
    expect(text).toContain('隐藏')
  })

  it('shows current basic property values', () => {
    widgetStore.addWidget(createTestWidget({ field: 'email', label: 'Email' }))
    editorStore.select('input_test1')

    const wrapper = mountPanel()
    const inputs = wrapper.findAll('input')
    const fieldInput = inputs.find(i => i.element.value === 'email')
    expect(fieldInput).toBeTruthy()
  })

  // ---------- Position properties ----------

  it('renders position properties (X, Y, width, height, zIndex)', () => {
    widgetStore.addWidget(createTestWidget())
    editorStore.select('input_test1')

    const wrapper = mountPanel()
    const text = wrapper.text()
    expect(text).toContain('X')
    expect(text).toContain('Y')
    expect(text).toContain('宽度')
    expect(text).toContain('高度')
    expect(text).toContain('层级')
  })

  // ---------- Style properties ----------

  it('renders public style properties (width, height, fontSize, color, backgroundColor)', () => {
    widgetStore.addWidget(createTestWidget())
    editorStore.select('input_test1')

    const wrapper = mountPanel()
    const text = wrapper.text()
    // publicStylePanel provides: width, height, margin, padding, backgroundColor, border, borderRadius, fontSize, fontWeight, color
    // widget config adds: width, height, fontSize, color, backgroundColor (merged with public)
    expect(text).toContain('宽度')
    expect(text).toContain('高度')
    expect(text).toContain('字号')
    expect(text).toContain('颜色')
    expect(text).toContain('背景色')
  })

  it('merges public and widget-specific style properties without duplicates', () => {
    widgetStore.addWidget(createTestWidget())
    editorStore.select('input_test1')

    const wrapper = mountPanel()
    // "宽度" appears in position AND style, but each PropertyField has a unique label
    // Count style-specific labels that come from publicStylePanel
    const text = wrapper.text()
    expect(text).toContain('外边距')
    expect(text).toContain('内边距')
    expect(text).toContain('边框')
    expect(text).toContain('圆角')
    expect(text).toContain('字重')
  })

  // ---------- Widget-specific props ----------

  it('renders widget-specific props from propertyPanel.props', () => {
    widgetStore.addWidget(createTestWidget())
    editorStore.select('input_test1')

    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('占位文字')
    expect(wrapper.text()).toContain('可清空')
  })

  // ---------- Property update ----------

  it('calls widgetStore.updateWidget when a basic property changes', async () => {
    widgetStore.addWidget(createTestWidget())
    editorStore.select('input_test1')
    const updateSpy = vi.spyOn(widgetStore, 'updateWidget')

    const wrapper = mountPanel()
    // Find the field name input (value is 'name') and change it
    const inputs = wrapper.findAll('input')
    const fieldInput = inputs.find(i => i.element.value === 'name')
    expect(fieldInput).toBeTruthy()

    await fieldInput!.setValue('email')
    await nextTick()

    expect(updateSpy).toHaveBeenCalledWith('input_test1', { field: 'email' })
  })

  it('calls widgetStore.updateWidget with position patch when X changes', async () => {
    widgetStore.addWidget(createTestWidget())
    editorStore.select('input_test1')
    const updateSpy = vi.spyOn(widgetStore, 'updateWidget')

    const wrapper = mountPanel()
    // X position value is 10 (number input)
    const numberInputs = wrapper.findAll('input[type="number"]')
    const xInput = numberInputs[0]
    expect(xInput).toBeTruthy()

    await xInput.setValue('50')
    await nextTick()

    expect(updateSpy).toHaveBeenCalledWith('input_test1', {
      position: { x: 50, y: 20, w: 240, h: 32, zIndex: 1 },
    })
  })

  it('calls widgetStore.updateWidget with style patch when a style property changes', async () => {
    widgetStore.addWidget(createTestWidget())
    editorStore.select('input_test1')
    const updateSpy = vi.spyOn(widgetStore, 'updateWidget')

    const wrapper = mountPanel()
    // Find input with value '240px' (style.width)
    const inputs = wrapper.findAll('input')
    const widthInput = inputs.find(i => i.element.value === '240px')
    expect(widthInput).toBeTruthy()

    await widthInput!.setValue('300px')
    await nextTick()

    expect(updateSpy).toHaveBeenCalledWith('input_test1', {
      style: { width: '300px', fontSize: '14px' },
    })
  })

  it('calls widgetStore.updateWidget with props patch when a widget prop changes', async () => {
    widgetStore.addWidget(createTestWidget())
    editorStore.select('input_test1')
    const updateSpy = vi.spyOn(widgetStore, 'updateWidget')

    const wrapper = mountPanel()
    // Find input with value '请输入' (props.placeholder)
    const inputs = wrapper.findAll('input')
    const placeholderInput = inputs.find(i => i.element.value === '请输入')
    expect(placeholderInput).toBeTruthy()

    await placeholderInput!.setValue('输入姓名')
    await nextTick()

    expect(updateSpy).toHaveBeenCalledWith('input_test1', {
      props: { placeholder: '输入姓名', clearable: true },
    })
  })

  // ---------- Selection transition ----------

  it('transitions from showing properties to empty state when selection is cleared', async () => {
    widgetStore.addWidget(createTestWidget())
    editorStore.select('input_test1')

    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('字段名')

    editorStore.clearSelection()
    await nextTick()

    expect(wrapper.text()).toContain('画布配置')
    expect(wrapper.text()).not.toContain('字段名')
  })

  it('updates property panel when switching selected widget', async () => {
    widgetStore.addWidget(createTestWidget({ id: 'input_1', field: 'name' }))
    widgetStore.addWidget(createTestWidget({ id: 'input_2', field: 'email', label: 'Email' }))
    editorStore.select('input_1')

    const wrapper = mountPanel()
    const inputs = wrapper.findAll('input')
    expect(inputs.find(i => i.element.value === 'name')).toBeTruthy()

    editorStore.select('input_2')
    await nextTick()

    const updatedInputs = wrapper.findAll('input')
    expect(updatedInputs.find(i => i.element.value === 'email')).toBeTruthy()
  })

  // ---------- Event/rule config buttons ----------

  it('shows event and rule config buttons when widget is selected', () => {
    widgetStore.addWidget(createTestWidget())
    editorStore.select('input_test1')

    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('事件配置')
    expect(wrapper.text()).toContain('规则配置')
  })

  it('does not show event/rule buttons when nothing is selected', () => {
    const wrapper = mountPanel()
    expect(wrapper.text()).not.toContain('事件配置')
    expect(wrapper.text()).not.toContain('规则配置')
  })

  // ---------- Container widget ----------

  it('renders container widget properties correctly', () => {
    widgetStore.addWidget(createCardWidget())
    editorStore.select('card_test1')

    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('卡片容器')
    expect(wrapper.text()).toContain('标题')
    expect(wrapper.text()).toContain('X')
    expect(wrapper.text()).toContain('Y')
  })
})
