/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import { queryWidgets, validateSchema } from '../tools/widgetTools.js'

describe('queryWidgets', () => {
  it('returns all widgets when no category filter', () => {
    const result = queryWidgets()
    expect(result.total).toBeGreaterThan(30)
    expect(result.widgets.length).toBe(result.total)
  })

  it('filters by category', () => {
    const layout = queryWidgets('layout')
    expect(layout.widgets.every((w) => w.category === 'layout')).toBe(true)
    expect(layout.total).toBeGreaterThan(0)

    const form = queryWidgets('form')
    expect(form.widgets.every((w) => w.category === 'form')).toBe(true)
  })

  it('returns empty for unknown category', () => {
    const result = queryWidgets('nonexistent')
    expect(result.total).toBe(0)
    expect(result.widgets).toEqual([])
  })

  it('includes expected widget types', () => {
    const all = queryWidgets()
    const types = all.widgets.map((w) => w.type)
    expect(types).toContain('input')
    expect(types).toContain('select')
    expect(types).toContain('table')
    expect(types).toContain('form')
    expect(types).toContain('card')
    expect(types).toContain('tabs')
  })
})

describe('validateSchema', () => {
  const makeWidget = (overrides: Record<string, unknown> = {}) => ({
    id: '550e8400-e29b-41d4-a716-446655440000',
    type: 'input',
    field: 'userName',
    label: '用户名',
    props: { placeholder: '请输入' },
    position: { x: 0, y: 0, w: 12, h: 2 },
    ...overrides,
  })

  const makeContainer = (children: Record<string, unknown>[] = []) => ({
    id: '550e8400-e29b-41d4-a716-446655440001',
    type: 'form',
    field: '',
    label: '',
    props: {},
    position: { x: 0, y: 0, w: 24, h: 10 },
    children,
  })

  it('validates a simple valid schema', () => {
    const result = validateSchema([makeContainer([makeWidget()])])
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejects widget without type', () => {
    const result = validateSchema([{ id: '550e8400-e29b-41d4-a716-446655440000', position: { x: 0, y: 0, w: 1, h: 1 } }])
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('type'))).toBe(true)
  })

  it('rejects invalid widget type', () => {
    const result = validateSchema([makeContainer([makeWidget({ type: 'nonexistent' })])])
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('nonexistent'))).toBe(true)
  })

  it('rejects missing id', () => {
    const result = validateSchema([makeContainer([makeWidget({ id: undefined })])])
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('id'))).toBe(true)
  })

  it('rejects non-UUID id', () => {
    const result = validateSchema([makeContainer([makeWidget({ id: 'not-a-uuid' })])])
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('UUID'))).toBe(true)
  })

  it('rejects missing position', () => {
    const result = validateSchema([makeContainer([makeWidget({ position: undefined })])])
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('position'))).toBe(true)
  })

  it('rejects negative position values', () => {
    const result = validateSchema([makeContainer([makeWidget({ position: { x: -1, y: 0, w: 1, h: 1 } })])])
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('non-negative'))).toBe(true)
  })

  it('rejects top-level non-container widget', () => {
    const result = validateSchema([makeWidget()])
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('nested inside a layout container'))).toBe(true)
  })

  it('rejects container without children array', () => {
    const result = validateSchema([{ ...makeContainer(), children: undefined }])
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('children'))).toBe(true)
  })

  it('validates nested structure recursively', () => {
    const nested = makeContainer([
      makeContainer([makeWidget()]),
    ])
    const result = validateSchema([nested])
    expect(result.valid).toBe(true)
  })

  it('reports error for missing type (stops early)', () => {
    const result = validateSchema([
      makeWidget({ id: undefined, type: undefined, position: undefined }),
    ])
    expect(result.valid).toBe(false)
    // Missing type causes `continue`, so only the type error is reported
    expect(result.errors.some((e) => e.message.includes('type'))).toBe(true)
  })

  it('reports multiple errors when type is valid but other fields missing', () => {
    const result = validateSchema([
      makeContainer([makeWidget({ id: undefined, position: undefined })]),
    ])
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(2)
  })
})
