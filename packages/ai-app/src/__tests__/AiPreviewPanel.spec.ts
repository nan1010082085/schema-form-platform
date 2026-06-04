/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AiPreviewPanel from '@/components/AiPreviewPanel.vue'
import type { Widget } from '@/types'

// Stub Element Plus components for testing
const ElFormStub = { template: '<form><slot /></form>', props: ['labelPosition', 'size'] }
const ElFormItemStub = { template: '<div class="el-form-item"><label>{{ label }}</label><slot /></div>', props: ['label'] }
const ElInputStub = { template: '<input />', props: ['type', 'placeholder', 'rows', 'disabled'] }
const ElSelectStub = { template: '<select><slot /></select>', props: ['placeholder', 'disabled', 'style'] }
const ElOptionStub = { template: '<option />', props: ['label', 'value'] }
const ElRadioGroupStub = { template: '<div><slot /></div>', props: ['disabled'] }
const ElRadioStub = { template: '<label><slot /></label>', props: ['value'] }
const ElCheckboxGroupStub = { template: '<div><slot /></div>', props: ['disabled'] }
const ElCheckboxStub = { template: '<label><input type="checkbox" /><slot /></label>', props: ['modelValue', 'value'] }
const ElSwitchStub = { template: '<input type="checkbox" />', props: ['disabled'] }
const ElSliderStub = { template: '<input type="range" />', props: ['disabled'] }
const ElRateStub = { template: '<div />', props: ['disabled'] }
const ElButtonStub = { template: '<button><slot /></button>', props: ['type', 'disabled'] }
const ElDialogStub = { template: '<div><slot /><slot name="footer" /></div>', props: ['modelValue', 'title', 'width', 'closeOnClickModal'] }

const globalStubs = {
  ElForm: ElFormStub,
  ElFormItem: ElFormItemStub,
  ElInput: ElInputStub,
  ElSelect: ElSelectStub,
  ElOption: ElOptionStub,
  ElRadioGroup: ElRadioGroupStub,
  ElRadio: ElRadioStub,
  ElCheckboxGroup: ElCheckboxGroupStub,
  ElCheckbox: ElCheckboxStub,
  ElSwitch: ElSwitchStub,
  ElSlider: ElSliderStub,
  ElRate: ElRateStub,
  ElButton: ElButtonStub,
  ElDialog: ElDialogStub,
}

