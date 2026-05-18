/**
 * FormGrid Smoke Test
 * Verifies that the schema-driven form engine renders correctly from a JSON schema.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'
import FormGrid from '@/components/FormGrid/index.vue'
import type { FormSchemaItem } from '@/components/FormGrid/types'

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

function createWrapper(schema: FormSchemaItem[], props: Record<string, unknown> = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)

  return mount(FormGrid, {
    props: {
      schema,
      ...props,
    },
    global: {
      plugins: [pinia, ElementPlus],
    },
  })
}

describe('FormGrid', () => {
  beforeAll(() => {
    setupMatchMediaStub()
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('renders a simple input schema item', () => {
    const schema: FormSchemaItem[] = [
      {
        type: 'grid-row',
        children: [
          {
            type: 'grid-col',
            span: 24,
            children: [
              {
                type: 'input',
                field: 'name',
                label: 'Name',
                props: { placeholder: 'Enter name' },
              },
            ],
          },
        ],
      },
    ]

    const wrapper = createWrapper(schema)

    // Should render the form structure
    expect(wrapper.find('.fg').exists()).toBe(true)
    expect(wrapper.find('.fg-grid-row').exists()).toBe(true)
    expect(wrapper.find('.fg-grid-col').exists()).toBe(true)

    // Should render an el-form-item with label
    const formItem = wrapper.find('.el-form-item')
    expect(formItem.exists()).toBe(true)
  })

  it('renders a multi-field schema', () => {
    const schema: FormSchemaItem[] = [
      {
        type: 'grid-row',
        children: [
          {
            type: 'grid-col',
            span: 12,
            children: [{ type: 'input', field: 'firstName', label: 'First Name' }],
          },
          {
            type: 'grid-col',
            span: 12,
            children: [{ type: 'input', field: 'lastName', label: 'Last Name' }],
          },
        ],
      },
    ]

    const wrapper = createWrapper(schema)
    const formItems = wrapper.findAll('.el-form-item')
    expect(formItems).toHaveLength(2)
  })

  it('hides items with hidden flag', () => {
    const schema: FormSchemaItem[] = [
      {
        type: 'grid-row',
        children: [
          {
            type: 'grid-col',
            span: 24,
            children: [
              { type: 'input', field: 'visible', label: 'Visible' },
              { type: 'input', field: 'secret', label: 'Secret', hidden: true },
            ],
          },
        ],
      },
    ]

    const wrapper = createWrapper(schema)
    const formItems = wrapper.findAll('.el-form-item')
    expect(formItems).toHaveLength(1)
  })

  it('exposes form API methods', () => {
    const schema: FormSchemaItem[] = [
      {
        type: 'grid-row',
        children: [
          {
            type: 'grid-col',
            span: 24,
            children: [{ type: 'input', field: 'test', label: 'Test' }],
          },
        ],
      },
    ]

    const wrapper = createWrapper(schema)

    // Check exposed API
    expect(typeof wrapper.vm.getFormData).toBe('function')
    expect(typeof wrapper.vm.validate).toBe('function')
    expect(typeof wrapper.vm.resetFields).toBe('function')
    expect(typeof wrapper.vm.clearValidate).toBe('function')
    expect(typeof wrapper.vm.scrollToField).toBe('function')
  })

  it('initializes default values', () => {
    const schema: FormSchemaItem[] = [
      {
        type: 'grid-row',
        children: [
          {
            type: 'grid-col',
            span: 24,
            children: [
              { type: 'input', field: 'name', label: 'Name', defaultValue: 'hello' },
              { type: 'checkbox', field: 'tags', label: 'Tags', defaultValue: ['a', 'b'] },
            ],
          },
        ],
      },
    ]

    const wrapper = createWrapper(schema)
    const data = wrapper.vm.getFormData()
    expect(data.name).toBe('hello')
    expect(data.tags).toEqual(['a', 'b'])
  })
})
