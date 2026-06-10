import { describe, it, expect, vi, beforeEach } from 'vitest'
import { evaluateCondition, executeEventAction, triggerWidgetEvent, type EventExecutionContext } from '@/engine/eventEngine'
import type { Widget } from '@/widgets/base/types'

vi.mock('@/composables/useLogger', () => ({
  useLogger: vi.fn(() => ({
    warn: vi.fn(),
    info: vi.fn(),
    rule: vi.fn(),
    event: vi.fn(),
    debug: vi.fn(),
    api: vi.fn(),
  })),
}))

const mockRequestUrl = vi.fn()
vi.mock('@/utils/apiClient', () => ({
  apiClient: { requestUrl: (...args: unknown[]) => mockRequestUrl(...args) },
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

  // ---- variables 上下文测试 ----

  it('evaluates expression with variables context', () => {
    // variables 合并到 context 中，因为 evaluateCondition 的 variables 参数指向 context
    const context = { status: 'active', threshold: 100 }
    expect(evaluateCondition('variables.threshold > 50', context)).toBe(true)
  })

  it('evaluates expression referencing both values and variables', () => {
    // values 和 variables 都指向同一个 context
    const context = { amount: 200, limit: 150 }
    expect(evaluateCondition('amount > variables.limit', context)).toBe(true)
  })

  // ---- exposed 上下文测试 ----

  it('evaluates expression with exposed context', () => {
    const context = {}
    const exposed = { table1: { selectedRows: [{ id: 1 }] } }
    expect(evaluateCondition('exposed.table1.selectedRows.length > 0', context, exposed)).toBe(true)
  })

  it('evaluates expression with exposed and variables together', () => {
    const context = { mode: 'edit', debug: true }
    const exposed = { form1: { loading: false } }
    expect(evaluateCondition('mode === "edit" && variables.debug && !exposed.form1.loading', context, exposed)).toBe(true)
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
      getFormData: vi.fn().mockReturnValue({ name: 'test', age: 25 }),
      emit: vi.fn(),
      ...overrides,
    }
  }

  beforeEach(() => {
    ctx = createMockContext()
    mockRequestUrl.mockReset()
  })

  // ---- 基础动作测试 ----

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

  // ---- 新增动作类型测试 ----

  describe('set-variable', () => {
    it('calls ctx.setVariable with variable name and value', () => {
      const setVariable = vi.fn()
      ctx = createMockContext({ setVariable })
      executeEventAction({ type: 'set-variable', variable: 'count', value: 42 }, ctx)
      expect(setVariable).toHaveBeenCalledWith('count', 42)
    })

    it('does nothing if variable name is missing', () => {
      const setVariable = vi.fn()
      ctx = createMockContext({ setVariable })
      executeEventAction({ type: 'set-variable', value: 42 }, ctx)
      expect(setVariable).not.toHaveBeenCalled()
    })

    it('does nothing if ctx.setVariable is not provided', () => {
      ctx = createMockContext({ setVariable: undefined })
      expect(() => {
        executeEventAction({ type: 'set-variable', variable: 'count', value: 42 }, ctx)
      }).not.toThrow()
    })
  })

  describe('trigger-event', () => {
    it('calls ctx.triggerEvent with target and event name', () => {
      const triggerEvent = vi.fn()
      ctx = createMockContext({ triggerEvent })
      executeEventAction({ type: 'trigger-event', target: 'table1', event: 'refresh' }, ctx)
      expect(triggerEvent).toHaveBeenCalledWith('table1', 'refresh')
    })

    it('does nothing if target is missing', () => {
      const triggerEvent = vi.fn()
      ctx = createMockContext({ triggerEvent })
      executeEventAction({ type: 'trigger-event', event: 'refresh' }, ctx)
      expect(triggerEvent).not.toHaveBeenCalled()
    })

    it('does nothing if event name is missing', () => {
      const triggerEvent = vi.fn()
      ctx = createMockContext({ triggerEvent })
      executeEventAction({ type: 'trigger-event', target: 'table1' }, ctx)
      expect(triggerEvent).not.toHaveBeenCalled()
    })
  })

  describe('post-message', () => {
    const originalPostMessage = window.parent.postMessage

    afterEach(() => {
      window.parent.postMessage = originalPostMessage
    })

    it('sends postMessage to parent window', () => {
      const postMessageSpy = vi.fn()
      window.parent.postMessage = postMessageSpy
      executeEventAction({ type: 'post-message', message: { type: 'save', data: 'test' } }, ctx)
      expect(postMessageSpy).toHaveBeenCalledWith({ type: 'save', data: 'test' }, '*')
    })

    it('resolves formData.xxx references in message', () => {
      const postMessageSpy = vi.fn()
      window.parent.postMessage = postMessageSpy
      ctx = createMockContext({ getFormData: vi.fn().mockReturnValue({ userName: 'Alice' }) })
      executeEventAction({ type: 'post-message', message: { name: 'formData.userName' } }, ctx)
      expect(postMessageSpy).toHaveBeenCalledWith({ name: 'Alice' }, '*')
    })

    it('does nothing if message is missing', () => {
      const postMessageSpy = vi.fn()
      window.parent.postMessage = postMessageSpy
      executeEventAction({ type: 'post-message' }, ctx)
      expect(postMessageSpy).not.toHaveBeenCalled()
    })
  })

  describe('close-tab', () => {
    it('calls window.close', () => {
      const closeSpy = vi.spyOn(window, 'close').mockImplementation(() => {})
      executeEventAction({ type: 'close-tab' }, ctx)
      expect(closeSpy).toHaveBeenCalled()
      closeSpy.mockRestore()
    })
  })

  describe('copy', () => {
    it('copies text to clipboard', async () => {
      const writeTextSpy = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, { clipboard: { writeText: writeTextSpy } })
      await executeEventAction({ type: 'copy', text: 'Hello World' }, ctx)
      expect(writeTextSpy).toHaveBeenCalledWith('Hello World')
    })

    it('resolves formData.xxx references in text', async () => {
      const writeTextSpy = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, { clipboard: { writeText: writeTextSpy } })
      ctx = createMockContext({ getFormData: vi.fn().mockReturnValue({ email: 'test@example.com' }) })
      await executeEventAction({ type: 'copy', text: 'formData.email' }, ctx)
      expect(writeTextSpy).toHaveBeenCalledWith('test@example.com')
    })

    it('does nothing if text is missing', () => {
      const writeTextSpy = vi.fn()
      Object.assign(navigator, { clipboard: { writeText: writeTextSpy } })
      executeEventAction({ type: 'copy' }, ctx)
      expect(writeTextSpy).not.toHaveBeenCalled()
    })
  })

  describe('refresh', () => {
    it('calls ctx.triggerEvent with refresh event', () => {
      const triggerEvent = vi.fn()
      ctx = createMockContext({ triggerEvent })
      executeEventAction({ type: 'refresh', target: 'table1' }, ctx)
      expect(triggerEvent).toHaveBeenCalledWith('table1', 'refresh')
    })

    it('does nothing if target is missing', () => {
      const triggerEvent = vi.fn()
      ctx = createMockContext({ triggerEvent })
      executeEventAction({ type: 'refresh' }, ctx)
      expect(triggerEvent).not.toHaveBeenCalled()
    })
  })

  describe('api', () => {
    it('calls apiClient.requestUrl and emits api-success', async () => {
      mockRequestUrl.mockResolvedValue({ ok: true })
      await executeEventAction({ type: 'api', apiUrl: '/api/users', apiMethod: 'get' }, ctx)
      expect(mockRequestUrl).toHaveBeenCalledWith('get', '/api/users', undefined)
      expect(ctx.emit).toHaveBeenCalledWith('api-success', { url: '/api/users', response: { ok: true } })
    })

    it('defaults to post method', async () => {
      mockRequestUrl.mockResolvedValue({})
      await executeEventAction({ type: 'api', apiUrl: '/api/users' }, ctx)
      expect(mockRequestUrl).toHaveBeenCalledWith('post', '/api/users', undefined)
    })

    it('sends formData as params when apiParams is "formData"', async () => {
      ctx = createMockContext({ getFormData: vi.fn().mockReturnValue({ name: 'test' }) })
      mockRequestUrl.mockResolvedValue({})
      await executeEventAction({ type: 'api', apiUrl: '/api/save', apiParams: 'formData' }, ctx)
      expect(mockRequestUrl).toHaveBeenCalledWith('post', '/api/save', { name: 'test' })
    })

    it('emits api-error on request failure', async () => {
      mockRequestUrl.mockRejectedValue(new Error('network error'))
      await executeEventAction({ type: 'api', apiUrl: '/api/fail' }, ctx)
      expect(ctx.emit).toHaveBeenCalledWith('api-error', { url: '/api/fail', error: 'Error: network error' })
    })

    it('sends custom params', async () => {
      mockRequestUrl.mockResolvedValue({})
      await executeEventAction({ type: 'api', apiUrl: '/api/query', apiParams: { id: 123 } }, ctx)
      expect(mockRequestUrl).toHaveBeenCalledWith('post', '/api/query', { id: 123 })
    })

    it('does nothing if apiUrl is missing', () => {
      executeEventAction({ type: 'api' }, ctx)
      expect(ctx.emit).not.toHaveBeenCalled()
    })
  })

  describe('navigate', () => {
    it('emits navigate event with path and query', () => {
      executeEventAction({ type: 'navigate', navigatePath: '/detail', navigateQuery: { id: '123' } }, ctx)
      expect(ctx.emit).toHaveBeenCalledWith('navigate', {
        path: '/detail',
        query: { id: '123' },
      })
    })

    it('emits navigate event without query', () => {
      executeEventAction({ type: 'navigate', navigatePath: '/list' }, ctx)
      expect(ctx.emit).toHaveBeenCalledWith('navigate', {
        path: '/list',
        query: undefined,
      })
    })

    it('does nothing if navigatePath is missing', () => {
      executeEventAction({ type: 'navigate' }, ctx)
      expect(ctx.emit).not.toHaveBeenCalled()
    })
  })

  describe('startFlow', () => {
    it('calls POST /flow-instances with definitionId and variables', async () => {
      mockRequestUrl.mockResolvedValue({ id: 'inst-1', status: 'running' })
      await executeEventAction({
        type: 'startFlow',
        definitionId: 'def-123',
        variables: { amount: 100 },
      }, ctx)
      expect(mockRequestUrl).toHaveBeenCalledWith('post', '/flow-instances', {
        definitionId: 'def-123',
        variables: { amount: 100 },
      })
      expect(ctx.emit).toHaveBeenCalledWith('flow-started', {
        definitionId: 'def-123',
        response: { id: 'inst-1', status: 'running' },
      })
    })

    it('uses empty variables when not provided', async () => {
      mockRequestUrl.mockResolvedValue({ id: 'inst-2' })
      await executeEventAction({ type: 'startFlow', definitionId: 'def-456' }, ctx)
      expect(mockRequestUrl).toHaveBeenCalledWith('post', '/flow-instances', {
        definitionId: 'def-456',
        variables: {},
      })
    })

    it('emits flow-error on request failure', async () => {
      mockRequestUrl.mockRejectedValue(new Error('permission denied'))
      await executeEventAction({ type: 'startFlow', definitionId: 'def-err' }, ctx)
      expect(ctx.emit).toHaveBeenCalledWith('flow-error', {
        action: 'startFlow',
        definitionId: 'def-err',
        error: 'Error: permission denied',
      })
    })

    it('does nothing if definitionId is missing', async () => {
      await executeEventAction({ type: 'startFlow' }, ctx)
      expect(mockRequestUrl).not.toHaveBeenCalled()
    })
  })

  describe('endFlow', () => {
    it('calls POST /flow-instances/:id/terminate', async () => {
      mockRequestUrl.mockResolvedValue({ id: 'inst-1', status: 'terminated' })
      await executeEventAction({
        type: 'endFlow',
        instanceId: 'inst-1',
        reason: '用户取消',
      }, ctx)
      expect(mockRequestUrl).toHaveBeenCalledWith('post', '/flow-instances/inst-1/terminate', { reason: '用户取消' })
      expect(ctx.emit).toHaveBeenCalledWith('flow-ended', {
        instanceId: 'inst-1',
        response: { id: 'inst-1', status: 'terminated' },
      })
    })

    it('omits reason body when not provided', async () => {
      mockRequestUrl.mockResolvedValue({ id: 'inst-2', status: 'terminated' })
      await executeEventAction({ type: 'endFlow', instanceId: 'inst-2' }, ctx)
      expect(mockRequestUrl).toHaveBeenCalledWith('post', '/flow-instances/inst-2/terminate', undefined)
    })

    it('emits flow-error on request failure', async () => {
      mockRequestUrl.mockRejectedValue(new Error('not found'))
      await executeEventAction({ type: 'endFlow', instanceId: 'inst-err' }, ctx)
      expect(ctx.emit).toHaveBeenCalledWith('flow-error', {
        action: 'endFlow',
        instanceId: 'inst-err',
        error: 'Error: not found',
      })
    })

    it('does nothing if instanceId is missing', async () => {
      await executeEventAction({ type: 'endFlow' }, ctx)
      expect(mockRequestUrl).not.toHaveBeenCalled()
    })
  })
})

