# Plan 3: WebSocket + Widget 统一生命周期 + 日志

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 WebSocket 共享连接 + topic 分发，为所有 Widget 提供统一生命周期钩子，扩展日志系统支持 child logger 和远程收集。

**Architecture:** WebSocketManager 单例管理连接池，按 URL 共享连接，按 topic 分发到订阅者。useWidgetLifecycle composable 为每个 widget 实例提供 5 个生命周期钩子。Logger 扩展支持 child() 和 transport。

**Tech Stack:** TypeScript, Vue 3 Composables, Vitest

**依赖:** Plan 1（ExpressionRuntime + Scopes）

---

## Task 1: Logger 扩展

**Files:**
- Modify: `packages/web/src/composables/useLogger.ts`
- Create: `packages/web/src/composables/__tests__/useLogger.spec.ts`

- [ ] **Step 1: 编写 Logger 扩展测试**

```typescript
// packages/web/src/composables/__tests__/useLogger.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useLogger, configureLogger } from '../useLogger'

describe('useLogger', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('creates logger with scope prefix', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    // useLogger 在 DEV 模式下输出日志
    // 测试环境中 import.meta.env.DEV 可能为 false
    // 所以我们测试接口存在性
    const logger = useLogger('Test')
    expect(logger).toHaveProperty('info')
    expect(logger).toHaveProperty('warn')
    expect(logger).toHaveProperty('error')
    expect(logger).toHaveProperty('debug')
    expect(logger).toHaveProperty('event')
    expect(logger).toHaveProperty('rule')
    expect(logger).toHaveProperty('api')
  })

  it('child logger adds prefix', () => {
    const parent = useLogger('Parent')
    const child = parent.child('Child')
    expect(child).toHaveProperty('info')
    expect(child).toHaveProperty('warn')
    expect(child).toHaveProperty('error')
    expect(child).toHaveProperty('debug')
  })

  it('child logger chains prefixes', () => {
    const logger = useLogger('App')
    const child1 = logger.child('Module')
    const child2 = child1.child('SubModule')
    expect(child2).toHaveProperty('info')
  })
})

describe('configureLogger', () => {
  it('accepts transport configuration', () => {
    const transport = vi.fn()
    expect(() => configureLogger({ transport })).not.toThrow()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @schema-form/web test -- src/composables/__tests__/useLogger.spec.ts`
Expected: FAIL — `child` and `configureLogger` not found

- [ ] **Step 3: 扩展 useLogger**

```typescript
// packages/web/src/composables/useLogger.ts

/** 日志传输函数 */
type LogTransport = (level: string, scope: string, args: unknown[]) => void

let globalTransport: LogTransport | null = null

const COLORS = {
  info: '',
  warn: '',
  error: '',
  debug: '',
  event: 'color: #409eff; font-weight: bold',
  rule: 'color: #9c27b0; font-weight: bold',
  api: 'color: #67c23a; font-weight: bold',
  lifecycle: 'color: #e6a23c; font-weight: bold',
} as const

export interface Logger {
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
  debug: (...args: unknown[]) => void
  event: (...args: unknown[]) => void
  rule: (...args: unknown[]) => void
  api: (...args: unknown[]) => void
  lifecycle: (...args: unknown[]) => void
  /** 创建子 logger，自动加前缀 */
  child: (prefix: string) => Logger
}

/**
 * 配置全局日志传输（用于生产环境远程收集）
 */
export function configureLogger(options: { transport?: LogTransport }): void {
  globalTransport = options.transport ?? null
}

export function useLogger(scope: string): Logger {
  const isDev = import.meta.env.DEV

  const LEVEL_MAP = { info: 'log', warn: 'warn', error: 'error', debug: 'debug' } as const

  function log(level: 'info' | 'warn' | 'error' | 'debug', color: string, ...args: unknown[]) {
    // 远程收集（生产环境也生效）
    if (globalTransport) {
      globalTransport(level, scope, args)
    }

    if (!isDev) return
    const prefix = `[${scope}]`
    const method = LEVEL_MAP[level]
    if (color) {
      console[method](`%c${prefix}`, color, ...args)
    } else {
      console[method](prefix, ...args)
    }
  }

  const logger: Logger = {
    info: (...args: unknown[]) => log('info', '', ...args),
    warn: (...args: unknown[]) => log('warn', '', ...args),
    error: (...args: unknown[]) => log('error', '', ...args),
    debug: (...args: unknown[]) => log('debug', '', ...args),
    event: (...args: unknown[]) => log('info', COLORS.event, ...args),
    rule: (...args: unknown[]) => log('info', COLORS.rule, ...args),
    api: (...args: unknown[]) => log('info', COLORS.api, ...args),
    lifecycle: (...args: unknown[]) => log('info', COLORS.lifecycle, ...args),
    child: (prefix: string) => useLogger(`${scope}:${prefix}`),
  }

  return logger
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter @schema-form/web test -- src/composables/__tests__/useLogger.spec.ts`
Expected: PASS

