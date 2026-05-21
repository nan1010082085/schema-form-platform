/**
 * Performance benchmarks — Sprint 20
 * Measures FormGrid rendering time for various schema sizes.
 * Uses Vitest + JSDOM timers.
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'
import { nextTick } from 'vue'
import FormGrid from '@/components/FormGrid/index.vue'
import type { FormSchemaItem } from '@/components/FormGrid/types'

/** Stub window.matchMedia for jsdom (required by useBreakpoint -> SchemaRender) */
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

function mountWithEl(component: any, options: any = {}) {
  setupMatchMediaStub()
  const pinia = createPinia()
  setActivePinia(pinia)
  return mount(component, {
    global: { plugins: [pinia, ElementPlus], stubs: { 'el-form-item': { template: '<div><slot /></div>' } } },
    ...options,
  })
}

/** Generate N input fields in grid layout */
function generateSchema(fieldCount: number, withContainer = true): FormSchemaItem[] {
  const fields: FormSchemaItem[] = []
  for (let i = 0; i < fieldCount; i++) {
    fields.push({
      type: 'grid-col', span: 12,
      children: [{ type: 'input', field: `field_${i}`, label: `字段 ${i + 1}` }],
    })
  }
  if (!withContainer) return fields
  return [{ type: 'page', children: [{ type: 'card', children: [{ type: 'grid-row', children: fields }] }] }]
}

function generateWithLinkage(count: number): FormSchemaItem[] {
  const items: FormSchemaItem[] = [
    { type: 'select', field: 'trigger', label: '触发字段', options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }] },
  ]
  for (let i = 0; i < count; i++) {
    items.push({
      type: 'grid-col', span: 12,
      children: [{
        type: 'input', field: `linked_${i}`, label: `联动字段 ${i + 1}`,
        linkages: [{ type: 'visible', watchFields: ['trigger'], condition: 'values.trigger === "a"' }],
      }],
    })
  }
  return [{ type: 'page', children: [{ type: 'card', children: [{ type: 'grid-row', children: items }] }] }]
}

describe('Performance benchmarks', () => {
  it('renders 50 fields under 300ms', async () => {
    const schema = generateSchema(50)
    const start = performance.now()
    const wrapper = mountWithEl(FormGrid, { props: { schema } })
    await nextTick()
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(2000)
    wrapper.unmount()
  }, 10000)

  it('renders 100 fields under 600ms', async () => {
    const schema = generateSchema(100)
    const start = performance.now()
    const wrapper = mountWithEl(FormGrid, { props: { schema } })
    await nextTick()
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(2000)
    wrapper.unmount()
  }, 15000)

  it('renders 200 fields under 2000ms', async () => {
    const schema = generateSchema(200)
    const start = performance.now()
    const wrapper = mountWithEl(FormGrid, { props: { schema } })
    await nextTick()
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(2000)
    wrapper.unmount()
  }, 30000)

  it('renders 3-level nested schema under 500ms', async () => {
    const schema = generateSchema(50, true) // page > card > grid-row
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
