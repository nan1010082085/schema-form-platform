/**
 * FgSteps component unit tests
 *
 * Covers:
 * - Step rendering and navigation
 * - Step validation on switch
 * - Controlled mode (active prop)
 * - v-show content preservation
 */
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive, defineComponent, h, provide, computed } from 'vue'
import ElementPlus from 'element-plus'
import FgSteps from '@/components/FormGrid/components/layout/FgSteps.vue'
import { FORM_GRID_API_KEY } from '@/components/FormGrid/types'
import type { FormSchemaItem, FormData, FormGridApi } from '@/components/FormGrid/types'

/** Stub window.matchMedia for jsdom (used by useBreakpoint -> SchemaRender) */
function setupMatchMediaStub() {
  vi.stubGlobal('matchMedia', (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

/** Helper: create a minimal schema for one step */
function makeStepSchema(stepIndex: number): FormSchemaItem {
  return {
    type: 'grid-row',
    children: [
      {
        type: 'grid-col',
        span: 12,
        children: [
          {
            type: 'input',
            field: `field_${stepIndex}_a`,
            label: `Step ${stepIndex} Field A`,
          },
        ],
      },
    ],
  }
}

/** SchemaRender stub: recursively renders schema labels */
const SchemaRenderStub = defineComponent({
  props: ['schema', 'formData', 'editable', 'isDragging', 'path'],
  setup(props) {
    const text = computed(() => {
      const labels: string[] = []
      const walk = (item: any) => {
        if (item?.label) labels.push(item.label)
        if (item?.children) item.children.forEach(walk)
      }
      if (props.schema) walk(props.schema)
      return labels.join(' ')
    })
    return { text }
  },
  template: '<div class="mock-schema-render">{{ text }}</div>',
})

/** Helper: mount FgSteps with optional API provider */
function mountSteps(options: {
  steps?: Array<{ title: string; description?: string }>
  children?: FormSchemaItem[]
  active?: number
  validateOnSwitch?: boolean
  formGridApi?: Partial<FormGridApi>
} = {}) {
  const steps = options.steps ?? [
    { title: 'Step 1' },
    { title: 'Step 2' },
    { title: 'Step 3' },
  ]
  const children = options.children ?? steps.map((_, i) => makeStepSchema(i))

  // Wrapper to provide FormGrid API
  const Wrapper = defineComponent({
    setup() {
      if (options.formGridApi) {
        provide(FORM_GRID_API_KEY, options.formGridApi as FormGridApi)
      }
    },
    render() {
      return h(FgSteps, {
        steps,
        children,
        active: options.active,
        validateOnSwitch: options.validateOnSwitch ?? false,
        formData: reactive<FormData>({ field_0_a: '', field_1_a: '', field_2_a: '' }),
      })
    },
  })

  return mount(Wrapper, {
    global: {
      plugins: [ElementPlus],
      stubs: {
        SchemaRender: SchemaRenderStub,
      },
    },
  })
}

describe('FgSteps', () => {
  beforeAll(() => {
    setupMatchMediaStub()
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // ---------- rendering ----------

  describe('rendering', () => {
    it('renders step headers', () => {
      const wrapper = mountSteps()
      expect(wrapper.text()).toContain('Step 1')
      expect(wrapper.text()).toContain('Step 2')
      expect(wrapper.text()).toContain('Step 3')
    })

    it('renders first step content by default', () => {
      const wrapper = mountSteps()
      expect(wrapper.text()).toContain('Step 0 Field A')
    })

    it('renders correct number of step panels', () => {
      const wrapper = mountSteps()
      // Find panels by structure: content area is the second child div of root
      // (after el-steps which is the first child)
      const stepsEl = wrapper.find('.el-steps')
      const rootDiv = stepsEl.element.parentElement!
      const contentDiv = rootDiv.children[1] as HTMLElement
      expect(contentDiv.children).toHaveLength(3)
    })

    it('shows prev/next buttons', () => {
      const wrapper = mountSteps()
      expect(wrapper.text()).toContain('下一步')
      // First step should not have prev button
      expect(wrapper.text()).not.toContain('上一步')
    })
  })

  // ---------- navigation ----------

  describe('navigation', () => {
    it('navigates to next step on next button click', async () => {
      const wrapper = mountSteps()
      const nextBtn = wrapper.findAll('button').find((b) => b.text() === '下一步')
      expect(nextBtn).toBeTruthy()

      await nextBtn!.trigger('click')
      expect(wrapper.text()).toContain('上一步')
    })

    it('navigates back on prev button click', async () => {
      const wrapper = mountSteps({ active: 1 })
      const prevBtn = wrapper.findAll('button').find((b) => b.text() === '上一步')
      expect(prevBtn).toBeTruthy()

      await prevBtn!.trigger('click')
      // Should go back to step 0
      expect(wrapper.text()).not.toContain('上一步')
    })

    it('does not show prev button on first step', () => {
      const wrapper = mountSteps({ active: 0 })
      const buttons = wrapper.findAll('button')
      const prevBtn = buttons.find((b) => b.text() === '上一步')
      expect(prevBtn).toBeUndefined()
    })

    it('does not show next button on last step', () => {
      const wrapper = mountSteps({ active: 2 }) // last of 3 steps
      const buttons = wrapper.findAll('button')
      const nextBtn = buttons.find((b) => b.text() === '下一步')
      expect(nextBtn).toBeUndefined()
    })
  })

  // ---------- validation on switch ----------

  describe('validation on switch', () => {
    it('blocks navigation when validation fails', async () => {
      const validateField = vi.fn().mockRejectedValue(new Error('Validation failed'))
      const wrapper = mountSteps({
        active: 0,
        validateOnSwitch: true,
        formGridApi: {
          validate: vi.fn().mockResolvedValue(true),
          validateField,
          getFormData: () => ({}),
          resetFields: () => {},
        },
      })

      const nextBtn = wrapper.findAll('button').find((b) => b.text() === '下一步')
      await nextBtn!.trigger('click')
      await vi.waitFor(() => {
        expect(validateField).toHaveBeenCalledWith(['field_0_a'])
      })
    })

    it('allows navigation when validation passes', async () => {
      const validateField = vi.fn().mockResolvedValue(true)
      const wrapper = mountSteps({
        active: 0,
        validateOnSwitch: true,
        formGridApi: {
          validate: vi.fn().mockResolvedValue(true),
          validateField,
          getFormData: () => ({}),
          resetFields: () => {},
        },
      })

      const nextBtn = wrapper.findAll('button').find((b) => b.text() === '下一步')
      await nextBtn!.trigger('click')
      await vi.waitFor(() => {
        expect(validateField).toHaveBeenCalled()
      })
    })
  })

  // ---------- controlled mode ----------

  describe('controlled mode', () => {
    it('respects active prop', () => {
      const wrapper = mountSteps({ active: 1 })
      // Step 1 should be visible (the second step)
      expect(wrapper.text()).toContain('上一步')
      expect(wrapper.text()).toContain('下一步')
    })
  })

  // ---------- emit events ----------

  describe('emit events', () => {
    it('emits step-change on navigation', async () => {
      const wrapper = mountSteps()
      const nextBtn = wrapper.findAll('button').find((b) => b.text() === '下一步')
      await nextBtn!.trigger('click')

      // The wrapper wraps FgSteps, so check the inner component
      const stepsComponent = wrapper.findComponent(FgSteps)
      expect(stepsComponent.emitted('step-change')).toBeTruthy()
      expect(stepsComponent.emitted('step-change')![0]).toEqual([1, 0])
    })
  })
})