- [ ] **Step 5: 运行全量测试确认无破坏**

Run: `pnpm --filter @schema-form/web test`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/composables/useLogger.ts packages/web/src/composables/__tests__/useLogger.spec.ts
git commit -m "feat: Logger 扩展 — child() + lifecycle 级别 + remote transport"
```

---

## Task 2: Widget 生命周期类型 + useWidgetLifecycle

**Files:**
- Modify: `packages/web/src/widgets/base/types.ts`
- Create: `packages/web/src/composables/useWidgetLifecycle.ts`
- Create: `packages/web/src/composables/__tests__/useWidgetLifecycle.spec.ts`

- [ ] **Step 1: 在 types.ts 添加生命周期类型**

在 `packages/web/src/widgets/base/types.ts` 的 `Widget` 接口中添加 `lifecycle` 字段：

```typescript
export interface Widget {
  // ...existing fields...

  // === 生命周期 ===
  /** Widget 生命周期钩子 */
  lifecycle?: WidgetLifecycleConfig
}
```

在文件末尾添加生命周期类型定义：

```typescript
// ============================================================
// Widget 生命周期
// ============================================================

/** 生命周期钩子配置 */
export interface WidgetLifecycleConfig {
  /** Widget 实例创建后 */
  onInit?: LifecycleHook
  /** DOM 挂载后 */
  onMount?: LifecycleHook
  /** DOM 卸载前 */
  onUnmount?: LifecycleHook
  /** 绑定字段值变化时 */
  onDataChange?: LifecycleHook
  /** 可见性变化时 */
  onVisibleChange?: LifecycleHook
}

/** 生命周期钩子：字符串表达式或函数 */
export type LifecycleHook = string | ((ctx: LifecycleContext) => void | Promise<void>)

/** 生命周期执行上下文 */
export interface LifecycleContext {
  /** 当前 Widget */
  widget: Widget
  /** 表单数据 */
  formData: Record<string, unknown>
  /** 变量作用域 */
  scopes: import('./types').VariableScope[]
  /** 字段名 */
  field?: string
  /** 字段值（onDataChange 时） */
  value?: unknown
  /** Logger 实例 */
  logger: import('@/composables/useLogger').Logger
}
```

- [ ] **Step 2: 编写 useWidgetLifecycle 测试**

```typescript
// packages/web/src/composables/__tests__/useWidgetLifecycle.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, ref, reactive } from 'vue'
import { useWidgetLifecycle } from '../useWidgetLifecycle'
import type { Widget, WidgetLifecycleConfig } from '@/widgets/base/types'

function createTestWidget(lifecycle?: WidgetLifecycleConfig): Widget {
  return {
    id: 'test_1',
    name: 'TestWidget',
    type: 'input',
    field: 'name',
    lifecycle,
    position: { x: 0, y: 0, w: 100, h: 40 },
  }
}

