# Plan A: 基础设施 — useLogger + EnhancedDialog + devtools

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立统一日志系统、可拖拽全屏弹框组件、启用 vue devtools，为后续所有工作流提供基础设施。

**Architecture:** useLogger 是一个 composable，接收 scope 字符串返回带颜色前缀的 logger 对象。EnhancedDialog 封装 el-dialog，透传所有 props 并增加拖拽和全屏能力。两者都是无外部依赖的纯 Vue 实现。

**Tech Stack:** Vue 3 Composition API, Element Plus, CSS Modules, TypeScript

---

## 文件结构

| 操作 | 文件 | 职责 |
|------|------|------|
| Create | `packages/web/src/composables/useLogger.ts` | 统一日志 composable |
| Create | `packages/web/src/__tests__/useLogger.spec.ts` | useLogger 测试 |
| Create | `packages/web/src/components/EnhancedDialog.vue` | 可拖拽全屏弹框 |
| Create | `packages/web/src/__tests__/EnhancedDialog.spec.ts` | EnhancedDialog 测试 |
| Modify | `packages/web/src/components/Editor/EventConfigDialog.vue` | 替换 el-dialog 为 EnhancedDialog |
| Modify | `packages/web/src/components/Editor/RuleConfigDialog.vue` | 替换 el-dialog 为 EnhancedDialog |
| Modify | `packages/web/src/components/Editor/OptionsApiConfigDialog.vue` | 替换 el-dialog 为 EnhancedDialog |
| Modify | `packages/web/src/components/Editor/RequestConfigDialog.vue` | 替换 el-dialog 为 EnhancedDialog |
| Modify | `packages/web/src/widgets/dialog/FgDialog.vue` | runtime 模式使用 EnhancedDialog |
| Modify | `packages/web/src/engine/eventEngine.ts` | 替换 console.log 为 useLogger |
| Modify | `packages/web/src/composables/useLinkage.ts` | 替换 console.log/warn 为 useLogger |
| Modify | `packages/web/src/composables/useDynamicOptions.ts` | 替换 console 为 useLogger |
| Modify | `packages/web/src/utils/requestQueue.ts` | 替换 console 为 useLogger |
| Modify | `packages/web/src/stores/requestStore.ts` | 替换 console 为 useLogger |
| Modify | `packages/web/src/utils/request.ts` | 替换 console 为 useLogger |
| Modify | `packages/web/src/utils/responseNormalizer.ts` | 替换 console 为 useLogger |
| Modify | `packages/web/vite.config.ts` | 确认 devtools 启用 |

---

## Task 1: useLogger composable

**Files:**
- Create: `packages/web/src/composables/useLogger.ts`
- Test: `packages/web/src/__tests__/useLogger.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/web/src/__tests__/useLogger.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useLogger } from '@/composables/useLogger'

describe('useLogger', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>
    warn: ReturnType<typeof vi.spyOn>
    error: ReturnType<typeof vi.spyOn>
    debug: ReturnType<typeof vi.spyOn>
  }

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
    }
  })

  it('returns a logger with all methods', () => {
    const logger = useLogger('Test')
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.debug).toBe('function')
    expect(typeof logger.event).toBe('function')
    expect(typeof logger.rule).toBe('function')
    expect(typeof logger.api).toBe('function')
  })

  it('info calls console.log with scope prefix', () => {
    const logger = useLogger('MyScope')
    logger.info('hello', 123)
    expect(consoleSpy.log).toHaveBeenCalledWith(
      expect.stringContaining('[MyScope]'),
      'hello',
      123
    )
  })

  it('warn calls console.warn', () => {
    const logger = useLogger('Test')
    logger.warn('warning')
    expect(consoleSpy.warn).toHaveBeenCalledWith(
      expect.stringContaining('[Test]'),
      'warning'
    )
  })

  it('error calls console.error', () => {
    const logger = useLogger('Test')
    logger.error('err')
    expect(consoleSpy.error).toHaveBeenCalledWith(
      expect.stringContaining('[Test]'),
      'err'
    )
  })

  it('event uses blue color prefix', () => {
    const logger = useLogger('EventEngine')
    logger.event('triggered')
    expect(consoleSpy.log).toHaveBeenCalledWith(
      expect.stringContaining('%c[EventEngine]'),
      expect.stringContaining('color: #409eff'),
      'triggered'
    )
  })

  it('rule uses purple color prefix', () => {
    const logger = useLogger('RuleEngine')
    logger.rule('evaluated')
    expect(consoleSpy.log).toHaveBeenCalledWith(
      expect.stringContaining('%c[RuleEngine]'),
      expect.stringContaining('color: #9c27b0'),
      'evaluated'
    )
  })

  it('api uses green color prefix', () => {
    const logger = useLogger('DataSource')
    api('fetched')
    expect(consoleSpy.log).toHaveBeenCalledWith(
      expect.stringContaining('%c[DataSource]'),
      expect.stringContaining('color: #67c23a'),
      'fetched'
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @schema-form/web test -- src/__tests__/useLogger.spec.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement useLogger**

```typescript
// packages/web/src/composables/useLogger.ts
const COLORS = {
  info: '',
  warn: '',
  error: '',
  debug: '',
  event: 'color: #409eff; font-weight: bold',
  rule: 'color: #9c27b0; font-weight: bold',
  api: 'color: #67c23a; font-weight: bold',
} as const

