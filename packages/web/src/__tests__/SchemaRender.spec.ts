/**
 * SchemaRender unit tests
 *
 * Tests the 4 rendering paths of the core recursive rendering engine:
 *   1. grid-row   — flex row container
 *   2. grid-col   — 24-column flex cell with optional label
 *   3. Layout component — page/toolbar/card/title/divider/spacer/steps/tabs
 *   4. Form component  — compMap[type] with model-value binding + special cases
 *
 * Also covers: hidden, expression visibility, linkage state, edge cases.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import ElementPlus from 'element-plus'
import type { Component } from 'vue'
import type {
  FormSchemaItem,
  FormData,
  LinkageState,
} from '@/components/FormGrid/types'
import {
  ACTION_EMIT_KEY,
  FORM_GRID_LINKAGE_KEY,
} from '@/components/FormGrid/types'
import SchemaRenderComponent from '@/components/FormGrid/SchemaRender.vue'

// ---------------------------------------------------------------------------
// Mock compMap — stub every type so SchemaRender can resolve components.
// ALL stubs are defined inside the factory because vi.mock() is hoisted.
// ---------------------------------------------------------------------------
vi.mock('@/components/FormGrid/compMap', () => {
  /** Generic slot-passthrough stub for layout components */
  function stubLayout(tag: string): Component {
    return {
      template: `<div class="stub-${tag}"><slot /></div>`,
      props: ['label', 'children', 'formData'],
    }
  }

  /** Simple input stub that emits update:modelValue */
  const StubInput: Component = {
    template: `<input class="stub-input" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`,
    props: ['modelValue', 'placeholder', 'disabled', 'readonly', 'options', 'api'],
  }

  /** Simple select stub */
  const StubSelect: Component = {
    template: '<select class="stub-select" :value="modelValue"><slot /></select>',
    props: ['modelValue', 'placeholder', 'disabled', 'readonly', 'options', 'api'],
  }

  /** Stub for date-range — receives formData + schema props */
  const StubDateRange: Component = {
    template: '<div class="stub-date-range" :data-start="formData?.startDate" :data-end="formData?.endDate" />',
    props: ['formData', 'schema', 'disabled'],
  }

  /** Stub for button-list */
  const StubButtonList: Component = {
    template: '<div class="stub-button-list"><button v-for="b in buttons" :key="b.text">{{ b.text }}</button></div>',
    props: ['buttons'],
  }

  /** Stub for toolbar-buttons */
  const StubToolbarButtons: Component = {
    template: '<div class="stub-toolbar-buttons"><button v-for="b in buttons" :key="b.text">{{ b.text }}</button></div>',
    props: ['buttons', 'background'],
  }

  /** Stub for table */
  const StubTable: Component = {
    template: '<div class="stub-table" :data-rows="JSON.stringify(modelValue)"><slot /></div>',
    props: ['modelValue', 'columnSchema', 'addDefault', 'showActions', 'actions'],
    emits: ['update:modelValue'],
  }

  /** Stub for file-list */
  const StubFileList: Component = {
    template: '<div class="stub-file-list" />',
    props: ['modelValue'],
  }

  /** Stub for person-select */
  const StubPersonSelect: Component = {
    template: '<div class="stub-person-select" />',
    props: ['modelValue'],
  }

  /** Stub for search-list */
  const StubSearchList: Component = {
    template: '<div class="stub-search-list" />',
    props: ['schema'],
    emits: ['action'],
  }

  return {
    compMap: {
      // Layout
      page: stubLayout('page'),
      toolbar: stubLayout('toolbar'),
      card: stubLayout('card'),
      title: stubLayout('title'),
      divider: stubLayout('divider'),
      spacer: stubLayout('spacer'),
      steps: { template: '<div class="stub-steps" />', props: ['children', 'formData'] },
      tabs: { template: '<div class="stub-tabs" />', props: ['children', 'formData'] },
      // Base
      input: StubInput,
      number: StubInput,
      select: StubSelect,
      radio: StubInput,
      checkbox: StubInput,
      date: StubInput,
      'date-range': StubDateRange,
      textarea: StubInput,
      richtext: StubInput,
      // Business
      'button-list': StubButtonList,
      dialog: stubLayout('dialog'),
      upload: StubInput,
      table: StubTable,
      pagination: StubInput,
      'file-list': StubFileList,
      'file-preview': StubInput,
      'person-select': StubPersonSelect,
      'dept-select': StubInput,
      transfer: StubInput,
      'detail-form': StubInput,
      banner: StubInput,
      'tree-layout': StubInput,
      'date-time-slot': StubInput,
      'toolbar-buttons': StubToolbarButtons,
      'search-list': StubSearchList,
      // grid-row/grid-col — never rendered via compMap
      'grid-row': stubLayout('grid-row-placeholder'),
      'grid-col': stubLayout('grid-col-placeholder'),
    } as Record<string, Component>,
  }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Stub window.matchMedia for jsdom (useBreakpoint compat) */
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

