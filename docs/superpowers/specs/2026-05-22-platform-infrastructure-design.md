# 平台基础设施设计规范 — 变量系统 + Worker + WebSocket + 生命周期 + 容器

## 概述

本次设计覆盖 8 项基础设施需求，目标是为 widget 系统提供统一的表达式引擎、数据请求管线、实时数据推送、生命周期管理和容器能力。

### 需求清单

| # | 需求 | 依赖 |
|---|---|---|
| 1 | 完善变量系统 | 4, 5 |
| 2 | Web Worker 数据请求 | 6 |
| 3 | WebSocket 数据源 | 4 |
| 4 | 统一表达式管线 | — |
| 5 | 变量作用域分层 | 4 |
| 6 | 数据请求生命周期钩子 | 2 |
| 7 | Widget 统一生命周期 + 日志 | 4 |
| 8 | FgForm / FgDialog 容器完善 | 7 |

### 执行策略

并行推进。基础设施层（4, 5）先行定义接口契约，其余模块基于契约并行开发。

---

## 1. ExpressionRuntime — 统一表达式引擎

### 1.1 合并目标

将现有 3 套独立的表达式编译/求值系统合并为 1 个 ExpressionRuntime：

- `packages/web/src/utils/expression.ts` → `evaluateExpression`
- `packages/web/src/composables/useLinkage.ts` → `compileCondition`
- `packages/web/src/engine/eventEngine.ts` → `evaluateCondition`

合并后删除 `useLinkage.ts` 和 `eventEngine.ts` 中的独立编译逻辑，统一调用 `ExpressionRuntime`。

### 1.2 核心 API

```typescript
// packages/web/src/engine/expressionRuntime.ts

interface ExpressionRuntime {
  /** 求值表达式，返回结果 */
  evaluate<T = unknown>(expr: string, scopes: VariableScope[]): T

  /** 编译表达式（带缓存），返回可复用的 CompiledExpr */
  compile(expr: string): CompiledExpr

  /** 验证表达式语法（不执行） */
  validate(expr: string): { valid: boolean; error?: string }

  /** 清除编译缓存 */
  clearCache(): void

  /** 获取缓存条目数 */
  getCacheSize(): number
}

interface CompiledExpr {
  /** 对给定 scopes 求值 */
  evaluate<T>(scopes: VariableScope[]): T

  /** 表达式原始字符串 */
  readonly source: string
}

interface VariableScope {
  /** 作用域名：form | user | env | global | widget */
  name: string

  /** 作用域数据 */
  data: Record<string, unknown>
}
```

### 1.3 表达式语法

**强制新语法：** `${scope.field}` — 必须带作用域前缀。

```typescript
// 正确
${form.age} >= 18
${user.deptId} === form.dept
${env.baseUrl}/api/list
${widget.props.placeholder}

// 错误 — 缺少作用域前缀，报错
${age} > 18
```

编译时 `${form.age}` → `scopes.find(s => s.name === 'form').data['age']`。

**旧 schema 迁移：** 提供 `migrateExpression(expr)` 工具函数，将 `${field}` 自动转为 `${form.field}`。一次性迁移脚本，非运行时兼容。

### 1.4 作用域优先级

查找顺序：`widget > form > user > env > global`。

```typescript
// 如果 widget 有 field="name"，form 也有 "name"
${widget.field}  →  widget 的 field 值
${form.name}     →  form 的 name 值
// 无歧义，因为必须带前缀
```

### 1.5 安全策略

保留现有安全检查：
- blocklist 模式：禁止 window / document / globalThis / eval / Function / import / require / setTimeout / setInterval / new / while / for / do
- 表达式长度限制：500 字符
- 执行超时：100ms
- LRU 编译缓存：1000 条

### 1.6 文件变更

