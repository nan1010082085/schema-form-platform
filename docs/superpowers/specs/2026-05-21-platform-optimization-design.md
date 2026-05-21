# 平台优化设计文档

日期：2026-05-21
状态：已确认

## 概述

6 条并行工作流，覆盖基础设施、Widget 体系、事件系统、规则系统、数据源、测试框架。

## 全局术语规范

| 术语 | 说明 |
|------|------|
| 画布 | 编辑器中的设计区域 |
| 编辑器（设计器） | 包含画布 + 部件面板 + 属性面板 + 工具栏 + overlay 的完整编辑环境 |
| 编辑器附加层（overlay） | 编辑器上层的交互层，处理选中框、拖拽、缩放手柄 |
| 渲染层 | 实际渲染部件的层（SchemaNode / SchemaRender） |
| 部件（Widget） | 画布上的每个元素 |
| 部件面板（左抽屉） | 左侧可拖拽的部件列表 |
| 属性面板（右抽屉） | 右侧选中部件的属性配置 |
| 画布结构树 | 树形展示画布上所有部件的层级 |
| 工具栏 | 顶部操作栏（撤销/重做、预览、保存等） |
| 渲染器 | 预览/发布模式，不含 overlay，部件可直接交互 |
| 编辑器模式 | 部件不可直接交互（输入框不可输入、按钮不可点击），仅支持拖拽/选中/配置 |
| 预览/发布模式 | 部件可直接交互 |

---

## A. 基础设施

### A1. useLogger — 统一日志组合函数

**文件**：`composables/useLogger.ts`

```typescript
interface Logger {
  info(...args: unknown[]): void
  warn(...args: unknown[]): void
  error(...args: unknown[]): void
  debug(...args: unknown[]): void
  event(...args: unknown[]): void   // 蓝色 #409eff
  rule(...args: unknown[]): void    // 紫色 #9c27b0
  api(...args: unknown[]): void     // 绿色 #67c23a
}

export function useLogger(scope: string): Logger
```

- 每个 subsystem 用不同颜色区分
- 前缀格式：`[scope]` 如 `[EventEngine]` `[useLinkage]`
- dev 环境输出，prod 静默（`import.meta.env.DEV` 守卫）
- 替换所有散落的 `console.log/warn/error`

**替换清单**：
- `engine/eventEngine.ts` → `useLogger('EventEngine')`
- `engine/ruleEngine.ts` → 废弃（见 Section D）
- `composables/useLinkage.ts` → `useLogger('Linkage')`
- `composables/useDynamicOptions.ts` → `useLogger('DynamicOptions')`
- `utils/requestQueue.ts` → `useLogger('RequestQueue')`
- `stores/requestStore.ts` → `useLogger('RequestStore')`
- `utils/request.ts` → `useLogger('Request')`
- `utils/responseNormalizer.ts` → `useLogger('ResponseNormalizer')`

### A2. EnhancedDialog — 可拖拽全屏弹框

**文件**：`components/EnhancedDialog.vue`

```typescript
// 透传所有 el-dialog props，额外增加：
interface EnhancedDialogProps {
  draggable?: boolean        // default true
  showFullscreenBtn?: boolean // default true
}
```

**功能**：
- 标题栏拖拽移动（mousedown + mousemove 计算偏移，限制在视口内）
- 标题栏全屏按钮（切换 fullscreen 状态，全屏时隐藏拖拽）
- 关闭时重置位置
- 通过 `v-bind="$attrs"` 透传所有 el-dialog 原生 props

**应用到**：
- `EventConfigDialog.vue`
- `RuleConfigDialog.vue` → 改名为 `LinkageConfigDialog.vue`
- `OptionsApiConfigDialog.vue`
- `RequestConfigDialog.vue`
- `widgets/dialog/FgDialog.vue`（runtime 模式）
- 所有未来新增的 dialog

### A3. Vue Devtools

**文件**：`vite.config.ts`

```typescript
plugins: [
  vue({
    template: { compilerOptions: { isCustomElement: ... } }
  })
]
```

Vite 的 vue plugin 默认在 dev 模式启用 devtools，确认 `__VUE_PROD_DEVTOOLS__` 未被显式关闭即可。

---

## B. Widget 体系

### B1. Widget description 字段

**类型变更**：`widgets/base/types.ts`

