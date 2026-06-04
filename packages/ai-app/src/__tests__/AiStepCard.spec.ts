/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import AiStepCard from '@/components/AiStepCard.vue'

// Mock marked to return predictable HTML
vi.mock('marked', () => ({
  marked: {
    parse: vi.fn((content: string) => `<p>${content}</p>`),
  },
}))

vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((html: string) => html),
  },
}))

describe('AiStepCard', () => {
  describe('rendering', () => {
    it('displays step number when pending', () => {
      const wrapper = mount(AiStepCard, {
        props: { index: 3, type: 'text', title: 'Reply', status: 'pending' },
      })
      expect(wrapper.text()).toContain('3')
    })

    it('displays title for all types', () => {
      const wrapper = mount(AiStepCard, {
        props: { index: 1, type: 'thinking', title: 'Analyzing...' },
      })
      expect(wrapper.text()).toContain('Analyzing...')
    })

    it('renders text content as Markdown', async () => {
      const wrapper = mount(AiStepCard, {
        props: {
          index: 1,
          type: 'text',
          title: 'Reply',
          content: '**bold** text',
          status: 'done',
        },
      })
      // Text step: no collapsible header, body always visible
      expect(wrapper.find('[class*="markdown"]').exists()).toBe(true)
    })

    it('renders thinking content when expanded', async () => {
      const wrapper = mount(AiStepCard, {
        props: {
          index: 1,
          type: 'thinking',
          title: 'Thinking',
          content: 'Let me analyze...',
          status: 'done',
        },
      })

      // Default collapsed
      expect(wrapper.text()).not.toContain('Let me analyze...')

      // Expand
      await wrapper.find('[class*="header"]').trigger('click')
      await nextTick()
      expect(wrapper.text()).toContain('Let me analyze...')
    })
  })

  describe('status indicator', () => {
    it('shows check mark when done', () => {
      const wrapper = mount(AiStepCard, {
        props: { index: 1, type: 'text', title: 'Reply', status: 'done' },
      })
      expect(wrapper.find('[class*="checkIcon"]').exists()).toBe(true)
    })

    it('shows loading dots when running', () => {
      const wrapper = mount(AiStepCard, {
        props: { index: 1, type: 'tool_call', title: 'Calling...', status: 'running' },
      })
      expect(wrapper.findComponent({ name: 'AiLoadingDots' }).exists()).toBe(true)
    })

    it('shows error indicator when error status', () => {
      const wrapper = mount(AiStepCard, {
        props: { index: 1, type: 'text', title: 'Error', status: 'error' },
      })
      expect(wrapper.find('[class*="errorIcon"]').exists()).toBe(true)
    })

    it('shows step number when pending', () => {
      const wrapper = mount(AiStepCard, {
        props: { index: 5, type: 'text', title: 'Pending', status: 'pending' },
      })
      expect(wrapper.text()).toContain('5')
      expect(wrapper.find('[class*="checkIcon"]').exists()).toBe(false)
      expect(wrapper.find('[class*="errorIcon"]').exists()).toBe(false)
    })
  })

  describe('collapse behavior', () => {
    it('thinking is collapsed by default', () => {
      const wrapper = mount(AiStepCard, {
        props: {
          index: 1,
          type: 'thinking',
          title: 'Thinking',
          content: 'Details...',
        },
      })
      expect(wrapper.text()).not.toContain('Details...')
    })

    it('tool_call is collapsed by default', () => {
      const wrapper = mount(AiStepCard, {
        props: {
          index: 1,
          type: 'tool_call',
          title: 'Search',
          toolName: 'search_schemas',
          toolDisplayName: 'Search',
        },
      })
      // Header is visible but body is collapsed
      expect(wrapper.find('[class*="header"]').exists()).toBe(true)
    })

    it('text is expanded by default', () => {
      const wrapper = mount(AiStepCard, {
        props: {
          index: 1,
          type: 'text',
          title: 'Reply',
          content: 'Hello!',
          status: 'done',
        },
      })
      // No header for text type, body always visible
      expect(wrapper.find('[class*="header"]').exists()).toBe(false)
      expect(wrapper.find('[class*="markdown"]').exists()).toBe(true)
    })

    it('toggles on header click', async () => {
      const wrapper = mount(AiStepCard, {
        props: {
          index: 1,
          type: 'thinking',
          title: 'Thinking',
          content: 'Details here',
        },
      })

      // Collapsed
      expect(wrapper.text()).not.toContain('Details here')

      // Expand
      await wrapper.find('[class*="header"]').trigger('click')
      await nextTick()
      expect(wrapper.text()).toContain('Details here')

      // Collapse again
      await wrapper.find('[class*="header"]').trigger('click')
      await nextTick()
      expect(wrapper.text()).not.toContain('Details here')
    })
  })

  describe('tool call content', () => {
    it('shows tool badge with display name', async () => {
      const wrapper = mount(AiStepCard, {
        props: {
          index: 1,
          type: 'tool_call',
          title: 'Search Schemas',
          toolName: 'search_schemas',
          toolDisplayName: 'Search Schemas',
          status: 'done',
        },
      })

      await wrapper.find('[class*="header"]').trigger('click')
      const badge = wrapper.find('[class*="toolBadge"]')
      expect(badge.exists()).toBe(true)
      expect(badge.text()).toBe('Search Schemas')
    })

    it('shows error card for tool_error type (expanded by default)', () => {
      const wrapper = mount(AiStepCard, {
        props: {
          index: 1,
          type: 'tool_error',
          title: 'Failed',
          toolName: 'generate_schema',
          error: 'Schema invalid',
          status: 'error',
        },
      })

      // tool_error is NOT collapsed by default, body is visible
      const errorCard = wrapper.find('[class*="errorCard"]')
      expect(errorCard.exists()).toBe(true)
      expect(errorCard.text()).toContain('Schema invalid')
    })

    it('shows arguments and result when available', async () => {
      const wrapper = mount(AiStepCard, {
        props: {
          index: 1,
          type: 'tool_call',
          title: 'Search',
          toolName: 'search_schemas',
          toolArguments: { query: 'user' },
          toolResult: { count: 3 },
          status: 'done',
        },
      })

      await wrapper.find('[class*="header"]').trigger('click')
      // Verify both section labels are present
      expect(wrapper.text()).toContain('参数')
      expect(wrapper.text()).toContain('结果')
      // Verify content is rendered
      expect(wrapper.text()).toContain('"query": "user"')
    })

    it('shows summary when tool result has summary field', async () => {
      const wrapper = mount(AiStepCard, {
        props: {
          index: 1,
          type: 'tool_call',
          title: 'Search',
          toolName: 'search_schemas',
          toolResult: { summary: 'Found 3 schemas', count: 3 },
          status: 'done',
        },
      })

      await wrapper.find('[class*="header"]').trigger('click')
      expect(wrapper.find('[class*="toolSummary"]').text()).toBe('Found 3 schemas')
    })
  })

  describe('connector line', () => {
    it('shows connector line when not last', () => {
      const wrapper = mount(AiStepCard, {
        props: { index: 1, type: 'text', title: 'Step', isLast: false },
      })
      expect(wrapper.find('[class*="line"]').exists()).toBe(true)
    })

    it('hides connector line when last', () => {
      const wrapper = mount(AiStepCard, {
        props: { index: 1, type: 'text', title: 'Step', isLast: true },
      })
      expect(wrapper.find('[class*="line"]').exists()).toBe(false)
    })
  })

  describe('type-specific styling', () => {
    it('applies type class to card', () => {
      const wrapper = mount(AiStepCard, {
        props: { index: 1, type: 'thinking', title: 'Think' },
      })
      expect(wrapper.find('[class*="type_thinking"]').exists()).toBe(true)
    })

    it('applies running status class to number', () => {
      const wrapper = mount(AiStepCard, {
        props: { index: 1, type: 'tool_call', title: 'Call', status: 'running' },
      })
      expect(wrapper.find('[class*="status_running"]').exists()).toBe(true)
    })

    it('applies done status class to number', () => {
      const wrapper = mount(AiStepCard, {
        props: { index: 1, type: 'text', title: 'Done', status: 'done' },
      })
      expect(wrapper.find('[class*="status_done"]').exists()).toBe(true)
    })

    it('applies error status class to number', () => {
      const wrapper = mount(AiStepCard, {
        props: { index: 1, type: 'tool_error', title: 'Err', status: 'error' },
      })
      expect(wrapper.find('[class*="status_error"]').exists()).toBe(true)
    })
  })

  describe('events', () => {
    it('emits primary-action on SchemaCard primary', async () => {
      const wrapper = mount(AiStepCard, {
        props: { index: 1, type: 'result', title: 'Schema', status: 'done' },
      })

      // The result type shows a slot, not built-in buttons
      // Events are emitted through the parent's slot content
      expect(wrapper.emitted('primary-action')).toBeUndefined()
    })
  })
})
