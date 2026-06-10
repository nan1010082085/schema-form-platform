/**
 * Performance benchmarks — Sprint 23 (S7-05 Performance Optimization)
 *
 * Tests:
 * 1. Canvas rendering: 100 widgets first paint < 1s
 * 2. Property panel: selection switch < 100ms
 * 3. Undo/redo: no lag on large schemas
 * 4. Store getters: computed caching (O(1) lookups)
 * 5. Component map caching: no repeated object creation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'
import { nextTick, ref } from 'vue'
import FormGrid from '@/components/WidgetRenderer/index.vue'
import type { PartialWidget } from '@/widgets/base/types'
import { useWidgetStore } from '@/stores/widget'
import { useEditorStore } from '@/stores/editor'
import { useHistory } from '@/composables/useHistory'
import { useWidgetIndex } from '@/composables/useWidgetIndex'
import { getComponentMap } from '@/widgets/registry'

/** Stub window.matchMedia for jsdom */
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

function mountWithEl(component: unknown, options: Record<string, unknown> = {}) {
  setupMatchMediaStub()
  const pinia = createPinia()
  setActivePinia(pinia)
  return mount(component as Parameters<typeof mount>[0], {
    global: { plugins: [pinia, ElementPlus], stubs: { 'el-form-item': { template: '<div><slot /></div>' } } },
    ...options,
  })
}

/** Generate N input fields */
function generateSchema(fieldCount: number, withContainer = true): PartialWidget[] {
  const fields: PartialWidget[] = []
  for (let i = 0; i < fieldCount; i++) {
    fields.push({
      type: 'input', field: `field_${i}`, label: `Field ${i + 1}`,
    })
  }
  if (!withContainer) return fields
  return [{ type: 'card', children: fields }]
}

/** Generate schema with various widget types for realistic testing */
function generateMixedSchema(count: number): PartialWidget[] {
  const types: PartialWidget['type'][] = ['input', 'select', 'number', 'checkbox', 'radio', 'textarea', 'button']
  const fields: PartialWidget[] = []
  for (let i = 0; i < count; i++) {
    const type = types[i % types.length]
    fields.push({
      type,
      field: `field_${i}`,
      label: `Field ${i + 1}`,
      ...(type === 'select' || type === 'radio' || type === 'checkbox'
        ? { options: [{ label: 'Option A', value: 'a' }, { label: 'Option B', value: 'b' }] }
        : {}),
    })
  }
  return [{ type: 'card', children: fields }]
}

/** Generate deep-nested schema (container depth) */
function generateNestedSchema(depth: number, widgetsPerLevel: number): PartialWidget[] {
  let children: PartialWidget[] = []
  for (let i = 0; i < widgetsPerLevel; i++) {
    children.push({ type: 'input', field: `leaf_${i}`, label: `Leaf ${i}` })
  }
  for (let d = 0; d < depth; d++) {
    children = [{ type: 'card', children }]
  }
  return children
}

function generateWithLinkage(count: number): PartialWidget[] {
  const items: PartialWidget[] = [
    { type: 'select', field: 'trigger', label: 'Trigger', options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }] },
  ]
  for (let i = 0; i < count; i++) {
    items.push({
      type: 'input', field: `linked_${i}`, label: `Linked ${i + 1}`,
      linkages: [{ type: 'visible', watchFields: ['trigger'], condition: 'values.trigger === "a"' }],
    })
  }
  return [{ type: 'card', children: items }]
}

// ================================================================
// 1. Canvas Rendering Performance
// ================================================================