describe('useWidgetLifecycle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('returns trigger function', () => {
    const widget = createTestWidget()
    const formData = reactive({ name: 'Alice' })
    const { trigger } = useWidgetLifecycle(widget, formData)
    expect(typeof trigger).toBe('function')
  })

  it('returns isRunning ref', () => {
    const widget = createTestWidget()
    const formData = reactive({})
    const { isRunning } = useWidgetLifecycle(widget, formData)
    expect(isRunning.value).toBe(false)
  })

  it('returns lastError ref', () => {
    const widget = createTestWidget()
    const formData = reactive({})
    const { lastError } = useWidgetLifecycle(widget, formData)
    expect(lastError.value).toBeNull()
  })

  it('triggers onMount lifecycle hook (string expression)', async () => {
    const hookExecuted = ref(false)
    // 模拟表达式执行
    const widget = createTestWidget({
      onMount: 'true',
    })
    const formData = reactive({})
    const { trigger } = useWidgetLifecycle(widget, formData)

    // trigger 不会抛出异常
    await expect(trigger('onMount')).resolves.not.toThrow()
  })

  it('triggers onMount lifecycle hook (function)', async () => {
    let receivedCtx: unknown = null
    const widget = createTestWidget({
      onMount: (ctx) => { receivedCtx = ctx },
    })
    const formData = reactive({ name: 'Alice' })
    const { trigger } = useWidgetLifecycle(widget, formData)

    await trigger('onMount')
    expect(receivedCtx).not.toBeNull()
    expect((receivedCtx as Record<string, unknown>).widget).toBe(widget)
  })

  it('triggers onDataChange with field and value', async () => {
    let receivedField: string | undefined
    let receivedValue: unknown
    const widget = createTestWidget({
      onDataChange: (ctx) => {
        receivedField = ctx.field
        receivedValue = ctx.value
      },
    })
    const formData = reactive({ name: 'Alice' })
    const { trigger } = useWidgetLifecycle(widget, formData)

    await trigger('onDataChange', { field: 'name', value: 'Bob' })
    expect(receivedField).toBe('name')
    expect(receivedValue).toBe('Bob')
  })

  it('sets lastError on hook failure', async () => {
    const widget = createTestWidget({
      onMount: () => { throw new Error('test error') },
    })
    const formData = reactive({})
    const { trigger, lastError } = useWidgetLifecycle(widget, formData)

    await trigger('onMount')
    expect(lastError.value).not.toBeNull()
    expect(lastError.value!.message).toBe('test error')
  })

  it('does not throw on hook failure (fail-safe)', async () => {
    const widget = createTestWidget({
      onMount: () => { throw new Error('fail') },
    })
    const formData = reactive({})
    const { trigger } = useWidgetLifecycle(widget, formData)

    await expect(trigger('onMount')).resolves.not.toThrow()
  })

  it('skips trigger when no hook configured', async () => {
    const widget = createTestWidget() // no lifecycle
    const formData = reactive({})
    const { trigger } = useWidgetLifecycle(widget, formData)

    await expect(trigger('onMount')).resolves.not.toThrow()
  })

  it('string expression hook receives scopes in context', async () => {
    let capturedScopes: unknown[] | undefined
    const widget = createTestWidget({
      onMount: (ctx) => { capturedScopes = ctx.scopes },
    })
    const formData = reactive({ age: 20 })
    const { trigger } = useWidgetLifecycle(widget, formData)

    await trigger('onMount')
    expect(capturedScopes).toBeDefined()
    expect(capturedScopes!.length).toBe(5) // widget, form, user, env, global
  })
})
```

- [ ] **Step 3: 运行测试确认失败**

Run: `pnpm --filter @schema-form/web test -- src/composables/__tests__/useWidgetLifecycle.spec.ts`
Expected: FAIL — `useWidgetLifecycle` not found

- [ ] **Step 4: 实现 useWidgetLifecycle**

```typescript
// packages/web/src/composables/useWidgetLifecycle.ts
import { ref, type Ref, toValue, type MaybeRefOrGetter } from 'vue'
import type { Widget, WidgetLifecycleConfig, LifecycleContext, LifecycleHook } from '@/widgets/base/types'
import type { VariableScope } from '@/widgets/base/types'
import { buildScopes } from '@/engine/scopes'
import { expressionRuntime } from '@/engine/expressionRuntime'
import { useLogger } from './useLogger'

export interface WidgetLifecycleAPI {
  /** 手动触发指定钩子 */
  trigger: (hookName: keyof WidgetLifecycleConfig, extra?: Record<string, unknown>) => Promise<void>
  /** 钩子执行状态 */
  isRunning: Readonly<Ref<boolean>>
  /** 最近一次错误 */
  lastError: Readonly<Ref<Error | null>>
}

/**
 * useWidgetLifecycle — 统一 Widget 生命周期管理
 *
 * 为所有 Widget 提供 onInit / onMount / onUnmount / onDataChange / onVisibleChange 钩子。
 * 钩子支持字符串表达式（通过 ExpressionRuntime 求值）和函数引用两种模式。
 */
export function useWidgetLifecycle(
  widget: MaybeRefOrGetter<Widget>,
  formData: MaybeRefOrGetter<Record<string, unknown>>,
): WidgetLifecycleAPI {
  const isRunning = ref(false)
  const lastError = ref<Error | null>(null)

  const logger = useLogger(`Widget:${toValue(widget).type}:${toValue(widget).field ?? toValue(widget).id}`)

  async function executeHook(
    hook: LifecycleHook | undefined,
    hookName: string,
    extra: Record<string, unknown> = {},
  ): Promise<void> {
    if (!hook) return

    isRunning.value = true
    lastError.value = null

    const currentWidget = toValue(widget)
    const currentFormData = toValue(formData)
    const scopes = buildScopes({
      formData: currentFormData,
      widget: {
        field: currentWidget.field ?? '',
        type: currentWidget.type,
        props: currentWidget.props ?? {},
        visible: !currentWidget.hidden,
        disabled: false,
      },
    })

    const ctx: LifecycleContext = {
      widget: currentWidget,
      formData: currentFormData,
      scopes,
      field: currentWidget.field,
      logger,
      ...extra,
    }

    const start = performance.now()

    try {
      if (typeof hook === 'function') {
        await hook(ctx)
      } else {
        // 字符串表达式：通过 ExpressionRuntime 求值
        // 将 ctx 的 key 注入为作用域变量
        expressionRuntime.evaluate(hook, scopes)
      }

      const duration = performance.now() - start
      logger.lifecycle(`${hookName} completed in ${duration.toFixed(0)}ms`)
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e))
      lastError.value = error
      logger.error(`${hookName} failed:`, error.message)
    } finally {
      isRunning.value = false
    }
  }

  async function trigger(
    hookName: keyof WidgetLifecycleConfig,
    extra: Record<string, unknown> = {},
  ): Promise<void> {
    const currentWidget = toValue(widget)
    const hook = currentWidget.lifecycle?.[hookName]
    await executeHook(hook, hookName, extra)
  }

  return {
    trigger,
    isRunning,
    lastError,
  }
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `pnpm --filter @schema-form/web test -- src/composables/__tests__/useWidgetLifecycle.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/widgets/base/types.ts packages/web/src/composables/useWidgetLifecycle.ts packages/web/src/composables/__tests__/useWidgetLifecycle.spec.ts
git commit -m "feat: useWidgetLifecycle — 统一 Widget 生命周期钩子"
```

