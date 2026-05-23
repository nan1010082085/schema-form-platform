import { describe, it, expect, vi, beforeEach } from 'vitest'
import { evaluateCondition, executeEventAction, type EventExecutionContext } from '@/engine/eventEngine'

vi.mock('@/composables/useLogger', () => ({
  useLogger: vi.fn(() => ({
    warn: vi.fn(),
    info: vi.fn(),
    rule: vi.fn(),
    event: vi.fn(),
    debug: vi.fn(),
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
  let ctx: EventExecutionContext

  function createMockContext(overrides: Partial<EventExecutionContext> = {}): EventExecutionContext {
    return {
      findWidget: vi.fn(),
      updateWidget: vi.fn(),
      openDialog: vi.fn(),
      closeDialog: vi.fn(),
      submitForm: vi.fn(),
      resetForm: vi.fn(),
      getFormData: vi.fn().mockReturnValue({}),
      emit: vi.fn(),
      ...overrides,
    }
  }

  beforeEach(() => {
    ctx = createMockContext()
  })

  it('set-value updates target widget defaultValue', () => {
    vi.mocked(ctx.findWidget).mockReturnValue({ id: 'w1', defaultValue: 'old' } as any)
    executeEventAction({ type: 'set-value', target: 'w1', value: 'new' }, ctx)
    expect(ctx.updateWidget).toHaveBeenCalledWith('w1', { defaultValue: 'new' })
  })

  it('set-value does nothing if target not found', () => {
    vi.mocked(ctx.findWidget).mockReturnValue(undefined)
    executeEventAction({ type: 'set-value', target: 'missing', value: 'val' }, ctx)
    expect(ctx.updateWidget).not.toHaveBeenCalled()
  })

  it('submit calls submitForm', () => {
    executeEventAction({ type: 'submit', target: '' }, ctx)
    expect(ctx.submitForm).toHaveBeenCalled()
  })

  it('reset calls resetForm', () => {
    executeEventAction({ type: 'reset', target: '' }, ctx)
    expect(ctx.resetForm).toHaveBeenCalled()
  })

  it('show unhides target widget', () => {
    vi.mocked(ctx.findWidget).mockReturnValue({ id: 'w1', hidden: true } as any)
    executeEventAction({ type: 'show', target: 'w1' }, ctx)
    expect(ctx.updateWidget).toHaveBeenCalledWith('w1', { hidden: false })
  })

  it('hide hides target widget', () => {
    vi.mocked(ctx.findWidget).mockReturnValue({ id: 'w1', hidden: false } as any)
    executeEventAction({ type: 'hide', target: 'w1' }, ctx)
    expect(ctx.updateWidget).toHaveBeenCalledWith('w1', { hidden: true })
  })

  it('open-dialog calls ctx.openDialog', () => {
    executeEventAction({ type: 'open-dialog', target: 'dlg1' }, ctx)
    expect(ctx.openDialog).toHaveBeenCalledWith('dlg1')
  })

  it('close-dialog calls ctx.closeDialog', () => {
    executeEventAction({ type: 'close-dialog', target: '' }, ctx)
    expect(ctx.closeDialog).toHaveBeenCalled()
  })

  it('switch-tab updates tabs widget activeKey', () => {
    vi.mocked(ctx.findWidget).mockReturnValue({ id: 'tabs1', type: 'tabs', props: {} } as any)
    executeEventAction({ type: 'switch-tab', target: 'tabs1', value: 'tab2' }, ctx)
    expect(ctx.updateWidget).toHaveBeenCalledWith('tabs1', { props: { activeKey: 'tab2' } })
  })

  it('emit calls ctx.emit with custom event', () => {
    executeEventAction({ type: 'emit', target: '', value: 'payload' }, ctx)
    expect(ctx.emit).toHaveBeenCalledWith('custom', 'payload')
  })
})
