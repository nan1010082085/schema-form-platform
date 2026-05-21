# Plan D: 规则系统重构 — 废弃 ruleEngine，统一到 linkage

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 废弃 engine/ruleEngine.ts，将所有联动逻辑统一到 useLinkage composable，Widget 类型从 rules 迁移到 linkages，补充集成测试和文档。

**Architecture:** Widget 接口的 `rules?: WidgetRule[]` 迁移为 `linkages?: SchemaLinkage[]`。SchemaNode 的 `computeWidgetRenderState` 调用改为从 useLinkage 的 stateMap 读取。RuleConfigDialog 重命名为 LinkageConfigDialog。

**Tech Stack:** Vue 3, TypeScript, Vitest

---

## Task 1: Widget 类型迁移

**Files:**
- Modify: `packages/web/src/widgets/base/types.ts`
- Modify: `packages/web/src/__tests__/widgets.spec.ts`

- [ ] **Step 1: 保留旧类型标记 @deprecated，添加新字段**

```typescript
// types.ts
/** @deprecated 使用 SchemaLinkage 替代 */
interface WidgetRule { ... }

// Widget 接口添加：
linkages?: SchemaLinkage[]
```

- [ ] **Step 2: 更新 widgets.spec.ts 规则引擎测试**

将 `computeWidgetRenderState` 测试保留（它仍然有效），添加 useLinkage 集成测试。

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/widgets/base/types.ts
git commit -m "refactor: Widget 类型添加 linkages 字段，rules 标记 @deprecated"
```

---

## Task 2: SchemaNode 使用 useLinkage

**Files:**
- Modify: `packages/web/src/components/FormGrid/SchemaNode.vue`
- Modify: `packages/web/src/engine/ruleEngine.ts`

- [ ] **Step 1: SchemaNode 切换到 useLinkage**

```diff
- import { computeWidgetRenderState } from '@/engine/ruleEngine'
+ import { useLinkage } from '@/composables/useLinkage'

- const renderState = computed(() => computeWidgetRenderState(widget.value, formData))
+ const linkage = useLinkage(widgetStore.widgets, formData)
+ const renderState = computed(() => linkage.getState(widget.value.id) ?? { visible: true, disabled: false, required: false })
```

- [ ] **Step 2: ruleEngine.ts 标记 @deprecated**

在文件顶部添加：
```typescript
/** @deprecated 此模块已废弃，请使用 useLinkage composable */
```

- [ ] **Step 3: 运行全量测试**

Run: `pnpm --filter @schema-form/web test`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/FormGrid/SchemaNode.vue packages/web/src/engine/ruleEngine.ts
git commit -m "refactor: SchemaNode 切换到 useLinkage，ruleEngine 标记废弃"
```

---

## Task 3: RuleConfigDialog → LinkageConfigDialog

**Files:**
- Rename: `packages/web/src/components/Editor/RuleConfigDialog.vue` → `LinkageConfigDialog.vue`
- Modify: `packages/web/src/components/Editor/PropertyPanel.vue`

- [ ] **Step 1: 重命名并更新内容**

将 RuleConfigDialog.vue 重命名为 LinkageConfigDialog.vue，内部使用已有的 `LinkageConfig.vue` 组件。

- [ ] **Step 2: PropertyPanel 更新引用**

```diff
- import RuleConfigDialog from './RuleConfigDialog.vue'
+ import LinkageConfigDialog from './LinkageConfigDialog.vue'
```

- [ ] **Step 3: 运行全量测试**

Run: `pnpm --filter @schema-form/web test`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/Editor/
git commit -m "refactor: RuleConfigDialog → LinkageConfigDialog"
```

---

## Task 4: 集成测试

**Files:**
- Create: `packages/web/src/__tests__/linkageIntegration.spec.ts`

- [ ] **Step 1: 编写集成测试**

```typescript
describe('Linkage Integration', () => {
  it('visible linkage hides widget', () => { ... })
  it('disabled linkage disables widget', () => { ... })
  it('required linkage marks required', () => { ... })
  it('set-value linkage updates target', () => { ... })
  it('multi-field watch triggers correctly', () => { ... })
  it('cycle detection prevents infinite loop', () => { ... })
})
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/__tests__/linkageIntegration.spec.ts
git commit -m "test: linkage 集成测试 — visible/disabled/required/set-value/循环检测"
```

---

## Task 5: 规则系统文档

**Files:**
- Create: `docs/rule-system.md`

- [ ] **Step 1: 编写文档**

内容：LinkageType 定义、条件表达式语法、watchFields 配置、与事件系统的区别、配置示例。

- [ ] **Step 2: Commit**

```bash
git add docs/rule-system.md
git commit -m "docs: 规则系统文档 — 联动类型、表达式、配置示例"
```