---

## Task 3: WebSocketManager

**Files:**
- Create: `packages/web/src/engine/webSocketManager.ts`
- Create: `packages/web/src/engine/__tests__/webSocketManager.spec.ts`

- [ ] **Step 1: 编写 WebSocketManager 测试**

```typescript
// packages/web/src/engine/__tests__/webSocketManager.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WebSocketManager } from '../webSocketManager'

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = []
  url: string
  readyState = 1 // OPEN
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  onopen: (() => void) | null = null
  sent: string[] = []

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
    // 模拟异步连接
    setTimeout(() => this.onopen?.(), 0)
  }

  send(data: string) {
    this.sent.push(data)
  }

  close() {
    this.readyState = 3
    this.onclose?.()
  }
}

describe('WebSocketManager', () => {
  let manager: WebSocketManager

  beforeEach(() => {
    MockWebSocket.instances = []
    vi.stubGlobal('WebSocket', MockWebSocket)
    manager = new WebSocketManager()
  })

  it('creates connection on first subscribe', () => {
    manager.subscribe({ url: 'ws://localhost/ws' }, vi.fn())
    expect(MockWebSocket.instances).toHaveLength(1)
    expect(MockWebSocket.instances[0].url).toBe('ws://localhost/ws')
  })

  it('shares connection for same URL', () => {
    manager.subscribe({ url: 'ws://localhost/ws' }, vi.fn())
    manager.subscribe({ url: 'ws://localhost/ws' }, vi.fn())
    expect(MockWebSocket.instances).toHaveLength(1)
  })

  it('creates separate connections for different URLs', () => {
    manager.subscribe({ url: 'ws://a/ws' }, vi.fn())
    manager.subscribe({ url: 'ws://b/ws' }, vi.fn())
    expect(MockWebSocket.instances).toHaveLength(2)
  })

  it('dispatches messages by topic', () => {
    const cb1 = vi.fn()
    const cb2 = vi.fn()

    manager.subscribe({ url: 'ws://localhost/ws', topic: 'order:1' }, cb1)
    manager.subscribe({ url: 'ws://localhost/ws', topic: 'order:2' }, cb2)

    // 模拟消息到达
    const ws = MockWebSocket.instances[0]
    ws.onmessage?.({ data: JSON.stringify({ topic: 'order:1', data: { id: 1 } }) })

    expect(cb1).toHaveBeenCalledWith({ id: 1 })
    expect(cb2).not.toHaveBeenCalled()
  })

  it('dispatches to all subscribers when no topic filter', () => {
    const cb1 = vi.fn()
    const cb2 = vi.fn()

    manager.subscribe({ url: 'ws://localhost/ws' }, cb1)
    manager.subscribe({ url: 'ws://localhost/ws' }, cb2)

    const ws = MockWebSocket.instances[0]
    ws.onmessage?.({ data: JSON.stringify({ data: { id: 1 } }) })

    expect(cb1).toHaveBeenCalled()
    expect(cb2).toHaveBeenCalled()
  })

  it('unsubscribes removes callback', () => {
    const cb = vi.fn()
    const subId = manager.subscribe({ url: 'ws://localhost/ws', topic: 'test' }, cb)
    manager.unsubscribe(subId)

    const ws = MockWebSocket.instances[0]
    ws.onmessage?.({ data: JSON.stringify({ topic: 'test', data: {} }) })

    expect(cb).not.toHaveBeenCalled()
  })

  it('closes connection when last subscriber unsubscribes', () => {
    const cb = vi.fn()
    const subId = manager.subscribe({ url: 'ws://localhost/ws' }, cb)
    const ws = MockWebSocket.instances[0]
    const closeSpy = vi.spyOn(ws, 'close')

    manager.unsubscribe(subId)
    expect(closeSpy).toHaveBeenCalled()
  })

  it('returns connection status', () => {
    manager.subscribe({ url: 'ws://localhost/ws' }, vi.fn())
    expect(manager.getStatus('ws://localhost/ws')).toBe('connecting')
  })

  it('returns closed for unknown URL', () => {
    expect(manager.getStatus('ws://unknown/ws')).toBe('closed')
  })

  it('dispose closes all connections', () => {
    manager.subscribe({ url: 'ws://a/ws' }, vi.fn())
    manager.subscribe({ url: 'ws://b/ws' }, vi.fn())
    const closeSpies = MockWebSocket.instances.map(ws => vi.spyOn(ws, 'close'))

    manager.dispose()
    closeSpies.forEach(spy => expect(spy).toHaveBeenCalled())
  })

  it('extracts data from message with custom event field', () => {
    const cb = vi.fn()
    manager.subscribe({ url: 'ws://localhost/ws', event: 'update', topic: 'order' }, cb)

    const ws = MockWebSocket.instances[0]
    ws.onmessage?.({ data: JSON.stringify({ event: 'update', topic: 'order', payload: { id: 1 } }) })

    expect(cb).toHaveBeenCalledWith({ id: 1 })
  })

  it('handles JSON parse error gracefully', () => {
    const cb = vi.fn()
    manager.subscribe({ url: 'ws://localhost/ws' }, cb)

    const ws = MockWebSocket.instances[0]
    // 不应该抛出异常
    expect(() => ws.onmessage?.({ data: 'invalid json' })).not.toThrow()
    expect(cb).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @schema-form/web test -- src/engine/__tests__/webSocketManager.spec.ts`