```typescript
interface WidgetConfig {
  name: string
  displayName: string
  description: string      // 新增
  defaultStyle?: Record<string, unknown>
  defaultProps?: Record<string, unknown>
  propertyPanel?: PropertyPanelConfig
  configPanels?: ConfigPanelType[]
}
```

**31 个部件各自填写 description**，示例：

| 部件 | description |
|------|-------------|
| FgInput | 单行文本输入框，支持 placeholder、清空、禁用等配置 |
| FgSelect | 下拉选择器，支持静态选项和动态数据源加载 |
| FgTabs | 页签容器，支持动态增删标签页，组件绑定到指定标签 |
| FgDialog | 弹窗容器，支持编辑模式和微前端模式 |
| FgSearchList | 搜索列表复合组件，包含搜索表单、数据表格、分页 |
| FgEditableTable | 可编辑表格，支持动态增删行、列配置 |
| ... | （其余 25 个部件各自填写） |

### B2. 属性面板 tooltip

**文件**：`components/Editor/PropertyPanel.vue`

在 `widgetType` 旁增加问号图标 + ElTooltip：

```html
<span :class="$style.widgetType">{{ widgetConfig?.displayName }}</span>
<ElTooltip :content="widgetConfig?.config.description" placement="top" :show-after="500">
  <el-icon :class="$style.questionIcon"><QuestionFilled /></el-icon>
</ElTooltip>
```

### B3. 移除部件 ID 显示

**文件**：`components/Editor/PropertyPanel.vue`

删除：`<span :class="$style.widgetId">{{ selectedWidget.id }}</span>`

### B4. 右键上下文菜单

**新文件**：`components/Editor/WidgetContextMenu.vue`

```
菜单项：
├── 部件名称（只读标题，灰色显示）
├── 复制部件
├── 删除部件
├── ─────────（分隔线）
├── 事件配置     ← 仅当 configPanels 包含 'events'
├── 规则配置     ← 仅当 configPanels 包含 'rules'
└── 数据源       ← 仅当 configPanels 包含 'api'
```

**触发位置**：`EditorOverlay.vue` 的 hitArea 层

```html
<div :class="$style.hitArea"
  @contextmenu.prevent="showContextMenu($event, fw.widget)" />
```

**定位**：`position: fixed`，鼠标坐标，点击外部关闭。

**复制逻辑**：深拷贝 widget，生成新 ID，插入到原 widget 旁边（x + 20, y + 20）。

**事件/规则/数据源**：复用 PropertyPanel 中已有的 openXxxDialog 逻辑，需要将 dialog 状态提升到 EditorView 或通过 provide/inject 共享。

---

## C. 事件系统加固

### C1. 统一表达式引擎

**废弃**：`engine/eventEngine.ts` 中的 `evaluateCondition`（裸 `new Function`）

**替换为**：`utils/expression.ts` 的 `evaluateExpression`

安全特性：
- 500 字符长度限制
- 安全黑名单（window/document/eval/Function/import/require/new/循环）
- 100ms 执行超时
- LRU 编译缓存（1000 条）

### C2. Widget 触发集成

**文件**：`components/FormGrid/SchemaNode.vue`

在 SchemaNode 层统一触发事件，各部件不需要各自实现：

| 组件类型 | 触发器 | 触发时机 |
|----------|--------|----------|
| input, textarea | change | model-value 变化 |
| input, textarea | blur | 失去焦点 |
| input, textarea | focus | 获得焦点 |
| select, radio, checkbox | change | 选中值变化 |
| number | change | 数值变化 |
| date, date-time-slot | change | 日期变化 |
| button | click | 点击 |
| dialog | close | 关闭 |

实现方式：SchemaNode 根据 widget.type 判断是否需要绑定事件处理器，在 wrapper 上绑定对应的 DOM 事件，调用 `triggerWidgetEvent(widget, trigger, context)`。

### C3. EventActionType 扩展

```typescript
type EventActionType =
  | 'show' | 'hide'
  | 'open-dialog' | 'close-dialog'
  | 'switch-tab'
  | 'set-value'      // 新增：设置目标部件的值
  | 'submit'         // 新增：触发表单提交
  | 'reset'          // 新增：重置表单
  | 'emit'           // 新增：向外层 emit 自定义事件
```

### C4. 测试

**新文件**：`__tests__/eventEngine.spec.ts`

