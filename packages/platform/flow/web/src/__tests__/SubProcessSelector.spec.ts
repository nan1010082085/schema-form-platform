import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

  SearchIcon: { template: '<span />' },
}))

/* ------------------------------------------------------------------ */
/*  Mock flowApi                                                        */
/* ------------------------------------------------------------------ */

const mockListFlows = vi.fn()

vi.mock('../api/flowApi.js', () => ({
  flowApi: {
    listFlows: (...args: unknown[]) => mockListFlows(...args),
  },
}))

vi.mock('../api/flowApi.ts', () => ({
  flowApi: {
    listFlows: (...args: unknown[]) => mockListFlows(...args),
  },
}))

/* ------------------------------------------------------------------ */
/*  Import AFTER mocks                                                 */
/* ------------------------------------------------------------------ */

import SubProcessSelector from '../components/SubProcessSelector.vue'

/* ------------------------------------------------------------------ */
/*  stubs                                                      */
/* ------------------------------------------------------------------ */

const tStubs = {
  't-dialog': {
    template: `
      <div v-if="visible" class="dialog-mock">
        <div class="dialog-title">{{ header }}</div>
        <div class="dialog-body"><slot /></div>
        <div class="dialog-footer"><slot name="footer" /></div>
      </div>
    `,
    props: ['visible', 'header', 'width', 'closeOnOverlayClick', 'destroyOnClose'],
    emits: ['update:visible', 'close'],
  },
  't-input': {
    template: `
      <input
        :value="modelValue"
        :placeholder="placeholder"
        @input="handleInput($event)"
      />
    `,
    props: ['modelValue', 'placeholder', 'clearable', 'prefixIcon'],
    emits: ['update:modelValue', 'input'],
    methods: {
      handleInput(e: Event) {
        const val = (e.target as HTMLInputElement).value
        this.$emit('update:modelValue', val)
        this.$emit('input', val)
      },
    },
  },
  't-button': {
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['theme', 'disabled', 'loading', 'size', 'variant'],
    emits: ['click'],
  },
}

/* ------------------------------------------------------------------ */
/*  Test data                                                          */
/* ------------------------------------------------------------------ */