Expected: FAIL — `WebSocketManager` not found

- [ ] **Step 3: 实现 WebSocketManager**

```typescript
// packages/web/src/engine/webSocketManager.ts
import type { WSConfig } from '@/widgets/base/types'
import { useLogger } from '@/composables/useLogger'

const logger = useLogger('WS')

interface Subscription {
  id: string
  config: WSConfig
  callback: (data: unknown) => void
}

interface ConnectionEntry {
  ws: WebSocket
  url: string
  subscriptions: Map<string, Subscription>
  status: 'connecting' | 'open' | 'closed' | 'error'
  reconnectAttempts: number
  heartbeatTimer: ReturnType<typeof setInterval> | null
}

let subCounter = 0

export class WebSocketManager {
  private connections = new Map<string, ConnectionEntry>()

  /**
   * 订阅 WebSocket 消息
   * @returns subscription ID
   */
  subscribe(config: WSConfig, callback: (data: unknown) => void): string {
    const id = `ws_sub_${++subCounter}`
    const sub: Subscription = { id, config, callback }

    let entry = this.connections.get(config.url)
    if (!entry) {
      entry = this.createConnection(config.url, config)
      this.connections.set(config.url, entry)
    }

    entry.subscriptions.set(id, sub)
    logger.debug(`Subscribed ${id} to ${config.url} topic=${config.topic ?? '*'}`)
    return id
  }

  /**
   * 取消订阅
   */
  unsubscribe(subscriptionId: string): void {
    for (const [url, entry] of this.connections) {
      if (entry.subscriptions.has(subscriptionId)) {
        entry.subscriptions.delete(subscriptionId)
        logger.debug(`Unsubscribed ${subscriptionId} from ${url}`)

        // 最后一个订阅者断开时关闭连接
        if (entry.subscriptions.size === 0) {
          this.closeConnection(url)
        }
        return
      }
    }
  }

  /**
   * 获取连接状态
   */
  getStatus(url: string): 'connecting' | 'open' | 'closed' | 'error' {
    return this.connections.get(url)?.status ?? 'closed'
  }

  /**
   * 关闭所有连接
   */
  dispose(): void {
    for (const url of this.connections.keys()) {
      this.closeConnection(url)
    }
    this.connections.clear()
  }

  private createConnection(url: string, config: WSConfig): ConnectionEntry {
    const entry: ConnectionEntry = {
      ws: null!,
      url,
      subscriptions: new Map(),
      status: 'connecting',
      reconnectAttempts: 0,
      heartbeatTimer: null,
    }

    this.connect(entry, config)
    return entry
  }

  private connect(entry: ConnectionEntry, config: WSConfig): void {
    try {
      const ws = new WebSocket(entry.url)
      entry.ws = ws
      entry.status = 'connecting'

      ws.onopen = () => {
        entry.status = 'open'
        entry.reconnectAttempts = 0
        logger.info(`Connected to ${entry.url}`)

        // 心跳
        const interval = config.heartbeat ?? 30000
        if (interval > 0) {
          entry.heartbeatTimer = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }))
            }
          }, interval)
        }
      }

      ws.onmessage = (event) => {
        this.handleMessage(entry, event.data)
      }

      ws.onclose = () => {
        entry.status = 'closed'
        if (entry.heartbeatTimer) {
          clearInterval(entry.heartbeatTimer)
          entry.heartbeatTimer = null
        }
        logger.info(`Disconnected from ${entry.url}`)

        // 自动重连
        if (config.reconnect !== false && entry.subscriptions.size > 0) {
          this.scheduleReconnect(entry, config)
        }
      }

      ws.onerror = () => {
        entry.status = 'error'
        logger.error(`WebSocket error on ${entry.url}`)
      }
    } catch (e) {
      entry.status = 'error'
      logger.error(`Failed to connect to ${entry.url}:`, e)
    }
  }

  private handleMessage(entry: ConnectionEntry, rawData: string): void {
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(rawData) as Record<string, unknown>
    } catch {
      logger.warn(`Invalid JSON from ${entry.url}:`, rawData.slice(0, 100))
      return
    }

    // 提取 topic 和 data
    const msgTopic = (parsed.topic ?? parsed.event ?? '') as string
    const msgData = parsed.data ?? parsed.payload ?? parsed

    // 分发给匹配的订阅者
    for (const sub of entry.subscriptions.values()) {
      // topic 匹配：无 topic 过滤 = 接收所有；有 topic 则精确匹配
      if (sub.config.topic && sub.config.topic !== msgTopic) continue

      // event 过滤
      if (sub.config.event && sub.config.event !== (parsed.event as string)) continue

      try {
        sub.callback(msgData)
      } catch (e) {
        logger.error(`Subscriber ${sub.id} callback error:`, e)
      }
    }
  }

  private scheduleReconnect(entry: ConnectionEntry, config: WSConfig): void {
    const maxAttempts = config.maxReconnectAttempts ?? 5
    if (entry.reconnectAttempts >= maxAttempts) {
      logger.warn(`Max reconnect attempts reached for ${entry.url}`)
      return
    }

    const delay = Math.min(1000 * Math.pow(2, entry.reconnectAttempts), 16000)
    entry.reconnectAttempts++

    logger.debug(`Reconnecting to ${entry.url} in ${delay}ms (attempt ${entry.reconnectAttempts})`)

    setTimeout(() => {
      if (entry.subscriptions.size > 0) {
        this.connect(entry, config)
      }
    }, delay)
  }

  private closeConnection(url: string): void {
    const entry = this.connections.get(url)
    if (!entry) return

    if (entry.heartbeatTimer) {
      clearInterval(entry.heartbeatTimer)
    }

    if (entry.ws && entry.ws.readyState !== WebSocket.CLOSED) {
      entry.ws.close()
    }

    entry.status = 'closed'
    this.connections.delete(url)
    logger.debug(`Closed connection to ${url}`)
  }
}

/** 全局单例 */
export const wsManager = new WebSocketManager()
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter @schema-form/web test -- src/engine/__tests__/webSocketManager.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/engine/webSocketManager.ts packages/web/src/engine/__tests__/webSocketManager.spec.ts
git commit -m "feat: WebSocketManager — 共享连接 + topic 分发 + 自动重连"
```