// ---- triggerWidgetEvent 完整测试 ----

describe('triggerWidgetEvent', () => {
  let ctx: EventExecutionContext

  function createMockContext(overrides: Partial<EventExecutionContext> = {}): EventExecutionContext {
    return {
      findWidget: vi.fn(),
      updateWidget: vi.fn(),
      openDialog: vi.fn(),
      closeDialog: vi.fn(),
      submitForm: vi.fn(),
      resetForm: vi.fn(),
      getFormData: vi.fn().mockReturnValue({ status: 'active', amount: 100 }),
      emit: vi.fn(),
      variables: { threshold: 50 },
      ...overrides,
    }
  }

  beforeEach(() => {
    ctx = createMockContext()
  })

  it('executes matching trigger events', () => {
    const widget: Widget = {
      id: 'btn1',
      name: 'FgButton',
      type: 'button',
      position: { x: 0, y: 0, w: 100, h: 40 },
      events: [
        {
          trigger: 'click',
          actions: [{ type: 'submit' }],
        },
      ],
    }

    triggerWidgetEvent(widget, 'click', ctx)
    expect(ctx.submitForm).toHaveBeenCalled()
  })

  it('skips non-matching triggers', () => {
    const widget: Widget = {
      id: 'btn1',
      name: 'FgButton',
      type: 'button',
      position: { x: 0, y: 0, w: 100, h: 40 },
      events: [
        {
          trigger: 'click',
          actions: [{ type: 'submit' }],
        },
      ],
    }

    triggerWidgetEvent(widget, 'change', ctx)
    expect(ctx.submitForm).not.toHaveBeenCalled()
  })

  it('skips events with unmet conditions', () => {
    const widget: Widget = {
      id: 'btn1',
      name: 'FgButton',
      type: 'button',
      position: { x: 0, y: 0, w: 100, h: 40 },
      events: [
        {
          trigger: 'click',
          condition: 'status === "inactive"',
          actions: [{ type: 'submit' }],
        },
      ],
    }

    triggerWidgetEvent(widget, 'click', ctx)
    expect(ctx.submitForm).not.toHaveBeenCalled()
  })

  it('executes events with met conditions', () => {
    const widget: Widget = {
      id: 'btn1',
      name: 'FgButton',
      type: 'button',
      position: { x: 0, y: 0, w: 100, h: 40 },
      events: [
        {
          trigger: 'click',
          condition: 'status === "active"',
          actions: [{ type: 'submit' }],
        },
      ],
    }

    triggerWidgetEvent(widget, 'click', ctx)
    expect(ctx.submitForm).toHaveBeenCalled()
  })

  it('handles confirm dialog (user confirms)', async () => {
    ctx = createMockContext({
      confirm: vi.fn().mockResolvedValue(undefined),
    })
    const widget: Widget = {
      id: 'btn1',
      name: 'FgButton',
      type: 'button',
      position: { x: 0, y: 0, w: 100, h: 40 },
      events: [
        {
          trigger: 'click',
          confirm: '确定提交？',
          actions: [{ type: 'submit' }],
        },
      ],
    }

    await triggerWidgetEvent(widget, 'click', ctx)
    expect(ctx.confirm).toHaveBeenCalledWith('确定提交？')
    expect(ctx.submitForm).toHaveBeenCalled()
  })

  it('handles confirm dialog (user cancels)', async () => {
    ctx = createMockContext({
      confirm: vi.fn().mockRejectedValue(new Error('cancel')),
    })
    const widget: Widget = {
      id: 'btn1',
      name: 'FgButton',
      type: 'button',
      position: { x: 0, y: 0, w: 100, h: 40 },
      events: [
        {
          trigger: 'click',
          confirm: '确定提交？',
          actions: [{ type: 'submit' }],
        },
      ],
    }

    await triggerWidgetEvent(widget, 'click', ctx)
    expect(ctx.submitForm).not.toHaveBeenCalled()
  })

  it('executes action chain in order', async () => {
    const callOrder: string[] = []
    vi.mocked(ctx.submitForm).mockImplementation(() => { callOrder.push('submit') })
    vi.mocked(ctx.resetForm).mockImplementation(() => { callOrder.push('reset') })

    const widget: Widget = {
      id: 'btn1',
      name: 'FgButton',
      type: 'button',
      position: { x: 0, y: 0, w: 100, h: 40 },
      events: [
        {
          trigger: 'click',
          actions: [
            { type: 'submit' },
            { type: 'reset' },
          ],
        },
      ],
    }

    await triggerWidgetEvent(widget, 'click', ctx)
    expect(callOrder).toEqual(['submit', 'reset'])
  })

  it('does nothing if widget has no events', async () => {
    const widget: Widget = {
      id: 'btn1',
      name: 'FgButton',
      type: 'button',
      position: { x: 0, y: 0, w: 100, h: 40 },
    }

    expect(() => triggerWidgetEvent(widget, 'click', ctx)).not.toThrow()
    expect(ctx.submitForm).not.toHaveBeenCalled()
  })

  it('evaluates condition with variables context', () => {
    const widget: Widget = {
      id: 'btn1',
      name: 'FgButton',
      type: 'button',
      position: { x: 0, y: 0, w: 100, h: 40 },
      events: [
        {
          trigger: 'click',
          condition: 'variables.threshold > 30',
          actions: [{ type: 'submit' }],
        },
      ],
    }

    triggerWidgetEvent(widget, 'click', ctx)
    expect(ctx.submitForm).toHaveBeenCalled()
  })
})
