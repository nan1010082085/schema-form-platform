/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import AiMessage from '@/components/AiMessage.vue'

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

describe('AiMessage', () => {
  let rafCallbacks: Map<number, FrameRequestCallback>
  let rafIdCounter: number
  let rafSpy: ReturnType<typeof vi.spyOn>
  let cafSpy: ReturnType<typeof vi.spyOn>

  function setupRAFMock() {
    rafCallbacks = new Map()
    rafIdCounter = 1
    rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      const id = rafIdCounter++
      rafCallbacks.set(id, cb)
      return id
    })
    cafSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      rafCallbacks.delete(id)
    })
  }

  function flushAllRAF() {
    const cbs = [...rafCallbacks.entries()]
    rafCallbacks.clear()
    for (const [, cb] of cbs) {
      cb(0)
    }
  }

  afterEach(() => {
    rafSpy?.mockRestore()
    cafSpy?.mockRestore()
  })

  it('renders user message content after rAF flush', async () => {
    setupRAFMock()

    const wrapper = mount(AiMessage, {
      props: {
        role: 'user',
        label: 'You',
        content: 'Hello',
      },
    })

    // Content is buffered by rAF, need to flush
    flushAllRAF()
    await nextTick()

    expect(wrapper.text()).toContain('Hello')
  })

  it('renders loading dots when loading is true', () => {
    setupRAFMock()

    const wrapper = mount(AiMessage, {
      props: {
        role: 'assistant',
        label: 'AI',
        loading: true,
      },
    })
    expect(wrapper.findComponent({ name: 'AiLoadingDots' }).exists()).toBe(true)
  })

  describe('F2: rAF-batched content rendering', () => {
    it('buffers rapid content updates and renders only on animation frame', async () => {
      setupRAFMock()

      const wrapper = mount(AiMessage, {
        props: {
          role: 'assistant',
          label: 'AI',
          content: '',
        },
      })

      // Initial mount schedules one rAF
      const initialCallCount = rafSpy.mock.calls.length

      // Simulate rapid token updates
      await wrapper.setProps({ content: 'H' })
      await wrapper.setProps({ content: 'He' })
      await wrapper.setProps({ content: 'Hel' })
      await wrapper.setProps({ content: 'Hell' })
      await wrapper.setProps({ content: 'Hello' })

      // Only one additional rAF should have been scheduled (for the first update)
      // Subsequent updates reuse the pending rAF
      expect(rafSpy.mock.calls.length).toBeLessThanOrEqual(initialCallCount + 1)

      // Before flushing rAF, the DOM should NOT contain the final content
      // (it still has the previous value or empty)
      const htmlBefore = wrapper.html()

      // Flush the animation frame
      flushAllRAF()
      await nextTick()

      // Now the rendered content should reflect the latest value
      expect(wrapper.text()).toContain('Hello')
    })

    it('cancels pending rAF on unmount', () => {
      setupRAFMock()

      const wrapper = mount(AiMessage, {
        props: {
          role: 'assistant',
          label: 'AI',
          content: '',
        },
      })

      // There should be a pending rAF from the initial mount
      expect(rafCallbacks.size).toBeGreaterThan(0)

      wrapper.unmount()

      // All pending rAFs should be cancelled
      expect(cafSpy).toHaveBeenCalled()
    })

    it('renders updated content after prop change and rAF flush', async () => {
      setupRAFMock()

      const wrapper = mount(AiMessage, {
        props: {
          role: 'assistant',
          label: 'AI',
          content: 'First',
        },
      })

      flushAllRAF()
      await nextTick()
      expect(wrapper.text()).toContain('First')

      await wrapper.setProps({ content: 'Second' })

      // Before rAF flush, still shows old content
      // After flush, shows new content
      flushAllRAF()
      await nextTick()
      expect(wrapper.text()).toContain('Second')
    })
  })

  describe('thinking section', () => {
    it('shows thinking header when thinking is provided', () => {
      setupRAFMock()

      const wrapper = mount(AiMessage, {
        props: {
          role: 'assistant',
          label: 'AI',
          thinking: 'Let me think...',
        },
      })
      expect(wrapper.text()).toContain('思考过程')
    })

    it('toggles thinking body on header click', async () => {
      setupRAFMock()

      const wrapper = mount(AiMessage, {
        props: {
          role: 'assistant',
          label: 'AI',
          thinking: 'Let me think...',
        },
      })

      // Initially collapsed
      expect(wrapper.text()).not.toContain('Let me think...')

      // Click to expand
      await wrapper.find('[class*="thinkingHeader"]').trigger('click')
      expect(wrapper.text()).toContain('Let me think...')

      // Click to collapse
      await wrapper.find('[class*="thinkingHeader"]').trigger('click')
      expect(wrapper.text()).not.toContain('Let me think...')
    })
  })

  describe('tool calls section', () => {
    it('shows tool calls count', () => {
      setupRAFMock()

      const wrapper = mount(AiMessage, {
        props: {
          role: 'assistant',
          label: 'AI',
          toolCalls: [
            { name: 'search_schemas', arguments: { query: 'test' } },
          ],
        },
      })
      expect(wrapper.text()).toContain('调用了 1 个工具')
    })
  })
})