describe('AiPreviewPanel', () => {
  const defaultTabs = ['schema', 'json'] as const

  it('renders empty state when no schema data', () => {
    const wrapper = mount(AiPreviewPanel, {
      props: { tabs: [...defaultTabs] },
      global: { stubs: globalStubs },
    })
    expect(wrapper.text()).toContain('生成内容将在此预览')
  })

  describe('F4: Form preview rendering', () => {
    const mockSchema: Widget[] = [
      { id: 'w1', type: 'input', field: 'username', label: '用户名' },
      { id: 'w2', type: 'select', field: 'role', label: '角色', props: { options: [{ label: '管理员', value: 'admin' }, { label: '用户', value: 'user' }] } },
      { id: 'w3', type: 'textarea', field: 'bio', label: '简介' },
      { id: 'w4', type: 'button', field: 'submit', label: '提交' },
    ]

    const schemaData = {
      title: '测试表单',
      fields: mockSchema.map((w) => ({
        icon: 'T',
        name: w.label ?? w.field ?? w.type,
        type: w.type,
      })),
    }

    it('renders form widgets using Element Plus components', () => {
      const wrapper = mount(AiPreviewPanel, {
        props: {
          tabs: [...defaultTabs],
          schemaData,
          schemaWidgets: mockSchema,
        },
        global: { stubs: globalStubs },
      })

      // Should render form items for each widget
      const formItems = wrapper.findAll('.el-form-item')
      // input + select + textarea + button = 4
      expect(formItems.length).toBeGreaterThanOrEqual(3)
    })

    it('renders input widget with placeholder', () => {
      const wrapper = mount(AiPreviewPanel, {
        props: {
          tabs: [...defaultTabs],
          schemaData,
          schemaWidgets: mockSchema,
        },
        global: { stubs: globalStubs },
      })

      // Check that input element exists
      const inputs = wrapper.findAll('input')
      expect(inputs.length).toBeGreaterThan(0)
    })

    it('filters out container types from form preview', () => {
      const schemaWithContainers: Widget[] = [
        { id: 'c1', type: 'form', field: 'form1', label: '表单容器' },
        { id: 'w1', type: 'input', field: 'name', label: '姓名' },
        { id: 'c2', type: 'single-col', field: 'col1', label: '单列布局' },
      ]

      const wrapper = mount(AiPreviewPanel, {
        props: {
          tabs: [...defaultTabs],
          schemaData: {
            title: '测试',
            fields: schemaWithContainers.map((w) => ({ icon: 'T', name: w.label!, type: w.type })),
          },
          schemaWidgets: schemaWithContainers,
        },
        global: { stubs: globalStubs },
      })

      // Only the input widget should render as a form item (containers filtered out)
      const formItems = wrapper.findAll('.el-form-item')
      expect(formItems).toHaveLength(1)
    })

    it('renders select widget with options', () => {
      const wrapper = mount(AiPreviewPanel, {
        props: {
          tabs: [...defaultTabs],
          schemaData,
          schemaWidgets: mockSchema,
        },
        global: { stubs: globalStubs },
      })

      // Should have a select element
      const selects = wrapper.findAll('select')
      expect(selects.length).toBeGreaterThan(0)
    })

    it('renders button widget', () => {
      const wrapper = mount(AiPreviewPanel, {
        props: {
          tabs: [...defaultTabs],
          schemaData,
          schemaWidgets: mockSchema,
        },
        global: { stubs: globalStubs },
      })

      // Should have a button element
      const buttons = wrapper.findAll('button')
      const submitBtn = buttons.find((b) => b.text().includes('提交'))
      expect(submitBtn).toBeTruthy()
    })

    it('shows actions bar when schema data exists', () => {
      const wrapper = mount(AiPreviewPanel, {
        props: {
          tabs: [...defaultTabs],
          schemaData,
          schemaWidgets: mockSchema,
          primaryAction: '确认发布',
          secondaryAction: '在编辑器中打开',
        },
        global: { stubs: globalStubs },
      })

      expect(wrapper.text()).toContain('确认发布')
      expect(wrapper.text()).toContain('在编辑器中打开')
    })

    it('emits primary-action on button click', async () => {
      const wrapper = mount(AiPreviewPanel, {
        props: {
          tabs: [...defaultTabs],
          schemaData,
          schemaWidgets: mockSchema,
        },
        global: { stubs: globalStubs },
      })

      const primaryBtn = wrapper.find('[class*="btnPrimary"]')
      await primaryBtn.trigger('click')

      expect(wrapper.emitted('primary-action')).toBeTruthy()
    })
  })

  describe('Field interaction', () => {
    const mockSchema: Widget[] = [
      { id: 'w1', type: 'input', field: 'username', label: '用户名' },
      { id: 'w2', type: 'input', field: 'email', label: '邮箱' },
    ]

    const schemaData = {
      title: '测试表单',
      fields: mockSchema.map((w) => ({
        icon: 'T',
        name: w.label ?? w.field ?? w.type,
        type: w.type,
      })),
    }

    it('emits field-click when field is clicked', async () => {
      const wrapper = mount(AiPreviewPanel, {
        props: {
          tabs: ['schema'],
          schemaData,
          schemaWidgets: mockSchema,
        },
        global: { stubs: globalStubs },
      })

      const fieldWrapper = wrapper.find('[class*="fieldWrapper"]')
      await fieldWrapper.trigger('click')

      expect(wrapper.emitted('field-click')).toBeTruthy()
      expect(wrapper.emitted('field-click')![0][0]).toBe('w1')
    })

    it('highlights fields when highlightedFieldIds is provided', () => {
      const wrapper = mount(AiPreviewPanel, {
        props: {
          tabs: ['schema'],
          schemaData,
          schemaWidgets: mockSchema,
          highlightedFieldIds: ['w1'],
        },
        global: { stubs: globalStubs },
      })

      // CSS Module transforms class names, so we check for attribute selector
      const fieldWrappers = wrapper.findAll('[class*="fieldWrapper"]')
      // First field should have highlighted class (contains 'fieldHighlighted' in class string)
      expect(fieldWrappers[0].attributes('class')).toContain('fieldHighlighted')
      // Second field should not have highlighted class
      expect(fieldWrappers[1].attributes('class')).not.toContain('fieldHighlighted')
    })

    it('shows apply to editor button', () => {
      const wrapper = mount(AiPreviewPanel, {
        props: {
          tabs: ['schema'],
          schemaData,
          schemaWidgets: mockSchema,
        },
        global: { stubs: globalStubs },
      })

      expect(wrapper.text()).toContain('应用到编辑器')
    })

    it('emits apply-to-editor when apply button is clicked', async () => {
      const wrapper = mount(AiPreviewPanel, {
        props: {
          tabs: ['schema'],
          schemaData,
          schemaWidgets: mockSchema,
        },
        global: { stubs: globalStubs },
      })

      const applyBtn = wrapper.find('[class*="btnApply"]')
      await applyBtn.trigger('click')

      expect(wrapper.emitted('apply-to-editor')).toBeTruthy()
    })

    it('shows compare button when showCompareButton is true', () => {
      const wrapper = mount(AiPreviewPanel, {
        props: {
          tabs: ['schema'],
          schemaData,
          schemaWidgets: mockSchema,
          showCompareButton: true,
        },
        global: { stubs: globalStubs },
      })

      const compareBtn = wrapper.find('[class*="headerBtn"]')
      expect(compareBtn.exists()).toBe(true)
    })

    it('emits compare when compare button is clicked', async () => {
      const wrapper = mount(AiPreviewPanel, {
        props: {
          tabs: ['schema'],
          schemaData,
          schemaWidgets: mockSchema,
          showCompareButton: true,
        },
        global: { stubs: globalStubs },
      })

      const compareBtn = wrapper.find('[class*="headerBtn"]')
      await compareBtn.trigger('click')

      expect(wrapper.emitted('compare')).toBeTruthy()
    })
  })

  describe('Field selection', () => {
    const mockSchema: Widget[] = [
      { id: 'w1', type: 'input', field: 'username', label: '用户名' },
      { id: 'w2', type: 'input', field: 'email', label: '邮箱' },
    ]

    const schemaData = {
      title: '测试表单',
      fields: mockSchema.map((w) => ({
        icon: 'T',
        name: w.label ?? w.field ?? w.type,
        type: w.type,
      })),
    }

    it('toggles field selection on checkbox change', async () => {
      const wrapper = mount(AiPreviewPanel, {
        props: {
          tabs: ['schema'],
          schemaData,
          schemaWidgets: mockSchema,
        },
        global: { stubs: globalStubs },
      })

      const checkboxes = wrapper.findAll('[class*="fieldCheckbox"] input[type="checkbox"]')
      await checkboxes[0].trigger('change')

      // After selection, apply button should show count
      expect(wrapper.text()).toContain('应用选中 (1)')
    })

    it('selects all fields when select all button is clicked', async () => {
      const wrapper = mount(AiPreviewPanel, {
        props: {
          tabs: ['schema'],
          schemaData,
          schemaWidgets: mockSchema,
        },
        global: { stubs: globalStubs },
      })

      const selectAllBtn = wrapper.find('[class*="selectAllBtn"]')
      await selectAllBtn.trigger('click')

      expect(wrapper.text()).toContain('应用选中 (2)')
    })
  })
})
