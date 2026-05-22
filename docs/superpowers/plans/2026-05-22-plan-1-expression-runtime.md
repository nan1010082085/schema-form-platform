# Plan 1: ExpressionRuntime + 变量作用域分层

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 合并 3 套表达式编译器为 1 个 ExpressionRuntime，支持 `${scope.field}` 分层变量语法，替换所有旧调用点。

**Architecture:** 新建 `engine/expressionRuntime.ts` 作为唯一表达式引擎，支持 5 层变量作用域（form/user/env/global/widget）。旧 `utils/expression.ts` 删除，`useLinkage.ts` 和 `eventEngine.ts` 中的独立编译逻辑删除，统一调用新 Runtime。

**Tech Stack:** TypeScript, Vitest, LRU cache

**依赖:** 无（基础层）

---

## Task 1: VariableScope 类型 + buildScopes

**Files:**
- Create: `packages/web/src/engine/scopes.ts`
- Create: `packages/web/src/engine/__tests__/scopes.spec.ts`
- Modify: `packages/web/src/widgets/base/types.ts`

- [ ] **Step 1: 在 types.ts 添加作用域类型**

在 `packages/web/src/widgets/base/types.ts` 文件末尾（`formContextKey` 之后）添加：

```typescript
// ============================================================
// 变量作用域（ExpressionRuntime 使用）
// ============================================================

/** 变量作用域 */
export interface VariableScope {
  /** 作用域名：form | user | env | global | widget */
  name: string
  /** 作用域数据 */
  data: Record<string, unknown>
}

/** 用户上下文 */
export interface UserContext {
  id: string
  name: string
  deptId: string
  deptName: string
  roles: string[]
}

/** 环境上下文 */
export interface EnvContext {
  baseUrl: string
  token: string
  [key: string]: unknown
}

/** Widget 自身作用域 */
export interface WidgetScopeData {
  field: string
  type: string
  props: Record<string, unknown>
  visible: boolean
  disabled: boolean
}

/** 作用域构建上下文 */
export interface ScopeContext {
  formData: Record<string, unknown>
  user?: UserContext
  env?: EnvContext
  global?: Record<string, unknown>
  widget?: WidgetScopeData
}
```

- [ ] **Step 2: 编写 scopes.ts 测试**

```typescript
// packages/web/src/engine/__tests__/scopes.spec.ts
import { describe, it, expect } from 'vitest'
import { buildScopes } from '../scopes'
import type { ScopeContext } from '@/widgets/base/types'

describe('buildScopes', () => {
  it('returns scopes in priority order: widget > form > user > env > global', () => {
    const ctx: ScopeContext = {
      formData: { name: 'Alice' },
      user: { id: 'u1', name: 'Bob', deptId: 'd1', deptName: 'Dept', roles: [] },
      env: { baseUrl: 'http://api', token: 'tok' },
      global: { theme: 'dark' },
      widget: { field: 'name', type: 'input', props: {}, visible: true, disabled: false },
    }
    const scopes = buildScopes(ctx)
    expect(scopes.map(s => s.name)).toEqual(['widget', 'form', 'user', 'env', 'global'])
  })

  it('form scope contains formData', () => {
    const scopes = buildScopes({ formData: { age: 20 } })
    const form = scopes.find(s => s.name === 'form')!
    expect(form.data).toEqual({ age: 20 })
  })

  it('user scope contains user context', () => {
    const user = { id: 'u1', name: 'Bob', deptId: 'd1', deptName: 'Dept', roles: ['admin'] }
    const scopes = buildScopes({ formData: {}, user })
    const userScope = scopes.find(s => s.name === 'user')!
    expect(userScope.data).toEqual(user)
  })

  it('env scope contains env context', () => {
    const env = { baseUrl: 'http://api', token: 'tok' }
    const scopes = buildScopes({ formData: {}, env })
    const envScope = scopes.find(s => s.name === 'env')!
    expect(envScope.data).toEqual(env)
  })

  it('global scope contains global config', () => {
    const scopes = buildScopes({ formData: {}, global: { theme: 'dark' } })
    const globalScope = scopes.find(s => s.name === 'global')!
    expect(globalScope.data).toEqual({ theme: 'dark' })
  })

  it('widget scope contains widget data', () => {
    const widget = { field: 'name', type: 'input', props: { placeholder: 'hi' }, visible: true, disabled: false }
    const scopes = buildScopes({ formData: {}, widget })
    const widgetScope = scopes.find(s => s.name === 'widget')!
    expect(widgetScope.data.field).toBe('name')
    expect(widgetScope.data.type).toBe('input')
    expect(widgetScope.data.props).toEqual({ placeholder: 'hi' })
  })

  it('missing optional contexts produce empty scopes', () => {
    const scopes = buildScopes({ formData: { x: 1 } })
    expect(scopes).toHaveLength(5)
    expect(scopes.find(s => s.name === 'user')!.data).toEqual({})
    expect(scopes.find(s => s.name === 'env')!.data).toEqual({})
    expect(scopes.find(s => s.name === 'global')!.data).toEqual({})
    expect(scopes.find(s => s.name === 'widget')!.data).toEqual({})
  })
})
```