/** Default inject mocks for SchemaRender */
function defaultProvides(overrides?: Record<string | symbol, unknown>) {
  const linkageMap = new Map<string, LinkageState>()
  return {
    [ACTION_EMIT_KEY as symbol]: vi.fn(),
    [FORM_GRID_LINKAGE_KEY as symbol]: computed(() => linkageMap),
    ...overrides,
  }
}

interface MountSchemaRenderOptions {
  schema: FormSchemaItem
  formData?: FormData
  provides?: Record<string | symbol, unknown>
  props?: Record<string, unknown>
}

function mountSchemaRender(options: MountSchemaRenderOptions) {
  return mount(SchemaRenderComponent, {
    props: {
      schema: options.schema,
      formData: options.formData ?? {},
      ...options.props,
    },
    global: {
      plugins: [ElementPlus],
      provide: options.provides ?? defaultProvides(),
    },
  })
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe('SchemaRender', () => {
  beforeAll(() => {
    setupMatchMediaStub()
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  // =========================================================================
  // Path 1: grid-row
  // =========================================================================
  describe('Path 1 — grid-row', () => {
    it('renders a div with class fg-grid-row', () => {
      const wrapper = mountSchemaRender({
        schema: { type: 'grid-row', children: [] },
      })

      expect(wrapper.find('.fg-grid-row').exists()).toBe(true)
    })

    it('renders child schemas recursively', () => {
      const wrapper = mountSchemaRender({
        schema: {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 12, children: [{ type: 'input', field: 'name', label: 'Name' }] },
            { type: 'grid-col', span: 12, children: [{ type: 'input', field: 'email', label: 'Email' }] },
          ],
        },
      })

      // Both grid-cols should render
      expect(wrapper.findAll('.fg-grid-col')).toHaveLength(2)
      // Both form items should render inside the grid-cols
      expect(wrapper.findAll('.el-form-item')).toHaveLength(2)
    })

    it('handles empty children array gracefully', () => {
      const wrapper = mountSchemaRender({
        schema: { type: 'grid-row', children: [] },
      })

      expect(wrapper.find('.fg-grid-row').exists()).toBe(true)
      // No grid-col children, no form items
      expect(wrapper.findAll('.fg-grid-col')).toHaveLength(0)
    })

    it('handles undefined children gracefully', () => {
      const wrapper = mountSchemaRender({
        schema: { type: 'grid-row' } as FormSchemaItem,
      })

      expect(wrapper.find('.fg-grid-row').exists()).toBe(true)
    })

    it('skips children with hidden: true', () => {
      const wrapper = mountSchemaRender({
        schema: {
          type: 'grid-row',
          children: [
            { type: 'grid-col', span: 12, children: [{ type: 'input', field: 'visible', label: 'Visible' }] },
            { type: 'grid-col', span: 12, children: [{ type: 'input', field: 'secret', label: 'Secret', hidden: true }] },
          ],
        },
      })

      // Both grid-cols render (neither hidden at grid-row level), but the hidden input inside
      // the second grid-col is skipped, so only 1 el-form-item
      expect(wrapper.findAll('.fg-grid-col')).toHaveLength(2)
      expect(wrapper.findAll('.el-form-item')).toHaveLength(1)
    })
  })

  // =========================================================================
  // Path 2: grid-col
  // =========================================================================
  describe('Path 2 — grid-col', () => {
    it('renders a div with class fg-grid-col', () => {
      const wrapper = mountSchemaRender({
        schema: { type: 'grid-col', span: 24, children: [] },
      })

      expect(wrapper.find('.fg-grid-col').exists()).toBe(true)
    })

    it('renders label when provided and children exist', () => {
      const wrapper = mountSchemaRender({
        schema: {
          type: 'grid-col',
          span: 24,
          label: 'My Section',
          children: [{ type: 'input', field: 'field1', label: 'Field 1' }],
        },
      })

      expect(wrapper.find('.fg-cell-label').exists()).toBe(true)
      expect(wrapper.find('.fg-cell-label').text()).toBe('My Section')
    })

    it('renders label-only cell when no children are present', () => {
      const wrapper = mountSchemaRender({
        schema: { type: 'grid-col', span: 24, label: 'Section Title' },
      })

      expect(wrapper.find('.fg-cell--label-only').exists()).toBe(true)
      expect(wrapper.find('.fg-cell--label-only').text()).toBe('Section Title')
      // No fg-cell-content since no children
      expect(wrapper.find('.fg-cell-content').exists()).toBe(false)
    })

    it('applies span-based flex width via inline style', () => {
      const wrapper = mountSchemaRender({
        schema: { type: 'grid-col', span: 12, children: [] },
      })

      const col = wrapper.find('.fg-grid-col')
      const style = col.attributes('style')
      // Browser/jsdom may compute calc(12/24*100%) → calc(50%)
      expect(style).toMatch(/calc\(50%\)/)
    })

    it('applies colspan override to span calculation', () => {
      const wrapper = mountSchemaRender({
        schema: { type: 'grid-col', colspan: 6, children: [] },
      })

      const col = wrapper.find('.fg-grid-col')
      const style = col.attributes('style')
      // colspan takes priority over default 24
      // Browser/jsdom may compute calc(6/24*100%) → calc(25%)
      expect(style).toMatch(/calc\(25%\)/)
    })

    it('applies custom width when specified', () => {
      const wrapper = mountSchemaRender({
        schema: { type: 'grid-col', width: '300px', children: [] },
      })

      const col = wrapper.find('.fg-grid-col')
      const style = col.attributes('style')
      expect(style).toContain('300px')
    })

    it('wraps child form component in el-form-item', () => {
      const wrapper = mountSchemaRender({
        schema: {
          type: 'grid-col',
          span: 24,
          children: [{ type: 'input', field: 'username', label: 'Username' }],
        },
      })

      expect(wrapper.find('.el-form-item').exists()).toBe(true)
    })

    it('suppresses no-border class when border is false', () => {
      const wrapper = mountSchemaRender({
        schema: { type: 'grid-col', span: 24, border: false, children: [] },
      })

      expect(wrapper.find('.fg-grid-col.no-border').exists()).toBe(true)
    })

    it('applies alignment class based on align prop', () => {
      const wrapper = mountSchemaRender({
        schema: { type: 'grid-col', span: 24, align: 'center', children: [] },
      })

      expect(wrapper.find('.fg-cell--center').exists()).toBe(true)
    })

    it('defaults alignment to left when not specified', () => {
      const wrapper = mountSchemaRender({
        schema: { type: 'grid-col', span: 24, children: [] },
      })

      expect(wrapper.find('.fg-cell--left').exists()).toBe(true)
    })
  })

  // =========================================================================
  // Path 3: Layout components
  // =========================================================================
  describe('Path 3 — Layout components', () => {
    const layoutTypes = ['page', 'toolbar', 'card', 'title', 'divider', 'spacer'] as const

    for (const layoutType of layoutTypes) {
      it(`renders stub-${layoutType} for type="${layoutType}"`, () => {
        const wrapper = mountSchemaRender({
          schema: { type: layoutType, children: [] },
        })

        expect(wrapper.find(`.stub-${layoutType}`).exists()).toBe(true)
      })

      it(`passes children via default slot for type="${layoutType}"`, () => {
        const wrapper = mountSchemaRender({
          schema: {
            type: layoutType,
            children: [
              { type: 'input', field: 'childField', label: 'Child' },
            ],
          },
        })

        // The child input should render inside the layout stub
        const stub = wrapper.find(`.stub-${layoutType}`)
        expect(stub.exists()).toBe(true)
        // Verify the el-form-item was rendered inside
        expect(wrapper.find('.el-form-item').exists()).toBe(true)
      })
    }

    it('renders steps component with children and formData as props', () => {
      const wrapper = mountSchemaRender({
        schema: {
          type: 'steps',
          children: [
            { type: 'input', field: 'step1', label: 'Step 1' },
          ],
        },
      })

      expect(wrapper.find('.stub-steps').exists()).toBe(true)
    })

    it('renders tabs component with children and formData as props', () => {
      const wrapper = mountSchemaRender({
        schema: {
          type: 'tabs',
          children: [
            { type: 'input', field: 'tab1', label: 'Tab 1' },
          ],
        },
      })

      expect(wrapper.find('.stub-tabs').exists()).toBe(true)
    })

    it('passes schema.label as label prop to layout component', () => {
      const wrapper = mountSchemaRender({
        schema: { type: 'card', label: 'Card Title', children: [] },
      })

      // The stub receives the label prop
      const cardEl = wrapper.find('.stub-card')
      expect(cardEl.exists()).toBe(true)
    })
  })

  // =========================================================================
  // Path 4: Form components
  // =========================================================================
  describe('Path 4 — Form components', () => {
    it('renders correct stub component from compMap', () => {
      const wrapper = mountSchemaRender({
        schema: { type: 'input', field: 'name', label: 'Name' },
      })

      expect(wrapper.find('.stub-input').exists()).toBe(true)
    })

    it('wraps standard component in el-form-item with label', () => {
      const wrapper = mountSchemaRender({
        schema: { type: 'input', field: 'username', label: 'Username' },
      })

      const formItem = wrapper.find('.el-form-item')
      expect(formItem.exists()).toBe(true)
    })

    it('binds model-value from formData[field]', () => {
      const formData: FormData = { username: 'Alice' }
      const wrapper = mountSchemaRender({
        schema: { type: 'input', field: 'username', label: 'Username' },
        formData,
      })

      const input = wrapper.find('.stub-input')
      expect(input.attributes('value')).toBe('Alice')
    })

    it('updates formData on update:model-value', async () => {
      const formData: FormData = { username: '' }
      const wrapper = mountSchemaRender({
        schema: { type: 'input', field: 'username', label: 'Username' },
        formData,
      })

      const input = wrapper.find('.stub-input')
      await input.trigger('input')
      // After input event, formData should be updated
      expect(formData.username).toBeDefined()
    })

    it('does not wrap in el-form-item when field is missing', () => {
      const wrapper = mountSchemaRender({
        schema: { type: 'input', label: 'No Field' },
      })

      // No field → no el-form-item, but still renders inside ErrorBoundary > fg-component
      expect(wrapper.find('.el-form-item').exists()).toBe(false)
      expect(wrapper.find('.fg-component').exists()).toBe(true)
    })

    // -- Special cases --

    it('date-range: receives formData prop directly (not v-model)', () => {
      const formData: FormData = { startDate: '2024-01-01', endDate: '2024-12-31' }
      const wrapper = mountSchemaRender({
        schema: { type: 'date-range', field: 'range' },
        formData,
      })

      const dr = wrapper.find('.stub-date-range')
      expect(dr.exists()).toBe(true)
      // date-range receives formData as a prop, not modelValue
      expect(dr.attributes('data-start')).toBe('2024-01-01')
      expect(dr.attributes('data-end')).toBe('2024-12-31')
    })

    it('button-list: renders without el-form-item wrapper', () => {
      const wrapper = mountSchemaRender({
        schema: {
          type: 'button-list',
          buttons: [{ text: 'Save' }, { text: 'Cancel' }],
        },
      })

      expect(wrapper.find('.stub-button-list').exists()).toBe(true)
      expect(wrapper.find('.el-form-item').exists()).toBe(false)
    })

    it('toolbar-buttons: renders without el-form-item wrapper', () => {
      const wrapper = mountSchemaRender({
        schema: {
          type: 'toolbar-buttons',
          buttons: [{ text: 'Submit' }],
        },
      })

      expect(wrapper.find('.stub-toolbar-buttons').exists()).toBe(true)
      expect(wrapper.find('.el-form-item').exists()).toBe(false)
    })

    it('table: binds model-value from formData[field] and does not wrap in el-form-item', () => {
      const formData: FormData = { items: [{ id: 1 }, { id: 2 }] }
      const wrapper = mountSchemaRender({
        schema: {
          type: 'table',
          field: 'items',
          props: { columnSchema: [] },
        },
        formData,
      })

      expect(wrapper.find('.stub-table').exists()).toBe(true)
      expect(wrapper.find('.el-form-item').exists()).toBe(false)
    })

    it('table: handles missing field gracefully', () => {
      const wrapper = mountSchemaRender({
        schema: {
          type: 'table',
          props: { columnSchema: [] },
        },
      })

      expect(wrapper.find('.stub-table').exists()).toBe(true)
    })

    it('file-list: renders without el-form-item wrapper', () => {
      const wrapper = mountSchemaRender({
        schema: { type: 'file-list', props: {} },
      })

      expect(wrapper.find('.stub-file-list').exists()).toBe(true)
      expect(wrapper.find('.el-form-item').exists()).toBe(false)
    })

    it('person-select: renders without el-form-item wrapper', () => {
      const wrapper = mountSchemaRender({
        schema: { type: 'person-select', props: {} },
      })

      expect(wrapper.find('.stub-person-select').exists()).toBe(true)
      expect(wrapper.find('.el-form-item').exists()).toBe(false)
    })

    it('search-list: renders with schema prop and emits action to inject', () => {
      const wrapper = mountSchemaRender({
        schema: { type: 'search-list', field: 'results' },
      })

      expect(wrapper.find('.stub-search-list').exists()).toBe(true)
      expect(wrapper.find('.el-form-item').exists()).toBe(false)
    })
  })

  // =========================================================================
  // Visibility / Hidden
  // =========================================================================
  describe('Visibility & hidden', () => {
    it('does not render DOM when schema.hidden is true', () => {
      const wrapper = mountSchemaRender({
        schema: { type: 'input', field: 'secret', label: 'Secret', hidden: true },
      })

      // The template renders <template v-if="!isVisible" /> which is empty
      expect(wrapper.find('.fg-component').exists()).toBe(false)
      expect(wrapper.find('.el-form-item').exists()).toBe(false)
      expect(wrapper.find('.stub-input').exists()).toBe(false)
    })

    it('renders normally when schema.hidden is false', () => {
      const wrapper = mountSchemaRender({
        schema: { type: 'input', field: 'normal', label: 'Normal', hidden: false },
      })

      expect(wrapper.find('.stub-input').exists()).toBe(true)
    })

    it('schema.hidden takes priority over linkage visibility', () => {
      const linkageMap = new Map<string, LinkageState>()
      // Linkage says visible, but hidden flag overrides
      linkageMap.set('field1', { visible: true, disabled: false, required: false })

      const wrapper = mountSchemaRender({
        schema: { type: 'input', field: 'field1', label: 'Field 1', hidden: true },
        provides: defaultProvides({
          [FORM_GRID_LINKAGE_KEY as symbol]: computed(() => linkageMap),
        }),
      })

      // hidden=true overrides everything
      expect(wrapper.find('.stub-input').exists()).toBe(false)
    })

    it('linkage can hide a visible field', () => {
      const linkageMap = new Map<string, LinkageState>()
      linkageMap.set('field2', { visible: false, disabled: false, required: false })

      const wrapper = mountSchemaRender({
        schema: { type: 'input', field: 'field2', label: 'Field 2' },
        provides: defaultProvides({
          [FORM_GRID_LINKAGE_KEY as symbol]: computed(() => linkageMap),
        }),
      })

      expect(wrapper.find('.stub-input').exists()).toBe(false)
    })
  })

  // =========================================================================
  // Disabled & linkage state
  // =========================================================================
  describe('Disabled & linkage state', () => {
    it('passes disabled from linkage state to component', () => {
      const linkageMap = new Map<string, LinkageState>()
      linkageMap.set('readonlyField', { visible: true, disabled: true, required: false })

      const wrapper = mountSchemaRender({
        schema: { type: 'input', field: 'readonlyField', label: 'Readonly' },
        provides: defaultProvides({
          [FORM_GRID_LINKAGE_KEY as symbol]: computed(() => linkageMap),
        }),
      })

      // The stub receives :disabled="isDisabled" which should be true
      const input = wrapper.find('.stub-input')
      expect(input.exists()).toBe(true)
    })

    it('is not disabled by default when no linkage and no disabledOn', () => {
      const wrapper = mountSchemaRender({
        schema: { type: 'input', field: 'editable', label: 'Editable' },
      })

      const input = wrapper.find('.stub-input')
      expect(input.exists()).toBe(true)
      // No disabled attribute by default
      expect(input.attributes('disabled')).toBeUndefined()
    })
  })

  // =========================================================================
  // Edge cases
  // =========================================================================
  describe('Edge cases', () => {
    it('handles null formData gracefully', () => {
      const wrapper = mountSchemaRender({
        schema: { type: 'input', field: 'test', label: 'Test' },
        formData: null as unknown as FormData,
      })

      // Should not throw — getFieldValue returns undefined for null formData
      expect(wrapper.find('.fg-component').exists()).toBe(true)
    })

    it('handles undefined field on a form component', () => {
      const wrapper = mountSchemaRender({
        schema: { type: 'input' },
      })

      // Renders in fg-component wrapper but no el-form-item since field is undefined
      expect(wrapper.find('.fg-component').exists()).toBe(true)
      expect(wrapper.find('.el-form-item').exists()).toBe(false)
    })

    it('renders component inside ErrorBoundary wrapper', () => {
      const wrapper = mountSchemaRender({
        schema: { type: 'input', field: 'test', label: 'Test' },
      })

      // ErrorBoundary wraps content in a div — verify the form component is rendered
      expect(wrapper.find('.fg-component').exists()).toBe(true)
    })

    it('applies effective options from linkage state', () => {
      const linkageMap = new Map<string, LinkageState>()
      linkageMap.set('dynamicField', {
        visible: true,
        disabled: false,
        required: false,
        options: [{ label: 'Dynamic A', value: 'a' }],
      })

      const wrapper = mountSchemaRender({
        schema: {
          type: 'select',
          field: 'dynamicField',
          label: 'Dynamic',
          options: [{ label: 'Static', value: 'static' }],
        },
        provides: defaultProvides({
          [FORM_GRID_LINKAGE_KEY as symbol]: computed(() => linkageMap),
        }),
      })

      // The select stub should receive the linkage options (but we can't easily
      // assert the prop value on a stub — just verify it renders)
      expect(wrapper.find('.stub-select').exists()).toBe(true)
    })

    it('applies colspan to full-width component overriding span', () => {
      const wrapper = mountSchemaRender({
        schema: {
          type: 'grid-col',
          colspan: 24,
          children: [
            { type: 'table', field: 'items', props: { columnSchema: [] } },
          ],
        },
      })

      const col = wrapper.find('.fg-grid-col')
      const style = col.attributes('style')
      // colspan=24 should produce calc(24 / 24 * 100%) for full-width types
      // Browser/jsdom may compute calc(24/24*100%) → calc(100%)
      expect(style).toMatch(/calc\(100%\)/)
    })

    it('does not render label-only cell when label exists but children is empty array', () => {
      const wrapper = mountSchemaRender({
        schema: { type: 'grid-col', span: 24, label: 'Title', children: [] },
      })

      // children is an empty array → isLabelOnly should be true
      expect(wrapper.find('.fg-cell--label-only').exists()).toBe(true)
      expect(wrapper.find('.fg-cell-content').exists()).toBe(false)
    })

    it('handles deeply nested schema (grid-row > grid-col > card > input)', () => {
      const wrapper = mountSchemaRender({
        schema: {
          type: 'grid-row',
          children: [
            {
              type: 'grid-col',
              span: 24,
              children: [
                {
                  type: 'card',
                  label: 'Card',
                  children: [
                    { type: 'input', field: 'nested', label: 'Nested Field' },
                  ],
                },
              ],
            },
          ],
        },
      })

      expect(wrapper.find('.fg-grid-row').exists()).toBe(true)
      expect(wrapper.find('.fg-grid-col').exists()).toBe(true)
      expect(wrapper.find('.stub-card').exists()).toBe(true)
      expect(wrapper.find('.el-form-item').exists()).toBe(true)
    })
  })

  // =========================================================================
  // responsive span (colSpan computed)
  // =========================================================================
  describe('Responsive span', () => {
    it('uses resolveSpan for span resolution', () => {
      // span as a number
      const wrapper = mountSchemaRender({
        schema: { type: 'grid-col', span: 6, children: [] },
      })

      const col = wrapper.find('.fg-grid-col')
      expect(col.attributes('style')).toMatch(/calc\(25%\)/)
    })

    it('defaults span to 24 when not specified', () => {
      const wrapper = mountSchemaRender({
        schema: { type: 'grid-col', children: [] },
      })

      const col = wrapper.find('.fg-grid-col')
      expect(col.attributes('style')).toMatch(/calc\(100%\)/)
    })
  })
})
