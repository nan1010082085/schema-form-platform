/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AiRagSearch from '@/components/AiRagSearch.vue'
import type { RagSearchResult } from '@/types'

function createResult(overrides: Partial<RagSearchResult> = {}): RagSearchResult {
  return {
    id: 'schema-1',
    editId: 'edit-1',
    name: 'Test Schema',
    type: 'form',
    score: 85,
    widgetTypes: ['input', 'select'],
    fieldNames: ['name', 'email'],
    labels: ['Name', 'Email'],
    description: 'A test schema',
    ...overrides,
  }
}

describe('AiRagSearch', () => {
  const defaultProps = {
    searchResults: [],
    selectedContext: [],
    loading: false,
  }

  it('renders the search input', () => {
    const wrapper = mount(AiRagSearch, { props: defaultProps })
    const input = wrapper.find('input')
    expect(input.exists()).toBe(true)
    expect(input.attributes('placeholder')).toContain('智能匹配')
  })

  it('shows hint when no search has been performed', () => {
    const wrapper = mount(AiRagSearch, { props: defaultProps })
    expect(wrapper.text()).toContain('输入自然语言描述')
  })

  it('shows empty result message when search returns nothing after query', async () => {
    const wrapper = mount(AiRagSearch, {
      props: { ...defaultProps, searchResults: [] },
    })
    // Set search query so the "no results" state shows
    await wrapper.find('input').setValue('nonexistent query')
    expect(wrapper.text()).toContain('未找到匹配的 Schema')
  })

  it('renders search results', () => {
    const results = [
      createResult({ id: '1', name: 'User Form', score: 85 }),
      createResult({ id: '2', name: 'Order Form', score: 62, widgetTypes: ['table', 'input'] }),
    ]
    const wrapper = mount(AiRagSearch, {
      props: { ...defaultProps, searchResults: results },
    })

    expect(wrapper.text()).toContain('User Form')
    expect(wrapper.text()).toContain('Order Form')
    expect(wrapper.text()).toContain('85')
    expect(wrapper.text()).toContain('62')
  })

  it('emits search event after debounce', async () => {
    vi.useFakeTimers()
    const wrapper = mount(AiRagSearch, { props: defaultProps })

    await wrapper.find('input').setValue('user registration')
    vi.advanceTimersByTime(300)

    expect(wrapper.emitted('search')).toBeTruthy()
    expect(wrapper.emitted('search')![0]).toEqual(['user registration'])
    vi.useRealTimers()
  })

  it('emits select event when result is clicked', async () => {
    const item = createResult()
    const wrapper = mount(AiRagSearch, {
      props: { ...defaultProps, searchResults: [item] },
    })

    await wrapper.findAll('[class*="resultItem"]')[0].trigger('click')
    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')![0]).toEqual([item])
  })

  it('does not emit select for already selected item', async () => {
    const item = createResult()
    const wrapper = mount(AiRagSearch, {
      props: {
        ...defaultProps,
        searchResults: [item],
        selectedContext: [item],
      },
    })

    await wrapper.findAll('[class*="resultItem"]')[0].trigger('click')
    expect(wrapper.emitted('select')).toBeFalsy()
  })

  it('shows selected context chips', () => {
    const selected = [
      createResult({ id: '1', name: 'Selected Schema' }),
    ]
    const wrapper = mount(AiRagSearch, {
      props: { ...defaultProps, selectedContext: selected },
    })

    expect(wrapper.text()).toContain('Selected Schema')
    expect(wrapper.text()).toContain('已选 1 个 Schema')
  })

  it('emits remove event when chip remove is clicked', async () => {
    const selected = [createResult({ id: '1', name: 'To Remove' })]
    const wrapper = mount(AiRagSearch, {
      props: { ...defaultProps, selectedContext: selected },
    })

    await wrapper.find('[class*="chipRemove"]').trigger('click')
    expect(wrapper.emitted('remove')).toBeTruthy()
    expect(wrapper.emitted('remove')![0]).toEqual(['1'])
  })

  it('emits close event when close button is clicked', async () => {
    const wrapper = mount(AiRagSearch, { props: defaultProps })

    await wrapper.find('[class*="closeBtn"]').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('shows loading spinner when loading', () => {
    const wrapper = mount(AiRagSearch, {
      props: { ...defaultProps, loading: true },
    })

    expect(wrapper.find('[class*="searchLoading"]').exists()).toBe(true)
  })

  it('renders widget type tags', () => {
    const results = [
      createResult({ widgetTypes: ['input', 'select', 'table', 'button', 'form', 'chart'] }),
    ]
    const wrapper = mount(AiRagSearch, {
      props: { ...defaultProps, searchResults: results },
    })

    // Should show first 5 tags
    const tags = wrapper.findAll('[class*="resultTag"]')
    expect(tags.length).toBeGreaterThanOrEqual(5)
    // Should show "+1" for the 6th tag
    expect(wrapper.text()).toContain('+1')
  })

  it('applies score class based on score value', () => {
    const results = [
      createResult({ id: '1', name: 'High', score: 80 }),
      createResult({ id: '2', name: 'Medium', score: 50 }),
      createResult({ id: '3', name: 'Low', score: 20 }),
    ]
    const wrapper = mount(AiRagSearch, {
      props: { ...defaultProps, searchResults: results },
    })

    const scoreElements = wrapper.findAll('[class*="resultScore"]')
    // CSS modules hash class names, so check for partial matches
    expect(scoreElements[0].classes().some((c: string) => c.includes('scoreHigh'))).toBe(true)
    expect(scoreElements[1].classes().some((c: string) => c.includes('scoreMedium'))).toBe(true)
    expect(scoreElements[2].classes().some((c: string) => c.includes('scoreLow'))).toBe(true)
  })
})
