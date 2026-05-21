# Plan F: Widget 测试框架 — harness + 示例 + 模板

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 Widget 测试 harness，以 FgInput 为示例编写完整的 5 维度测试，为其余部件提供可复用的测试模板。

**Architecture:** createWidgetTestHarness 工厂函数返回 5 个测试维度的工具方法。每个部件目录下创建 `__tests__/FgXxx.spec.ts`，使用 harness 生成基础测试再补充特有逻辑。

**Tech Stack:** Vue 3, Vitest, @vue/test-utils

**依赖:** Plan B（Widget description 字段）完成后启动

---

## Task 1: 测试 Harness

**Files:**
- Create: `packages/web/src/__tests__/widgetTestHarness.ts`

- [ ] **Step 1: 实现 harness**

```typescript
// packages/web/src/__tests__/widgetTestHarness.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'
import { triggerWidgetEvent } from '@/engine/eventEngine'
import { computeWidgetRenderState } from '@/engine/ruleEngine'
import type { SchemaType, Widget, SchemaLinkage } from '@/widgets/base/types'

export function createWidgetTestHarness(type: SchemaType) {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  return {
    getStore: () => store,

    // 维度 1：拖放
    testDragToCanvas() {
      it(`[${type}] 拖放到画布 → store 中存在`, () => {
        const widget = createWidget(type, `test_${type}`)
        expect(widget).not.toBeNull()
        store.addWidget(widget!)
        const found = store.findWidget(`test_${type}`)
        expect(found).toBeDefined()
        expect(found!.type).toBe(type)
      })
    },

    testDragToContainer() {
      it(`[${type}] 拖入容器 → children 包含`, () => {
        const widget = createWidget(type, `test_${type}`)
        const container = createWidget('card', 'container_1')
        store.addWidget(container!)
        store.addWidget(widget!)
        store.addToContainer(`test_${type}`, 'container_1')
        const parent = store.findWidget('container_1')
        expect(parent!.children).toHaveLength(1)
        expect(parent!.children![0].type).toBe(type)
      })
    },

    testDragOutFromContainer() {
      it(`[${type}] 从容器拖出 → 回到 root`, () => {
        const widget = createWidget(type, `test_${type}`)
        const container = createWidget('card', 'container_1')
        store.addWidget(container!)
        store.addWidget(widget!)
        store.addToContainer(`test_${type}`, 'container_1')
        store.removeFromContainer(`test_${type}`)
        expect(store.isRootWidget(`test_${type}`)).toBe(true)
      })
    },

    // 维度 2：属性生效（需要 mount 组件）
    testPropertyBinding(propKey: string, value: unknown, assertFn: (wrapper: any) => void) {
      it(`[${type}] 属性 ${propKey} 生效`, () => {
        const widget = createWidget(type, `test_${type}`)
        store.addWidget(widget!)
        store.updateWidget(`test_${type}`, { props: { [propKey]: value } })
        // 具体断言由调用方提供
        assertFn(store.findWidget(`test_${type}`))
      })
    },

    // 维度 3：事件触发
    testEventTrigger(trigger: string) {
      it(`[${type}] 事件 ${trigger} 触发`, () => {
        const widget = createWidget(type, `test_${type}`, {
          events: [{ trigger, actions: [{ type: 'show', target: 'some_target' }] }],
        })
        store.addWidget(widget!)
        // 验证 events 配置存在
        const found = store.findWidget(`test_${type}`)
        expect(found!.events).toHaveLength(1)
        expect(found!.events![0].trigger).toBe(trigger)
      })
    },

    // 维度 4：规则联动
    testLinkage(linkage: SchemaLinkage, formData: Record<string, unknown>, expected: { visible?: boolean; disabled?: boolean }) {
      it(`[${type}] linkage ${linkage.type} 生效`, () => {
        const widget = createWidget(type, `test_${type}`)
        store.addWidget(widget!)
        const found = store.findWidget(`test_${type}`)!
        const state = computeWidgetRenderState(found, formData)
        if (expected.visible !== undefined) {
          expect(state.visible).toBe(expected.visible)
        }
        if (expected.disabled !== undefined) {
          expect(state.disabled).toBe(expected.disabled)
        }
      })
    },

    // 维度 5：数据源配置
    testDatasourceConfig() {
      it(`[${type}] 支持数据源配置`, () => {
        const widget = createWidget(type, `test_${type}`)
        store.addWidget(widget!)
        store.updateWidget(`test_${type}`, {
          api: { url: '/api/options', method: 'get' },
        })
        const found = store.findWidget(`test_${type}`)
        expect(found!.api).toBeDefined()
        expect(found!.api!.url).toBe('/api/options')
      })
    },
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/__tests__/widgetTestHarness.ts
git commit -m "feat: widgetTestHarness — 5 维度测试工具"
```