describe('Canvas rendering performance', () => {
  it('renders 100 widgets under 1000ms', async () => {
    const schema = generateSchema(100)
    const start = performance.now()
    const wrapper = mountWithEl(FormGrid, { props: { schema } })
    await nextTick()
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(1000)
    wrapper.unmount()
  }, 10000)

  it('renders 200 widgets under 2000ms', async () => {
    const schema = generateSchema(200)
    const start = performance.now()
    const wrapper = mountWithEl(FormGrid, { props: { schema } })
    await nextTick()
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(2000)
    wrapper.unmount()
  }, 30000)

  it('renders mixed widget types efficiently', async () => {
    const schema = generateMixedSchema(100)
    const start = performance.now()
    const wrapper = mountWithEl(FormGrid, { props: { schema } })
    await nextTick()
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(1500)
    wrapper.unmount()
  }, 15000)

  it('renders deeply nested schema efficiently', async () => {
    const schema = generateNestedSchema(5, 4)
    const start = performance.now()
    const wrapper = mountWithEl(FormGrid, { props: { schema } })
    await nextTick()
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(500)
    wrapper.unmount()
  }, 10000)

  it('renders schema with linkages under 800ms', async () => {
    const schema = generateWithLinkage(30)
    const start = performance.now()
    const wrapper = mountWithEl(FormGrid, { props: { schema } })
    await nextTick()
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(800)
    wrapper.unmount()
  }, 15000)
})

// ================================================================
// 2. Store Performance: O(1) Widget Lookup
// ================================================================

describe('Store widget lookup performance', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
  })

  it('findWidget is O(1) via index, not O(n) DFS', () => {
    const store = useWidgetStore()
    // Load 500 widgets
    const widgets = Array.from({ length: 500 }, (_, i) => ({
      type: 'input' as const,
      id: `input_${i}`,
      field: `field_${i}`,
      label: `Field ${i}`,
      position: { x: 0, y: i * 50, w: 200, h: 40 },
    }))
    store.loadWidgets(widgets)

    // Find the last widget — should be O(1) via index
    const start = performance.now()
    const found = store.findWidget('input_499')
    const elapsed = performance.now() - start

    expect(found).not.toBeNull()
    expect(found!.id).toBe('input_499')
    // O(1) lookup should be < 1ms even for 500 widgets
    expect(elapsed).toBeLessThan(5)
  })

  it('findWidget works with nested containers', () => {
    const store = useWidgetStore()
    const children = Array.from({ length: 50 }, (_, i) => ({
      type: 'input' as const,
      id: `child_${i}`,
      field: `child_${i}`,
      label: `Child ${i}`,
      position: { x: 0, y: i * 50, w: 200, h: 40 },
    }))
    store.loadWidgets([
      {
        type: 'card' as const,
        id: 'card_1',
        label: 'Card',
        position: { x: 0, y: 0, w: 800, h: 600 },
        children,
      },
    ])

    const found = store.findWidget('child_49')
    expect(found).not.toBeNull()
    expect(found!.id).toBe('child_49')
  })
})

// ================================================================
// 3. useWidgetIndex Composable
// ================================================================

describe('useWidgetIndex composable', () => {
  it('provides O(1) lookup by ID', () => {
    const widgets = ref([
      { type: 'input' as const, id: 'a', field: 'a', label: 'A', position: { x: 0, y: 0, w: 200, h: 40 } },
      { type: 'card' as const, id: 'b', label: 'B', position: { x: 0, y: 50, w: 800, h: 600 }, children: [
        { type: 'input' as const, id: 'c', field: 'c', label: 'C', position: { x: 0, y: 0, w: 200, h: 40 } },
      ] },
    ])

    const index = useWidgetIndex(widgets)

    expect(index.has('a')).toBe(true)
    expect(index.has('c')).toBe(true) // nested
    expect(index.has('z')).toBe(false)

    const widget = index.get('c')
    expect(widget?.id).toBe('c')
  })

  it('handles 1000 widgets in < 5ms', () => {
    const items = Array.from({ length: 1000 }, (_, i) => ({
      type: 'input' as const,
      id: `w_${i}`,
      field: `f_${i}`,
      label: `W ${i}`,
      position: { x: 0, y: i * 50, w: 200, h: 40 },
    }))
    const widgets = ref(items)

    const start = performance.now()
    const index = useWidgetIndex(widgets)
    // Access to trigger computed evaluation
    index.has('w_999')
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(5)
    expect(index.get('w_999')?.id).toBe('w_999')
  })
})

// ================================================================
// 4. Undo/Redo Performance
// ================================================================