| 操作 | 文件 |
|---|---|
| 重写 | `packages/web/src/engine/expressionRuntime.ts`（新文件，替代 `utils/expression.ts`） |
| 删除 | `packages/web/src/utils/expression.ts` |
| 修改 | `packages/web/src/composables/useLinkage.ts` — 删除 `compileCondition`，改为调用 `expressionRuntime.evaluate()` |
| 修改 | `packages/web/src/engine/eventEngine.ts` — 删除 `evaluateCondition`，改为调用 `expressionRuntime.evaluate()` |
| 修改 | `packages/web/src/widgets/base/types.ts` — 添加 `VariableScope` 类型 |
| 创建 | `packages/web/src/engine/__tests__/expressionRuntime.spec.ts` |
| 创建 | `scripts/migrateExpressions.ts` — 旧表达式迁移脚本 |

---

## 2. 变量作用域分层

### 2.1 五层作用域定义

```typescript
// packages/web/src/engine/scopes.ts

interface FormScope {
  [field: string]: unknown    // 表单字段值
}

interface UserScope {
  id: string
  name: string
  deptId: string
  deptName: string
  roles: string[]
}

interface EnvScope {
  baseUrl: string
  token: string
  [key: string]: unknown      // 环境变量扩展
}

interface GlobalScope {
  [key: string]: unknown      // 全局配置注入
}

interface WidgetScope {
  field: string               // widget 绑定的字段名
  type: string                // widget 类型
  props: Record<string, unknown>  // widget 当前属性
  visible: boolean
  disabled: boolean
}
```

### 2.2 作用域构建

```typescript
// packages/web/src/engine/scopes.ts

function buildScopes(context: ScopeContext): VariableScope[]

interface ScopeContext {
  formData: Record<string, unknown>
  user?: UserScope
  env?: EnvScope
  global?: Record<string, unknown>
  widget?: Widget
  widgetState?: { visible: boolean; disabled: boolean }
}
```

`buildScopes` 按优先级排列：`[widget, form, user, env, global]`。

### 2.3 作用域注入时机

| 时机 | 可用作用域 |
|---|---|
| 属性面板表达式编辑 | form, user, env, global |
| 渲染时属性求值 | 全部 5 层 |
| 事件条件求值 | 全部 5 层 |
| 联动规则求值 | 全部 5 层 |
| 数据源钩子求值 | 全部 5 层 + params/data |
| 生命周期钩子 | 全部 5 层 + logger |

### 2.4 文件变更

| 操作 | 文件 |
|---|---|
| 创建 | `packages/web/src/engine/scopes.ts` — 作用域类型定义 + `buildScopes()` |
| 创建 | `packages/web/src/engine/__tests__/scopes.spec.ts` |

---

## 3. Widget 统一生命周期 + 日志

### 3.1 Widget 接口扩展

```typescript
// packages/web/src/widgets/base/types.ts — Widget 接口新增

interface Widget {
  // ...existing fields
  lifecycle?: WidgetLifecycleConfig
}

interface WidgetLifecycleConfig {
  onInit?: LifecycleHook
  onMount?: LifecycleHook
  onUnmount?: LifecycleHook
  onDataChange?: LifecycleHook
  onVisibleChange?: LifecycleHook
}

type LifecycleHook = string | ((ctx: LifecycleContext) => void | Promise<void>)

interface LifecycleContext {
  widget: Widget
  formData: Record<string, unknown>
  scopes: VariableScope[]
  field?: string
  value?: unknown
  logger: Logger
}
```

### 3.2 useWidgetLifecycle composable

```typescript
// packages/web/src/composables/useWidgetLifecycle.ts

function useWidgetLifecycle(
  widget: MaybeRefOrGetter<Widget>,
  formData: MaybeRefOrGetter<Record<string, unknown>>,
): {
  /** 手动触发指定钩子 */
  trigger: (hookName: keyof WidgetLifecycleConfig, extra?: Record<string, unknown>) => Promise<void>

  /** 钩子执行状态 */
  isRunning: Ref<boolean>

  /** 最近一次错误 */
  lastError: Ref<Error | null>
}
```