- [ ] **Step 3: 运行测试确认失败**

Run: `pnpm --filter @schema-form/web test -- src/engine/__tests__/scopes.spec.ts`
Expected: FAIL — `buildScopes` not found

- [ ] **Step 4: 实现 scopes.ts**

```typescript
// packages/web/src/engine/scopes.ts
import type { VariableScope, ScopeContext } from '@/widgets/base/types'

/**
 * 构建变量作用域数组，按优先级排列：widget > form > user > env > global
 */
export function buildScopes(context: ScopeContext): VariableScope[] {
  const { formData, user, env, global, widget } = context

  return [
    {
      name: 'widget',
      data: widget
        ? {
            field: widget.field,
            type: widget.type,
            props: widget.props,
            visible: widget.visible,
            disabled: widget.disabled,
          }
        : {},
    },
    {
      name: 'form',
      data: formData ?? {},
    },
    {
      name: 'user',
      data: user ?? {},
    },
    {
      name: 'env',
      data: env ?? {},
    },
    {
      name: 'global',
      data: global ?? {},
    },
  ]
}

/**
 * 从作用域数组中查找变量值
 * 按优先级查找：widget > form > user > env > global
 */
export function resolveVariable(
  scopes: VariableScope[],
  scopeName: string,
  fieldPath: string,
): unknown {
  const scope = scopes.find(s => s.name === scopeName)
  if (!scope) return undefined

  // 支持嵌套路径：props.placeholder → data.props.placeholder
  const parts = fieldPath.split('.')
  let current: unknown = scope.data
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `pnpm --filter @schema-form/web test -- src/engine/__tests__/scopes.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/engine/scopes.ts packages/web/src/engine/__tests__/scopes.spec.ts packages/web/src/widgets/base/types.ts
git commit -m "feat: VariableScope 类型 + buildScopes 作用域构建"
```

---

## Task 2: ExpressionRuntime 核心

**Files:**
- Create: `packages/web/src/engine/expressionRuntime.ts`
- Create: `packages/web/src/engine/__tests__/expressionRuntime.spec.ts`

- [ ] **Step 1: 编写 ExpressionRuntime 测试**

```typescript
// packages/web/src/engine/__tests__/expressionRuntime.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { ExpressionRuntime } from '../expressionRuntime'
import type { VariableScope } from '@/widgets/base/types'