const mockFlows = [
  { id: 'flow-1', name: '审批流程', description: '用于审批的子流程', status: 'published', category: '审批' },
  { id: 'flow-2', name: '通知流程', description: '', status: 'published', category: '' },
  { id: 'flow-3', name: '归档流程', description: '已归档', status: 'archived', category: '归档' },
]

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('SubProcessSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListFlows.mockResolvedValue({ items: mockFlows, total: 3 })
  })

  function mountSelector(props: Record<string, unknown> = {}) {
    return mount(SubProcessSelector, {
      props,
      global: { stubs: tStubs },
    })
  }

  describe('dialog visibility', () => {
    it('dialog is closed by default', () => {
      const wrapper = mountSelector()
      expect(wrapper.find('.dialog-mock').exists()).toBe(false)
    })

    it('opens dialog when open() is called', async () => {
      const wrapper = mountSelector()
      await wrapper.vm.open()
      await flushPromises()
      expect(wrapper.find('.dialog-mock').exists()).toBe(true)
    })

    it('fetches published flows on open', async () => {
      const wrapper = mountSelector()
      await wrapper.vm.open()
      await flushPromises()
      expect(mockListFlows).toHaveBeenCalledWith({ status: 'published', pageSize: 200 })
    })
  })

  describe('flow list rendering', () => {
    it('renders flow items in the list', async () => {
      const wrapper = mountSelector()
      await wrapper.vm.open()
      await flushPromises()
      expect(wrapper.text()).toContain('审批流程')
      expect(wrapper.text()).toContain('通知流程')
    })

    it('shows status tags', async () => {
      const wrapper = mountSelector()
      await wrapper.vm.open()
      await flushPromises()
      expect(wrapper.text()).toContain('已发布')
    })

    it('shows empty message when no flows', async () => {
      mockListFlows.mockResolvedValue({ items: [], total: 0 })
      const wrapper = mountSelector()
      await wrapper.vm.open()
      await flushPromises()
      expect(wrapper.text()).toContain('暂无可选流程')
    })
  })

  describe('search and filter', () => {
    it('filters flows by name', async () => {
      const wrapper = mountSelector()
      await wrapper.vm.open()
      await flushPromises()

      const input = wrapper.find('input')
      await input.setValue('审批')
      expect(wrapper.text()).toContain('审批流程')
      expect(wrapper.text()).not.toContain('通知流程')
    })

    it('filters flows by description', async () => {
      const wrapper = mountSelector()
      await wrapper.vm.open()
      await flushPromises()

      const input = wrapper.find('input')
      await input.setValue('子流程')
      expect(wrapper.text()).toContain('审批流程')
    })
  })

  describe('selection and confirm', () => {
    it('pre-selects modelValue flow in footer', async () => {
      const wrapper = mountSelector({ modelValue: 'flow-2' })
      await wrapper.vm.open()
      await flushPromises()
      expect(wrapper.text()).toContain('已选: 通知流程')
    })

    it('confirm button is disabled when no flow selected', async () => {
      const wrapper = mountSelector()
      await wrapper.vm.open()
      await flushPromises()

      const buttons = wrapper.findAll('button')
      const confirmBtn = buttons.find(b => b.text() === '确认')
      expect(confirmBtn!.attributes('disabled')).toBeDefined()
    })

    it('selects flow and emits confirm on confirm click', async () => {
      const wrapper = mountSelector()
      await wrapper.vm.open()
      await flushPromises()

      // Find the flow name text and click its parent container
      const flowNameEl = wrapper.findAll('span').find(s => s.text() === '审批流程')
      expect(flowNameEl).toBeDefined()
      // Click the parent container (the item div)
      const itemEl = flowNameEl!.element.closest('[class]')?.parentElement
      expect(itemEl).toBeDefined()
      // Use wrapper find to trigger click on the item text
      await flowNameEl!.trigger('click')

      // Now confirm
      const buttons = wrapper.findAll('button')
      const confirmBtn = buttons.find(b => b.text() === '确认')
      // The button should now be enabled since we selected a flow
      // Click confirm
      await confirmBtn!.trigger('click')

      const emitted = wrapper.emitted('confirm')
      expect(emitted).toBeDefined()
      expect(emitted![0][0]).toEqual(mockFlows[0])

      const modelEmitted = wrapper.emitted('update:modelValue')
      expect(modelEmitted).toBeDefined()
      expect(modelEmitted![0][0]).toBe('flow-1')
    })

    it('closes dialog on cancel', async () => {
      const wrapper = mountSelector()
      await wrapper.vm.open()
      await flushPromises()

      const buttons = wrapper.findAll('button')
      const cancelBtn = buttons.find(b => b.text() === '取消')
      await cancelBtn!.trigger('click')

      expect(wrapper.find('.dialog-mock').exists()).toBe(false)
    })
  })

  describe('excludeId', () => {
    it('excludes specified flow from list', async () => {
      const wrapper = mountSelector({ excludeId: 'flow-1' })
      await wrapper.vm.open()
      await flushPromises()

      expect(wrapper.text()).not.toContain('审批流程')
      expect(wrapper.text()).toContain('通知流程')
    })
  })

  describe('refresh', () => {
    it('re-fetches flows on refresh button click', async () => {
      const wrapper = mountSelector()
      await wrapper.vm.open()
      await flushPromises()

      mockListFlows.mockClear()
      const buttons = wrapper.findAll('button')
      const refreshBtn = buttons.find(b => b.text() === '刷新')
      await refreshBtn!.trigger('click')

      expect(mockListFlows).toHaveBeenCalledTimes(1)
    })
  })
})
