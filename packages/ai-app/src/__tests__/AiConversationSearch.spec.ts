/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AiConversationSearch from '@/components/AiConversationSearch.vue'

const mockSearchResult = {
  conversations: [
    {
      id: 'conv-1',
      title: '用户注册表单设计',
      source: 'editor' as const,
      activeAgent: 'editor' as const,
      createdAt: '2026-06-01T10:00:00Z',
      updatedAt: '2026-06-02T15:30:00Z',
    },
    {
      id: 'conv-2',
      title: '订单审批流程',
      source: 'flow' as const,
      activeAgent: 'flow' as const,
      createdAt: '2026-06-03T08:00:00Z',
      updatedAt: '2026-06-04T09:00:00Z',
    },
  ],
  total: 2,
  page: 1,
  pageSize: 20,
}

const mockSearchAction = vi.fn().mockResolvedValue(mockSearchResult)

vi.mock('@/stores/ai', () => ({
  useAiStore: () => ({
    searchConversationsAction: mockSearchAction,
  }),
}))

describe('AiConversationSearch', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders a search input', () => {
    const wrapper = mount(AiConversationSearch)
    expect(wrapper.find('input').exists()).toBe(true)
    expect(wrapper.find('input').attributes('placeholder')).toBe('搜索对话...')
  })

  it('shows results after typing and debounce', async () => {
    const wrapper = mount(AiConversationSearch)
    const input = wrapper.find('input')

    await input.setValue('表单')

    await vi.waitFor(() => {
      expect(wrapper.findAll('[class*="resultItem"]').length).toBe(2)
    }, { timeout: 3000 })
  })

  it('displays conversation title in results', async () => {
    const wrapper = mount(AiConversationSearch)
    const input = wrapper.find('input')

    await input.setValue('表单')

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('用户注册表单设计')
    }, { timeout: 3000 })

    expect(wrapper.text()).toContain('订单审批流程')
  })

  it('displays source tags', async () => {
    const wrapper = mount(AiConversationSearch)
    const input = wrapper.find('input')

    await input.setValue('表单')

    await vi.waitFor(() => {
      const tags = wrapper.findAll('[class*="sourceTag"]')
      expect(tags.length).toBe(2)
    }, { timeout: 3000 })
  })

  it('emits select event when clicking a result', async () => {
    const wrapper = mount(AiConversationSearch)
    const input = wrapper.find('input')

    await input.setValue('表单')

    await vi.waitFor(() => {
      expect(wrapper.findAll('[class*="resultItem"]').length).toBe(2)
    }, { timeout: 3000 })

    await wrapper.find('[class*="resultItem"]').trigger('click')

    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')![0][0]).toBe('conv-1')
  })

  it('clears search after selecting a result', async () => {
    const wrapper = mount(AiConversationSearch)
    const input = wrapper.find('input')

    await input.setValue('表单')

    await vi.waitFor(() => {
      expect(wrapper.findAll('[class*="resultItem"]').length).toBe(2)
    }, { timeout: 3000 })

    await wrapper.find('[class*="resultItem"]').trigger('click')

    expect(wrapper.find('input').element.value).toBe('')
    expect(wrapper.find('[class*="results"]').exists()).toBe(false)
  })

  it('hides panel when search query is cleared', async () => {
    const wrapper = mount(AiConversationSearch)
    const input = wrapper.find('input')

    await input.setValue('test')

    await vi.waitFor(() => {
      expect(wrapper.find('[class*="results"]').exists()).toBe(true)
    }, { timeout: 3000 })

    await input.setValue('')

    // After clearing, panel should hide immediately (empty query = no search)
    await flushPromises()
    expect(wrapper.find('[class*="results"]').exists()).toBe(false)
  })

  it('shows result count', async () => {
    const wrapper = mount(AiConversationSearch)
    const input = wrapper.find('input')

    await input.setValue('表单')

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('找到 2 条结果')
    }, { timeout: 3000 })
  })

  it('clears search when clicking clear button', async () => {
    const wrapper = mount(AiConversationSearch)
    const input = wrapper.find('input')

    await input.setValue('test')

    await vi.waitFor(() => {
      expect(wrapper.find('[class*="clearBtn"]').exists()).toBe(true)
    }, { timeout: 3000 })

    await wrapper.find('[class*="clearBtn"]').trigger('click')

    expect(wrapper.find('input').element.value).toBe('')
  })

  it('calls searchConversationsAction with query', async () => {
    const wrapper = mount(AiConversationSearch)
    const input = wrapper.find('input')

    await input.setValue('审批')

    await vi.waitFor(() => {
      expect(mockSearchAction).toHaveBeenCalledWith('审批')
    }, { timeout: 3000 })
  })
})