**自动触发逻辑：**
- `onMount` → Vue `onMounted` 时自动触发
- `onUnmount` → Vue `onUnmounted` 时自动触发
- `onDataChange` → `watch(formData, ...)` 深度监听，300ms 防抖
- `onVisibleChange` → 联动状态变化时触发
- `onInit` → composable 初始化时触发

### 3.3 日志系统

```typescript
// packages/web/src/composables/useLogger.ts — 扩展

interface Logger {
  debug(...args: unknown[]): void
  info(...args: unknown[]): void
  warn(...args: unknown[]): void
  error(...args: unknown[]): void

  /** 创建子 logger，自动加前缀 */
  child(prefix: string): Logger
}

// Widget logger 前缀格式：
// [Widget:input:userName]
// [Widget:card:section1]
// [Widget:dialog:editDialog]
```

**日志行为：**
- lifecycle hook 执行前：`logger.info('onMount executing')`
- lifecycle hook 执行后：`logger.debug('onMount completed in 12ms')`
- lifecycle hook 异常：`logger.error('onMount failed:', error)`
- development 环境输出到 console
- production 环境可选远程收集（通过 `configureLogger({ transport })` 配置）

### 3.4 与旧 useLifecycle 的关系

- 旧 `packages/web/src/composables/useLifecycle.ts` 标记 `@deprecated`
- 旧的 4 个钩子（onFormMount / onFieldChange / onBeforeSubmit / onAfterLoad）映射到新系统：
  - `onFormMount` → `onMount`
  - `onFieldChange` → `onDataChange`
  - `onBeforeSubmit` → FgForm 的 `submit` 流程中手动调用
  - `onAfterLoad` → FgForm 的 `loadApi` 完成后手动调用
- 迁移期保留旧 composable 作为适配器

### 3.5 文件变更

| 操作 | 文件 |
|---|---|
| 创建 | `packages/web/src/composables/useWidgetLifecycle.ts` |
| 创建 | `packages/web/src/composables/__tests__/useWidgetLifecycle.spec.ts` |
| 修改 | `packages/web/src/widgets/base/types.ts` — 添加 WidgetLifecycleConfig |
| 修改 | `packages/web/src/composables/useLogger.ts` — 扩展 Logger 接口，添加 child() |
| 标记废弃 | `packages/web/src/composables/useLifecycle.ts` |

---

## 4. RequestWorker — 数据请求 Worker

### 4.1 架构

```
主线程                          Worker 线程
┌─────────────┐               ┌──────────────────┐
│ useWorker   │  Comlink      │ WorkerFetch      │
│ Request()   │◄─────────────►│  - HTTP 请求      │
│             │               │ ResponseNormalizer│
│ request()   │               │  - JSONPath 解析  │
│ cancel()    │               │ ExpressionRuntime │
│ cancelAll() │               │  - 钩子求值       │
└─────────────┘               │ LRU Cache        │
                              │  - 响应缓存       │
                              └──────────────────┘
```

### 4.2 消息协议

```typescript
// packages/web/src/workers/types.ts

interface WorkerRequest {
  id: string
  url: string
  method: 'get' | 'post'
  params?: Record<string, unknown>
  headers?: Record<string, string>
  dataPath?: string
  onBeforeRequest?: string    // 表达式
  onResponse?: string         // 表达式
  cacheTTL?: number
}

interface WorkerResult<T = unknown> {
  id: string
  data: T
  fromCache: boolean
  duration: number
}

interface WorkerError {
  id: string
  message: string
  code: string
  statusCode?: number
}
```

### 4.3 Comlink 代理接口

```typescript
// packages/web/src/workers/requestWorker.ts

interface RequestWorkerAPI {
  /** 发送请求 */
  request(req: WorkerRequest): Promise<WorkerResult>

  /** 批量请求 */
  batchRequest(reqs: WorkerRequest[]): Promise<WorkerResult[]>

  /** 取消请求 */
  cancel(id: string): void

  /** 取消所有请求 */
  cancelAll(): void

  /** 清除缓存 */
  clearCache(): void

  /** 获取缓存统计 */
  getCacheStats(): { size: number; hitRate: number }
}
```

