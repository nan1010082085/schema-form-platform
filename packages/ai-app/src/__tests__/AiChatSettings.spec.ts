/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AiChatSettings from '@/components/AiChatSettings.vue'
import type { ChatSettings } from '@/types'

// Stub Element Plus components
const ElDialogStub = {
  template: '<div v-if="modelValue"><div class="dialog-title">{{ title }}</div><slot /><div class="footer"><slot name="footer" /></div></div>',
  props: ['modelValue', 'title', 'width', 'closeOnClickModal'],
}
const ElRadioButtonStub = {
  template: '<button :class="{ active: modelValue === value }" @click="$emit(\'update:modelValue\', value)"><slot /></button>',
  props: ['value', 'modelValue'],
}
const ElRadioGroupStub = {
  template: '<div><slot /></div>',
  props: ['modelValue'],
}
const ElInputStub = {
  template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  props: ['modelValue', 'type', 'rows', 'placeholder'],
}
const ElButtonStub = {
  template: '<button @click="$emit(\'click\')"><slot /></button>',
  props: ['type'],
}

const defaultSettings: ChatSettings = {
  preferences: {
    replyLanguage: 'zh-CN',
    replyStyle: 'detailed',
    codeComment: 'yes',
  },
  historySummary: {
    mode: 'auto',
  },
}

const stubs = {
  ElDialog: ElDialogStub,
  ElRadioButton: ElRadioButtonStub,
  ElRadioGroup: ElRadioGroupStub,
  ElInput: ElInputStub,
  ElButton: ElButtonStub,
}

describe('AiChatSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders when visible is true', () => {
    const wrapper = mount(AiChatSettings, {
      props: { visible: true, settings: defaultSettings },
      global: { stubs },
    })
    expect(wrapper.text()).toContain('对话设置')
    expect(wrapper.text()).toContain('用户偏好')
    expect(wrapper.text()).toContain('对话历史摘要')
  })

  it('does not render content when visible is false', () => {
    const wrapper = mount(AiChatSettings, {
      props: { visible: false, settings: defaultSettings },
      global: { stubs },
    })
    // Dialog stub hides content when modelValue is false
    expect(wrapper.text()).not.toContain('用户偏好')
  })

  it('displays all preference options', () => {
    const wrapper = mount(AiChatSettings, {
      props: { visible: true, settings: defaultSettings },
      global: { stubs },
    })
    // Language options
    expect(wrapper.text()).toContain('回复语言')
    expect(wrapper.text()).toContain('中文')
    expect(wrapper.text()).toContain('English')

    // Style options
    expect(wrapper.text()).toContain('回复风格')
    expect(wrapper.text()).toContain('简洁')
    expect(wrapper.text()).toContain('详细')

    // Code comment options
    expect(wrapper.text()).toContain('代码注释')
    expect(wrapper.text()).toContain('是')
    expect(wrapper.text()).toContain('否')
  })

  it('displays history summary mode options', () => {
    const wrapper = mount(AiChatSettings, {
      props: { visible: true, settings: defaultSettings },
      global: { stubs },
    })
    expect(wrapper.text()).toContain('生成方式')
    expect(wrapper.text()).toContain('自动生成')
    expect(wrapper.text()).toContain('手动编辑')
  })

  it('shows manual summary textarea when mode is manual', () => {
    const manualSettings: ChatSettings = {
      ...defaultSettings,
      historySummary: { mode: 'manual', manualSummary: 'test summary' },
    }
    const wrapper = mount(AiChatSettings, {
      props: { visible: true, settings: manualSettings },
      global: { stubs },
    })
    expect(wrapper.text()).toContain('手动摘要')
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('hides manual summary textarea when mode is auto', () => {
    const wrapper = mount(AiChatSettings, {
      props: { visible: true, settings: defaultSettings },
      global: { stubs },
    })
    // The manual summary textarea should not be visible when mode is auto
    expect(wrapper.text()).not.toContain('手动摘要')
  })

  it('emits update:settings on save', async () => {
    const wrapper = mount(AiChatSettings, {
      props: { visible: true, settings: defaultSettings },
      global: { stubs },
    })

    // Click save button
    const buttons = wrapper.findAll('button')
    const saveBtn = buttons.find((b) => b.text() === '保存')
    expect(saveBtn).toBeTruthy()
    await saveBtn!.trigger('click')

    expect(wrapper.emitted('update:settings')).toBeTruthy()
    expect(wrapper.emitted('update:settings')![0][0]).toEqual(defaultSettings)
  })

  it('emits update:visible false on cancel', async () => {
    const wrapper = mount(AiChatSettings, {
      props: { visible: true, settings: defaultSettings },
      global: { stubs },
    })

    const buttons = wrapper.findAll('button')
    const cancelBtn = buttons.find((b) => b.text() === '取消')
    expect(cancelBtn).toBeTruthy()
    await cancelBtn!.trigger('click')

    expect(wrapper.emitted('update:visible')).toBeTruthy()
    expect(wrapper.emitted('update:visible')![0][0]).toBe(false)
  })

  it('emits update:visible false on save', async () => {
    const wrapper = mount(AiChatSettings, {
      props: { visible: true, settings: defaultSettings },
      global: { stubs },
    })

    const buttons = wrapper.findAll('button')
    const saveBtn = buttons.find((b) => b.text() === '保存')
    await saveBtn!.trigger('click')

    expect(wrapper.emitted('update:visible')).toBeTruthy()
    expect(wrapper.emitted('update:visible')![0][0]).toBe(false)
  })
})
