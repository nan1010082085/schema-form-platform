# Plan B: Widget 体系 — description + tooltip + 右键菜单 + 移除 ID

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为所有部件添加 description 元数据，属性面板展示 description tooltip，实现部件右键上下文菜单，移除属性面板中的部件 ID 显示。

**Architecture:** WidgetConfig 接口扩展 description 字段，31 个 config.ts 各自填写。右键菜单作为独立组件，通过 EditorOverlay 的 contextmenu 事件触发，复用 PropertyPanel 已有的 dialog 打开逻辑。

**Tech Stack:** Vue 3 Composition API, Element Plus (ElTooltip, ElPopover), CSS Modules

---

## 文件结构

| 操作 | 文件 | 职责 |
|------|------|------|
| Modify | `packages/web/src/widgets/base/types.ts` | WidgetConfig 增加 description |
| Modify | 31 个 `widgets/*/config.ts` | 各自填写 description |
| Modify | `packages/web/src/components/Editor/PropertyPanel.vue` | tooltip + 移除 ID |
| Create | `packages/web/src/components/Editor/WidgetContextMenu.vue` | 右键菜单组件 |
| Modify | `packages/web/src/components/Editor/EditorOverlay.vue` | 绑定 contextmenu |
| Modify | `packages/web/src/views/EditorView.vue` | 提供 dialog 状态 |
| Test | `packages/web/src/__tests__/widgets.spec.ts` | 验证 description 字段 |

---

## Task 1: WidgetConfig 增加 description 字段

**Files:**
- Modify: `packages/web/src/widgets/base/types.ts`
- Modify: `packages/web/src/__tests__/widgets.spec.ts`

- [ ] **Step 1: 修改 WidgetConfig 类型**

在 `widgets/base/types.ts` 的 `WidgetConfig` 接口中添加：
```typescript
interface WidgetConfig {
  name: string
  displayName: string
  description: string      // 新增：部件描述
  defaultStyle?: Record<string, unknown>
  defaultProps?: Record<string, unknown>
  propertyPanel?: PropertyPanelConfig
  configPanels?: ConfigPanelType[]
}
```

- [ ] **Step 2: 更新 widgets.spec.ts 的 config 验证测试**

在 `Widget Config Validation` 的循环中添加：
```typescript
it('has description (string)', () => {
  expect(typeof config.description).toBe('string')
  expect((config.description as string).length).toBeGreaterThan(0)
})
```

- [ ] **Step 3: 运行测试确认失败**