### 4.4 useWorkerRequest composable

```typescript
// packages/web/src/composables/useWorkerRequest.ts

function useWorkerRequest(): {
  /** 发送请求 */
  request: <T = unknown>(config: RequestConfig) => Promise<T>

  /** 批量请求 */
  batchRequest: <T = unknown>(configs: RequestConfig[]) => Promise<T[]>

  /** 取消指定请求 */
  cancel: (id: string) => void

  /** 取消所有请求 */
  cancelAll: () => void

  /** 正在进行的请求数 */
  pendingCount: Readonly<Ref<number>>

  /** Worker 是否就绪 */
  isReady: Readonly<Ref<boolean>>
}

interface RequestConfig {
  url: string
  method?: 'get' | 'post'
  params?: Record<string, unknown>
  headers?: Record<string, string>
  dataPath?: string
  onBeforeRequest?: string | ((params: unknown) => unknown)
  onResponse?: string | ((data: unknown) => unknown)
  onError?: string | ((error: Error) => void)
  cacheTTL?: number
}
```

### 4.5 与现有代码的关系

| 现有模块 | 处理方式 |
|---|---|
| `stores/requestStore.ts` | 简化为 Worker 消息代理，保留接口兼容 |
| `utils/requestQueue.ts` | @deprecated，逻辑迁入 Worker |
| `utils/optionsCache.ts` | @deprecated，逻辑迁入 Worker |
| `utils/responseNormalizer.ts` | 迁入 Worker 内部 |
| `stores/api.ts` | 改为调用 `useWorkerRequest` |

### 4.6 文件变更

| 操作 | 文件 |
|---|---|
| 创建 | `packages/web/src/workers/request.worker.ts` — Worker 入口 |
| 创建 | `packages/web/src/workers/requestWorker.ts` — Comlink 代理 |
| 创建 | `packages/web/src/workers/types.ts` — 消息类型定义 |
| 创建 | `packages/web/src/composables/useWorkerRequest.ts` |
| 创建 | `packages/web/src/workers/__tests__/requestWorker.spec.ts` |
| 修改 | `packages/web/src/stores/requestStore.ts` — 简化为代理 |
| 修改 | `packages/web/src/stores/api.ts` — 使用 useWorkerRequest |
| 标记废弃 | `packages/web/src/utils/requestQueue.ts` |
| 标记废弃 | `packages/web/src/utils/optionsCache.ts` |

---

## 5. WebSocket 数据源

### 5.1 架构

```
Widget A (ws: "ws://api/ws", topic: "order:${form.orderId}") ──┐
                                                                 ├──→ WS连接
Widget B (ws: "ws://api/ws", topic: "order:${form.orderId}") ──┘     │
                                                                MessageRouter
Widget C (ws: "ws://api2/ws", topic: "user:${form.userId}") ────→ WS连接2
                                                                      │
                                                                 dispatch by topic
```

### 5.2 WSConfig 类型

```typescript
// packages/web/src/widgets/base/types.ts

interface WSConfig {
  /** WebSocket URL，支持表达式 */
  url: string

  /** 订阅主题，支持 ${form.field} 表达式 */
  topic?: string

  /** 监听的消息事件名 */
  event?: string

  /** 心跳间隔 ms，默认 30000 */
  heartbeat?: number

  /** 断线重连，默认 true */
  reconnect?: boolean

  /** 最大重连次数，默认 5 */
  maxReconnectAttempts?: number

  /** 消息数据路径（JSONPath） */
  dataPath?: string
}
```

### 5.3 WebSocketManager

```typescript
// packages/web/src/engine/webSocketManager.ts

interface WebSocketManager {
  /** 订阅 */
  subscribe(config: WSConfig, callback: (data: unknown) => void): string

  /** 取消订阅 */
  unsubscribe(subscriptionId: string): void

  /** 获取连接状态 */
  getStatus(url: string): 'connecting' | 'open' | 'closed' | 'error'

  /** 关闭所有连接 */
  dispose(): void
}
```

