/**
 * schemaDiff unit tests
 *
 * Covers:
 * - Empty schemas produce no diffs
 * - Added widgets detected
 * - Removed widgets detected
 * - Modified widgets detected (prop changes)
 * - Moved widgets detected (parent change)
 * - Nested children diffs
 * - Multiple diff types combined
 * - getDiffSummary formatting
 */
import { describe, it, expect } from 'vitest'
import { diffSchema, getDiffSummary } from '@/utils/schemaDiff'
import type { Widget } from '@/widgets/base/types'

/** Helper: create a minimal Widget with given overrides */
function makeWidget(overrides: Partial<Widget> & { id: string; type: Widget['type'] }): Widget {
  return {
    name: overrides.name ?? `Widget-${overrides.id}`,
    position: { x: 0, y: 0, w: 200, h: 40 },
    ...overrides,
  } as Widget
}

describe('diffSchema', () => {
  // ---------- empty schemas ----------

  it('returns empty diffs for two empty schemas', () => {
    const result = diffSchema([], [])
    expect(result.added).toHaveLength(0)
    expect(result.removed).toHaveLength(0)
    expect(result.modified).toHaveLength(0)
    expect(result.moved).toHaveLength(0)
  })

  it('returns empty diffs when schemas are identical', () => {
    const widgets: Widget[] = [
      makeWidget({ id: 'a', type: 'input', label: 'Name', field: 'name' }),
    ]
    const result = diffSchema(widgets, widgets)
    expect(result.added).toHaveLength(0)
    expect(result.removed).toHaveLength(0)
    expect(result.modified).toHaveLength(0)
    expect(result.moved).toHaveLength(0)
  })

  // ---------- added ----------

  it('detects added widgets', () => {
    const oldWidgets: Widget[] = []
    const newWidgets: Widget[] = [
      makeWidget({ id: 'a', type: 'input', label: 'Name' }),
      makeWidget({ id: 'b', type: 'select', label: 'City' }),
    ]
    const result = diffSchema(oldWidgets, newWidgets)
    expect(result.added).toHaveLength(2)
    expect(result.added.map((d) => d.id)).toEqual(expect.arrayContaining(['a', 'b']))
    expect(result.removed).toHaveLength(0)
    expect(result.modified).toHaveLength(0)
  })

  // ---------- removed ----------

  it('detects removed widgets', () => {
    const oldWidgets: Widget[] = [
      makeWidget({ id: 'a', type: 'input', label: 'Name' }),
      makeWidget({ id: 'b', type: 'select', label: 'City' }),
    ]
    const newWidgets: Widget[] = [
      makeWidget({ id: 'a', type: 'input', label: 'Name' }),
    ]
    const result = diffSchema(oldWidgets, newWidgets)
    expect(result.removed).toHaveLength(1)
    expect(result.removed[0].id).toBe('b')
    expect(result.added).toHaveLength(0)
  })

  // ---------- modified ----------

  it('detects modified widgets when label changes', () => {
    const oldWidgets: Widget[] = [
      makeWidget({ id: 'a', type: 'input', label: 'Name' }),
    ]
    const newWidgets: Widget[] = [
      makeWidget({ id: 'a', type: 'input', label: 'Full Name' }),
    ]
    const result = diffSchema(oldWidgets, newWidgets)
    expect(result.modified).toHaveLength(1)
    expect(result.modified[0].id).toBe('a')
    expect(result.modified[0].changes).toBeDefined()
    expect(result.modified[0].changes!.length).toBeGreaterThan(0)
    // Should have a change for label
    const labelChange = result.modified[0].changes!.find((c) => c.field.includes('label'))
    expect(labelChange).toBeDefined()
    expect(labelChange!.oldValue).toBe('Name')
    expect(labelChange!.newValue).toBe('Full Name')
  })

  it('detects modified widgets when props change', () => {
    const oldWidgets: Widget[] = [
      makeWidget({
        id: 'a',
        type: 'input',
        label: 'Name',
        props: { placeholder: 'Enter name' },
      }),
    ]
    const newWidgets: Widget[] = [
      makeWidget({
        id: 'a',
        type: 'input',
        label: 'Name',
        props: { placeholder: 'Type your name' },
      }),
    ]
    const result = diffSchema(oldWidgets, newWidgets)
    expect(result.modified).toHaveLength(1)
    const propChange = result.modified[0].changes!.find((c) => c.field.includes('placeholder'))
    expect(propChange).toBeDefined()
    expect(propChange!.oldValue).toBe('Enter name')
    expect(propChange!.newValue).toBe('Type your name')
  })

  it('does not flag identical schemas as modified', () => {
    const w = makeWidget({
      id: 'a',
      type: 'input',
      label: 'Name',
      props: { placeholder: 'Enter' },
    })
    const result = diffSchema([w], [w])
    expect(result.modified).toHaveLength(0)
  })

  // ---------- moved ----------

  it('detects moved widgets (parent change)', () => {
    const oldWidgets: Widget[] = [
      makeWidget({
        id: 'parent1',
        type: 'card',
        name: 'Card-1',
        children: [
          makeWidget({ id: 'child-a', type: 'input', label: 'A' }),
        ],
      }),
      makeWidget({
        id: 'parent2',
        type: 'card',
        name: 'Card-2',
      }),
    ]
    const newWidgets: Widget[] = [
      makeWidget({
        id: 'parent1',
        type: 'card',
        name: 'Card-1',
      }),
      makeWidget({
        id: 'parent2',
        type: 'card',
        name: 'Card-2',
        children: [
          makeWidget({ id: 'child-a', type: 'input', label: 'A' }),
        ],
      }),
    ]
    const result = diffSchema(oldWidgets, newWidgets)
    expect(result.moved).toHaveLength(1)
    expect(result.moved[0].id).toBe('child-a')
  })

  it('detects widget moved from root to container', () => {
    const oldWidgets: Widget[] = [
      makeWidget({ id: 'a', type: 'input', label: 'A' }),
      makeWidget({ id: 'container', type: 'card', name: 'Card' }),
    ]
    const newWidgets: Widget[] = [
      makeWidget({
        id: 'container',
        type: 'card',
        name: 'Card',
        children: [
          makeWidget({ id: 'a', type: 'input', label: 'A' }),
        ],
      }),
    ]
    const result = diffSchema(oldWidgets, newWidgets)
    expect(result.moved).toHaveLength(1)
    expect(result.moved[0].id).toBe('a')
  })

  // ---------- nested children ----------

  it('detects diffs in nested children', () => {
    const oldWidgets: Widget[] = [
      makeWidget({
        id: 'form',
        type: 'form',
        name: 'Form',
        children: [
          makeWidget({ id: 'a', type: 'input', label: 'Name' }),
        ],
      }),
    ]
    const newWidgets: Widget[] = [
      makeWidget({
        id: 'form',
        type: 'form',
        name: 'Form',
        children: [
          makeWidget({ id: 'a', type: 'input', label: 'Full Name' }),
          makeWidget({ id: 'b', type: 'select', label: 'City' }),
        ],
      }),
    ]
    const result = diffSchema(oldWidgets, newWidgets)
    expect(result.added).toHaveLength(1)
    expect(result.added[0].id).toBe('b')
    expect(result.modified).toHaveLength(1)
    expect(result.modified[0].id).toBe('a')
  })

  // ---------- combined ----------

  it('detects multiple diff types simultaneously', () => {
    const oldWidgets: Widget[] = [
      makeWidget({ id: 'keep', type: 'input', label: 'Same' }),
      makeWidget({ id: 'modify-me', type: 'input', label: 'Old Label' }),
      makeWidget({ id: 'delete-me', type: 'input', label: 'Bye' }),
      makeWidget({
        id: 'parent-a',
        type: 'card',
        name: 'A',
        children: [
          makeWidget({ id: 'mover', type: 'input', label: 'M' }),
        ],
      }),
      makeWidget({ id: 'parent-b', type: 'card', name: 'B' }),
    ]
    const newWidgets: Widget[] = [
      makeWidget({ id: 'keep', type: 'input', label: 'Same' }),
      makeWidget({ id: 'modify-me', type: 'input', label: 'New Label' }),
      makeWidget({ id: 'new-guy', type: 'select', label: 'New' }),
      makeWidget({ id: 'parent-a', type: 'card', name: 'A' }),
      makeWidget({
        id: 'parent-b',
        type: 'card',
        name: 'B',
        children: [
          makeWidget({ id: 'mover', type: 'input', label: 'M' }),
        ],
      }),
    ]
    const result = diffSchema(oldWidgets, newWidgets)

    expect(result.added).toHaveLength(1)
    expect(result.added[0].id).toBe('new-guy')

    expect(result.removed).toHaveLength(1)
    expect(result.removed[0].id).toBe('delete-me')

    expect(result.modified).toHaveLength(1)
    expect(result.modified[0].id).toBe('modify-me')

    expect(result.moved).toHaveLength(1)
    expect(result.moved[0].id).toBe('mover')
  })

  // ---------- path info ----------

  it('generates correct path for nested widgets', () => {
    const oldWidgets: Widget[] = []
    const newWidgets: Widget[] = [
      makeWidget({
        id: 'card',
        type: 'card',
        name: 'Card',
        label: 'Card',
        children: [
          makeWidget({ id: 'input', type: 'input', label: 'Name', field: 'name' }),
        ],
      }),
    ]
    const result = diffSchema(oldWidgets, newWidgets)
    expect(result.added).toHaveLength(2)
    const cardDiff = result.added.find((d) => d.id === 'card')
    const inputDiff = result.added.find((d) => d.id === 'input')
    expect(cardDiff).toBeDefined()
    expect(inputDiff).toBeDefined()
    expect(cardDiff!.path).toContain('Card')
    expect(inputDiff!.path).toContain('Card')
    expect(inputDiff!.path).toContain('Name')
  })
})

describe('getDiffSummary', () => {
  it('returns "无差异" for empty result', () => {
    const summary = getDiffSummary({ added: [], removed: [], modified: [], moved: [] })
    expect(summary).toBe('无差异')
  })

  it('formats single change type', () => {
    const summary = getDiffSummary({
      added: [{ id: 'a', name: 'A', type: 'input', path: 'A(input)' }],
      removed: [],
      modified: [],
      moved: [],
    })
    expect(summary).toBe('1 个新增')
  })

  it('formats multiple change types', () => {
    const summary = getDiffSummary({
      added: [{ id: 'a', name: 'A', type: 'input', path: 'A' }],
      removed: [{ id: 'b', name: 'B', type: 'input', path: 'B' }],
      modified: [{ id: 'c', name: 'C', type: 'input', path: 'C' }],
      moved: [{ id: 'd', name: 'D', type: 'input', path: 'D' }],
    })
    expect(summary).toBe('1 个新增，1 个删除，1 个修改，1 个移动')
  })
})
