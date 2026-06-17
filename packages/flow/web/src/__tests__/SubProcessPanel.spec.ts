import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

  ChevronRightIcon: { template: '<span />' },
  ChevronDownIcon: { template: '<span />' },
  AddIcon: { template: '<span />' },
  DeleteIcon: { template: '<span />' },
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

import SubProcessPanel from '../components/nodePanels/SubProcessPanel.vue'

/* ------------------------------------------------------------------ */
/*  TDesign stubs                                                      */
/* ------------------------------------------------------------------ */

const tStubs = {
  't-input': {
    template: `
      <textarea
        v-if="type === 'textarea'"
        :value="modelValue"
        :placeholder="placeholder"
        @input="handleInput($event)"
      />
      <input
        v-else
        :value="modelValue"
        :placeholder="placeholder"
        @input="handleInput($event)"
      />
    `,
    props: ['modelValue', 'placeholder', 'type', 'rows', 'size'],
    emits: ['update:modelValue', 'input'],
    methods: {
      handleInput(e: Event) {
        const val = (e.target as HTMLInputElement).value
        this.$emit('update:modelValue', val)
        this.$emit('input', val)
      },
    },
  },
  't-textarea': {
    template: `
      <textarea
        :value="modelValue"
        :placeholder="placeholder"
        @input="handleInput($event)"
      />
    `,
    props: ['modelValue', 'placeholder', 'rows', 'size'],
    emits: ['update:modelValue', 'input'],
    methods: {
      handleInput(e: Event) {
        const val = (e.target as HTMLTextAreaElement).value
        this.$emit('update:modelValue', val)
        this.$emit('input', val)
      },
    },
  },
  't-select': {
    template: `
      <select :value="modelValue" @change="handleChange($event)">
        <slot />
      </select>
    `,
    props: ['modelValue', 'filterable', 'loading', 'placeholder', 'clearable', 'size'],
    emits: ['update:modelValue', 'change'],
    methods: {
      handleChange(e: Event) {
        const val = (e.target as HTMLSelectElement).value
        this.$emit('update:modelValue', val)
        this.$emit('change', val)
      },
    },
  },
  't-option': {
    template: '<option :value="value">{{ label }}</option>',
    props: ['label', 'value'],
  },
  't-radio-group': {
    template: '<div><slot /></div>',
    props: ['modelValue', 'size'],
    emits: ['update:modelValue', 'change'],
  },
  't-radio-button': {
    template: `<label><input type="radio" :value="value" @change="$emit('change', $event.target.value)" /><slot /></label>`,
    props: ['value', 'label'],
    emits: ['change'],
  },
  't-button': {
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['size', 'variant', 'theme', 'disabled'],
    emits: ['click'],
  },
}

/* ------------------------------------------------------------------ */
/*  Test data                                                          */
/* ------------------------------------------------------------------ */

const mockFlows = [
  { id: 'flow-1', name: '审批流程', description: '审批子流程', status: 'published', category: '审批' },
  { id: 'flow-2', name: '通知流程', description: '', status: 'published', category: '' },
]

function createNode(data: Record<string, unknown> = {}) {
  return {
    id: 'sub-1',
    type: 'sub-process',
    data: {
      label: '子流程',
      subProcessDefinitionId: '',
      ...data,
    },
  }
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('SubProcessPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListFlows.mockResolvedValue({ items: mockFlows, total: 2 })
  })

  function mountPanel(nodeData: Record<string, unknown> = {}) {
    return mount(SubProcessPanel, {
      props: { node: createNode(nodeData) },
      global: { stubs: tStubs },
    })
  }

  describe('section structure', () => {
    it('renders section toggle with title', async () => {
      const wrapper = mountPanel()
      await flushPromises()
      expect(wrapper.text()).toContain('子流程配置')
    })

    it('renders three field rows', async () => {
      const wrapper = mountPanel()
      await flushPromises()
      expect(wrapper.text()).toContain('选择子流程')
      expect(wrapper.text()).toContain('输入变量映射')
      expect(wrapper.text()).toContain('输出变量映射')
    })
  })

  describe('sub process definition selection', () => {
    it('renders a select for choosing a sub-process with flow options', async () => {
      const wrapper = mountPanel()
      await flushPromises()
      const select = wrapper.find('select')
      expect(select.exists()).toBe(true)
      // Options are populated from flowApi.listFlows
      const options = wrapper.findAll('option')
      const optionValues = options.map(o => o.element.value)
      expect(optionValues).toContain('flow-1')
      expect(optionValues).toContain('flow-2')
    })

    it('displays current subProcessDefinitionId as selected value', async () => {
      const wrapper = mountPanel({ subProcessDefinitionId: 'flow-1' })
      await flushPromises()
      const select = wrapper.find('select')
      expect(select.element.value).toBe('flow-1')
    })

    it('emits updateNodeData with subProcessDefinitionId on selection', async () => {
      const wrapper = mountPanel()
      await flushPromises()
      const select = wrapper.find('select')
      await select.setValue('flow-2')
      const emitted = wrapper.emitted('updateNodeData')
      expect(emitted).toBeDefined()
      expect(emitted!.some(e => e[0] === 'subProcessDefinitionId' && e[1] === 'flow-2')).toBe(true)
    })

    it('fetches published flows on mount', async () => {
      mountPanel()
      await flushPromises()
      expect(mockListFlows).toHaveBeenCalledWith({ status: 'published', pageSize: 200 })
    })

    it('shows flow details when a flow is selected', async () => {
      const wrapper = mountPanel({ subProcessDefinitionId: 'flow-1' })
      await flushPromises()
      expect(wrapper.text()).toContain('审批流程')
      expect(wrapper.text()).toContain('已发布')
    })
  })

  describe('mappings', () => {
    it('renders input mapping label', async () => {
      const wrapper = mountPanel()
      await flushPromises()
      expect(wrapper.text()).toContain('输入变量映射')
    })

    it('renders output mapping label', async () => {
      const wrapper = mountPanel()
      await flushPromises()
      expect(wrapper.text()).toContain('输出变量映射')
    })

    it('emits updateNodeData when input mapping key-value is edited', async () => {
      const wrapper = mountPanel()
      await flushPromises()

      // Click "添加映射" button to add an input entry
      const addButtons = wrapper.findAll('button')
      const addInputBtn = addButtons.find(btn => btn.text().includes('添加映射'))
      expect(addInputBtn).toBeDefined()
      await addInputBtn!.trigger('click')

      const emitted = wrapper.emitted('updateNodeData')
      expect(emitted).toBeDefined()
      const inputEvent = emitted!.find(e => e[0] === 'inputMapping')
      expect(inputEvent).toBeDefined()
      expect(inputEvent![1]).toEqual({})
    })

    it('emits updateNodeData when output mapping key-value is edited', async () => {
      const wrapper = mountPanel()
      await flushPromises()

      // Click "添加映射" button — second one is for output
      const addButtons = wrapper.findAll('button')
      const mappingButtons = addButtons.filter(btn => btn.text().includes('添加映射'))
      await mappingButtons[1].trigger('click')

      const emitted = wrapper.emitted('updateNodeData')
      expect(emitted).toBeDefined()
      const outputEvent = emitted!.find(e => e[0] === 'outputMapping')
      expect(outputEvent).toBeDefined()
      expect(outputEvent![1]).toEqual({})
    })

    it('renders mapping mode toggle with KV and JSON options', async () => {
      const wrapper = mountPanel()
      await flushPromises()
      expect(wrapper.text()).toContain('键值对')
      expect(wrapper.text()).toContain('JSON')
    })
  })
})