**单例模式：** 全局一个 `WebSocketManager` 实例，通过 `provide/inject` 在组件树中共享。

**连接管理：**
- 相同 URL 共享一个 WebSocket 连接
- 第一个 subscriber 创建连接，最后一个 unsubscribe 关闭连接
- 断线后指数退避重连（1s → 2s → 4s → 8s → 16s）
- 心跳 ping/pong 检测连接活性

**Topic 分发：**
- 每条消息包含 `topic` 和 `data` 字段（可配置）
- Manager 根据 subscriber 的 topic 配置匹配分发
- topic 支持表达式：`${form.orderId}` 在求值后变成 `order:123`
- formData 变化导致 topic 变化时，自动 unsubscribe 旧 topic，subscribe 新 topic

### 5.4 useWidgetWebSocket composable

```typescript
// packages/web/src/composables/useWidgetWebSocket.ts

function useWidgetWebSocket(
  widget: MaybeRefOrGetter<Widget>,
  formData: MaybeRefOrGetter<Record<string, unknown>>,
): {
  /** 推送数据（自动更新） */
  data: Readonly<Ref<unknown>>

  /** 连接状态 */
  status: Readonly<Ref<'connecting' | 'open' | 'closed' | 'error'>>

  /** 是否已连接 */
  isConnected: Readonly<Ref<boolean>>
}
```

**与 widget 生命周期集成：**
- `onMount` → 自动 subscribe
- `onUnmount` → 自动 unsubscribe
- `formData` 变化导致 topic 变化 → 自动重新订阅

### 5.5 Widget api 配置扩展

```typescript
// SchemaApiConfig 新增 ws 字段
interface SchemaApiConfig {
  url: string
  method?: 'get' | 'post'
  params?: Record<string, unknown>
  dataPath?: string
  labelKey?: string
  valueKey?: string
  hooks?: RequestHooks
  cacheTTL?: number
  ws?: WSConfig           // 新增
}
```

### 5.6 文件变更

| 操作 | 文件 |
|---|---|
| 创建 | `packages/web/src/engine/webSocketManager.ts` |
| 创建 | `packages/web/src/composables/useWidgetWebSocket.ts` |
| 创建 | `packages/web/src/engine/__tests__/webSocketManager.spec.ts` |
| 创建 | `packages/web/src/composables/__tests__/useWidgetWebSocket.spec.ts` |
| 修改 | `packages/web/src/widgets/base/types.ts` — 添加 WSConfig，SchemaApiConfig 扩展 ws 字段 |

---

## 6. 数据请求生命周期钩子

### 6.1 RequestHooks 类型

```typescript
// packages/web/src/workers/types.ts

interface RequestHooks {
  /** 请求前参数变换 */
  onBeforeRequest?: string | ((params: Record<string, unknown>) => Record<string, unknown>)

  /** 响应后数据变换 */
  onResponse?: string | ((data: unknown) => unknown)

  /** 错误处理 */
  onError?: string | ((error: Error) => void)
}
```

### 6.2 表达式中的特殊变量

| 钩子 | 可用变量 | 示例 |
|---|---|---|
| onBeforeRequest | `${params}` — 请求参数对象 | `${params.page} = ${form.page}` |
| onResponse | `${data}` — 响应数据 | `${data}.filter(d => d.status === form.type)` |
| onError | `${error}` — 错误对象 | `console.log(${error}.message)` |

### 6.3 执行位置

全部在 Worker 中执行。Worker 内部使用 ExpressionRuntime 的子集（无 widget/user 作用域，只有 params/data + form）。

### 6.4 文件变更

| 操作 | 文件 |
|---|---|
| 修改 | `packages/web/src/workers/types.ts` — 添加 RequestHooks |
| 修改 | `packages/web/src/workers/request.worker.ts` — 钩子执行逻辑 |

---

## 7. FgForm 容器完善

### 7.1 defineExpose