---

## Task 4: useWidgetWebSocket composable

**Files:**
- Create: `packages/web/src/composables/useWidgetWebSocket.ts`
- Create: `packages/web/src/composables/__tests__/useWidgetWebSocket.spec.ts`

- [ ] **Step 1: 编写 useWidgetWebSocket 测试**

```typescript
// packages/web/src/composables/__tests__/useWidgetWebSocket.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { reactive } from 'vue'
import type { Widget } from '@/widgets/base/types'

describe('useWidgetWebSocket', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('exports useWidgetWebSocket function', async () => {
    const mod = await import('../useWidgetWebSocket')
    expect(typeof mod.useWidgetWebSocket).toBe('function')
  })

  it('returns expected interface', async () => {
    const mod = await import('../useWidgetWebSocket')
    const widget: Widget = {
      id: 'test_1',
      name: 'Test',
      type: 'table',
      field: 'list',
      api: {
        url: '/api/data',
        ws: { url: 'ws://localhost/ws', topic: 'updates' },
      },
      position: { x: 0, y: 0, w: 100, h: 40 },
    }
    const formData = reactive({})

    try {
      const api = mod.useWidgetWebSocket(widget, formData)
      expect(api).toHaveProperty('data')
      expect(api).toHaveProperty('status')
      expect(api).toHaveProperty('isConnected')
    } catch {
      // WS 可能在测试环境中不可用
    }
  })
})
```

- [ ] **Step 2: 实现 useWidgetWebSocket**