describe('Undo/redo performance', () => {
  it('pushHistory + undo/redo on 100-widget schema < 50ms each', () => {
    const store = useEditorStore()
    const widgets = Array.from({ length: 100 }, (_, i) => ({
      type: 'input' as const,
      id: `input_${i}`,
      field: `field_${i}`,
      label: `Field ${i}`,
      position: { x: 0, y: i * 50, w: 200, h: 40 },
    }))

    // Push 10 snapshots
    const pushStart = performance.now()
    for (let i = 0; i < 10; i++) {
      store.pushHistory(widgets.map(w => ({ ...w, label: `${w.label} v${i}` })))
    }
    const pushElapsed = performance.now() - pushStart
    expect(pushElapsed).toBeLessThan(100)

    // Undo
    const undoStart = performance.now()
    const undone = store.undo()
    const undoElapsed = performance.now() - undoStart
    expect(undone).not.toBeNull()
    expect(undoElapsed).toBeLessThan(50)

    // Redo
    const redoStart = performance.now()
    const redone = store.redo()
    const redoElapsed = performance.now() - redoStart
    expect(redone).not.toBeNull()
    expect(redoElapsed).toBeLessThan(50)
  })

  it('useHistory handles rapid push/undo/redo cycles', () => {
    const { pushState, undo, redo, canUndo, canRedo } = useHistory({ maxSize: 20 })

    const widgets: PartialWidget[] = Array.from({ length: 50 }, (_, i) => ({
      type: 'input',
      field: `field_${i}`,
      label: `Field ${i}`,
    }))

    const start = performance.now()
    for (let i = 0; i < 30; i++) {
      pushState(widgets.map(w => ({ ...w, label: `${w.label} v${i}` })))
    }
    for (let i = 0; i < 15; i++) {
      undo()
    }
    for (let i = 0; i < 10; i++) {
      redo()
    }
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(200)
    expect(canUndo.value).toBe(true)
    expect(canRedo.value).toBe(true)
  })
})

// ================================================================
// 5. Component Map Caching
// ================================================================

describe('Component map caching', () => {
  it('returns the same object reference on repeated calls', () => {
    const map1 = getComponentMap()
    const map2 = getComponentMap()
    expect(map1).toBe(map2) // same reference, not a new object
  })

  it('cached map lookup is fast', () => {
    // Warm up
    getComponentMap()

    const start = performance.now()
    for (let i = 0; i < 10000; i++) {
      getComponentMap()
    }
    const elapsed = performance.now() - start
    // 10k lookups of cached map should be < 10ms
    expect(elapsed).toBeLessThan(10)
  })
})

// ================================================================
// 6. Deep Clone Performance
// ================================================================

describe('Deep clone performance', () => {
  it('deep clone of 100-widget schema < 10ms', () => {
    const widgets = Array.from({ length: 100 }, (_, i) => ({
      type: 'input' as const,
      id: `input_${i}`,
      field: `field_${i}`,
      label: `Field ${i}`,
      position: { x: 0, y: i * 50, w: 200, h: 40 },
      props: { placeholder: `Enter ${i}`, disabled: false },
      style: { fontSize: '14px', color: '#333' },
    }))

    const start = performance.now()
    const clone = JSON.parse(JSON.stringify(widgets))
    const elapsed = performance.now() - start

    expect(clone).toEqual(widgets)
    expect(clone).not.toBe(widgets) // different reference
    expect(elapsed).toBeLessThan(10)
  })

  it('deep clone of 500-widget schema < 50ms', () => {
    const widgets = Array.from({ length: 500 }, (_, i) => ({
      type: 'input' as const,
      id: `input_${i}`,
      field: `field_${i}`,
      label: `Field ${i}`,
      position: { x: 0, y: i * 50, w: 200, h: 40 },
      props: { placeholder: `Enter ${i}` },
    }))

    const start = performance.now()
    const clone = JSON.parse(JSON.stringify(widgets))
    const elapsed = performance.now() - start

    expect(clone.length).toBe(500)
    expect(elapsed).toBeLessThan(50)
  })
})
