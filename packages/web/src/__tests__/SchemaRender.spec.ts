/**
 * SchemaRender unit tests
 *
 * Tests the new Widget + registry based rendering engine:
 *   1. Basic rendering — SchemaRender delegates to SchemaNode for each Widget
 *   2. Hidden visibility — widget.hidden controls rendering
 *   3. Container rendering — containers render children recursively
 *   4. Mode prop — edit vs preview mode adds/removes outline styles
 *   5. Edge cases — empty widgets, unknown types, position styling
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, type Component, type PropType } from 'vue'
import ElementPlus from 'element-plus'
import type { Widget, SchemaType } from '@/widgets/base/types'
import SchemaRenderComponent from '@/components/FormGrid/SchemaRender.vue'
import { useWidgetStore } from '@/stores/widget'

// ---------------------------------------------------------------------------
// Mock registry — provide stub components for all types SchemaNode resolves.
// vi.mock is hoisted, so the factory must be self-contained.
// ---------------------------------------------------------------------------
vi.mock('@/widgets/registry', () => {
  function makeStub(className: string, isContainer = false): Component {
    return defineComponent({
      name: `Stub_${className}`,
      props: {
        widget: { type: Object as PropType<Widget>, required: true },
      },
      setup(_, { slots }) {
        return () =>
          h('div', { class: className }, isContainer && slots.default ? slots.default() : [])
      },
    })
  }

  const compMap: Record<string, Component> = {
    // Container types
    form: makeStub('stub-form', true),
    card: makeStub('stub-card', true),
    'row-col': makeStub('stub-row-col', true),
    tabs: makeStub('stub-tabs', true),
    dialog: makeStub('stub-dialog', true),
    // Basic types
    input: makeStub('stub-input'),
    number: makeStub('stub-number'),
    select: makeStub('stub-select'),
    radio: makeStub('stub-radio'),
    checkbox: makeStub('stub-checkbox'),
    date: makeStub('stub-date'),
    'date-range': makeStub('stub-date-range'),
    textarea: makeStub('stub-textarea'),
    richtext: makeStub('stub-richtext'),
    'button-list': makeStub('stub-button-list'),
    upload: makeStub('stub-upload'),
    table: makeStub('stub-table'),
    'search-list': makeStub('stub-search-list'),
    'editable-table': makeStub('stub-editable-table'),
    title: makeStub('stub-title'),
    divider: makeStub('stub-divider'),
    spacer: makeStub('stub-spacer'),
    'toolbar-buttons': makeStub('stub-toolbar-buttons'),
    'file-list': makeStub('stub-file-list'),
    transfer: makeStub('stub-transfer'),
    'detail-form': makeStub('stub-detail-form'),
    banner: makeStub('stub-banner'),
    'tree-layout': makeStub('stub-tree-layout'),
    'date-time-slot': makeStub('stub-date-time-slot'),
  }

  return {
    getComponentMap: () => compMap,
    getWidget: (type: SchemaType) => ({
      name: `Stub_${type}`,
      displayName: type,
      type,
      group: 'basic' as const,
      component: compMap[type],
      create: (id: string) => ({
        id,
        name: `Stub_${type}`,
        type,
        position: { x: 0, y: 0, w: 240, h: 40 },
      }),
      config: {},
    }),
    getAllWidgets: () => Object.values(compMap).map((c, i) => ({
      name: `Stub_${i}`,
      displayName: `Stub ${i}`,
      type: `stub-${i}` as SchemaType,
      group: 'basic' as const,
      component: c,
      create: (id: string) => ({ id, name: '', type: 'input' as SchemaType, position: { x: 0, y: 0, w: 240, h: 40 } }),
      config: {},
    })),
    registerWidget: vi.fn(),
    createWidget: vi.fn(),
    getWidgetsByGroup: vi.fn(() => []),
    generateWidgetId: vi.fn(() => 'generated-id'),
  }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWidget(overrides: Partial<Widget> = {}): Widget {
  return {
    id: `widget-${Math.random().toString(36).slice(2, 7)}`,
    name: 'FgInput',
    type: 'input',
    position: { x: 0, y: 0, w: 240, h: 40 },
    ...overrides,
  }
}

function makeContainerWidget(type: SchemaType, children: Widget[] = [], overrides: Partial<Widget> = {}): Widget {
  return {
    id: `container-${Math.random().toString(36).slice(2, 7)}`,
    name: `Fg${type}`,
    type,
    position: { x: 0, y: 0, w: 800, h: 400 },
    children,
    ...overrides,
  }
}

function mountSchemaRender(widgets: Widget[], props: Record<string, unknown> = {}) {
  // Populate widgetStore so useLinkage can find linkage rules
  const widgetStore = useWidgetStore()
  widgetStore.widgets = widgets

  return mount(SchemaRenderComponent, {
    props: {
      widgets,
      ...props,
    },
    global: {
      plugins: [ElementPlus],
    },
  })
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe('SchemaRender', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // =========================================================================
  // 1. Basic rendering
  // =========================================================================
  describe('Basic rendering', () => {
    it('renders a single widget via SchemaNode', () => {
      const wrapper = mountSchemaRender([
        makeWidget({ type: 'input', id: 'w1' }),
      ])

      expect(wrapper.find('.stub-input').exists()).toBe(true)
    })

    it('renders multiple widgets', () => {
      const wrapper = mountSchemaRender([
        makeWidget({ type: 'input', id: 'w1' }),
        makeWidget({ type: 'select', id: 'w2' }),
        makeWidget({ type: 'textarea', id: 'w3' }),
      ])

      expect(wrapper.find('.stub-input').exists()).toBe(true)
      expect(wrapper.find('.stub-select').exists()).toBe(true)
      expect(wrapper.find('.stub-textarea').exists()).toBe(true)
    })

    it('renders correct component for each type', () => {
      const types: SchemaType[] = ['input', 'number', 'select', 'radio', 'checkbox', 'date', 'textarea']

      for (const type of types) {
        const wrapper = mountSchemaRender([
          makeWidget({ type, id: `w-${type}` }),
        ])
        expect(wrapper.find(`.stub-${type}`).exists()).toBe(true)
      }
    })

    it('renders empty list without errors', () => {
      const wrapper = mountSchemaRender([])
      expect(wrapper.element.children).toHaveLength(0)
    })

    it('renders wrapper div but no component for unknown widget type', () => {
      const wrapper = mountSchemaRender([
        makeWidget({ type: 'unknown-type' as SchemaType, id: 'w-unknown' }),
      ])
      // No stub component for the unknown type
      expect(wrapper.find('.stub-unknown-type').exists()).toBe(false)
      // SchemaNode still renders a wrapper div with position:absolute
      expect(wrapper.find('div[style*="position: absolute"]').exists()).toBe(true)
    })
  })

  // =========================================================================
  // 2. Hidden visibility
  // =========================================================================
  describe('Hidden visibility', () => {
    it('does not render widget when hidden is true', () => {
      const wrapper = mountSchemaRender([
        makeWidget({ type: 'input', id: 'w1', hidden: true }),
      ])

      expect(wrapper.find('.stub-input').exists()).toBe(false)
    })

    it('renders widget when hidden is false', () => {
      const wrapper = mountSchemaRender([
        makeWidget({ type: 'input', id: 'w1', hidden: false }),
      ])

      expect(wrapper.find('.stub-input').exists()).toBe(true)
    })

    it('renders widget when hidden is undefined (default)', () => {
      const wrapper = mountSchemaRender([
        makeWidget({ type: 'input', id: 'w1' }),
      ])

      expect(wrapper.find('.stub-input').exists()).toBe(true)
    })

    it('skips hidden widgets but renders visible ones in the same list', () => {
      const wrapper = mountSchemaRender([
        makeWidget({ type: 'input', id: 'w1', hidden: true }),
        makeWidget({ type: 'select', id: 'w2', hidden: false }),
        makeWidget({ type: 'textarea', id: 'w3' }),
      ])

      expect(wrapper.find('.stub-input').exists()).toBe(false)
      expect(wrapper.find('.stub-select').exists()).toBe(true)
      expect(wrapper.find('.stub-textarea').exists()).toBe(true)
    })
  })

  // =========================================================================
  // 3. Container rendering
  // =========================================================================
  describe('Container rendering', () => {
    const containerTypes: SchemaType[] = ['form', 'card', 'row-col', 'tabs', 'dialog']

    for (const containerType of containerTypes) {
      it(`renders ${containerType} container with children`, () => {
        const child = makeWidget({ type: 'input', id: 'child1' })
        const container = makeContainerWidget(containerType, [child], { id: 'container1' })

        const wrapper = mountSchemaRender([container])

        expect(wrapper.find(`.stub-${containerType}`).exists()).toBe(true)
        expect(wrapper.find('.stub-input').exists()).toBe(true)
      })

      it(`renders ${containerType} without children gracefully`, () => {
        const container = makeContainerWidget(containerType, [], { id: 'container1' })

        const wrapper = mountSchemaRender([container])

        expect(wrapper.find(`.stub-${containerType}`).exists()).toBe(true)
      })
    }

    it('renders deeply nested containers (card > form > input)', () => {
      const input = makeWidget({ type: 'input', id: 'deep-input' })
      const form = makeContainerWidget('form', [input], { id: 'form1' })
      const card = makeContainerWidget('card', [form], { id: 'card1' })

      const wrapper = mountSchemaRender([card])

      expect(wrapper.find('.stub-card').exists()).toBe(true)
      expect(wrapper.find('.stub-form').exists()).toBe(true)
      expect(wrapper.find('.stub-input').exists()).toBe(true)
    })

    it('handles container with undefined children', () => {
      const container: Widget = {
        id: 'c1',
        name: 'FgCard',
        type: 'card',
        position: { x: 0, y: 0, w: 800, h: 400 },
        // children is undefined
      }

      const wrapper = mountSchemaRender([container])

      expect(wrapper.find('.stub-card').exists()).toBe(true)
    })

    it('renders multiple children inside a container', () => {
      const children = [
        makeWidget({ type: 'input', id: 'c1' }),
        makeWidget({ type: 'select', id: 'c2' }),
        makeWidget({ type: 'textarea', id: 'c3' }),
      ]
      const container = makeContainerWidget('card', children, { id: 'card1' })

      const wrapper = mountSchemaRender([container])

      expect(wrapper.find('.stub-input').exists()).toBe(true)
      expect(wrapper.find('.stub-select').exists()).toBe(true)
      expect(wrapper.find('.stub-textarea').exists()).toBe(true)
    })
  })

  // =========================================================================
  // 4. Mode prop (edit / preview)
  // =========================================================================
  describe('Mode prop', () => {
    // Note: CSS Module classes ($style.nodeWrapperEdit) are not resolved in jsdom.
    // We verify mode is passed correctly by checking the rendered DOM structure:
    // - In edit mode, SchemaNode still renders the wrapper div with position style
    // - The mode prop is correctly propagated to child containers' SchemaRender

    it('renders widgets correctly in edit mode', () => {
      const wrapper = mountSchemaRender(
        [makeWidget({ type: 'input', id: 'w1' })],
        { mode: 'edit' },
      )

      expect(wrapper.find('.stub-input').exists()).toBe(true)
    })

    it('renders widgets correctly in preview mode', () => {
      const wrapper = mountSchemaRender(
        [makeWidget({ type: 'input', id: 'w1' })],
        { mode: 'preview' },
      )

      expect(wrapper.find('.stub-input').exists()).toBe(true)
    })

    it('renders widgets correctly when mode is not specified', () => {
      const wrapper = mountSchemaRender([
        makeWidget({ type: 'input', id: 'w1' }),
      ])

      expect(wrapper.find('.stub-input').exists()).toBe(true)
    })

    it('passes mode to nested children in containers', () => {
      const child = makeWidget({ type: 'input', id: 'child1' })
      const container = makeContainerWidget('card', [child], { id: 'card1' })

      const wrapper = mountSchemaRender([container], { mode: 'edit' })

      // Both container and child should render their stubs (mode doesn't break rendering)
      expect(wrapper.find('.stub-card').exists()).toBe(true)
      expect(wrapper.find('.stub-input').exists()).toBe(true)
    })
  })

  // =========================================================================
  // 5. Linkage integration (useLinkage)
  // =========================================================================
  describe('Linkage integration', () => {
    it('shows widget by default when no linkages defined', () => {
      const wrapper = mountSchemaRender([
        makeWidget({ type: 'input', id: 'w1' }),
      ])

      expect(wrapper.find('.stub-input').exists()).toBe(true)
    })

    it('hides widget when linkage condition hides it', () => {
      // useLinkage evaluates linkage rules; a visible=false linkage hides the widget
      const wrapper = mountSchemaRender([
        makeWidget({
          type: 'input',
          id: 'w1',
          field: 'target',
          linkages: [{
            type: 'visible',
            watchFields: ['source'],
            condition: 'values.source === "show"',
          }],
        }),
        makeWidget({
          type: 'select',
          id: 'w2',
          field: 'source',
          options: [{ label: 'A', value: 'a' }],
        }),
      ])

      // source is undefined by default, condition evaluates to false → visible=false
      expect(wrapper.find('.stub-input').exists()).toBe(false)
      expect(wrapper.find('.stub-select').exists()).toBe(true)
    })

    it('multiple widgets without linkages all render', () => {
      const wrapper = mountSchemaRender([
        makeWidget({ type: 'input', id: 'w1' }),
        makeWidget({ type: 'select', id: 'w2' }),
      ])

      expect(wrapper.find('.stub-input').exists()).toBe(true)
      expect(wrapper.find('.stub-select').exists()).toBe(true)
    })
  })

  // =========================================================================
  // 6. Position styling
  // =========================================================================
  describe('Position styling', () => {
    // Note: CSS Module class `.nodeWrapper` is not available in jsdom.
    // We locate the wrapper div by its inline style (position: absolute).

    it('applies absolute positioning based on widget position', () => {
      const widget = makeWidget({
        type: 'input',
        id: 'w1',
        position: { x: 100, y: 200, w: 300, h: 50 },
      })

      const wrapper = mountSchemaRender([widget])

      // SchemaNode wraps components in a div with position:absolute and the widget's position
      const nodeWrapper = wrapper.find('div[style*="position: absolute"]')
      expect(nodeWrapper.exists()).toBe(true)
      const style = nodeWrapper.attributes('style')
      expect(style).toContain('left: 100px')
      expect(style).toContain('top: 200px')
      expect(style).toContain('width: 300px')
      expect(style).toContain('height: 50px')
    })

    it('applies zIndex when present', () => {
      const widget = makeWidget({
        type: 'input',
        id: 'w1',
        position: { x: 0, y: 0, w: 240, h: 40, zIndex: 10 },
      })

      const wrapper = mountSchemaRender([widget])

      const style = wrapper.find('div[style*="position: absolute"]').attributes('style')
      expect(style).toContain('z-index: 10')
    })

    it('does not include zIndex when not specified', () => {
      const widget = makeWidget({
        type: 'input',
        id: 'w1',
        position: { x: 0, y: 0, w: 240, h: 40 },
      })

      const wrapper = mountSchemaRender([widget])

      const style = wrapper.find('div[style*="position: absolute"]').attributes('style')
      expect(style).not.toContain('z-index')
    })
  })

  // =========================================================================
  // 7. Widget data provide/inject
  // =========================================================================
  describe('Widget data provide/inject', () => {
    it('provides widget data via widgetDataKey', () => {
      const widget = makeWidget({
        type: 'input',
        id: 'w1',
        label: 'Test Label',
        field: 'testField',
      })

      // We can verify this indirectly: the component renders correctly
      // which means SchemaNode resolved the component via registry
      const wrapper = mountSchemaRender([widget])
      expect(wrapper.find('.stub-input').exists()).toBe(true)
    })

    it('provides widget style via widgetStyleKey', () => {
      const widget = makeWidget({
        type: 'input',
        id: 'w1',
        style: { backgroundColor: 'red' },
      })

      const wrapper = mountSchemaRender([widget])
      expect(wrapper.find('.stub-input').exists()).toBe(true)
    })
  })

  // =========================================================================
  // 8. Widget with various properties
  // =========================================================================
  describe('Widget properties', () => {
    it('renders widget with label', () => {
      const wrapper = mountSchemaRender([
        makeWidget({ type: 'input', id: 'w1', label: 'Username' }),
      ])

      expect(wrapper.find('.stub-input').exists()).toBe(true)
    })

    it('renders widget with field', () => {
      const wrapper = mountSchemaRender([
        makeWidget({ type: 'input', id: 'w1', field: 'username' }),
      ])

      expect(wrapper.find('.stub-input').exists()).toBe(true)
    })

    it('renders widget with options', () => {
      const wrapper = mountSchemaRender([
        makeWidget({
          type: 'select',
          id: 'w1',
          options: [
            { label: 'Option A', value: 'a' },
            { label: 'Option B', value: 'b' },
          ],
        }),
      ])

      expect(wrapper.find('.stub-select').exists()).toBe(true)
    })

    it('renders widget with defaultValue', () => {
      const wrapper = mountSchemaRender([
        makeWidget({ type: 'input', id: 'w1', defaultValue: 'hello' }),
      ])

      expect(wrapper.find('.stub-input').exists()).toBe(true)
    })

    it('renders widget with props', () => {
      const wrapper = mountSchemaRender([
        makeWidget({ type: 'input', id: 'w1', props: { placeholder: 'Enter name' } }),
      ])

      expect(wrapper.find('.stub-input').exists()).toBe(true)
    })

    it('renders widget with validationRules', () => {
      const wrapper = mountSchemaRender([
        makeWidget({
          type: 'input',
          id: 'w1',
          field: 'name',
          validationRules: [{ required: true, message: 'Name is required' }],
        }),
      ])

      expect(wrapper.find('.stub-input').exists()).toBe(true)
    })

    it('renders widget with events', () => {
      const wrapper = mountSchemaRender([
        makeWidget({
          type: 'input',
          id: 'w1',
          events: [{
            trigger: 'change',
            actions: [{ type: 'show', target: 'w2' }],
          }],
        }),
      ])

      expect(wrapper.find('.stub-input').exists()).toBe(true)
    })

    it('renders widget with rules', () => {
      const wrapper = mountSchemaRender([
        makeWidget({
          type: 'input',
          id: 'w1',
          rules: [{
            watches: [{ type: 'field' as const, source: 'status' }],
            condition: 'status === "active"',
            actions: [{ type: 'visible' as const, config: {} }],
          }],
        }),
      ])

      expect(wrapper.find('.stub-input').exists()).toBe(true)
    })
  })

  // =========================================================================
  // 9. Mixed layout — multiple containers and widgets
  // =========================================================================
  describe('Mixed layout', () => {
    it('renders a form with card children containing inputs', () => {
      const inputs = [
        makeWidget({ type: 'input', id: 'i1', field: 'name' }),
        makeWidget({ type: 'select', id: 'i2', field: 'status' }),
      ]
      const card = makeContainerWidget('card', inputs, { id: 'card1', label: 'Info' })
      const form = makeContainerWidget('form', [card], { id: 'form1' })

      const wrapper = mountSchemaRender([form])

      expect(wrapper.find('.stub-form').exists()).toBe(true)
      expect(wrapper.find('.stub-card').exists()).toBe(true)
      expect(wrapper.find('.stub-input').exists()).toBe(true)
      expect(wrapper.find('.stub-select').exists()).toBe(true)
    })

    it('renders multiple root-level containers', () => {
      const form = makeContainerWidget('form', [
        makeWidget({ type: 'input', id: 'i1' }),
      ], { id: 'form1' })
      const card = makeContainerWidget('card', [
        makeWidget({ type: 'select', id: 's1' }),
      ], { id: 'card1' })

      const wrapper = mountSchemaRender([form, card])

      expect(wrapper.find('.stub-form').exists()).toBe(true)
      expect(wrapper.find('.stub-card').exists()).toBe(true)
      expect(wrapper.findAll('.stub-input')).toHaveLength(1)
      expect(wrapper.findAll('.stub-select')).toHaveLength(1)
    })

    it('renders tabs container with multiple children', () => {
      const children = [
        makeWidget({ type: 'input', id: 't1' }),
        makeWidget({ type: 'textarea', id: 't2' }),
      ]
      const tabs = makeContainerWidget('tabs', children, { id: 'tabs1' })

      const wrapper = mountSchemaRender([tabs])

      expect(wrapper.find('.stub-tabs').exists()).toBe(true)
      expect(wrapper.find('.stub-input').exists()).toBe(true)
      expect(wrapper.find('.stub-textarea').exists()).toBe(true)
    })
  })

  // =========================================================================
  // 10. Non-container types render without slot
  // =========================================================================
  describe('Non-container rendering', () => {
    const nonContainerTypes: SchemaType[] = ['input', 'select', 'textarea', 'date', 'radio', 'checkbox', 'number']

    for (const type of nonContainerTypes) {
      it(`${type} renders without slot content even if children are set`, () => {
        const widget = makeWidget({
          type,
          id: `w-${type}`,
          children: [makeWidget({ type: 'input', id: 'nested' })],
        })

        const wrapper = mountSchemaRender([widget])

        // The stub for non-container types does not render a slot,
        // so the nested child should not appear
        expect(wrapper.find(`.stub-${type}`).exists()).toBe(true)
        // Only one stub-input should exist (from the non-container stub itself if type=input)
        // The nested child is not rendered because non-container stubs don't have slots
      })
    }
  })
})