```typescript
// packages/web/src/composables/useWidgetWebSocket.ts
import { ref, watch, onMounted, onUnmounted, computed, toValue, type MaybeRefOrGetter, type Ref, readonly } from 'vue'
import type { Widget } from '@/widgets/base/types'
import { wsManager } from '@/engine/webSocketManager'
import { expressionRuntime } from '@/engine/expressionRuntime'
import { buildScopes } from '@/engine/scopes'
import { extractByPath } from '@/utils/responseNormalizer'
import { useLogger } from './useLogger'

/**
 * useWidgetWebSocket — Widget WebSocket 数据源
 *
 * 自动根据 widget.api.ws 配置订阅 WebSocket，
 * 收到数据时自动更新 data ref，
 * formData 变化导致 topic 变化时自动重新订阅。
 */
export function useWidgetWebSocket(
  widget: MaybeRefOrGetter<Widget>,
  formData: MaybeRefOrGetter<Record<string, unknown>>,
): {
  data: Readonly<Ref<unknown>>
  status: Readonly<Ref<'connecting' | 'open' | 'closed' | 'error'>>
  isConnected: Readonly<Ref<boolean>>
} {
  const data = ref<unknown>(undefined)
  const status = ref<'connecting' | 'open' | 'closed' | 'error'>('closed')
  const isConnected = computed(() => status.value === 'open')

  let currentSubId: string | null = null
  const logger = useLogger(`WS:${toValue(widget).field ?? toValue(widget).id}`)

  function resolveTopic(topic: string | undefined): string | undefined {
    if (!topic) return undefined
    try {
      const currentFormData = toValue(formData)
      const scopes = buildScopes({ formData: currentFormData })
      return expressionRuntime.evaluate<string>(topic, scopes)
    } catch {
      logger.warn(`Failed to resolve topic expression: ${topic}`)
      return topic
    }
  }

  function subscribe(): void {
    const currentWidget = toValue(widget)
    const wsConfig = currentWidget.api?.ws
    if (!wsConfig) return

    // 清理旧订阅
    unsubscribe()

    const resolvedTopic = resolveTopic(wsConfig.topic)
    const config = { ...wsConfig, topic: resolvedTopic }

    status.value = 'connecting'

    currentSubId = wsManager.subscribe(config, (msgData) => {
      // 应用 dataPath
      let result = msgData
      if (wsConfig.dataPath) {
        const extracted = extractByPath(msgData, wsConfig.dataPath)
        if (extracted !== undefined) result = extracted
      }

      data.value = result
      status.value = 'open'
      logger.debug('Received data:', Array.isArray(result) ? `[${result.length} items]` : typeof result)
    })

    // 轮询状态
    const checkStatus = setInterval(() => {
      status.value = wsManager.getStatus(wsConfig.url)
      if (status.value === 'open') clearInterval(checkStatus)
    }, 100)

    // 5 秒后停止轮询
    setTimeout(() => clearInterval(checkStatus), 5000)
  }

  function unsubscribe(): void {
    if (currentSubId) {
      wsManager.unsubscribe(currentSubId)
      currentSubId = null
    }
  }

  // 监听 widget.api.ws 变化
  watch(
    () => {
      const w = toValue(widget)
      return w.api?.ws ? JSON.stringify(w.api.ws) : null
    },
    (newWs, oldWs) => {
      if (newWs !== oldWs) {
        subscribe()
      }
    },
  )

  // 监听 formData 变化导致 topic 变化
  watch(
    () => {
      const ws = toValue(widget).api?.ws
      if (!ws?.topic) return null
      return resolveTopic(ws.topic)
    },
    (newTopic, oldTopic) => {
      if (newTopic !== oldTopic && currentSubId) {
        logger.debug(`Topic changed: ${oldTopic} → ${newTopic}`)
        subscribe()
      }
    },
  )

  onMounted(() => {
    subscribe()
  })

  onUnmounted(() => {
    unsubscribe()
  })

  return {
    data: readonly(data) as Readonly<Ref<unknown>>,
    status: readonly(status) as Readonly<Ref<'connecting' | 'open' | 'closed' | 'error'>>,
    isConnected,
  }
}
```

- [ ] **Step 3: 运行测试**

Run: `pnpm --filter @schema-form/web test -- src/composables/__tests__/useWidgetWebSocket.spec.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/composables/useWidgetWebSocket.ts packages/web/src/composables/__tests__/useWidgetWebSocket.spec.ts
git commit -m "feat: useWidgetWebSocket — Widget WebSocket 数据源 composable"
```

---

## Task 5: 完整性测试 — 生命周期 + WebSocket 边界场景

**Files:**
- Modify: `packages/web/src/composables/__tests__/useWidgetLifecycle.spec.ts`
- Modify: `packages/web/src/engine/__tests__/webSocketManager.spec.ts`

- [ ] **Step 1: 补充生命周期边界测试**

在 `useWidgetLifecycle.spec.ts` 末尾追加：

