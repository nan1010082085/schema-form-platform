# Plan E: 数据源增强 — JSONPath + 响应解析 + 弹框样式

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 responseNormalizer 增加 JSONPath 查询能力，增强"测试连接"功能的反馈，优化弹框按钮样式，补充测试和文档。

**Architecture:** 在 responseNormalizer.ts 中新增 extractByPath 函数，支持 JSONPath 语法（`$.data.list[*]`）。dataPath 自动检测：`$` 开头走 JSONPath，否则走现有 getNestedValue。依赖 jsonpath-plus 库（~5KB gzipped）。

**Tech Stack:** TypeScript, jsonpath-plus, Vitest

---

## Task 1: 安装 jsonpath-plus

- [ ] **Step 1: 安装依赖**

```bash
pnpm --filter @schema-form/web add jsonpath-plus
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/package.json pnpm-lock.yaml
git commit -m "chore: 添加 jsonpath-plus 依赖"
```

---

## Task 2: responseNormalizer 增加 JSONPath

**Files:**
- Modify: `packages/web/src/utils/responseNormalizer.ts`
- Modify: `packages/web/src/__tests__/datasource.spec.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/web/src/__tests__/datasource.spec.ts
import { describe, it, expect } from 'vitest'
import { extractByPath, normalizeListResponse, getNestedValue } from '@/utils/responseNormalizer'

describe('extractByPath', () => {
  const data = {
    code: 200,
    data: {
      list: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
      total: 2,
    },
  }

  it('returns data when path is empty', () => {
    expect(extractByPath(data, '')).toEqual(data)
  })

  it('supports simple dot path', () => {
    expect(extractByPath(data, 'data.list')).toEqual(data.data.list)
  })

  it('supports JSONPath with $', () => {
    const result = extractByPath(data, '$.data.list[*].name')
    expect(result).toEqual(['Alice', 'Bob'])
  })

  it('supports JSONPath array index', () => {
    const result = extractByPath(data, '$.data.list[0].name')
    expect(result).toBe('Alice')
  })

  it('returns undefined for invalid path', () => {
    expect(extractByPath(data, 'nonexistent.path')).toBeUndefined()
  })
})

describe('normalizeListResponse with JSONPath', () => {
  it('extracts list from nested structure via JSONPath', () => {
    const response = { result: { items: [{ id: 1 }] } }
    const result = normalizeListResponse(response, '$.result.items')
    expect(result).toEqual([{ id: 1 }])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @schema-form/web test -- src/__tests__/datasource.spec.ts`
Expected: FAIL — extractByPath not found

- [ ] **Step 3: Implement extractByPath**

```typescript
// packages/web/src/utils/responseNormalizer.ts
import { JSONPath } from 'jsonpath-plus'

export function extractByPath(data: unknown, path: string): unknown {
  if (!path) return data
  if (path.startsWith('$')) {
    try {
      const result = JSONPath({ path, json: data, wrap: false })
      return result
    } catch {
      return undefined
    }
  }
  return getNestedValue(data, path)
}
```

- [ ] **Step 4: Update normalizeListResponse to use extractByPath**

```typescript
export function normalizeListResponse(response: unknown, dataPath?: string): unknown[] {
  // 如果指定了 dataPath，优先使用
  if (dataPath) {
    const extracted = extractByPath(response, dataPath)
    if (Array.isArray(extracted)) return extracted
  }
  // 现有逻辑不变...
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @schema-form/web test -- src/__tests__/datasource.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/utils/responseNormalizer.ts packages/web/src/__tests__/datasource.spec.ts
git commit -m "feat: responseNormalizer 支持 JSONPath 查询表达式"
```

---

## Task 3: 增强"测试连接"功能

**Files:**
- Modify: `packages/web/src/components/Editor/ApiConfig.vue`

- [ ] **Step 1: 增强测试连接结果展示**

测试连接成功后显示：
- 原始响应结构预览（前 200 字符）
- 自动推荐 dataPath（检测常见 wrapper key: data/list/rows/items/result）
- 解析后的 options 预览（前 5 条）
- 错误提示：响应格式不匹配时给出建议

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/Editor/ApiConfig.vue
git commit -m "feat: 测试连接增强 — 响应预览 + 自动推荐 dataPath + 解析预览"
```

---

## Task 4: 弹框按钮样式优化

**Files:**
- Modify: `packages/web/src/components/Editor/OptionsApiConfigDialog.vue`

- [ ] **Step 1: 优化底部按钮布局**

```html
<template #footer>
  <div :class="$style.footer">
    <el-button @click="close">取消</el-button>
    <el-button type="primary" plain @click="testConnection">测试连接</el-button>
    <el-button type="primary" @click="save">保存</el-button>
  </div>
</template>
```

```css
.footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/Editor/OptionsApiConfigDialog.vue
git commit -m "style: 数据源弹框底部按钮样式优化"
```

---

## Task 5: 数据源文档

**Files:**
- Create: `docs/datasource-system.md`

- [ ] **Step 1: 编写文档**

内容：SchemaApiConfig 配置说明、JSONPath 语法参考、响应格式要求、缓存策略、dictCode 模式、使用示例。

- [ ] **Step 2: Commit**

```bash
git add docs/datasource-system.md
git commit -m "docs: 数据源系统文档 — JSONPath、响应格式、缓存、配置示例"
```
