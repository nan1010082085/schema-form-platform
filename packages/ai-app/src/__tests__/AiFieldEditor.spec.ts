/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AiFieldEditor from '@/components/AiFieldEditor.vue'
import type { EditContext } from '@/composables/usePreviewInteraction'

// Stub Element Plus components
const ElDialogStub = {
  template: '<div v-if="modelValue"><div class="el-dialog__title">{{ title }}</div><slot /><slot name="footer" /></div>',
  props: ['modelValue', 'title', 'width', 'closeOnClickModal'],
  emits: ['update:modelValue'],
}
const ElFormStub = { template: '<form><slot /></form>', props: ['labelPosition', 'size'] }
const ElFormItemStub = { template: '<div><label>{{ label }}</label><slot /></div>', props: ['label'] }
const ElInputStub = { template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'placeholder'], emits: ['update:modelValue'] }
const ElSelectStub = { template: '<select><slot /></select>', props: ['modelValue', 'placeholder'], emits: ['update:modelValue'] }
const ElOptionStub = { template: '<option />', props: ['label', 'value'] }
const ElSwitchStub = { template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />', props: ['modelValue'], emits: ['update:modelValue'] }
const ElButtonStub = { template: '<button><slot /></button>', props: ['type'] }

const globalStubs = {
  ElDialog: ElDialogStub,
  ElForm: ElFormStub,
  ElFormItem: ElFormItemStub,
  ElInput: ElInputStub,
  ElSelect: ElSelectStub,
  ElOption: ElOptionStub,
  ElSwitch: ElSwitchStub,
  ElButton: ElButtonStub,
}

describe('AiFieldEditor', () => {
  const mockFieldContext: EditContext = {
    type: 'field',
    id: 'w1',
    data: {
      type: 'input',
      label: '用户名',
      field: 'username',
      placeholder: '请输入用户名',
      required: true,
    },
  }

  const mockNodeContext: EditContext = {
    type: 'node',
    id: 'n1',
    data: {
      bpmnType: 'userTask',
      label: '审批任务',
      description: '处理审批请求',
    },
  }

  it('renders dialog when visible is true', () => {
    const wrapper = mount(AiFieldEditor, {
      props: {
        visible: true,
        context: mockFieldContext,
      },
      global: { stubs: globalStubs },
    })

    expect(wrapper.text()).toContain('编辑属性')
  })

  it('does not render dialog when visible is false', () => {
    const wrapper = mount(AiFieldEditor, {
      props: {
        visible: false,
        context: mockFieldContext,
      },
      global: { stubs: globalStubs },
    })

    expect(wrapper.find('.el-dialog').exists()).toBe(false)
  })

  it('renders field form fields for field context', () => {
    const wrapper = mount(AiFieldEditor, {
      props: {
        visible: true,
        context: mockFieldContext,
      },
      global: { stubs: globalStubs },
    })

    expect(wrapper.text()).toContain('标签')
    expect(wrapper.text()).toContain('字段名')
    expect(wrapper.text()).toContain('占位符')
    expect(wrapper.text()).toContain('必填')
  })

  it('renders node form fields for node context', () => {
    const wrapper = mount(AiFieldEditor, {
      props: {
        visible: true,
        context: mockNodeContext,
      },
      global: { stubs: globalStubs },
    })

    expect(wrapper.text()).toContain('标签')
    expect(wrapper.text()).toContain('描述')
  })

  it('shows type info', () => {
    const wrapper = mount(AiFieldEditor, {
      props: {
        visible: true,
        context: mockFieldContext,
      },
      global: { stubs: globalStubs },
    })

    expect(wrapper.text()).toContain('类型：')
    expect(wrapper.text()).toContain('input')
  })

  it('emits save when save button is clicked', async () => {
    const wrapper = mount(AiFieldEditor, {
      props: {
        visible: true,
        context: mockFieldContext,
      },
      global: { stubs: globalStubs },
    })

    const saveBtn = wrapper.findAll('button').find((b) => b.text() === '保存')
    await saveBtn!.trigger('click')

    expect(wrapper.emitted('save')).toBeTruthy()
    expect(wrapper.emitted('save')![0][0]).toBe('w1')
  })

  it('emits cancel when cancel button is clicked', async () => {
    const wrapper = mount(AiFieldEditor, {
      props: {
        visible: true,
        context: mockFieldContext,
      },
      global: { stubs: globalStubs },
    })

    const cancelBtn = wrapper.findAll('button').find((b) => b.text() === '取消')
    await cancelBtn!.trigger('click')

    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('emits update:visible when dialog is closed', async () => {
    const wrapper = mount(AiFieldEditor, {
      props: {
        visible: true,
        context: mockFieldContext,
      },
      global: { stubs: globalStubs },
    })

    // Trigger dialog close
    await wrapper.findComponent(ElDialogStub).vm.$emit('update:modelValue', false)

    expect(wrapper.emitted('update:visible')).toBeTruthy()
    expect(wrapper.emitted('update:visible')![0]).toEqual([false])
  })
})