```typescript
// packages/web/src/widgets/form/FgForm.vue

defineExpose({
  validate: () => elFormRef.value?.validate() ?? Promise.resolve(false),
  validateField: (field: string) => elFormRef.value?.validateField(field),
  clearValidate: (field?: string) => elFormRef.value?.clearValidate(field),
  resetFields: () => elFormRef.value?.resetFields(),
  scrollToField: (field: string) => elFormRef.value?.scrollToField(field),
  getFormData: () => ({ ...formModel }),
  setFormData: (data: Record<string, unknown>) => {
    Object.assign(formModel, data)
  },
  submit: async () => {
    await trigger('onBeforeSubmit')
    const valid = await elFormRef.value?.validate()
    if (valid) {
      emit('submit', { ...formModel })
    } else {
      emit('validate-error', elFormRef.value?.fields)
    }
  },
})
```

### 7.2 双向 Model Sync

```typescript
// 子 widget 写回 formModel 的机制
provide(formContextKey, {
  formRef: elFormRef,
  formModel,
  updateField: (field: string, value: unknown) => {
    formModel[field] = value
  },
})

// 子 widget（如 FgInput）注入并使用
const formCtx = inject(formContextKey)
// v-model 绑定：formCtx.formModel[field]
// 值变化时：formCtx.updateField(field, newValue)
```

### 7.3 事件系统

```typescript
const emit = defineEmits<{
  submit: [data: Record<string, unknown>]
  'validate-error': [fields: unknown[]]
  reset: []
  'data-change': [field: string, value: unknown]
}>()
```

### 7.4 生命周期集成

```typescript
const { trigger } = useWidgetLifecycle(widgetData, formModel)

onMounted(() => {
  trigger('onMount')
  if (widgetData.value.api) {
    loadRemoteData()
  }
})
```

### 7.5 loadApi 支持

```typescript
async function loadRemoteData() {
  const api = widgetData.value.api
  if (!api) return

  const workerRequest = useWorkerRequest()
  try {
    const data = await workerRequest.request({
      url: api.url,
      method: api.method,
      params: api.params,
      dataPath: api.dataPath,
      onResponse: api.hooks?.onResponse,
    })
    setFormData(data as Record<string, unknown>)
    await trigger('onAfterLoad')
  } catch (e) {
    logger.error('loadApi failed:', e)
  }
}
```

### 7.6 configPanels

属性面板新增 Tab：
- **事件 Tab** — submit / validate-error / reset / data-change 事件配置
- **规则 Tab** — 联动规则配置
- **数据源 Tab** — loadApi 配置

### 7.7 文件变更

| 操作 | 文件 |
|---|---|
| 重写 | `packages/web/src/widgets/form/FgForm.vue` |
| 修改 | `packages/web/src/widgets/form/config.ts` — 添加 configPanels |
| 修改 | `packages/web/src/widgets/form/__tests__/FgForm.spec.ts` |

---

## 8. FgDialog 容器完善

### 8.1 defineExpose

```typescript
defineExpose({
  open: (formData?: Record<string, unknown>) => {
    if (formData) Object.assign(dialogModel, formData)
    visible.value = true
    trigger('onOpen')
  },
  close: () => {
    visible.value = false
    trigger('onClose')
  },
  validate: () => {
    // 查找子 form 组件并调用其 validate
    return childFormRef.value?.validate() ?? Promise.resolve(true)
  },
})
```

### 8.2 事件系统

```typescript
const emit = defineEmits<{
  confirm: [data: Record<string, unknown>]
  cancel: []
  open: []
  close: []
}>()

function handleConfirm() {
  emit('confirm', { ...dialogModel })
  visible.value = false
}

function handleCancel() {
  emit('cancel')
  visible.value = false
}
```

### 8.3 Form Context 自动注入

```typescript
// 如果子组件包含 form widget，自动 provide
provide(formContextKey, {
  formRef: childFormRef,
  formModel: dialogModel,
  updateField: (field: string, value: unknown) => {
    dialogModel[field] = value
  },
})
```

### 8.4 Dialog Callback 机制