describe('ExpressionRuntime', () => {
  let runtime: ExpressionRuntime

  const scopes: VariableScope[] = [
    { name: 'widget', data: { field: 'age', type: 'input', props: { placeholder: 'Enter' } } },
    { name: 'form', data: { age: 20, name: 'Alice', status: 'active' } },
    { name: 'user', data: { id: 'u1', deptId: 'd1' } },
    { name: 'env', data: { baseUrl: 'http://api' } },
    { name: 'global', data: { theme: 'dark' } },
  ]

  beforeEach(() => {
    runtime = new ExpressionRuntime()
  })

  // === 基础求值 ===

  it('evaluates simple comparison with form scope', () => {
    expect(runtime.evaluate<boolean>('${form.age} >= 18', scopes)).toBe(true)
  })

  it('evaluates logical expression', () => {
    expect(runtime.evaluate<boolean>('${form.age} > 18 && ${form.status} === "active"', scopes)).toBe(true)
  })

  it('evaluates ternary expression', () => {
    expect(runtime.evaluate<string>('${form.age} >= 18 ? "adult" : "minor"', scopes)).toBe('adult')
  })

  it('evaluates nullish coalescing', () => {
    expect(runtime.evaluate<string>('${form.missing} ?? "default"', scopes)).toBe('default')
  })

  // === 多作用域 ===

  it('accesses user scope', () => {
    expect(runtime.evaluate<string>('${user.id}', scopes)).toBe('u1')
  })

  it('accesses env scope', () => {
    expect(runtime.evaluate<string>('${env.baseUrl}', scopes)).toBe('http://api')
  })

  it('accesses global scope', () => {
    expect(runtime.evaluate<string>('${global.theme}', scopes)).toBe('dark')
  })

  it('accesses widget scope', () => {
    expect(runtime.evaluate<string>('${widget.field}', scopes)).toBe('age')
  })

  it('accesses nested widget props', () => {
    expect(runtime.evaluate<string>('${widget.props.placeholder}', scopes)).toBe('Enter')
  })

  it('cross-scope comparison', () => {
    expect(runtime.evaluate<boolean>('${user.deptId} === "d1"', scopes)).toBe(true)
  })

  it('cross-scope string concatenation', () => {
    expect(runtime.evaluate<string>('`${env.baseUrl}/api/list`', scopes)).toBe('http://api/api/list')
  })

  // === 安全 ===

  it('blocks window access', () => {
    expect(() => runtime.evaluate('window.location', scopes)).toThrow('安全检查失败')
  })

  it('blocks eval', () => {
    expect(() => runtime.evaluate('eval("alert(1)")', scopes)).toThrow('安全检查失败')
  })

  it('blocks import()', () => {
    expect(() => runtime.evaluate('import("fs")', scopes)).toThrow('安全检查失败')
  })

  it('blocks Function constructor', () => {
    expect(() => runtime.evaluate('Function("return 1")()', scopes)).toThrow('安全检查失败')
  })

  it('blocks loop constructs', () => {
    expect(() => runtime.evaluate('while(true){}', scopes)).toThrow('安全检查失败')
  })

  it('blocks new keyword', () => {
    expect(() => runtime.evaluate('new Array()', scopes)).toThrow('安全检查失败')
  })

  // === 错误处理 ===

  it('throws on empty expression', () => {
    expect(() => runtime.evaluate('', scopes)).toThrow('非空字符串')
  })

  it('throws on expression exceeding length limit', () => {
    const long = '${form.' + 'a'.repeat(500) + '}'
    expect(() => runtime.evaluate(long, scopes)).toThrow('长度超过限制')
  })

  it('throws on syntax error', () => {
    expect(() => runtime.evaluate('${form.age} ====', scopes)).toThrow('编译失败')
  })

  // === validate ===

  it('validate returns valid for correct expression', () => {
    const result = runtime.validate('${form.age} > 18')
    expect(result.valid).toBe(true)
  })

  it('validate returns invalid for security violation', () => {
    const result = runtime.validate('window.location')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('window')
  })

  it('validate returns invalid for syntax error', () => {
    const result = runtime.evaluate.bind(runtime, '${form.age} ====', scopes)
    // validate should catch syntax error
    const v = runtime.validate('${form.age} ====')
    expect(v.valid).toBe(false)
  })

  // === 缓存 ===

  it('caches compiled expressions', () => {
    runtime.evaluate('${form.age} > 10', scopes)
    runtime.evaluate('${form.age} > 10', scopes)
    expect(runtime.getCacheSize()).toBe(1)
  })

  it('clearCache empties the cache', () => {
    runtime.evaluate('${form.age} > 10', scopes)
    runtime.clearCache()
    expect(runtime.getCacheSize()).toBe(0)
  })

  it('different expressions have different cache entries', () => {
    runtime.evaluate('${form.age} > 10', scopes)
    runtime.evaluate('${form.age} > 20', scopes)
    expect(runtime.getCacheSize()).toBe(2)
  })

  // === 缺失作用域 ===

  it('returns undefined for missing scope field', () => {
    expect(runtime.evaluate('${form.nonexistent}', scopes)).toBeUndefined()
  })

  it('returns undefined for missing scope', () => {
    // accessing a scope that's empty but present
    expect(runtime.evaluate<boolean>('${global.nonexistent} === undefined', scopes)).toBe(true)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @schema-form/web test -- src/engine/__tests__/expressionRuntime.spec.ts`
Expected: FAIL — `ExpressionRuntime` not found

- [ ] **Step 3: 实现 ExpressionRuntime**

```typescript
// packages/web/src/engine/expressionRuntime.ts
import type { VariableScope } from '@/widgets/base/types'

/** Expression validation result */
export interface ExpressionValidationResult {
  valid: boolean
  error?: string
}

// ---- Constants ----

const MAX_EXPRESSION_LENGTH = 500
const MAX_CACHE_SIZE = 1000
const EXECUTION_TIMEOUT_MS = 100

/** Security blocklist */
const BLOCKED_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /\bwindow\b/, message: '禁止访问全局对象: window' },
  { pattern: /\bdocument\b/, message: '禁止访问全局对象: document' },
  { pattern: /\bglobalThis\b/, message: '禁止访问全局对象: globalThis' },
  { pattern: /\bself\s*[.[]/, message: '禁止访问全局对象: self' },
  { pattern: /\btop\s*[.[]/, message: '禁止访问全局对象: top' },
  { pattern: /\bparent\s*[.[]/, message: '禁止访问全局对象: parent' },
  { pattern: /\bframes\b/, message: '禁止访问全局对象: frames' },
  { pattern: /\bimport\s*\(/, message: '禁止模块导入: import()' },
  { pattern: /\brequire\s*\(/, message: '禁止模块导入: require()' },
  { pattern: /\beval\s*\(/, message: '禁止代码注入: eval()' },
  { pattern: /\bFunction\s*\(/, message: '禁止代码注入: Function()' },
  { pattern: /\bsetTimeout\s*\(/, message: '禁止代码注入: setTimeout()' },
  { pattern: /\bsetInterval\s*\(/, message: '禁止代码注入: setInterval()' },
  { pattern: /\bnew\s+/, message: '禁止使用 new 关键字' },
  { pattern: /\bwhile\s*\(/, message: '禁止循环语句: while' },
  { pattern: /\bfor\s*\(/, message: '禁止循环语句: for' },
  { pattern: /\bdo\s*\{/, message: '禁止循环语句: do' },
]

/**
 * 安全检查表达式
 */
export function checkSecurity(expression: string): string | null {
  for (const { pattern, message } of BLOCKED_PATTERNS) {
    if (pattern.test(expression)) {
      return message
    }
  }
  return null
}

/**
 * 替换 ${scope.field} 引用为作用域属性访问
 * ${form.age} → __scopes[1].data['age']
 * ${widget.props.placeholder} → __scopes[0].data['props']['placeholder']
 */
function replaceScopeRefs(expression: string, scopeIndexMap: Map<string, number>): string {
  return expression.replace(
    /\$\{(\w+)\.([^}]+)\}/g,
    (_match, scopeName: string, fieldPath: string) => {
      const idx = scopeIndexMap.get(scopeName)
      if (idx === undefined) {
        throw new Error(`未知的作用域: ${scopeName}`)
      }
      // 将 fieldPath 拆分为属性链：props.placeholder → ['props']['placeholder']
      const parts = fieldPath.split('.')
      const accessChain = parts.map(p => `['${p}']`).join('')
      return `__scopes[${idx}].data${accessChain}`
    },
  )
}

/**
 * ExpressionRuntime — 统一表达式引擎
 *
 * 支持 ${scope.field} 语法，5 层变量作用域。
 * 合并原 expression.ts / useLinkage.compileCondition / eventEngine.evaluateCondition。
 */
export class ExpressionRuntime {
  private cache = new Map<string, (...scopes: VariableScope[]) => unknown>()

  /**
   * 求值表达式
   */
  evaluate<T = unknown>(expression: string, scopes: VariableScope[]): T {
    if (!expression || typeof expression !== 'string') {
      throw new Error('表达式必须是非空字符串')
    }

    if (expression.length > MAX_EXPRESSION_LENGTH) {
      throw new Error(`表达式长度超过限制 (${expression.length} > ${MAX_EXPRESSION_LENGTH} 字符)`)
    }

    const fn = this.compile(expression)

    const start = performance.now()
    const result = fn(...scopes) as T
    const elapsed = performance.now() - start

    if (elapsed > EXECUTION_TIMEOUT_MS) {
      throw new Error(`表达式执行超时 (${elapsed.toFixed(1)}ms > ${EXECUTION_TIMEOUT_MS}ms)`)
    }

    return result
  }

  /**
   * 编译表达式（带缓存）
   */
  compile(expression: string): (...scopes: VariableScope[]) => unknown {
    const cached = this.cache.get(expression)
    if (cached) {
      // LRU: move to end
      this.cache.delete(expression)
      this.cache.set(expression, cached)
      return cached
    }

    // Security check on raw expression
    const securityError = checkSecurity(expression)
    if (securityError) {
      throw new Error(`表达式安全检查失败: ${securityError}`)
    }

    // Build scope index map
    const scopeIndexMap = new Map<string, number>([
      ['widget', 0],
      ['form', 1],
      ['user', 2],
      ['env', 3],
      ['global', 4],
    ])

    // Replace ${scope.field} references
    const replaced = replaceScopeRefs(expression, scopeIndexMap)

    // Security check on replaced expression
    const replacedSecurityError = checkSecurity(replaced)
    if (replacedSecurityError) {
      throw new Error(`表达式安全检查失败: ${replacedSecurityError}`)
    }

    // Compile
    try {
      const fn = new Function(
        '__scopes',
        `"use strict"; const [__w, __f, __u, __e, __g] = __scopes; return (${replaced})`,
      ) as (scopes: VariableScope[]) => unknown

      // LRU eviction
      if (this.cache.size >= MAX_CACHE_SIZE) {
        const oldestKey = this.cache.keys().next().value
        if (oldestKey !== undefined) {
          this.cache.delete(oldestKey)
        }
      }

      this.cache.set(expression, fn)
      return fn
    } catch (err) {
      throw new Error(`表达式编译失败: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  /**
   * 验证表达式（不执行）
   */
  validate(expression: string): ExpressionValidationResult {
    if (!expression || typeof expression !== 'string') {
      return { valid: false, error: '表达式必须是非空字符串' }
    }

    if (expression.length > MAX_EXPRESSION_LENGTH) {
      return { valid: false, error: `表达式长度超过限制 (${expression.length} > ${MAX_EXPRESSION_LENGTH} 字符)` }
    }

    const securityError = checkSecurity(expression)
    if (securityError) {
      return { valid: false, error: securityError }
    }

    try {
      const scopeIndexMap = new Map<string, number>([
        ['widget', 0], ['form', 1], ['user', 2], ['env', 3], ['global', 4],
      ])
      const replaced = replaceScopeRefs(expression, scopeIndexMap)
      new Function(
        '__scopes',
        `"use strict"; const [__w, __f, __u, __e, __g] = __scopes; return (${replaced})`,
      )
      return { valid: true }
    } catch (err) {
      return { valid: false, error: `表达式语法错误: ${err instanceof Error ? err.message : String(err)}` }
    }
  }

  /**
   * 清除编译缓存
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * 获取缓存条目数
   */
  getCacheSize(): number {
    return this.cache.size
  }
}

/** 全局单例 */
export const expressionRuntime = new ExpressionRuntime()
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter @schema-form/web test -- src/engine/__tests__/expressionRuntime.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/engine/expressionRuntime.ts packages/web/src/engine/__tests__/expressionRuntime.spec.ts
git commit -m "feat: ExpressionRuntime — 统一表达式引擎，支持 ${scope.field} 语法"
```

---

## Task 3: useLinkage 迁移到 ExpressionRuntime

**Files:**
- Modify: `packages/web/src/composables/useLinkage.ts`
- Test: `packages/web/src/__tests__/linkageIntegration.spec.ts`（已有，回归验证）

- [ ] **Step 1: 修改 useLinkage 使用 ExpressionRuntime**

在 `packages/web/src/composables/useLinkage.ts` 中：

1. 删除 `compileCondition` 函数（第 119-135 行）
2. 修改 `evaluateCondition` 函数使用 `expressionRuntime`：

```typescript
import { expressionRuntime } from '@/engine/expressionRuntime'
import { buildScopes } from '@/engine/scopes'
import type { VariableScope } from '@/widgets/base/types'

/**
 * 对单个联动配置求值
 */
function evaluateCondition(
  linkage: SchemaLinkage,
  formData: FormData,
  scopes?: VariableScope[],
): boolean {
  if (typeof linkage.condition === 'function') {
    const values: Record<string, FormFieldValue> = {}
    for (const field of linkage.watchFields) {
      values[field] = formData[field]
    }
    try {
      return linkage.condition(values)
    } catch {
      logger.rule(`条件函数求值失败`)
      return false
    }
  }

  // 字符串表达式：使用 ExpressionRuntime
  try {
    // 如果没有传入 scopes，构建默认的 form-only scopes
    const effectiveScopes = scopes ?? buildScopes({ formData })
    return Boolean(expressionRuntime.evaluate(linkage.condition, effectiveScopes))
  } catch {
    logger.rule(`条件表达式求值失败: "${linkage.condition}"`)
    return false
  }
}
```

3. 在 `useLinkage` 函数签名中添加可选 `scopes` 参数：

```typescript
export function useLinkage(
  schema: FormSchemaItem[],
  formData: MaybeRefOrGetter<FormData>,
  scopes?: MaybeRefOrGetter<VariableScope[]>,
): { stateMap: ComputedRef<Map<string, LinkageState>> } {
```

4. 在 `stateMap` computed 中传递 scopes：

```typescript
const effectiveScopes = toValue(scopes)
// ...
const result = evaluateCondition(linkage, currentFormData, effectiveScopes)
```

- [ ] **Step 2: 运行全量测试**

Run: `pnpm --filter @schema-form/web test`
Expected: All pass — 旧的 linkage 测试仍然通过（向后兼容）

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/composables/useLinkage.ts
git commit -m "refactor: useLinkage 迁移到 ExpressionRuntime"
```

---

## Task 4: eventEngine 迁移到 ExpressionRuntime

**Files:**
- Modify: `packages/web/src/engine/eventEngine.ts`
- Test: `packages/web/src/__tests__/eventEngine.spec.ts`（已有，回归验证）

- [ ] **Step 1: 修改 eventEngine 使用 ExpressionRuntime**

在 `packages/web/src/engine/eventEngine.ts` 中：

1. 删除 `evaluateCondition` 函数（第 134-156 行）
2. 修改 import：

```typescript
import { expressionRuntime } from './expressionRuntime'
import { buildScopes } from './scopes'
import type { ScopeContext } from '../widgets/base/types'
```

3. 修改 `triggerWidgetEvent` 使用新 API：

```typescript
export function triggerWidgetEvent(
  widget: Widget,
  trigger: string,
  context: Record<string, unknown> = {},
  scopeContext?: ScopeContext,
): void {
  if (!widget.events) return

  const scopes = scopeContext ? buildScopes(scopeContext) : buildScopes({ formData: context as Record<string, unknown> })

  for (const event of widget.events) {
    if (event.trigger !== trigger) continue

    // 条件判断 — 使用 ExpressionRuntime
    if (event.condition) {
      try {
        const result = expressionRuntime.evaluate<boolean>(event.condition, scopes)
        if (!result) continue
      } catch {
        logger.warn(`条件表达式求值失败: ${event.condition}`)
        continue
      }
    }

    // 确认提示
    if (event.confirm) {
      const confirmed = window.confirm(event.confirm)
      if (!confirmed) continue
    }

    // 执行动作链
    for (const action of event.actions) {
      executeEventAction(action, context)
    }
  }
}
```

4. 删除旧的 `evaluateCondition` 函数，但保留一个兼容导出：

```typescript
/**
 * @deprecated 使用 expressionRuntime.evaluate() 替代
 */
export function evaluateCondition(
  expression: string,
  context: Record<string, unknown>,
): boolean {
  try {
    const scopes = buildScopes({ formData: context as Record<string, unknown> })
    return expressionRuntime.evaluate<boolean>(expression, scopes)
  } catch {
    return false
  }
}
```

- [ ] **Step 2: 运行全量测试**

Run: `pnpm --filter @schema-form/web test`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/engine/eventEngine.ts
git commit -m "refactor: eventEngine 迁移到 ExpressionRuntime"
```

---

## Task 5: 删除旧 expression.ts + 表达式迁移工具

**Files:**
- Delete: `packages/web/src/utils/expression.ts`
- Create: `packages/web/src/engine/migrateExpressions.ts`
- Create: `packages/web/src/engine/__tests__/migrateExpressions.spec.ts`
- Modify: 全局 import 替换

- [ ] **Step 1: 搜索所有对旧 expression.ts 的引用**

```bash
grep -rn "from.*@/utils/expression\|from.*utils/expression" packages/web/src/ --include="*.ts" --include="*.vue"
```

- [ ] **Step 2: 编写迁移工具测试**

```typescript
// packages/web/src/engine/__tests__/migrateExpressions.spec.ts
import { describe, it, expect } from 'vitest'
import { migrateExpression, migrateSchemaExpressions } from '../migrateExpressions'

describe('migrateExpression', () => {
  it('converts ${field} to ${form.field}', () => {
    expect(migrateExpression('${age} > 18')).toBe('${form.age} > 18')
  })

  it('converts multiple ${field} references', () => {
    expect(migrateExpression('${age} > 18 && ${status} === "active"'))
      .toBe('${form.age} > 18 && ${form.status} === "active"')
  })

  it('does not convert already-scoped references', () => {
    expect(migrateExpression('${form.age} > 18')).toBe('${form.age} > 18')
    expect(migrateExpression('${user.id} === "u1"')).toBe('${user.id} === "u1"')
  })

  it('handles mixed old and new syntax', () => {
    expect(migrateExpression('${age} > 18 && ${user.id} === "u1"'))
      .toBe('${form.age} > 18 && ${user.id} === "u1"')
  })

  it('returns empty string unchanged', () => {
    expect(migrateExpression('')).toBe('')
  })

  it('returns non-string unchanged', () => {
    expect(migrateExpression(null as unknown as string)).toBe(null)
  })
})

describe('migrateSchemaExpressions', () => {
  it('migrates visibleOn/disabledOn/requiredOn in schema tree', () => {
    const schema = [
      {
        field: 'age',
        visibleOn: '${status} === "show"',
        disabledOn: '${lock} === true',
        children: [
          {
            field: 'name',
            requiredOn: '${age} > 0',
          },
        ],
      },
    ]
    const migrated = migrateSchemaExpressions(schema)
    expect(migrated[0].visibleOn).toBe('${form.status} === "show"')
    expect(migrated[0].disabledOn).toBe('${form.lock} === true')
    expect(migrated[0].children![0].requiredOn).toBe('${form.age} > 0')
  })

  it('migrates linkage conditions', () => {
    const schema = [
      {
        field: 'age',
        linkages: [
          {
            type: 'visible' as const,
            watchFields: ['status'],
            condition: '${status} === "show"',
          },
        ],
      },
    ]
    const migrated = migrateSchemaExpressions(schema)
    expect(migrated[0].linkages![0].condition).toBe('${form.status} === "show"')
  })

  it('migrates event conditions', () => {
    const schema = [
      {
        field: 'btn',
        events: [
          {
            trigger: 'click',
            condition: '${enabled} === true',
            actions: [],
          },
        ],
      },
    ]
    const migrated = migrateSchemaExpressions(schema)
    expect(migrated[0].events![0].condition).toBe('${form.enabled} === true')
  })
})
```

- [ ] **Step 3: 运行测试确认失败**

Run: `pnpm --filter @schema-form/web test -- src/engine/__tests__/migrateExpressions.spec.ts`
Expected: FAIL

- [ ] **Step 4: 实现迁移工具**

```typescript
// packages/web/src/engine/migrateExpressions.ts

/**
 * 将旧 ${field} 语法迁移为 ${form.field} 语法
 * - ${age} → ${form.age}
 * - ${form.age} 保持不变
 * - ${user.id} 保持不变
 */
export function migrateExpression(expr: string): string {
  if (!expr || typeof expr !== 'string') return expr

  // 匹配 ${field}，但不匹配 ${scope.field}（已有点号的跳过）
  return expr.replace(/\$\{(\w+)\}/g, (match, field: string) => {
    // 如果是已知作用域名，不替换（但只有单个词的情况不太可能出现）
    // 主要靠：如果 ${word} 中 word 不含点号，就是旧语法
    return `\${form.${field}}`
  })
}

/**
 * 递归遍历 schema 树，迁移所有表达式
 */
export function migrateSchemaExpressions(schema: Record<string, unknown>[]): Record<string, unknown>[] {
  return schema.map(item => {
    const migrated = { ...item }

    // 迁移 visibleOn / disabledOn / requiredOn
    for (const key of ['visibleOn', 'disabledOn', 'requiredOn']) {
      if (typeof migrated[key] === 'string') {
        migrated[key] = migrateExpression(migrated[key] as string)
      }
    }

    // 迁移 linkages[].condition（仅字符串）
    if (Array.isArray(migrated.linkages)) {
      migrated.linkages = (migrated.linkages as Record<string, unknown>[]).map(linkage => {
        if (typeof linkage.condition === 'string') {
          return { ...linkage, condition: migrateExpression(linkage.condition) }
        }
        return linkage
      })
    }

    // 迁移 events[].condition
    if (Array.isArray(migrated.events)) {
      migrated.events = (migrated.events as Record<string, unknown>[]).map(event => {
        if (typeof event.condition === 'string') {
          return { ...event, condition: migrateExpression(event.condition) }
        }
        return event
      })
    }

    // 递归 children
    if (Array.isArray(migrated.children)) {
      migrated.children = migrateSchemaExpressions(migrated.children as Record<string, unknown>[])
    }

    return migrated
  })
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `pnpm --filter @schema-form/web test -- src/engine/__tests__/migrateExpressions.spec.ts`
Expected: PASS

- [ ] **Step 6: 删除旧 expression.ts 并更新引用**

1. 搜索并替换所有 `from '@/utils/expression'` 引用：
   - `eventEngine.ts` — 已在 Task 4 中更新
   - 其他文件如有引用，改为 `from '@/engine/expressionRuntime'`

2. 删除 `packages/web/src/utils/expression.ts`

3. 删除旧的 `packages/web/src/__tests__/expression.spec.ts`（如果存在）

- [ ] **Step 7: 运行全量测试**

Run: `pnpm --filter @schema-form/web test`
Expected: All pass

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: 删除旧 expression.ts，添加表达式迁移工具"
```

---

## Task 6: 完整性测试 — ExpressionRuntime 边界场景

**Files:**
- Modify: `packages/web/src/engine/__tests__/expressionRuntime.spec.ts`

- [ ] **Step 1: 补充边界场景测试**

在现有测试文件末尾追加：

```typescript
describe('ExpressionRuntime — edge cases', () => {
  let runtime: ExpressionRuntime

  beforeEach(() => {
    runtime = new ExpressionRuntime()
  })

  it('handles null form data', () => {
    const scopes: VariableScope[] = [
      { name: 'form', data: null as unknown as Record<string, unknown> },
    ]
    expect(runtime.evaluate('${form.age} ?? 0', scopes)).toBe(0)
  })

  it('handles deeply nested widget props', () => {
    const scopes: VariableScope[] = [
      { name: 'widget', data: { props: { style: { color: 'red' } } } },
    ]
    expect(runtime.evaluate('${widget.props.style.color}', scopes)).toBe('red')
  })

  it('handles string values with special characters', () => {
    const scopes: VariableScope[] = [
      { name: 'form', data: { name: "O'Brien" } },
    ]
    expect(runtime.evaluate<string>('${form.name}', scopes)).toBe("O'Brien")
  })

  it('handles numeric comparisons', () => {
    const scopes: VariableScope[] = [
      { name: 'form', data: { price: 99.99, discount: 0.1 } },
    ]
    expect(runtime.evaluate<boolean>('${form.price} * (1 - ${form.discount}) < 100', scopes)).toBe(true)
  })

  it('handles boolean values', () => {
    const scopes: VariableScope[] = [
      { name: 'form', data: { enabled: true } },
    ]
    expect(runtime.evaluate<boolean>('${form.enabled} === true', scopes)).toBe(true)
  })

  it('handles array operations', () => {
    const scopes: VariableScope[] = [
      { name: 'form', data: { tags: ['a', 'b', 'c'] } },
    ]
    expect(runtime.evaluate<number>('${form.tags}.length', scopes)).toBe(3)
  })

  it('LRU evicts oldest entry when cache is full', () => {
    // Fill cache to max
    for (let i = 0; i < MAX_CACHE_SIZE; i++) {
      runtime.evaluate(`${i} + 1`, [{ name: 'form', data: {} }])
    }
    expect(runtime.getCacheSize()).toBe(MAX_CACHE_SIZE)

    // One more should evict the oldest
    runtime.evaluate('99999 + 1', [{ name: 'form', data: {} }])
    expect(runtime.getCacheSize()).toBe(MAX_CACHE_SIZE)
  })

  it('handles concurrent evaluations', () => {
    const scopes: VariableScope[] = [
      { name: 'form', data: { a: 1, b: 2, c: 3 } },
    ]
    const results = [
      runtime.evaluate('${form.a} + 1', scopes),
      runtime.evaluate('${form.b} + 1', scopes),
      runtime.evaluate('${form.c} + 1', scopes),
    ]
    expect(results).toEqual([2, 3, 4])
  })

  it('blocks setTimeout injection', () => {
    expect(() => runtime.evaluate('setTimeout(() => {}, 1)', [
      { name: 'form', data: {} },
    ])).toThrow('安全检查失败')
  })

  it('blocks setInterval injection', () => {
    expect(() => runtime.evaluate('setInterval(() => {}, 1)', [
      { name: 'form', data: {} },
    ])).toThrow('安全检查失败')
  })

  it('validates expressions with scope references', () => {
    expect(runtime.validate('${form.age} > 18').valid).toBe(true)
    expect(runtime.validate('${user.id} === "u1"').valid).toBe(true)
    expect(runtime.validate('${widget.props.x}').valid).toBe(true)
  })
})

// 边界场景需要导入常量
const MAX_CACHE_SIZE = 1000
```

- [ ] **Step 2: 运行测试确认通过**

Run: `pnpm --filter @schema-form/web test -- src/engine/__tests__/expressionRuntime.spec.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/engine/__tests__/expressionRuntime.spec.ts
git commit -m "test: ExpressionRuntime 边界场景完整性测试"
```
