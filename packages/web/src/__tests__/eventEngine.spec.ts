import { describe, it, expect, vi, beforeEach } from 'vitest'
import { evaluateCondition, executeEventAction } from '@/engine/eventEngine'
import { useWidgetStore } from '@/stores/widget'
import { useEditorStore } from '@/stores/editor'

vi.mock('@/stores/widget', () => ({
  useWidgetStore: vi.fn(),
}))

vi.mock('@/stores/editor', () => ({
  useEditorStore: vi.fn(),
}))

vi.mock('@/composables/useLogger', () => ({
  useLogger: vi.fn(() => ({
    warn: vi.fn(),
    info: vi.fn(),
    rule: vi.fn(),
    event: vi.fn(),
  })),
}))

describe('evaluateCondition', () => {
  it('evaluates simple expression', () => {
    expect(evaluateCondition('status === "active"', { status: 'active' })).toBe(true)
  })

  it('returns false for non-matching expression', () => {
    expect(evaluateCondition('status === "active"', { status: 'inactive' })).toBe(false)
  })

  it('returns false for syntax error', () => {
    expect(evaluateCondition('invalid !!!', {})).toBe(false)
  })

  it('blocks dangerous expressions', () => {
    expect(evaluateCondition('window.location', {})).toBe(false)
    expect(evaluateCondition('document.cookie', {})).toBe(false)
    expect(evaluateCondition('eval("1+1")', {})).toBe(false)
  })

  it('enforces length limit', () => {
    const longExpr = 'a'.repeat(501)
    expect(evaluateCondition(longExpr, {})).toBe(false)
  })
})

describe('executeEventAction', () => {
  let mockWidgetStore: ReturnType<typeof createMockWidgetStore>
  let mockEditorStore: ReturnType<typeof createMockEditorStore>

  function createMockWidgetStore(overrides: Record<string, unknown> = {}) {
    return {
      findWidget: vi.fn(),
      updateWidget: vi.fn(),
      widgets: [] as unknown[],
      collectFormValues: vi.fn().mockReturnValue({}),
      ...overrides,
    }
  }

  function createMockEditorStore(overrides: Record<string, unknown> = {}) {
    return {
      openDialogEditor: vi.fn(),
      closeDialogEditor: vi.fn(),
      ...overrides,
    }
  }

  beforeEach(() => {
    mockWidgetStore = createMockWidgetStore()
    mockEditorStore = createMockEditorStore()
    vi.mocked(useWidgetStore).mockReturnValue(mockWidgetStore as any)
    vi.mocked(useEditorStore).mockReturnValue(mockEditorStore as any)
  })

  it('set-value updates target widget defaultValue', () => {
    mockWidgetStore.findWidget.mockReturnValue({ id: 'w1', defaultValue: 'old' })
    executeEventAction(
      { type: 'set-value', target: 'w1', value: 'new' },
    )
    expect(mockWidgetStore.updateWidget).toHaveBeenCalledWith('w1', { defaultValue: 'new' })
  })

  it('set-value does nothing if target not found', () => {
    mockWidgetStore.findWidget.mockReturnValue(null)
    executeEventAction(
      { type: 'set-value', target: 'missing', value: 'val' },
    )
    expect(mockWidgetStore.updateWidget).not.toHaveBeenCalled()
  })

  it('submit collects form values from the first form widget', () => {
    mockWidgetStore.widgets = [{ id: 'form1', type: 'form' }] as any
    mockWidgetStore.collectFormValues.mockReturnValue({ name: 'Alice' })
    executeEventAction({ type: 'submit', target: '' })
    expect(mockWidgetStore.collectFormValues).toHaveBeenCalledWith('form1')
  })

  it('submit does nothing if no form widget exists', () => {
    mockWidgetStore.widgets = []
    executeEventAction({ type: 'submit', target: '' })
    expect(mockWidgetStore.collectFormValues).not.toHaveBeenCalled()
  })

  it('reset restores children defaultValue', () => {
    const child1 = { id: 'c1', field: 'name', defaultValue: '' }
    const child2 = { id: 'c2', field: 'age', defaultValue: 0 }
    mockWidgetStore.widgets = [{ id: 'form1', type: 'form', children: [child1, child2] }] as any
    executeEventAction({ type: 'reset', target: '' })
    expect(mockWidgetStore.updateWidget).toHaveBeenCalledWith('c1', { defaultValue: '' })
    expect(mockWidgetStore.updateWidget).toHaveBeenCalledWith('c2', { defaultValue: 0 })
  })

  it('reset skips children without field', () => {
    const noField = { id: 'c1', defaultValue: '' }
    mockWidgetStore.widgets = [{ id: 'form1', type: 'form', children: [noField] }] as any
    executeEventAction({ type: 'reset', target: '' })
    expect(mockWidgetStore.updateWidget).not.toHaveBeenCalled()
  })
})