```typescript
// WidgetRuleWatch 的 'dialog-callback' source 生效
// 父 widget 配置：
{
  events: [{
    trigger: 'click',
    actions: [{
      type: 'open-dialog',
      target: 'editDialog',
      dialogCallback: {
        onConfirm: [{ type: 'set-value', target: 'status', value: '${dialogResult.status}' }]
      }
    }]
  }]
}
```

### 8.5 destroyOnClose 实际行为

```typescript
watch(visible, (newVal) => {
  if (!newVal && widgetData.value.props.destroyOnClose) {
    // 重置子组件状态
    Object.keys(dialogModel).forEach(key => {
      dialogModel[key] = undefined
    })
  }
})
```

### 8.6 Microapp 渲染

```html
<template v-if="contentMode === 'microapp'">
  <iframe
    :src="microappUrl"
    frameborder="0"
    style="width: 100%; height: 100%;"
    @load="handleMicroappLoad"
  />
</template>
<template v-else>
  <slot />
</template>
```

### 8.7 configPanels

属性面板新增 Tab：
- **事件 Tab** — confirm / cancel / open / close 事件配置
- **规则 Tab** — 联动规则配置

### 8.8 文件变更

| 操作 | 文件 |
|---|---|
| 重写 | `packages/web/src/widgets/dialog/FgDialog.vue` |
| 修改 | `packages/web/src/widgets/dialog/config.ts` — 添加 configPanels |
| 修改 | `packages/web/src/widgets/dialog/__tests__/FgDialog.spec.ts` |

---

## 9. 实施计划概要

### 可并行的模块组

**组 A — 表达式基础设施（无外部依赖）：**
- Plan A1: ExpressionRuntime（#4）
- Plan A2: 变量作用域（#5）

**组 B — 数据层（依赖组 A 的接口）：**
- Plan B1: RequestWorker（#2, #6）
- Plan B2: WebSocketManager（#3）

**组 C — 生命周期 + 容器（依赖组 A）：**
- Plan C1: Widget 生命周期 + 日志（#7）
- Plan C2: FgForm 容器完善（#8）
- Plan C3: FgDialog 容器完善（#8）

**组 D — 迁移（依赖全部）：**
- Plan D1: 旧表达式迁移脚本
- Plan D2: 旧模块废弃清理

### 依赖关系

```
A1 (ExpressionRuntime) ──┬──► B1 (RequestWorker)
                         ├──► B2 (WebSocket)
A2 (Scopes) ─────────────┤
                         ├──► C1 (Lifecycle) ──┬──► C2 (FgForm)
                                               └──► C3 (FgDialog)

B1, B2, C2, C3 ───────────────────────────────► D1, D2 (迁移)
```

组 A 完成后，组 B 和组 C 可并行执行。

---

## 10. 验证标准

- [ ] ExpressionRuntime: 所有旧表达式可通过迁移脚本转为新语法
- [ ] ExpressionRuntime: 3 套旧编译器全部替换为新 Runtime 调用
- [ ] 变量作用域: `${form.field}` / `${user.id}` / `${env.baseUrl}` 正确求值
- [ ] Worker: HTTP 请求在 Worker 中执行，主线程无阻塞
- [ ] Worker: onBeforeRequest / onResponse 钩子在 Worker 中执行
- [ ] WebSocket: 相同 URL 共享连接，topic 正确分发
- [ ] WebSocket: formData 变化导致 topic 变化时自动重新订阅
- [ ] 生命周期: 所有 widget 支持 onInit/onMount/onUnmount/onDataChange/onVisibleChange
- [ ] 日志: lifecycle hook 执行自动记录日志
- [ ] FgForm: validate/submit/reset/getFormData/setFormData 全部可用
- [ ] FgForm: loadApi 在 onMount 时自动执行
- [ ] FgForm: 子 widget 值变化自动写回 formModel
- [ ] FgDialog: open/close/confirm/cancel 事件正确 emit
- [ ] FgDialog: confirm 时携带表单数据
- [ ] FgDialog: destroyOnClose 实际清除子组件状态
- [ ] 全量测试通过（现有 1112 测试 + 新增测试）
