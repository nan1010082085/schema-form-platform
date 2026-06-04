/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AiMentionInput from '@/components/AiMentionInput.vue'

const mockResults = [
  { id: '1', type: 'schema', name: '用户注册表单', description: 'form' },
  { id: '2', type: 'schema', name: '订单表单', description: 'form' },
]

const mockMentionSearch = vi.fn().mockResolvedValue(mockResults)

vi.mock('@/stores/ai', () => ({
  useAiStore: () => ({
    mentionSearchAction: mockMentionSearch,
  }),
}))

/**
 * Helper: simulate typing text into a textarea with correct selectionStart.
 * Uses native Event('input') so Vue's v-model picks up the change.
 */
async function typeInto(textarea: import('@vue/test-utils').DOMWrapper<HTMLTextAreaElement>, text: string) {
  const el = textarea.element
  el.value = text
  el.selectionStart = text.length
  el.selectionEnd = text.length
  el.dispatchEvent(new Event('input', { bubbles: true }))
  await flushPromises()
}

/**
 * Helper: check if the mention search panel is visible.
 * Uses the tabs div which is unique to the panel and only rendered inside v-if.
 */
function isPanelVisible(wrapper: import('@vue/test-utils').VueWrapper): boolean {
  return wrapper.findAll('button[class*="tab"]').length > 0
}

