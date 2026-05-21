# Plan C: 事件系统加固

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 统一表达式引擎到 utils/expression.ts，扩展 EventActionType，在 SchemaNode 层统一 widget 事件触发，补充完整测试和文档。

**Architecture:** eventEngine.ts 的 evaluateCondition 替换为 expression.ts 的 evaluateExpression（带安全黑名单、超时、缓存）。SchemaNode 根据 widget.type 绑定对应的 DOM 事件处理器，统一调用 triggerWidgetEvent。

**Tech Stack:** Vue 3, TypeScript, Vitest

---

## Task 1: 统一表达式引擎

**Files:**
- Modify: `packages/web/src/engine/eventEngine.ts`
- Test: `packages/web/src/__tests__/eventEngine.spec.ts`

- [ ] **Step 1: Write failing tests for security**

```typescript
// packages/web/src/__tests__/eventEngine.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { evaluateCondition, triggerWidgetEvent, executeEventAction } from '@/engine/eventEngine'
import type { Widget } from '@/widgets/base/types'

describe('evaluateCondition (via expression.ts)', () => {
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
```

- [ ] **Step 2: Run test to verify it fails (security tests)**

Run: `pnpm --filter @schema-form/web test -- src/__tests__/eventEngine.spec.ts`
Expected: FAIL — security tests fail (current impl uses raw new Function)

- [ ] **Step 3: Replace evaluateCondition implementation**

```typescript
// packages/web/src/engine/eventEngine.ts
import { evaluateExpression } from '@/utils/expression'

export function evaluateCondition(expression: string, context: Record<string, unknown>): boolean {
  try {
    const result = evaluateExpression(expression, context)
    return Boolean(result)
  } catch {
    return false
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @schema-form/web test -- src/__tests__/eventEngine.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/engine/eventEngine.ts packages/web/src/__tests__/eventEngine.spec.ts
git commit -m "refactor: eventEngine.evaluateCondition 统一到 expression.ts 安全引擎"
```

---

## Task 2: 扩展 EventActionType

**Files:**
- Modify: `packages/web/src/widgets/base/types.ts`
- Modify: `packages/web/src/engine/eventEngine.ts`

- [ ] **Step 1: 扩展类型**

```typescript
// types.ts
type EventActionType =
  | 'show' | 'hide'
  | 'open-dialog' | 'close-dialog'
  | 'switch-tab'
  | 'set-value'      // 新增
  | 'submit'         // 新增
  | 'reset'          // 新增
  | 'emit'           // 新增
```

- [ ] **Step 2: 在 executeEventAction 中实现新 action**

```typescript
// eventEngine.ts
case 'set-value':
  if (action.target) {
    const targetWidget = context.widgetStore.findWidget(action.target)
    if (targetWidget) {
      context.widgetStore.updateWidget(action.target, { defaultValue: action.value })
    }
  }
  break

case 'submit':
  // 查找最近的 form 容器并触发提交
  const formWidget = context.widgetStore.widgets.find(w => w.type === 'form')
  if (formWidget) {
    const values = context.widgetStore.collectFormValues(formWidget.id)
    logger.event('Form submit:', values)
  }
  break

case 'reset':
  const form = context.widgetStore.widgets.find(w => w.type === 'form')
  if (form && form.children) {
    for (const child of form.children) {
      if (child.field) {
        context.widgetStore.updateWidget(child.id, { defaultValue: child.defaultValue })
      }
    }
  }
  break

case 'emit':
  logger.event('Emit custom event:', action.value)
  break
```

- [ ] **Step 3: 添加测试**

```typescript
describe('executeEventAction', () => {
  it('set-value updates target widget', () => {
    const mockStore = {
      findWidget: vi.fn().mockReturnValue({ id: 'w1', defaultValue: 'old' }),
      updateWidget: vi.fn(),
    }
    executeEventAction(
      { type: 'set-value', target: 'w1', value: 'new' },
      { widgetStore: mockStore } as any
    )
    expect(mockStore.updateWidget).toHaveBeenCalledWith('w1', { defaultValue: 'new' })
  })
})
```

- [ ] **Step 4: 运行全量测试**

Run: `pnpm --filter @schema-form/web test`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/widgets/base/types.ts packages/web/src/engine/eventEngine.ts packages/web/src/__tests__/eventEngine.spec.ts
git commit -m "feat: EventActionType 扩展 — set-value/submit/reset/emit"
```

---

## Task 3: SchemaNode 统一事件触发

**Files:**
- Modify: `packages/web/src/components/FormGrid/SchemaNode.vue`
- Modify: 各部件 `.vue` 文件（移除各自的事件调用）

- [ ] **Step 1: 在 SchemaNode 中添加事件触发逻辑**

```typescript
// SchemaNode.vue
import { triggerWidgetEvent } from '@/engine/eventEngine'
import { useWidgetStore } from '@/stores/widget'
import { useLogger } from '@/composables/useLogger'

const logger = useLogger('SchemaNode')

function handleWidgetEvent(trigger: string, value?: unknown) {
  triggerWidgetEvent(widget.value, trigger, {
    widgetStore,
    value,
    formData: {}, // 从 form 容器获取
  })
}
```

- [ ] **Step 2: 根据 widget.type 绑定事件**

在容器 wrapper 上根据类型绑定：

```html
<div :class="wrapperClass" :style="wrapperStyle"
  @change="isFormComponent && handleWidgetEvent('change', $event)"
  @focus="isInputComponent && handleWidgetEvent('focus')"
  @blur="isInputComponent && handleWidgetEvent('blur')"
>
```

- [ ] **Step 3: FgButton 移除自行调用**

FgButton.vue 中删除 `triggerWidgetEvent` 调用（由 SchemaNode 统一处理）。

- [ ] **Step 4: 运行全量测试**

Run: `pnpm --filter @schema-form/web test`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/FormGrid/SchemaNode.vue packages/web/src/widgets/button/FgButton.vue
git commit -m "feat: SchemaNode 统一事件触发，各部件无需自行调用"
```

---

## Task 4: 事件系统文档

**Files:**
- Create: `docs/event-system.md`

- [ ] **Step 1: 编写文档**

内容包括：
- 触发器类型定义（click, change, blur, focus, close）
- 动作类型定义（show, hide, open-dialog, close-dialog, switch-tab, set-value, submit, reset, emit）
- 条件表达式语法与安全限制
- Widget 触发集成说明
- 配置示例

- [ ] **Step 2: Commit**

```bash
git add docs/event-system.md
git commit -m "docs: 事件系统文档 — 触发器、动作、安全限制、配置示例"
```