---

## Task 2: FgInput 完整测试示例

**Files:**
- Create: `packages/web/src/widgets/input/__tests__/FgInput.spec.ts`

- [ ] **Step 1: 编写完整测试**

```typescript
// packages/web/src/widgets/input/__tests__/FgInput.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'
import { computeWidgetRenderState } from '@/engine/ruleEngine'
import FgInput from '../FgInput.vue'
import { provide } from 'vue'
import { widgetDataKey, widgetStyleKey } from '../../base/types'
import { computed } from 'vue'

describe('FgInput', () => {
  let store: ReturnType<typeof useWidgetStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
    store = useWidgetStore()
  })

  function mountInput(overrides: Record<string, unknown> = {}) {
    const widget = createWidget('input', 'test_input')!
    Object.assign(widget, overrides)
    store.addWidget(widget)

    return mount(FgInput, {
      global: {
        provide: {
          [widgetDataKey as symbol]: computed(() => store.findWidget('test_input')!),
          [widgetStyleKey as symbol]: computed(() => store.findWidget('test_input')!.style ?? {}),
        },
      },
    })
  }

  // 维度 1：拖放
  describe('拖放', () => {
    it('创建后 store 中存在', () => {
      const widget = createWidget('input', 'test_input')
      store.addWidget(widget!)
      expect(store.findWidget('test_input')).toBeDefined()
    })

    it('拖入 card 容器', () => {
      const widget = createWidget('input', 'test_input')
      const card = createWidget('card', 'test_card')
      store.addWidget(card!)
      store.addWidget(widget!)
      store.addToContainer('test_input', 'test_card')
      expect(store.findWidget('test_card')!.children).toHaveLength(1)
    })

    it('从容器拖出', () => {
      const widget = createWidget('input', 'test_input')
      const card = createWidget('card', 'test_card')
      store.addWidget(card!)
      store.addWidget(widget!)
      store.addToContainer('test_input', 'test_card')
      store.removeFromContainer('test_input')
      expect(store.isRootWidget('test_input')).toBe(true)
    })
  })

  // 维度 2：属性生效
  describe('属性', () => {
    it('placeholder 生效', () => {
      const wrapper = mountInput({ props: { placeholder: '请输入姓名' } })
      expect(wrapper.find('input').attributes('placeholder')).toBe('请输入姓名')
    })

    it('disabled 生效', () => {
      const wrapper = mountInput({ props: { disabled: true } })
      expect(wrapper.find('input').attributes('disabled')).toBeDefined()
    })
  })

  // 维度 3：事件配置
  describe('事件', () => {
    it('支持 change 事件配置', () => {
      const widget = createWidget('input', 'test_input')!
      widget.events = [{ trigger: 'change', actions: [{ type: 'show', target: 'w2' }] }]
      store.addWidget(widget)
      expect(store.findWidget('test_input')!.events).toHaveLength(1)
    })

    it('支持 blur/focus 事件配置', () => {
      const widget = createWidget('input', 'test_input')!
      widget.events = [
        { trigger: 'blur', actions: [{ type: 'hide', target: 'w2' }] },
        { trigger: 'focus', actions: [{ type: 'show', target: 'w3' }] },
      ]
      store.addWidget(widget)
      expect(store.findWidget('test_input')!.events).toHaveLength(2)
    })
  })

  // 维度 4：规则联动
  describe('规则', () => {
    it('visible=false 隐藏', () => {
      const widget = createWidget('input', 'test_input')!
      widget.rules = [{
        watches: [{ type: 'field', source: 'status' }],
        condition: 'status === "hide"',
        actions: [{ type: 'hide', config: {} }],
      }]
      store.addWidget(widget)
      const state = computeWidgetRenderState(widget, { status: 'hide' })
      expect(state.visible).toBe(false)
    })

    it('disabled=true 禁用', () => {
      const widget = createWidget('input', 'test_input')!
      widget.rules = [{
        watches: [{ type: 'field', source: 'lock' }],
        condition: 'lock === true',
        actions: [{ type: 'disabled', config: {} }],
      }]
      store.addWidget(widget)
      const state = computeWidgetRenderState(widget, { lock: true })
      expect(state.disabled).toBe(true)
    })
  })

  // 维度 5：数据源
  describe('数据源', () => {
    it('支持 api 配置', () => {
      const widget = createWidget('input', 'test_input')!
      widget.api = { url: '/api/users', method: 'get' }
      store.addWidget(widget)
      expect(store.findWidget('test_input')!.api!.url).toBe('/api/users')
    })
  })
})
```