export function useLogger(scope: string) {
  const isDev = import.meta.env.DEV

  function log(level: 'info' | 'warn' | 'error' | 'debug', color: string, ...args: unknown[]) {
    if (!isDev) return
    const prefix = `[${scope}]`
    if (color) {
      console[level](`%c${prefix}`, color, ...args)
    } else {
      console[level](prefix, ...args)
    }
  }

  return {
    info: (...args: unknown[]) => log('info', '', ...args),
    warn: (...args: unknown[]) => log('warn', '', ...args),
    error: (...args: unknown[]) => log('error', '', ...args),
    debug: (...args: unknown[]) => log('debug', '', ...args),
    event: (...args: unknown[]) => log('info', COLORS.event, ...args),
    rule: (...args: unknown[]) => log('info', COLORS.rule, ...args),
    api: (...args: unknown[]) => log('info', COLORS.api, ...args),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @schema-form/web test -- src/__tests__/useLogger.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/composables/useLogger.ts packages/web/src/__tests__/useLogger.spec.ts
git commit -m "feat: useLogger composable — 统一日志系统，带颜色前缀"
```

---

## Task 2: useLogger 替换散落的 console 调用

**Files:**
- Modify: `packages/web/src/engine/eventEngine.ts`
- Modify: `packages/web/src/composables/useLinkage.ts`
- Modify: `packages/web/src/composables/useDynamicOptions.ts`
- Modify: `packages/web/src/utils/requestQueue.ts`
- Modify: `packages/web/src/stores/requestStore.ts`
- Modify: `packages/web/src/utils/request.ts`
- Modify: `packages/web/src/utils/responseNormalizer.ts`

- [ ] **Step 1: 替换 eventEngine.ts 中的 console 调用**

在文件顶部添加 import：
```typescript
import { useLogger } from '@/composables/useLogger'
const logger = useLogger('EventEngine')
```

将所有 `console.log('[EventEngine]...')` 替换为 `logger.event(...)` 或 `logger.error(...)`。

- [ ] **Step 2: 替换 useLinkage.ts 中的 console 调用**

```typescript
import { useLogger } from '@/composables/useLogger'
const logger = useLogger('Linkage')
```

替换 `console.warn('[useLinkage]...')` → `logger.warn(...)`。

- [ ] **Step 3: 替换 useDynamicOptions.ts 中的 console 调用**

```typescript
import { useLogger } from '@/composables/useLogger'
const logger = useLogger('DynamicOptions')
```

- [ ] **Step 4: 替换 requestQueue.ts 中的 console 调用**

```typescript
import { useLogger } from '@/composables/useLogger'
const logger = useLogger('RequestQueue')
```

- [ ] **Step 5: 替换 requestStore.ts 中的 console 调用**

```typescript
import { useLogger } from '@/composables/useLogger'
const logger = useLogger('RequestStore')
```

- [ ] **Step 6: 替换 request.ts 中的 console 调用**

```typescript
import { useLogger } from '@/composables/useLogger'
const logger = useLogger('Request')
```

- [ ] **Step 7: 替换 responseNormalizer.ts 中的 console 调用**

```typescript
import { useLogger } from '@/composables/useLogger'
const logger = useLogger('ResponseNormalizer')
```

- [ ] **Step 8: 运行全量测试确认无回归**

Run: `pnpm --filter @schema-form/web test`
Expected: All tests pass

- [ ] **Step 9: Commit**

```bash
git add packages/web/src/engine/eventEngine.ts packages/web/src/composables/useLinkage.ts packages/web/src/composables/useDynamicOptions.ts packages/web/src/utils/requestQueue.ts packages/web/src/stores/requestStore.ts packages/web/src/utils/request.ts packages/web/src/utils/responseNormalizer.ts
git commit -m "refactor: 替换所有散落 console 调用为 useLogger"
```

---

## Task 3: EnhancedDialog 组件

**Files:**
- Create: `packages/web/src/components/EnhancedDialog.vue`
- Test: `packages/web/src/__tests__/EnhancedDialog.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/web/src/__tests__/EnhancedDialog.spec.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EnhancedDialog from '@/components/EnhancedDialog.vue'

describe('EnhancedDialog', () => {
  it('renders el-dialog', () => {
    const wrapper = mount(EnhancedDialog, {
      props: { modelValue: true, title: 'Test' },
    })
    expect(wrapper.find('.el-dialog').exists()).toBe(true)
  })

  it('shows fullscreen button by default', () => {
    const wrapper = mount(EnhancedDialog, {
      props: { modelValue: true, title: 'Test' },
    })
    expect(wrapper.find('[data-testid="fullscreen-btn"]').exists()).toBe(true)
  })

  it('hides fullscreen button when showFullscreenBtn is false', () => {
    const wrapper = mount(EnhancedDialog, {
      props: { modelValue: true, title: 'Test', showFullscreenBtn: false },
    })
    expect(wrapper.find('[data-testid="fullscreen-btn"]').exists()).toBe(false)
  })

  it('toggles fullscreen on button click', async () => {
    const wrapper = mount(EnhancedDialog, {
      props: { modelValue: true, title: 'Test' },
    })
    await wrapper.find('[data-testid="fullscreen-btn"]').trigger('click')
    expect(wrapper.find('.el-dialog').classes()).toContain('is-fullscreen')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @schema-form/web test -- src/__tests__/EnhancedDialog.spec.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement EnhancedDialog**

```vue
<!-- packages/web/src/components/EnhancedDialog.vue -->
<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { FullScreen } from '@element-plus/icons-vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  title?: string
  width?: string | number
  draggable?: boolean
  showFullscreenBtn?: boolean
  destroyOnClose?: boolean
  closeOnClickModal?: boolean
}>(), {
  draggable: true,
  showFullscreenBtn: true,
  destroyOnClose: true,
  closeOnClickModal: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

const isFullscreen = ref(false)
const dialogStyle = ref<Record<string, string>>({})

// 拖拽状态
let isDragging = false
let startX = 0
let startY = 0
let startLeft = 0
let startTop = 0

function onHeaderMousedown(e: MouseEvent) {
  if (!props.draggable || isFullscreen.value) return
  const dialog = (e.currentTarget as HTMLElement).closest('.el-dialog')
  if (!dialog) return

  isDragging = true
  startX = e.clientX
  startY = e.clientY
  startLeft = parseInt(dialog.style.left || '0', 10)
  startTop = parseInt(dialog.style.top || '0', 10)

  document.addEventListener('mousemove', onMousemove)
  document.addEventListener('mouseup', onMouseup)
}

function onMousemove(e: MouseEvent) {
  if (!isDragging) return
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  dialogStyle.value = {
    ...dialogStyle.value,
    left: `${startLeft + dx}px`,
    top: `${startTop + dy}px`,
    margin: '0',
  }
}

function onMouseup() {
  isDragging = false
  document.removeEventListener('mousemove', onMousemove)
  document.removeEventListener('mouseup', onMouseup)
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
  if (isFullscreen.value) {
    dialogStyle.value = {}
  }
}

function handleClose() {
  emit('update:modelValue', false)
  emit('close')
  // 重置位置
  dialogStyle.value = {}
  isFullscreen.value = false
}

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onMousemove)
  document.removeEventListener('mouseup', onMouseup)
})
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    :width="width"
    :destroy-on-close="destroyOnClose"
    :close-on-click-modal="closeOnClickModal"
    :class="{ 'is-fullscreen': isFullscreen }"
    :style="dialogStyle"
    @close="handleClose"
  >
    <template #header>
      <div
        :class="$style.header"
        @mousedown="onHeaderMousedown"
      >
        <span :class="$style.title">{{ title }}</span>
        <el-icon
          v-if="showFullscreenBtn"
          data-testid="fullscreen-btn"
          :class="$style.fullscreenBtn"
          @click.stop="toggleFullscreen"
        >
          <FullScreen />
        </el-icon>
      </div>
    </template>

    <slot />

    <template #footer>
      <slot name="footer" />
    </template>
  </el-dialog>
</template>

<style module>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: v-bind("props.draggable && !isFullscreen ? 'move' : 'default'");
  user-select: none;
}

.title {
  flex: 1;
}

.fullscreenBtn {
  cursor: pointer;
  font-size: 16px;
  color: var(--el-text-color-secondary);
  margin-left: 8px;
}

.fullscreenBtn:hover {
  color: var(--el-color-primary);
}
</style>

<style>
.el-dialog.is-fullscreen {
  width: 100vw !important;
  max-width: 100vw !important;
  margin: 0 !important;
  top: 0 !important;
  left: 0 !important;
  height: 100vh;
  border-radius: 0;
}

.el-dialog.is-fullscreen .el-dialog__body {
  height: calc(100vh - 120px);
  overflow: auto;
}
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @schema-form/web test -- src/__tests__/EnhancedDialog.spec.ts`
Expected: PASS

- [ ] **Step 5: 类型检查**

Run: `pnpm --filter @schema-form/web exec vue-tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/components/EnhancedDialog.vue packages/web/src/__tests__/EnhancedDialog.spec.ts
git commit -m "feat: EnhancedDialog 组件 — 可拖拽、全屏弹框封装"
```

---

## Task 4: 替换编辑器弹框为 EnhancedDialog

**Files:**
- Modify: `packages/web/src/components/Editor/EventConfigDialog.vue`
- Modify: `packages/web/src/components/Editor/RuleConfigDialog.vue`
- Modify: `packages/web/src/components/Editor/OptionsApiConfigDialog.vue`
- Modify: `packages/web/src/components/Editor/RequestConfigDialog.vue`

- [ ] **Step 1: 替换 EventConfigDialog**

将 `<el-dialog>` 替换为 `<EnhancedDialog>`，移除手动设置的 `width`、`destroy-on-close`、`close-on-click-modal`（EnhancedDialog 已有默认值）。

```diff
+ import EnhancedDialog from '@/components/EnhancedDialog.vue'

- <el-dialog :visible="visible" title="事件配置" width="640px" destroy-on-close close-on-click-modal=false>
+ <EnhancedDialog :model-value="visible" title="事件配置" width="640px">
```

- [ ] **Step 2: 替换 RuleConfigDialog**

同上模式替换。

- [ ] **Step 3: 替换 OptionsApiConfigDialog**

同上模式替换。

- [ ] **Step 4: 替换 RequestConfigDialog**

同上模式替换。

- [ ] **Step 5: 运行全量测试**

Run: `pnpm --filter @schema-form/web test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/components/Editor/EventConfigDialog.vue packages/web/src/components/Editor/RuleConfigDialog.vue packages/web/src/components/Editor/OptionsApiConfigDialog.vue packages/web/src/components/Editor/RequestConfigDialog.vue
git commit -m "refactor: 编辑器弹框统一使用 EnhancedDialog"
```

---

## Task 5: FgDialog 部件使用 EnhancedDialog

**Files:**
- Modify: `packages/web/src/widgets/dialog/FgDialog.vue`
- Modify: `packages/web/src/widgets/dialog/config.ts`

- [ ] **Step 1: FgDialog runtime 模式使用 EnhancedDialog**

将 FgDialog.vue 的 runtime 模式中 `<el-dialog>` 替换为 `<EnhancedDialog>`。

- [ ] **Step 2: config.ts 增加 draggable/fullscreen 属性面板配置**

在 `propertyPanel.props` 中添加：
```typescript
{ key: 'draggable', label: '可拖拽', type: 'switch', default: true },
{ key: 'showFullscreenBtn', label: '显示全屏按钮', type: 'switch', default: true },
```

- [ ] **Step 3: 运行全量测试**

Run: `pnpm --filter @schema-form/web test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/widgets/dialog/FgDialog.vue packages/web/src/widgets/dialog/config.ts
git commit -m "feat: FgDialog 部件使用 EnhancedDialog，支持拖拽和全屏"
```

---

## Task 6: 确认 Vue Devtools 启用

**Files:**
- Check: `packages/web/vite.config.ts`

- [ ] **Step 1: 检查 vite.config.ts**

确认 vue plugin 未显式关闭 devtools。如果 `__VUE_PROD_DEVTOOLS__` 被 define 为 false，移除该配置。

- [ ] **Step 2: 验证**

运行 `pnpm dev:web`，打开浏览器确认 Vue Devtools 可用。

- [ ] **Step 3: Commit (如有变更)**

```bash
git add packages/web/vite.config.ts
git commit -m "chore: 确认 vue devtools 在 dev 模式启用"
```