Run: `pnpm --filter @schema-form/web test -- src/__tests__/widgets.spec.ts`
Expected: FAIL — description 不存在

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/widgets/base/types.ts packages/web/src/__tests__/widgets.spec.ts
git commit -m "feat: WidgetConfig 增加 description 字段类型定义"
```

---

## Task 2: 31 个部件填写 description

**Files:**
- Modify: 所有 31 个 `packages/web/src/widgets/*/config.ts`

- [ ] **Step 1: 容器类部件 (5个)**

```typescript
// form/config.ts
description: '表单容器，包裹 el-form，支持表单提交、校验和数据收集',

// card/config.ts
description: '卡片容器，提供标题和阴影包裹，用于内容分组展示',

// row-col/config.ts
description: '行列容器，使用 el-row + el-col 布局，支持 1-4 列选择',

// tabs/config.ts
description: '页签容器，支持动态增删标签页，组件绑定到指定标签',

// dialog/config.ts
description: '弹窗容器，支持编辑模式和微前端模式，可配置标题、宽度、按钮',
```

- [ ] **Step 2: 表单类部件 (12个)**

```typescript
// input/config.ts
description: '单行文本输入框，支持 placeholder、清空、禁用等配置',

// select/config.ts
description: '下拉选择器，支持静态选项和动态数据源加载',

// number/config.ts
description: '数字输入框，支持步进、最小最大值限制',

// radio/config.ts
description: '单选框组，支持静态选项和动态数据源',

// checkbox/config.ts
description: '多选框组，支持静态选项和动态数据源',

// date/config.ts
description: '日期选择器，支持日期格式配置',

// textarea/config.ts
description: '多行文本输入框，支持行数配置',

// richtext/config.ts
description: '富文本编辑器，支持格式化内容输入',

// upload/config.ts
description: '文件上传组件，支持文件类型和大小限制',

// date-time-slot/config.ts
description: '日期时间区间选择器，支持开始/结束时间配置',

// person-select/config.ts
description: '人员选择器，支持单选/多选模式',

// dept-select/config.ts
description: '部门选择器，支持单选/多选模式',
```

- [ ] **Step 3: 基础类部件 (10个)**

```typescript
// button-list/config.ts
description: '按钮列表，支持提交、重置等操作按钮组合',

// title/config.ts
description: '标题组件，用于页面或区块标题展示',

// divider/config.ts
description: '分割线组件，用于内容区域分隔',

// spacer/config.ts
description: '间隔组件，用于控制元素间距',

// toolbar-buttons/config.ts
description: '工具栏按钮组，用于操作栏按钮排列',

// button/config.ts
description: '按钮组件，支持事件配置和样式自定义',

// banner/config.ts
description: '横幅提示组件，支持 info/success/warning/error 类型',

// tree-layout/config.ts
description: '树形布局容器，支持树形结构展示和搜索',

// file-list/config.ts
description: '文件列表组件，支持文件预览和删除',

// transfer/config.ts
description: '穿梭框组件，支持左右列表数据穿梭',
```

- [ ] **Step 4: 复合/表格类部件 (4个)**

```typescript
// table/config.ts
description: '数据表格组件，支持列配置和操作按钮',

// search-list/config.ts
description: '搜索列表复合组件，包含搜索表单、数据表格、分页',

// editable-table/config.ts
description: '可编辑表格，支持动态增删行、列配置',

// detail-form/config.ts
description: '详情表单组件，用于只读数据展示',
```

- [ ] **Step 5: 运行测试确认通过**

Run: `pnpm --filter @schema-form/web test -- src/__tests__/widgets.spec.ts`
Expected: PASS — description 验证通过

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/widgets/*/config.ts
git commit -m "feat: 31 个部件 config 补充 description 描述"
```

---

## Task 3: 属性面板 — tooltip + 移除 ID

**Files:**
- Modify: `packages/web/src/components/Editor/PropertyPanel.vue`

- [ ] **Step 1: 添加 tooltip**

在 `widgetType` 旁增加问号图标和 ElTooltip：

```html
<template>
  <div :class="$style.widgetInfo">
    <div :class="$style.widgetNameRow">
      <span :class="$style.widgetType">{{ widgetConfig?.displayName }}</span>
      <ElTooltip
        v-if="widgetConfig?.config.description"
        :content="widgetConfig.config.description"
        placement="top"
        :show-after="500"
      >
        <el-icon :class="$style.questionIcon"><QuestionFilled /></el-icon>
      </ElTooltip>
    </div>
  </div>
</template>
```

需要在 script 中导入 `QuestionFilled` 图标和 `ElTooltip`。

- [ ] **Step 2: 移除 ID 显示**

删除：
```html
<span :class="$style.widgetId">{{ selectedWidget.id }}</span>
```

删除对应的 `.widgetId` CSS。

- [ ] **Step 3: 添加 CSS**

```css
.widgetNameRow {
  display: flex;
  align-items: center;
  gap: 4px;
}

.questionIcon {
  color: var(--el-text-color-placeholder);
  cursor: help;
  font-size: 14px;
}

.questionIcon:hover {
  color: var(--el-color-primary);
}
```

- [ ] **Step 4: 运行测试**

Run: `pnpm --filter @schema-form/web test`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/Editor/PropertyPanel.vue
git commit -m "feat: 属性面板增加 description tooltip，移除部件 ID 显示"
```

---

## Task 4: 右键上下文菜单组件

**Files:**
- Create: `packages/web/src/components/Editor/WidgetContextMenu.vue`

- [ ] **Step 1: 实现 WidgetContextMenu**

