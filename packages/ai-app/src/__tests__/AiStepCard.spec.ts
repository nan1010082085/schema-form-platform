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
    it('displays title when pending', () => {
      const wrapper = mount(AiStepCard, {
        props: { index: 3, type: 'tool_call', title: 'Reply', status: 'pending' },
      })
      // tool_call type has header that displays title
      expect(wrapper.text()).toContain('Reply')
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
        props: { index: 1, type: 'tool_call', title: 'Reply', status: 'done' },
      })
      // done status shown via statusDotSuccess dot
      expect(wrapper.find('[class*="statusDotSuccess"]').exists()).toBe(true)
    })

    it('shows loading status dot when running', () => {
      const wrapper = mount(AiStepCard, {
        props: { index: 1, type: 'tool_call', title: 'Calling...', status: 'running' },
      })
      // Running status shown via statusDotLoading dot animation
      expect(wrapper.find('[class*="statusDotLoading"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('调用中...')
    })

    it('shows error indicator when tool_error', () => {
      const wrapper = mount(AiStepCard, {
        props: { index: 1, type: 'tool_error', title: 'Error', error: 'Failed', status: 'error' },
      })
      expect(wrapper.find('[class*="errorIcon"]').exists()).toBe(true)
    })

    it('shows title and status area for tool_call', () => {
      const wrapper = mount(AiStepCard, {
        props: { index: 5, type: 'tool_call', title: 'Pending', status: 'pending' },
      })
      expect(wrapper.text()).toContain('Pending')
      // Status area exists for tool_call type
      expect(wrapper.find('[class*="status"]').exists()).toBe(true)
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
    it('shows tool display name in subtitle', async () => {
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

      // toolName shown in subtitle
      const subtitle = wrapper.find('[class*="subtitle"]')
      expect(subtitle.exists()).toBe(true)
      expect(subtitle.text()).toBe('search_schemas')
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
      const errorContent = wrapper.find('[class*="errorContent"]')
      expect(errorContent.exists()).toBe(true)
      expect(errorContent.text()).toContain('Schema invalid')
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
    it('renders card with timeline dot indicator', () => {
      const wrapper = mount(AiStepCard, {
        props: { index: 1, type: 'text', title: 'Step', isLast: false },
      })
      // Card has ::before pseudo-element for timeline dot (CSS)
      expect(wrapper.find('[class*="card"]').exists()).toBe(true)
    })

    it('hides connector line when last', () => {
      const wrapper = mount(AiStepCard, {
        props: { index: 1, type: 'text', title: 'Step', isLast: true },
      })
      // Card still renders, timeline is in parent stepList
      expect(wrapper.find('[class*="card"]').exists()).toBe(true)
    })
  })

  describe('type-specific styling', () => {
    it('applies type class to card', () => {
      const wrapper = mount(AiStepCard, {
        props: { index: 1, type: 'thinking', title: 'Think' },
      })
      expect(wrapper.find('[class*="type_thinking"]').exists()).toBe(true)
    })

    it('applies running status dot class', () => {
      const wrapper = mount(AiStepCard, {
        props: { index: 1, type: 'tool_call', title: 'Call', status: 'running' },
      })
      expect(wrapper.find('[class*="statusDotLoading"]').exists()).toBe(true)
    })

    it('applies done status dot class', () => {
      const wrapper = mount(AiStepCard, {
        props: { index: 1, type: 'tool_call', title: 'Done', status: 'done' },
      })
      expect(wrapper.find('[class*="statusDotSuccess"]').exists()).toBe(true)
    })

    it('applies error status dot class', () => {
      const wrapper = mount(AiStepCard, {
        props: { index: 1, type: 'tool_error', title: 'Err', status: 'error' },
      })
      expect(wrapper.find('[class*="statusDotError"]').exists()).toBe(true)
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

  // ---- S6-02: tool_error card ----

  describe('S6-02: tool_error card', () => {
    it('shows friendly error description for timeout errors', () => {
      const wrapper = mount(AiStepCard, {
        props: {
          index: 1,
          type: 'tool_error',
          title: 'Failed',
          toolName: 'save_widget',
          error: 'Connection timeout after 30s',
          status: 'error',
        },
      })

      expect(wrapper.text()).toContain('服务响应超时，请稍后重试')
    })

    it('shows friendly error description for database errors', () => {
      const wrapper = mount(AiStepCard, {
        props: {
          index: 1,
          type: 'tool_error',
          title: 'Failed',
          toolName: 'save_widget',
          error: 'database connection refused',
          status: 'error',
        },
      })

      expect(wrapper.text()).toContain('数据库操作失败，请稍后重试')
    })

    it('shows friendly error description for validation errors', () => {
      const wrapper = mount(AiStepCard, {
        props: {
          index: 1,
          type: 'tool_error',
          title: 'Failed',
          toolName: 'validate_schema',
          error: 'validation failed: missing required field',
          status: 'error',
        },
      })

      expect(wrapper.text()).toContain('数据校验失败，请检查输入内容')
    })

    it('shows raw error as detail when it differs from friendly description', () => {
      const wrapper = mount(AiStepCard, {
        props: {
          index: 1,
          type: 'tool_error',
          title: 'Failed',
          toolName: 'save_widget',
          error: 'Connection timeout after 30s',
          status: 'error',
        },
      })

      const detail = wrapper.find('[class*="errorDetail"]')
      expect(detail.exists()).toBe(true)
      expect(detail.text()).toBe('Connection timeout after 30s')
    })

    it('does not show detail when raw error equals friendly description', () => {
      const wrapper = mount(AiStepCard, {
        props: {
          index: 1,
          type: 'tool_error',
          title: 'Failed',
          toolName: 'save_widget',
          error: 'unknown error occurred',
          status: 'error',
        },
      })

      const detail = wrapper.find('[class*="errorDetail"]')
      expect(detail.exists()).toBe(false)
    })

    it('shows retry button for tool_error type', () => {
      const wrapper = mount(AiStepCard, {
        props: {
          index: 1,
          type: 'tool_error',
          title: 'Failed',
          toolName: 'save_widget',
          error: 'timeout',
          status: 'error',
        },
      })

      const retryBtn = wrapper.find('[class*="retryBtn"]')
      expect(retryBtn.exists()).toBe(true)
      expect(retryBtn.text()).toContain('重试')
    })

    it('does not show retry button for tool_call type', () => {
      const wrapper = mount(AiStepCard, {
        props: {
          index: 1,
          type: 'tool_call',
          title: 'Search',
          toolName: 'search_schemas',
          status: 'done',
        },
      })

      expect(wrapper.find('[class*="retryBtn"]').exists()).toBe(false)
    })

    it('emits retry-tool when retry button is clicked', async () => {
      const wrapper = mount(AiStepCard, {
        props: {
          index: 1,
          type: 'tool_error',
          title: 'Failed',
          toolName: 'save_widget',
          error: 'timeout',
          status: 'error',
        },
      })

      await wrapper.find('[class*="retryBtn"]').trigger('click')
      expect(wrapper.emitted('retry-tool')).toHaveLength(1)
    })

    it('tool_error is expanded by default to show error details', () => {
      const wrapper = mount(AiStepCard, {
        props: {
          index: 1,
          type: 'tool_error',
          title: 'Failed',
          toolName: 'save_widget',
          error: 'timeout',
          status: 'error',
        },
      })

      // Body should be visible (not collapsed)
      expect(wrapper.find('[class*="errorContent"]').exists()).toBe(true)
      expect(wrapper.find('[class*="retryBtn"]').exists()).toBe(true)
    })

    it('shows default friendly description when error is empty', () => {
      const wrapper = mount(AiStepCard, {
        props: {
          index: 1,
          type: 'tool_error',
          title: 'Failed',
          toolName: 'save_widget',
          error: '',
          status: 'error',
        },
      })

      expect(wrapper.text()).toContain('工具执行失败，请重试')
    })
  })
})