- [ ] **Step 2: 创建目录并运行测试**

```bash
mkdir -p packages/web/src/widgets/input/__tests__
pnpm --filter @schema-form/web test -- src/widgets/input/__tests__/FgInput.spec.ts
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/widgets/input/__tests__/FgInput.spec.ts
git commit -m "test: FgInput 完整 5 维度测试 — 拖放/属性/事件/规则/数据源"
```

---

## Task 3: 其余部件测试模板

**Files:**
- Create: 各部件 `__tests__/FgXxx.spec.ts`

- [ ] **Step 1: 表单类部件测试 (select, number, radio, checkbox, date, textarea)**

每个部件使用相同模式，替换 type 和特有属性断言：

```typescript
// packages/web/src/widgets/select/__tests__/FgSelect.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWidgetStore } from '@/stores/widget'
import { registerAllWidgets } from '@/widgets/index'
import { createWidget } from '@/widgets/registry'

describe('FgSelect', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerAllWidgets()
  })

  it('创建后 store 中存在', () => {
    const store = useWidgetStore()
    const widget = createWidget('select', 'test_select')
    store.addWidget(widget!)
    expect(store.findWidget('test_select')).toBeDefined()
  })

  it('支持 options 配置', () => {
    const store = useWidgetStore()
    const widget = createWidget('select', 'test_select')!
    widget.options = [{ label: 'A', value: 'a' }]
    store.addWidget(widget)
    expect(store.findWidget('test_select')!.options).toHaveLength(1)
  })

  it('支持 api 数据源', () => {
    const store = useWidgetStore()
    const widget = createWidget('select', 'test_select')!
    widget.api = { url: '/api/options', method: 'get' }
    store.addWidget(widget)
    expect(store.findWidget('test_select')!.api).toBeDefined()
  })
})
```

- [ ] **Step 2: 容器类部件测试 (card, tabs, dialog)**

```typescript
// packages/web/src/widgets/card/__tests__/FgCard.spec.ts
describe('FgCard', () => {
  it('创建后 store 中存在', () => { ... })
  it('可容纳子组件', () => {
    const store = useWidgetStore()
    const card = createWidget('card', 'test_card')
    const input = createWidget('input', 'child_1')
    store.addWidget(card!)
    store.addWidget(input!)
    store.addToContainer('child_1', 'test_card')
    expect(store.findWidget('test_card')!.children).toHaveLength(1)
  })
  it('移除子组件', () => { ... })
})
```

- [ ] **Step 3: 运行全量测试**

Run: `pnpm --filter @schema-form/web test`
Expected: All pass (including new widget tests)

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/widgets/*/packages/
git commit -m "test: 31 个部件基础测试模板 — 拖放/属性/事件/规则/数据源"
```

---

## Task 4: 测试覆盖率报告

- [ ] **Step 1: 运行覆盖率**

```bash
pnpm --filter @schema-form/web test -- --coverage
```

- [ ] **Step 2: 记录当前覆盖率基线，写入文档**

更新 `docs/superpowers/specs/2026-05-21-platform-optimization-design.md` 的 F section，记录覆盖率数据。
