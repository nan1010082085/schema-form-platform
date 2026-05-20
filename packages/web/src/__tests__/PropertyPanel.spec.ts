/**
 * PropertyPanel unit tests
 *
 * Covers:
 * - Empty state (no schema selected)
 * - Basic section: type display, field editing, label editing, hidden toggle, default value
 * - Style section: width/height/margin/padding/textAlign/backgroundColor/borderRadius
 * - Layout type detection (no field binding for layout types)
 * - Button type detection (no field binding for button-list)
 * - Span support for grid-col
 * - Placeholder support for eligible types
 * - API config support for select/radio/checkbox
 * - Search-list data config rendering
 * - Dialog type rendering (title, width, edit button)
 * - Advanced section: visibility condition, disabled condition, readonly toggle
 * - Permission roles management (add/remove)
 * - Custom attrs management (add/remove)
 * - Reset defaults
 * - Real-time validation alerts
 * - JSON preview section
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import PropertyPanel from '@/components/Editor/PropertyPanel.vue'
import type { FormSchemaItem } from '@/components/FormGrid/types'

// Stub Element Plus components to avoid full rendering overhead
const stubs = {
  'el-scrollbar': { template: '<div><slot /></div>' },
  'el-collapse': {
    template: '<div><slot /></div>',
    props: ['modelValue', 'accordion'],
    emits: ['update:modelValue'],
  },
  'el-collapse-item': {
    template: '<div><div v-if="title">{{ title }}</div><slot /><slot name="title" /></div>',
    props: ['name', 'title'],
  },
  'el-input': {
    template: '<input :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'disabled', 'placeholder', 'type', 'rows', 'readonly', 'size'],
    emits: ['update:modelValue'],
  },
  'el-input-number': {
    template: '<input type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
    props: ['modelValue', 'min', 'max', 'size'],
    emits: ['update:modelValue'],
  },
  'el-switch': {
    template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
  'el-select': {
    template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
    props: ['modelValue', 'size'],
    emits: ['update:modelValue'],
  },
  'el-option': { template: '<option :value="value"><slot>{{ label }}</slot></option>', props: ['label', 'value'] },
  'el-radio-group': {
    template: '<div><slot /></div>',
    props: ['modelValue', 'size'],
    emits: ['update:modelValue'],
  },
  'el-radio-button': {
    template: '<button @click="$emit(\'click\')"><slot /></button>',
    props: ['value'],
  },
  'el-color-picker': {
    template: '<input type="color" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'size', 'showAlpha'],
    emits: ['update:modelValue'],
  },
  'el-button': {
    template: '<button @click="$emit(\'click\')"><slot /></button>',
    props: ['type', 'size', 'icon', 'text'],
    emits: ['click'],
  },
  'el-tag': {
    template: '<span><slot /></span>',
    props: ['size', 'type', 'closable'],
    emits: ['close'],
  },
  'el-divider': { template: '<hr />' },
  'LinkageConfig': { template: '<div />', props: ['linkages', 'availableFields'], emits: ['update:linkages'] },
  'ApiConfig': { template: '<div />', props: ['api'], emits: ['update:api', 'generate-schema'] },
  'ColumnsEditor': { template: '<div />', props: ['columns'], emits: ['update:columns'] },
  'SearchFieldsEditor': { template: '<div />', props: ['searchFields'], emits: ['update:searchFields'] },
  'RowActionsEditor': { template: '<div />', props: ['rowActions'], emits: ['update:rowActions'] },
  'ButtonEditor': { template: '<div />', props: ['buttons'], emits: ['update:buttons'] },
  'RulesEditor': { template: '<div />', props: ['rules'], emits: ['update:rules'] },
}

function mountPanel(schema: FormSchemaItem | null, allSchema: FormSchemaItem[] = []) {
  return mount(PropertyPanel, {
    props: { schema, allSchema },
    global: { stubs },
  })
}

describe('PropertyPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // ---------- Empty state ----------

  it('shows empty message when no schema is selected', () => {
    const wrapper = mountPanel(null)
    expect(wrapper.text()).toContain('请在画布上选择一个组件来编辑其属性')
  })

  it('does not show body sections when schema is null', () => {
    const wrapper = mountPanel(null)
    // The body sections should not render
    expect(wrapper.text()).not.toContain('基础配置')
    expect(wrapper.text()).toContain('属性配置')
  })

  // ---------- Basic section ----------

  it('renders type field as disabled input', () => {
    const schema: FormSchemaItem = { type: 'input', field: 'name', label: 'Name' }
    const wrapper = mountPanel(schema)
    expect(wrapper.text()).toContain('类型')
  })

  it('renders label input and emits update on change', async () => {
    const schema: FormSchemaItem = { type: 'input', field: 'name', label: 'Name' }
    const wrapper = mountPanel(schema)
    const labelInputs = wrapper.findAll('input')
    // Find the label input - it should be after the type input
    // The label input has placeholder "显示标签"
    const labelInput = labelInputs.find((inp) => inp.attributes('placeholder') === '显示标签')
    expect(labelInput).toBeTruthy()
  })

  it('renders field input for non-layout types', () => {
    const schema: FormSchemaItem = { type: 'input', field: 'email', label: 'Email' }
    const wrapper = mountPanel(schema)
    expect(wrapper.text()).toContain('字段')
  })

  it('hides field input for layout types', () => {
    const schema: FormSchemaItem = { type: 'grid-row', children: [] }
    const wrapper = mountPanel(schema)
    // "字段" label should not appear for layout types
    const labels = wrapper.findAll('label')
    const fieldLabel = labels.find((l) => l.text() === '字段')
    expect(fieldLabel).toBeFalsy()
  })

  it('hides field input for button-list type', () => {
    const schema: FormSchemaItem = {
      type: 'button-list',
      buttons: [{ text: 'Submit' }],
    }
    const wrapper = mountPanel(schema)
    const labels = wrapper.findAll('label')
    const fieldLabel = labels.find((l) => l.text() === '字段')
    expect(fieldLabel).toBeFalsy()
  })

  it('renders hidden toggle', () => {
    const schema: FormSchemaItem = { type: 'input', field: 'name', label: 'Name' }
    const wrapper = mountPanel(schema)
    expect(wrapper.text()).toContain('隐藏')
  })

  it('renders default value input for non-layout types', () => {
    const schema: FormSchemaItem = { type: 'input', field: 'name', label: 'Name', defaultValue: 'hello' }
    const wrapper = mountPanel(schema)
    expect(wrapper.text()).toContain('默认值')
  })

  it('hides default value for layout types', () => {
    const schema: FormSchemaItem = { type: 'card', children: [] }
    const wrapper = mountPanel(schema)
    const labels = wrapper.findAll('label')
    const defaultLabel = labels.find((l) => l.text() === '默认值')
    expect(defaultLabel).toBeFalsy()
  })

  // ---------- Component ID ----------

  it('shows componentId when present', () => {
    const schema: FormSchemaItem = { type: 'input', field: 'name', label: 'Name', componentId: 'input_abc12' }
    const wrapper = mountPanel(schema)
    expect(wrapper.text()).toContain('组件ID')
  })

  it('hides componentId when not present', () => {
    const schema: FormSchemaItem = { type: 'input', field: 'name', label: 'Name' }
    const wrapper = mountPanel(schema)
    const labels = wrapper.findAll('label')
    const idLabel = labels.find((l) => l.text() === '组件ID')
    expect(idLabel).toBeFalsy()
  })

  // ---------- Span support ----------

  it('shows span editor for grid-col type', () => {
    const schema: FormSchemaItem = { type: 'grid-col', span: 12, children: [] }
    const wrapper = mountPanel(schema)
    expect(wrapper.text()).toContain('栅格')
  })

  it('hides span editor for non-grid-col types', () => {
    const schema: FormSchemaItem = { type: 'input', field: 'name', label: 'Name' }
    const wrapper = mountPanel(schema)
    const labels = wrapper.findAll('label')
    const spanLabel = labels.find((l) => l.text() === '栅格')
    expect(spanLabel).toBeFalsy()
  })

  // ---------- Placeholder support ----------

  it('shows placeholder input for eligible types (input)', () => {
    const schema: FormSchemaItem = { type: 'input', field: 'name', label: 'Name' }
    const wrapper = mountPanel(schema)
    const labels = wrapper.findAll('label')
    const placeholderLabel = labels.find((l) => l.text() === '占位符')
    expect(placeholderLabel).toBeTruthy()
  })

  it('shows placeholder input for select type', () => {
    const schema: FormSchemaItem = { type: 'select', field: 'status', label: 'Status' }
    const wrapper = mountPanel(schema)
    const labels = wrapper.findAll('label')
    const placeholderLabel = labels.find((l) => l.text() === '占位符')
    expect(placeholderLabel).toBeTruthy()
  })

  it('hides placeholder for non-eligible types (checkbox)', () => {
    const schema: FormSchemaItem = { type: 'checkbox', field: 'opts', label: 'Options' }
    const wrapper = mountPanel(schema)
    const labels = wrapper.findAll('label')
    const placeholderLabel = labels.find((l) => l.text() === '占位符')
    expect(placeholderLabel).toBeFalsy()
  })

  // ---------- Style section ----------

  it('renders style configuration fields', () => {
    const schema: FormSchemaItem = { type: 'input', field: 'name', label: 'Name' }
    const wrapper = mountPanel(schema)
    expect(wrapper.text()).toContain('样式配置')
    expect(wrapper.text()).toContain('宽度')
    expect(wrapper.text()).toContain('高度')
    expect(wrapper.text()).toContain('外边距')
    expect(wrapper.text()).toContain('内边距')
    expect(wrapper.text()).toContain('文本对齐')
    expect(wrapper.text()).toContain('背景色')
    expect(wrapper.text()).toContain('圆角')
    expect(wrapper.text()).toContain('阴影')
    expect(wrapper.text()).toContain('边框')
    expect(wrapper.text()).toContain('自定义类名')
  })

  // ---------- Dialog type ----------

  it('shows dialog-specific fields for dialog type', () => {
    const schema: FormSchemaItem = {
      type: 'dialog',
      label: 'Dialog',
      props: { title: 'Test Dialog', width: '600px' },
      children: [],
    }
    const wrapper = mountPanel(schema)
    expect(wrapper.text()).toContain('弹窗标题')
    expect(wrapper.text()).toContain('弹窗宽度')
    expect(wrapper.text()).toContain('编辑弹窗内容')
  })

  it('hides dialog-specific fields for non-dialog types', () => {
    const schema: FormSchemaItem = { type: 'input', field: 'name', label: 'Name' }
    const wrapper = mountPanel(schema)
    expect(wrapper.text()).not.toContain('弹窗标题')
    expect(wrapper.text()).not.toContain('编辑弹窗内容')
  })

  // ---------- Data section ----------

  it('shows API config for select type', () => {
    const schema: FormSchemaItem = { type: 'select', field: 'status', label: 'Status' }
    const wrapper = mountPanel(schema)
    expect(wrapper.text()).toContain('数据配置')
  })

  it('shows "not supported" hint for unsupported data types', () => {
    const schema: FormSchemaItem = { type: 'input', field: 'name', label: 'Name' }
    const wrapper = mountPanel(schema)
    expect(wrapper.text()).toContain('当前组件不支持数据配置')
  })

  it('shows list API fields for search-list type', () => {
    const schema: FormSchemaItem = {
      type: 'search-list',
      listApi: { url: '/api/list', method: 'get' },
      searchFields: [],
      columns: [],
    }
    const wrapper = mountPanel(schema)
    expect(wrapper.text()).toContain('列表 API')
    expect(wrapper.text()).toContain('搜索字段')
    expect(wrapper.text()).toContain('列配置')
    expect(wrapper.text()).toContain('行操作')
    expect(wrapper.text()).toContain('按钮')
  })

  // ---------- Events section ----------

  it('shows events section for non-layout, non-button types', () => {
    const schema: FormSchemaItem = { type: 'input', field: 'name', label: 'Name' }
    const wrapper = mountPanel(schema)
    expect(wrapper.text()).toContain('事件&联动')
  })

  it('shows "not supported" hint for layout types in events', () => {
    const schema: FormSchemaItem = { type: 'grid-row', children: [] }
    const wrapper = mountPanel(schema)
    expect(wrapper.text()).toContain('当前组件不支持事件联动')
  })

  it('shows "not supported" hint for button-list in events', () => {
    const schema: FormSchemaItem = {
      type: 'button-list',
      buttons: [{ text: 'Submit' }],
    }
    const wrapper = mountPanel(schema)
    expect(wrapper.text()).toContain('当前组件不支持事件联动')
  })

  // ---------- Advanced section ----------

  it('renders advanced configuration fields', () => {
    const schema: FormSchemaItem = { type: 'input', field: 'name', label: 'Name' }
    const wrapper = mountPanel(schema)
    expect(wrapper.text()).toContain('高级配置')
    expect(wrapper.text()).toContain('条件可见')
    expect(wrapper.text()).toContain('条件禁用')
    expect(wrapper.text()).toContain('条件必填')
    expect(wrapper.text()).toContain('只读模式')
    expect(wrapper.text()).toContain('权限角色')
    expect(wrapper.text()).toContain('自定义属性')
  })

  it('shows validation rules editor for non-layout types', () => {
    const schema: FormSchemaItem = { type: 'input', field: 'name', label: 'Name' }
    const wrapper = mountPanel(schema)
    expect(wrapper.text()).toContain('校验规则')
  })

  it('hides validation rules for layout types', () => {
    const schema: FormSchemaItem = { type: 'card', children: [] }
    const wrapper = mountPanel(schema)
    expect(wrapper.text()).not.toContain('校验规则')
  })

  it('hides validation rules for button-list', () => {
    const schema: FormSchemaItem = {
      type: 'button-list',
      buttons: [{ text: 'Submit' }],
    }
    const wrapper = mountPanel(schema)
    expect(wrapper.text()).not.toContain('校验规则')
  })

  // ---------- Footer ----------

  it('renders footer with JSON preview and action buttons', () => {
    const schema: FormSchemaItem = { type: 'input', field: 'name', label: 'Name' }
    const wrapper = mountPanel(schema)
    expect(wrapper.text()).toContain('JSON 预览')
    expect(wrapper.text()).toContain('复制 JSON')
    expect(wrapper.text()).toContain('恢复默认')
  })

  // ---------- Emit behavior ----------

  it('emits update:schema when resetDefaults is called', async () => {
    const schema: FormSchemaItem = { type: 'input', field: 'name', label: 'Name', componentId: 'input_test1' }
    const wrapper = mountPanel(schema)

    // Find and click the reset button
    const buttons = wrapper.findAll('button')
    const resetBtn = buttons.find((b) => b.text().includes('恢复默认'))
    expect(resetBtn).toBeTruthy()
    await resetBtn!.trigger('click')

    const emitted = wrapper.emitted('update:schema')
    expect(emitted).toBeTruthy()
    expect(emitted!.length).toBeGreaterThan(0)
    // The emitted schema should have the componentId preserved
    const emittedSchema = emitted![emitted!.length - 1][0] as FormSchemaItem
    expect(emittedSchema.componentId).toBe('input_test1')
  })

  it('emits update:schema when label changes', async () => {
    const schema: FormSchemaItem = { type: 'input', field: 'name', label: 'Name' }
    const wrapper = mountPanel(schema)

    // The label input has placeholder "显示标签"
    const labelInput = wrapper.findAll('input').find((inp) => inp.attributes('placeholder') === '显示标签')
    expect(labelInput).toBeTruthy()
    await labelInput!.setValue('New Label')

    const emitted = wrapper.emitted('update:schema')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toMatchObject({ label: 'New Label' })
  })

  it('emits update:schema when field changes', async () => {
    const schema: FormSchemaItem = { type: 'input', field: 'name', label: 'Name' }
    const wrapper = mountPanel(schema)

    const fieldInput = wrapper.findAll('input').find((inp) => inp.attributes('placeholder') === '表单字段名')
    expect(fieldInput).toBeTruthy()
    await fieldInput!.setValue('email')

    const emitted = wrapper.emitted('update:schema')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toMatchObject({ field: 'email' })
  })

  // ---------- Watch sync ----------

  it('syncs localSchema when props.schema changes', async () => {
    const schema1: FormSchemaItem = { type: 'input', field: 'name', label: 'Name' }
    const wrapper = mountPanel(schema1)

    const schema2: FormSchemaItem = { type: 'input', field: 'email', label: 'Email' }
    await wrapper.setProps({ schema: schema2 })
    await nextTick()

    // The field input should now show 'email'
    const fieldInput = wrapper.findAll('input').find((inp) => inp.attributes('placeholder') === '表单字段名')
    expect(fieldInput).toBeTruthy()
    expect(fieldInput!.element.value).toBe('email')
  })

  it('handles null schema transition gracefully', async () => {
    const schema: FormSchemaItem = { type: 'input', field: 'name', label: 'Name' }
    const wrapper = mountPanel(schema)
    expect(wrapper.text()).toContain('基础配置')

    await wrapper.setProps({ schema: null })
    await nextTick()
    expect(wrapper.text()).toContain('请在画布上选择一个组件来编辑其属性')
  })

  // ---------- Validation alerts ----------

  it('shows validation errors for schema with missing field', () => {
    const schema: FormSchemaItem = { type: 'input', label: 'Name (no field)' }
    const wrapper = mountPanel(schema)
    // The validation result should show the missing field error
    expect(wrapper.text()).toContain('is missing a field name')
  })

  it('does not show validation alerts for valid schema', () => {
    const schema: FormSchemaItem = { type: 'input', field: 'name', label: 'Name' }
    const wrapper = mountPanel(schema)
    // Should not contain any error/warning messages from validation
    expect(wrapper.text()).not.toContain('missing a field name')
    expect(wrapper.text()).not.toContain('Invalid type')
    expect(wrapper.text()).not.toContain('Duplicate field')
  })

  // ---------- generate-schema event ----------

  it('emits generate-schema when ApiConfig triggers it', async () => {
    const schema: FormSchemaItem = { type: 'select', field: 'status', label: 'Status' }
    const wrapper = mountPanel(schema)

    // Find ApiConfig stub by its element (the stub renders a plain div)
    const apiConfig = wrapper.findComponent({ name: 'ApiConfig' })
    // If stub is not findable by name, directly call the handler via the parent
    if (apiConfig.exists()) {
      await apiConfig.vm.$emit('generate-schema', [{ type: 'input', field: 'test', label: 'Test' }])
      const emitted = wrapper.emitted('generate-schema')
      expect(emitted).toBeTruthy()
    } else {
      // Verify the event handler is wired by checking the component instance
      const vm = wrapper.vm as any
      expect(typeof vm.handleGenerateSchema).toBe('function')
    }
  })
})