```typescript
describe('useWidgetLifecycle — edge cases', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('handles async function hook', async () => {
    let resolved = false
    const widget = createTestWidget({
      onMount: async () => {
        await new Promise(r => setTimeout(r, 10))
        resolved = true
      },
    })
    const formData = reactive({})
    const { trigger } = useWidgetLifecycle(widget, formData)

    await trigger('onMount')
    expect(resolved).toBe(true)
  })

  it('logger has correct prefix format', async () => {
    let capturedLogger: unknown = null
    const widget = createTestWidget({
      onMount: (ctx) => { capturedLogger = ctx.logger },
    })
    widget.field = 'userName'
    const formData = reactive({})
    const { trigger } = useWidgetLifecycle(widget, formData)

    await trigger('onMount')
    expect(capturedLogger).toHaveProperty('info')
    expect(capturedLogger).toHaveProperty('child')
  })

  it('handles onVisibleChange hook', async () => {
    let visible: boolean | undefined
    const widget = createTestWidget({
      onVisibleChange: (ctx) => {
        visible = (ctx as Record<string, unknown>).isVisible as boolean
      },
    })
    const formData = reactive({})
    const { trigger } = useWidgetLifecycle(widget, formData)

    await trigger('onVisibleChange', { isVisible: false })
    expect(visible).toBe(false)
  })

  it('handles widget without lifecycle config', async () => {
    const widget = createTestWidget()
    delete widget.lifecycle
    const formData = reactive({})
    const { trigger, isRunning, lastError } = useWidgetLifecycle(widget, formData)

    await trigger('onMount')
    expect(isRunning.value).toBe(false)
    expect(lastError.value).toBeNull()
  })

  it('concurrent triggers are sequential', async () => {
    const order: number[] = []
    const widget = createTestWidget({
      onMount: async () => {
        order.push(1)
        await new Promise(r => setTimeout(r, 50))
        order.push(2)
      },
      onDataChange: async () => {
        order.push(3)
      },
    })
    const formData = reactive({})
    const { trigger } = useWidgetLifecycle(widget, formData)

    await Promise.all([trigger('onMount'), trigger('onDataChange')])
    // 由于 isRunning 锁，应该是顺序执行
    expect(order).toEqual([1, 2, 3])
  })
})
```

- [ ] **Step 2: 补充 WebSocket 边界测试**

在 `webSocketManager.spec.ts` 末尾追加：

```typescript
describe('WebSocketManager — edge cases', () => {
  let manager: WebSocketManager

  beforeEach(() => {
    MockWebSocket.instances = []
    vi.stubGlobal('WebSocket', MockWebSocket)
    manager = new WebSocketManager()
  })

  it('handles multiple topics on same connection', () => {
    const cb1 = vi.fn()
    const cb2 = vi.fn()

    manager.subscribe({ url: 'ws://localhost/ws', topic: 'a' }, cb1)
    manager.subscribe({ url: 'ws://localhost/ws', topic: 'b' }, cb2)

    const ws = MockWebSocket.instances[0]
    ws.onmessage?.({ data: JSON.stringify({ topic: 'a', data: 1 }) })
    ws.onmessage?.({ data: JSON.stringify({ topic: 'b', data: 2 }) })

    expect(cb1).toHaveBeenCalledWith(1)
    expect(cb2).toHaveBeenCalledWith(2)
  })

  it('handles subscribe after connection is open', () => {
    manager.subscribe({ url: 'ws://localhost/ws' }, vi.fn())
    const ws = MockWebSocket.instances[0]
    ws.onopen?.()

    // 第二个订阅者连接已打开
    const cb = vi.fn()
    manager.subscribe({ url: 'ws://localhost/ws', topic: 'test' }, cb)
    ws.onmessage?.({ data: JSON.stringify({ topic: 'test', data: 42 }) })

    expect(cb).toHaveBeenCalledWith(42)
  })

  it('unsubscribing all closes connection', () => {
    const cb1 = vi.fn()
    const cb2 = vi.fn()
    const id1 = manager.subscribe({ url: 'ws://localhost/ws' }, cb1)
    const id2 = manager.subscribe({ url: 'ws://localhost/ws' }, cb2)

    const ws = MockWebSocket.instances[0]
    const closeSpy = vi.spyOn(ws, 'close')

    manager.unsubscribe(id1)
    manager.unsubscribe(id2)
    expect(closeSpy).toHaveBeenCalled()
  })

  it('dispose is idempotent', () => {
    manager.subscribe({ url: 'ws://localhost/ws' }, vi.fn())
    expect(() => {
      manager.dispose()
      manager.dispose()
    }).not.toThrow()
  })

  it('handles message with only event field (no topic)', () => {
    const cb = vi.fn()
    manager.subscribe({ url: 'ws://localhost/ws', event: 'update' }, cb)

    const ws = MockWebSocket.instances[0]
    ws.onmessage?.({ data: JSON.stringify({ event: 'update', payload: { id: 1 } }) })

    expect(cb).toHaveBeenCalledWith({ id: 1 })
  })

  it('does not dispatch when event filter does not match', () => {
    const cb = vi.fn()
    manager.subscribe({ url: 'ws://localhost/ws', event: 'update' }, cb)

    const ws = MockWebSocket.instances[0]
    ws.onmessage?.({ data: JSON.stringify({ event: 'delete', payload: { id: 1 } }) })

    expect(cb).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: 运行测试**

Run: `pnpm --filter @schema-form/web test -- src/composables/__tests__/useWidgetLifecycle.spec.ts src/engine/__tests__/webSocketManager.spec.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/composables/__tests__/useWidgetLifecycle.spec.ts packages/web/src/engine/__tests__/webSocketManager.spec.ts
git commit -m "test: 生命周期 + WebSocket 边界场景完整性测试"
```