```
测试用例：
  - evaluateExpression 安全测试（黑名单词、超时、长度限制）
  - triggerWidgetEvent 各 trigger 类型（click, change, blur, focus, close）
  - executeEventAction 各 action 类型（show, hide, open-dialog, close-dialog, switch-tab, set-value, submit, reset, emit）
  - 条件表达式边界（空字符串、语法错误、undefined 变量、返回非布尔值）
  - confirm 弹框交互（有 confirm 配置时弹窗、取消时不执行）
  - 多个 action 顺序执行
  - 无 events 属性的 widget 不报错
```

### C5. 文档

**新文件**：`docs/event-system.md`

内容：触发器类型定义、动作类型定义、条件表达式语法与安全限制、Widget 触发集成说明、配置示例。

---

## D. 规则系统重构

### D1. 废弃 ruleEngine，统一到 linkage

**删除**：`engine/ruleEngine.ts`

**迁移映射**：

| WidgetRule (旧) | SchemaLinkage (新) |
|---|---|
| `watches: [{ type: 'field', source: 'status' }]` | `watchFields: ['status']` |
| `condition: 'status === "inactive"'` | `condition: 'status === "inactive"'` |
| `actions: [{ type: 'hide' }]` | `type: 'visible', thenValue: false` |
| `actions: [{ type: 'visible' }]` | `type: 'visible', thenValue: true` |
| `actions: [{ type: 'disabled' }]` | `type: 'disabled'` |
| `actions: [{ type: 'set-value', config: { field, value } }]` | `type: 'set-value', targetFields: [field], thenValue: value` |
| `actions: [{ type: 'fetch-data', config: { url, ... } }]` | `type: 'options', thenApi: { url, ... }` |
| `actions: [{ type: 'reset' }]` | `type: 'reset-fields'` |
| `actions: [{ type: 'submit' }]` | 删除（无对应，由事件系统处理） |
| `actions: [{ type: 'validate' }]` | 删除（无对应，由表单组件自行处理） |

### D2. computeWidgetRenderState 迁移

**文件**：`components/FormGrid/SchemaNode.vue`

当前调用 `computeWidgetRenderState(widget, formData)` 改为从 `useLinkage` 的 stateMap 读取：

```typescript
const linkage = useLinkage(widgetStore.widgets, formData)
const renderState = computed(() => linkage.getState(widget.id))
// { visible: boolean, disabled: boolean, required: boolean }
```

### D3. Widget 类型更新

**文件**：`widgets/base/types.ts`

```diff
- rules?: WidgetRule[]
+ linkages?: SchemaLinkage[]
```

删除：`WidgetRule`、`WidgetRuleWatch`、`WidgetRuleAction` 类型

**UI**：`RuleConfigDialog.vue` → 重命名为 `LinkageConfigDialog.vue`，内部使用已有的 `LinkageConfig.vue` 组件。

### D4. 测试

**新文件**：`__tests__/linkageIntegration.spec.ts`

```
测试用例：
  - 各 linkage type 的 renderState 计算（visible, disabled, required）
  - 多字段联合 watch
  - 条件表达式安全（复用 expression.ts 的安全特性）
  - 循环依赖检测
  - set-value 联动
  - options 联动（配合数据源）
  - reset-fields 联动
  - 与 useLinkage.spec.ts 互补
```

### D5. 文档

**新文件**：`docs/rule-system.md`

内容：联动类型定义（LinkageType）、条件表达式语法、watchFields 配置、与事件系统的区别和协作、配置示例。

---

## E. 数据源增强

### E1. JSONPath 支持

**文件**：`utils/responseNormalizer.ts`

新增 `extractByPath` 函数：

```typescript
import { JSONPath } from 'jsonpath-plus'

function extractByPath(data: unknown, path: string): unknown {
  if (!path) return data
  const result = JSONPath({ path, json: data, wrap: false })
  return result
}
```

**兼容性**：
- `dataPath` 为空 → 返回原始数据
- `dataPath` 以 `$` 开头 → 走 JSONPath
- `dataPath` 为简单路径（如 `data.list`）→ 走现有 `getNestedValue`

**依赖**：`pnpm add jsonpath-plus`（~5KB gzipped，无依赖）

### E2. 响应解析验证增强

**文件**：`components/Editor/ApiConfig.vue`

"测试连接"按钮增强：
- 显示原始响应结构预览（JSON tree）
- 自动推荐 dataPath（检测常见 wrapper key）
- 显示解析后的 options 预览（前 5 条）
- 错误提示：响应格式不匹配时给出具体建议

