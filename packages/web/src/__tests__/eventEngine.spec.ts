import { describe, it, expect, vi } from 'vitest'
import { evaluateCondition } from '@/engine/eventEngine'

vi.mock('@/stores/widget', () => ({
  useWidgetStore: vi.fn(() => ({
    findWidget: vi.fn(),
    updateWidget: vi.fn(),
  })),
}))

vi.mock('@/stores/editor', () => ({
  useEditorStore: vi.fn(() => ({
    openDialogEditor: vi.fn(),
    closeDialogEditor: vi.fn(),
  })),
}))

vi.mock('@/composables/useLogger', () => ({
  useLogger: vi.fn(() => ({
    warn: vi.fn(),
    info: vi.fn(),
    rule: vi.fn(),
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