```vue
<!-- packages/web/src/components/Editor/WidgetContextMenu.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { getWidget } from '@/widgets/registry'
import type { Widget, ConfigPanelType } from '@/widgets/base/types'

const props = defineProps<{
  visible: boolean
  x: number
  y: number
  widget: Widget | null
}>()

const emit = defineEmits<{
  close: []
  copy: [widget: Widget]
  delete: [widget: Widget]
  openEvent: [widget: Widget]
  openRule: [widget: Widget]
  openApi: [widget: Widget]
}>()

const widgetConfig = computed(() => {
  if (!props.widget) return null
  const reg = getWidget(props.widget.type)
  return reg?.config ?? null
})

const configPanels = computed<ConfigPanelType[]>(() => {
  return widgetConfig.value?.configPanels ?? []
})

function handleAction(action: string) {
  if (!props.widget) return
  switch (action) {
    case 'copy': emit('copy', props.widget); break
    case 'delete': emit('delete', props.widget); break
    case 'event': emit('openEvent', props.widget); break
    case 'rule': emit('openRule', props.widget); break
    case 'api': emit('openApi', props.widget); break
  }
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      :class="$style.backdrop"
      @click="emit('close')"
      @contextmenu.prevent="emit('close')"
    />
    <div
      v-if="visible && widget"
      :class="$style.menu"
      :style="{ left: `${x}px`, top: `${y}px` }"
    >
      <div :class="$style.header">{{ widgetConfig?.displayName ?? widget.name }}</div>
      <div :class="$style.item" @click="handleAction('copy')">复制部件</div>
      <div :class="$style.item" @click="handleAction('delete')">删除部件</div>
      <template v-if="configPanels.length">
        <div :class="$style.divider" />
        <div v-if="configPanels.includes('events')" :class="$style.item" @click="handleAction('event')">事件配置</div>
        <div v-if="configPanels.includes('rules')" :class="$style.item" @click="handleAction('rule')">规则配置</div>
        <div v-if="configPanels.includes('api')" :class="$style.item" @click="handleAction('api')">数据源</div>
      </template>
    </div>
  </Teleport>
</template>

<style module>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 9998;
}

.menu {
  position: fixed;
  z-index: 9999;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 4px 0;
  min-width: 140px;
}

.header {
  padding: 6px 16px;
  font-size: 12px;
  color: #909399;
  border-bottom: 1px solid #f0f2f5;
  margin-bottom: 4px;
}

.item {
  padding: 6px 16px;
  font-size: 13px;
  color: #303133;
  cursor: pointer;
  white-space: nowrap;
}

.item:hover {
  background: #f5f7fa;
  color: #409eff;
}

.divider {
  height: 1px;
  background: #f0f2f5;
  margin: 4px 0;
}
</style>
```

- [ ] **Step 2: 运行类型检查**

Run: `pnpm --filter @schema-form/web exec vue-tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/Editor/WidgetContextMenu.vue
git commit -m "feat: WidgetContextMenu 右键上下文菜单组件"
```

---

## Task 5: EditorOverlay 集成右键菜单

**Files:**
- Modify: `packages/web/src/components/Editor/EditorOverlay.vue`
- Modify: `packages/web/src/views/EditorView.vue`

- [ ] **Step 1: EditorOverlay 添加 contextmenu 事件**

在 hitArea 的 div 上添加：
```html
@contextmenu.prevent="showContextMenu($event, fw.widget)"
```

添加状态和方法：
```typescript
const contextMenu = ref({ visible: false, x: 0, y: 0, widget: null as Widget | null })

function showContextMenu(e: MouseEvent, widget: Widget) {
  contextMenu.value = { visible: true, x: e.clientX, y: e.clientY, widget }
}
```

- [ ] **Step 2: 在模板中渲染 WidgetContextMenu**

```html
<WidgetContextMenu
  :visible="contextMenu.visible"
  :x="contextMenu.x"
  :y="contextMenu.y"
  :widget="contextMenu.widget"
  @close="contextMenu.visible = false"
  @copy="handleCopyWidget"
  @delete="handleDeleteWidget"
  @open-event="handleOpenEvent"
  @open-rule="handleOpenRule"
  @open-api="handleOpenApi"
/>
```

- [ ] **Step 3: 实现 copy/delete 逻辑**

```typescript
function handleCopyWidget(widget: Widget) {
  const copy = JSON.parse(JSON.stringify(widget))
  copy.id = generateId()
  copy.position.x += 20
  copy.position.y += 20
  widgetStore.addWidget(copy)
}

function handleDeleteWidget(widget: Widget) {
  widgetStore.removeWidget(widget.id)
  editorStore.selectWidget(null)
}
```

- [ ] **Step 4: 实现 openEvent/openRule/openApi**

这些需要打开 PropertyPanel 中的 dialog。通过 emit 向 EditorView 传递，或通过 provide/inject 共享 dialog 状态。

在 EditorView.vue 中管理 dialog 状态：
```typescript
const eventDialogTarget = ref<Widget | null>(null)
const ruleDialogTarget = ref<Widget | null>(null)
const apiDialogTarget = ref<Widget | null>(null)
```

- [ ] **Step 5: 运行全量测试**

Run: `pnpm --filter @schema-form/web test`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/components/Editor/EditorOverlay.vue packages/web/src/views/EditorView.vue
git commit -m "feat: EditorOverlay 集成右键上下文菜单，支持复制/删除/配置"
```
