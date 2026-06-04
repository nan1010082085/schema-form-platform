/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AiChatPanel from '@/components/AiChatPanel.vue'

// Stub child components
const AiMessageStub = { template: '<div />', props: ['role', 'label', 'content'] }
const TaskChainBarStub = { template: '<div />', props: ['steps', 'currentIndex'] }
const AiRagSearchStub = { template: '<div />', props: ['searchResults', 'selectedContext', 'loading'] }

// AiMentionInput stub that exposes a textarea and emits send
const AiMentionInputStub = {
  template: `<div>
    <textarea ref="ta" :disabled="disabled" @keydown="onKey" />
  </div>`,
  props: ['disabled', 'loading', 'placeholder'],
  emits: ['send'],
  methods: {
    onKey(e: KeyboardEvent) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        const val = (this.$refs.ta as HTMLTextAreaElement).value.trim()
        if (val) this.$emit('send', val, [])
      }
    },
  },
}

describe('AiChatPanel', () => {
  const defaultProps = {
    title: 'Test Chat',
    agent: 'auto' as const,
    messages: [],
    loading: false,
  }

  const stubs = {
    AiMessage: AiMessageStub,
    TaskChainBar: TaskChainBarStub,
    AiRagSearch: AiRagSearchStub,
    AiMentionInput: AiMentionInputStub,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders header with title and agent badge', () => {
    const wrapper = mount(AiChatPanel, {
      props: defaultProps,
      global: { stubs },
    })
    expect(wrapper.text()).toContain('Test Chat')
    expect(wrapper.text()).toContain('Auto')
  })

  describe('F3: Empty state starter prompts', () => {
    it('shows prompt cards when messages is empty', () => {
      const wrapper = mount(AiChatPanel, {
        props: defaultProps,
        global: { stubs },
      })

      expect(wrapper.text()).toContain('开始一段新对话')

      const promptCards = wrapper.findAll('[class*="promptCard"]')
      expect(promptCards).toHaveLength(4)

      expect(wrapper.text()).toContain('帮我生成一个用户注册表单')
      expect(wrapper.text()).toContain('创建一个订单审批流程')
      expect(wrapper.text()).toContain('搜索已有的表单模板')
      expect(wrapper.text()).toContain('设计一个系统配置页面')
    })

    it('hides prompt cards when messages exist', () => {
      const wrapper = mount(AiChatPanel, {
        props: {
          ...defaultProps,
          messages: [
            { role: 'user', content: 'hi', timestamp: new Date() },
          ],
        },
        global: { stubs },
      })

      const promptCards = wrapper.findAll('[class*="promptCard"]')
      expect(promptCards).toHaveLength(0)
    })

    it('emits send event with correct agent when prompt card is clicked', async () => {
      const wrapper = mount(AiChatPanel, {
        props: defaultProps,
        global: { stubs },
      })

      const promptCards = wrapper.findAll('[class*="promptCard"]')

      await promptCards[0].trigger('click')
      expect(wrapper.emitted('send')).toBeTruthy()
      expect(wrapper.emitted('send')![0]).toEqual(['帮我生成一个用户注册表单', 'editor'])

      await promptCards[1].trigger('click')
      expect(wrapper.emitted('send')![1]).toEqual(['创建一个订单审批流程', 'flow'])
    })
  })

  describe('input area', () => {
    it('sends message on Enter key via AiMentionInput', async () => {
      const wrapper = mount(AiChatPanel, {
        props: defaultProps,
        global: { stubs },
      })

      const textarea = wrapper.find('textarea')
      await textarea.setValue('Hello')
      await textarea.trigger('keydown', { key: 'Enter' })

      expect(wrapper.emitted('send')).toBeTruthy()
      expect(wrapper.emitted('send')![0][0]).toBe('Hello')
    })

    it('does not send on Shift+Enter', async () => {
      const wrapper = mount(AiChatPanel, {
        props: defaultProps,
        global: { stubs },
      })

      const textarea = wrapper.find('textarea')
      await textarea.setValue('Hello')
      await textarea.trigger('keydown', { key: 'Enter', shiftKey: true })

      expect(wrapper.emitted('send')).toBeFalsy()
    })

    it('does not send empty message', async () => {
      const wrapper = mount(AiChatPanel, {
        props: defaultProps,
        global: { stubs },
      })

      const textarea = wrapper.find('textarea')
      await textarea.setValue('   ')
      await textarea.trigger('keydown', { key: 'Enter' })

      expect(wrapper.emitted('send')).toBeFalsy()
    })
  })
})