### E3. 弹框按钮样式

**文件**：`components/Editor/OptionsApiConfigDialog.vue`

底部按钮改为右对齐，主按钮在最右：

```html
<template #footer>
  <div :class="$style.footer">
    <el-button @click="close">取消</el-button>
    <el-button type="primary" plain @click="testConnection">测试连接</el-button>
    <el-button type="primary" @click="save">保存</el-button>
  </div>
</template>
```

### E4. 测试

**新文件**：`__tests__/datasource.spec.ts`

```
测试用例：
  - responseNormalizer 各种响应格式
    - bare array: [1, 2, 3]
    - wrapper keys: { data: [...] }, { list: [...] }, { rows: [...] }
    - nested: { result: { items: [...] } }
    - empty: { data: [] }
    - error response: { code: 500, message: '...' }
  - JSONPath 提取
    - $.data.list[*].name
    - $.items[0].id
    - 简单路径兼容
  - useDynamicOptions
    - dictCode 模式
    - URL 模式（GET/POST）
    - 缓存 TTL 过期
    - 模板参数插值 ${fieldName}
    - 树形数据 childrenKey
    - 响应为空/错误时降级
  - optionsCache
    - TTL 过期
    - 手动清除
```

### E5. 文档

**新文件**：`docs/datasource-system.md`

内容：SchemaApiConfig 配置说明、JSONPath 语法参考、响应格式要求、缓存策略、dictCode 模式、使用示例。

---

## F. Widget 测试框架

### F1. 测试 Harness

**新文件**：`__tests__/widgetTestHarness.ts`

```typescript
export function createWidgetTestHarness(type: SchemaType) {
  return {
    // 维度 1：拖放测试
    testDragToCanvas(): void       // 创建部件 → 验证 store 中存在
    testDragToContainer(): void    // 拖入容器 → children 包含该部件
    testDragOutFromContainer(): void // 从容器拖出 → 回到 root

    // 维度 2：属性生效测试
    testPropertyBinding(propKey: string, value: unknown, assertFn: (el) => void): void

    // 维度 3：事件触发测试（仅当 configPanels 包含 'events'）
    testEventTrigger(trigger: string, expectedActions: unknown[]): void

    // 维度 4：规则联动测试（仅当 configPanels 包含 'rules'）
    testLinkage(linkage: SchemaLinkage, formData: unknown, expected: unknown): void

    // 维度 5：数据源测试（仅当 configPanels 包含 'api'）
    testDatasource(apiConfig: SchemaApiConfig, mockResponse: unknown, expected: unknown): void
  }
}
```

### F2. 示例部件完整测试

以 `FgInput` 为示例，覆盖全部 5 个维度：

**文件**：`widgets/input/__tests__/FgInput.spec.ts`

```
测试用例：
  维度 1 - 拖放：
    ✓ 拖放到画布 → store 中存在且属性正确
    ✓ 拖入 card 容器 → children 包含该部件
    ✓ 从容器拖出 → 回到 root widgets

  维度 2 - 属性：
    ✓ 修改 placeholder → el-input placeholder 更新
    ✓ 修改 disabled → input 禁用
    ✓ 修改 clearable → 显示清除按钮
    ✓ 修改 label → 标签文本更新

  维度 3 - 事件：
    ✓ input change → triggerWidgetEvent('change') 被调用
    ✓ input blur → triggerWidgetEvent('blur') 被调用
    ✓ input focus → triggerWidgetEvent('focus') 被调用

  维度 4 - 规则：
    ✓ linkage visible=false → 组件隐藏
    ✓ linkage disabled=true → 组件禁用
    ✓ linkage required=true → 必填标记

  维度 5 - 数据源：
    ✓ 配置 URL → useDynamicOptions 加载选项
    ✓ dictCode 模式 → 字典查询
```

### F3. 其余部件模板

每个部件目录下创建 `__tests__/FgXxx.spec.ts`，使用 harness 生成基础测试。容器类部件额外测试子组件渲染。复合类部件（search-list、editable-table）额外测试内部组件交互。

---

## 执行顺序

```
A (基础设施)  ─────┬──→ C (事件系统)
                   ├──→ D (规则系统)
                   └──→ E (数据源)

B (Widget 体系) ───┴──→ F (测试框架)
```

A 和 B 无依赖，可立即并行启动。C/D/E 依赖 A 的 useLogger。F 依赖 B 的 description 字段。