describe('AiMentionInput', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders a textarea', () => {
    const wrapper = mount(AiMentionInput)
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('shows placeholder text', () => {
    const wrapper = mount(AiMentionInput, {
      props: { placeholder: '输入消息...' },
    })
    expect(wrapper.find('textarea').attributes('placeholder')).toBe('输入消息...')
  })

  it('emits send event on Enter key', async () => {
    const wrapper = mount(AiMentionInput)
    const textarea = wrapper.find('textarea')

    await typeInto(textarea, 'Hello world')
    await textarea.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('send')).toBeTruthy()
    expect(wrapper.emitted('send')![0][0]).toBe('Hello world')
    expect(wrapper.emitted('send')![0][1]).toEqual([])
  })

  it('does not send on Shift+Enter', async () => {
    const wrapper = mount(AiMentionInput)
    const textarea = wrapper.find('textarea')

    await typeInto(textarea, 'Hello')
    await textarea.trigger('keydown', { key: 'Enter', shiftKey: true })

    expect(wrapper.emitted('send')).toBeFalsy()
  })

  it('does not send empty message', async () => {
    const wrapper = mount(AiMentionInput)
    const textarea = wrapper.find('textarea')

    await typeInto(textarea, '   ')
    await textarea.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('send')).toBeFalsy()
  })

  it('opens mention panel when @ is typed', async () => {
    const wrapper = mount(AiMentionInput)
    const textarea = wrapper.find('textarea')

    await typeInto(textarea, '@')

    expect(isPanelVisible(wrapper)).toBe(true)
  })

  it('shows category tabs in mention panel', async () => {
    const wrapper = mount(AiMentionInput)
    const textarea = wrapper.find('textarea')

    await typeInto(textarea, '@test')

    const tabs = wrapper.findAll('button[class*="tab"]')
    expect(tabs.length).toBe(3)
    expect(tabs[0].text()).toBe('Schema')
    expect(tabs[1].text()).toBe('Flow')
    expect(tabs[2].text()).toBe('Widget')
  })

  it('closes panel on Escape', async () => {
    const wrapper = mount(AiMentionInput)
    const textarea = wrapper.find('textarea')

    await typeInto(textarea, '@test')
    expect(isPanelVisible(wrapper)).toBe(true)

    await textarea.trigger('keydown', { key: 'Escape' })
    await flushPromises()

    expect(isPanelVisible(wrapper)).toBe(false)
  })

  it('calls mentionSearchAction when typing with debounce', async () => {
    vi.useFakeTimers()
    const wrapper = mount(AiMentionInput)
    const textarea = wrapper.find('textarea')

    await typeInto(textarea, '@test')
    vi.advanceTimersByTime(300)
    await flushPromises()

    expect(mockMentionSearch).toHaveBeenCalledWith('test', 'schema')
    vi.useRealTimers()
  })

  it('displays search results after debounce resolves', async () => {
    vi.useFakeTimers()
    const wrapper = mount(AiMentionInput)
    const textarea = wrapper.find('textarea')

    await typeInto(textarea, '@test')
    vi.advanceTimersByTime(300)
    await flushPromises()

    expect(mockMentionSearch).toHaveBeenCalledWith('test', 'schema')
    expect(wrapper.findAll('[class*="resultItem"]').length).toBe(2)
    expect(wrapper.text()).toContain('用户注册表单')
    expect(wrapper.text()).toContain('订单表单')
    vi.useRealTimers()
  })

  it('selecting a result adds a mention chip and closes panel', async () => {
    vi.useFakeTimers()
    const wrapper = mount(AiMentionInput)
    const textarea = wrapper.find('textarea')

    await typeInto(textarea, '@test')
    vi.advanceTimersByTime(300)
    await flushPromises()

    const firstResult = wrapper.find('[class*="resultItem"]')
    await firstResult.trigger('click')
    await flushPromises()

    // Panel should close after selection
    expect(isPanelVisible(wrapper)).toBe(false)

    // At least one mention chip should exist
    const chips = wrapper.findAll('[class*="mentionChip"]')
    expect(chips.length).toBeGreaterThanOrEqual(1)
    expect(wrapper.text()).toContain('用户注册表单')
    vi.useRealTimers()
  })

  it('removes mention chip when clicking remove', async () => {
    vi.useFakeTimers()
    const wrapper = mount(AiMentionInput)
    const textarea = wrapper.find('textarea')

    await typeInto(textarea, '@test')
    vi.advanceTimersByTime(300)
    await flushPromises()

    await wrapper.find('[class*="resultItem"]').trigger('click')
    await flushPromises()

    const initialChipCount = wrapper.findAll('[class*="mentionChip"]').length
    expect(initialChipCount).toBeGreaterThanOrEqual(1)

    // Remove all chips
    const removeButtons = wrapper.findAll('[class*="chipRemove"]')
    for (const btn of removeButtons) {
      await btn.trigger('click')
      await flushPromises()
    }
    expect(wrapper.findAll('[class*="mentionChip"]').length).toBe(0)
    vi.useRealTimers()
  })

  it('emits send with mentions attached', async () => {
    vi.useFakeTimers()
    const wrapper = mount(AiMentionInput)
    const textarea = wrapper.find('textarea')

    // Select a mention first
    await typeInto(textarea, '@test')
    vi.advanceTimersByTime(300)
    await flushPromises()

    await wrapper.find('[class*="resultItem"]').trigger('click')
    await flushPromises()

    // Now type a message and send
    await typeInto(textarea, '请帮我修改')
    await textarea.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('send')).toBeTruthy()
    const emitted = wrapper.emitted('send')![0]
    expect(emitted[0]).toBe('请帮我修改')
    const mentions = emitted[1] as Array<{ id: string; type: string; label: string }>
    expect(mentions.length).toBeGreaterThanOrEqual(1)
    expect(mentions[0].id).toBe('1')
    expect(mentions[0].type).toBe('schema')
    vi.useRealTimers()
  })

  it('disables textarea when disabled prop is true', () => {
    const wrapper = mount(AiMentionInput, {
      props: { disabled: true },
    })
    expect(wrapper.find('textarea').attributes('disabled')).toBeDefined()
  })

  it('switches tabs and searches with new type', async () => {
    vi.useFakeTimers()
    const wrapper = mount(AiMentionInput)
    const textarea = wrapper.find('textarea')

    await typeInto(textarea, '@test')

    const tabs = wrapper.findAll('button[class*="tab"]')
    await tabs[1].trigger('click')
    vi.advanceTimersByTime(300)
    await flushPromises()

    expect(mockMentionSearch).toHaveBeenCalledWith('test', 'flow')
    vi.useRealTimers()
  })
})
