# 事件系统文档

事件系统是 schema 驱动的交互层。Widget 通过 `events` 数组声明事件绑定，SchemaNode 在 DOM 层拦截原生事件并调用 eventEngine 执行动作链。

## 1. 触发器类型（Trigger）

SchemaNode 根据组件类型自动绑定对应的 DOM 事件：

| 触发器 | 绑定的 DOM 事件 | 适用组件类型 |
|---|---|---|
| `click` | `@click` | button |
| `change` | `@change` | input, select, number, radio, checkbox, date, textarea, richtext, upload, date-time-slot, person-select, dept-select |
| `focus` | `@focus` | input, select, number, textarea, richtext |
| `blur` | `@blur` | input, select, number, textarea, richtext |
| `close` | 由 dialog 等组件内部触发 | dialog |

容器组件（form, card, row-col, tabs, dialog）不绑定表单事件，仅交互式容器（tabs, dialog）有选中逻辑。

## 2. 动作类型（Action）

每个 `WidgetEvent` 包含一个 `actions` 数组，依次顺序执行。

### show / hide

控制目标组件的 `hidden` 属性，影响可见性。

```json
{
  "trigger": "click",
  "actions": [
    { "type": "show", "target": "widget-abc12" },
    { "type": "hide", "target": "widget-def34" }
  ]
}
```

### open-dialog / close-dialog

打开或关闭弹窗编辑器。

```json
{
  "trigger": "click",
  "actions": [
    { "type": "open-dialog", "target": "dialog-001" }
  ]
}
```

### switch-tab

切换 Tabs 容器的激活标签页。`value` 为 tab key。

```json
{
  "trigger": "click",
  "actions": [
    { "type": "switch-tab", "target": "tabs-container-id", "value": "tab2" }
  ]
}
```

### set-value

设置目标组件的 `defaultValue`。

```json
{
  "trigger": "change",
  "actions": [
    { "type": "set-value", "target": "input-xyz", "value": "默认文本" }
  ]
}
```

### submit

收集当前表单容器下所有字段值并触发提交。

```json
{
  "trigger": "click",
  "actions": [
    { "type": "submit", "target": "" }
  ]
}
```

### reset

将表单内所有带 `field` 的子组件恢复为各自的 `defaultValue`。

```json
{
  "trigger": "click",
  "actions": [
    { "type": "reset", "target": "" }
  ]
}
```

### emit

记录自定义事件（调试用，当前仅日志输出）。

```json
{
  "trigger": "click",
  "actions": [
    { "type": "emit", "target": "", "value": "myCustomEvent" }
  ]
}
```

## 3. 条件表达式语法

事件可配置 `condition` 字段，仅当表达式求值为 true 时执行动作链。

### 支持的语法

| 语法 | 示例 |
|---|---|
| 比较运算符 | `===`, `!==`, `>`, `<`, `>=`, `<=` |
| 逻辑运算符 | `&&`, `||`, `!` |
| 三元表达式 | `condition ? trueVal : falseVal` |
| 空值合并 | `value ?? default` |
| 字段引用 | `${fieldName}` — 自动映射到 `formData['fieldName']` |

### 示例

```json
{
  "trigger": "change",
  "condition": "${status} === 'approved'",
  "actions": [
    { "type": "show", "target": "approval-section" }
  ]
}
```

### 安全限制

表达式引擎（`utils/expression.ts`）实施以下安全措施：

- **黑名单拦截**：禁止访问 `window`, `document`, `globalThis`, `self`, `top`, `parent`, `frames`
- **模块导入拦截**：禁止 `import()`, `require()`
- **代码注入拦截**：禁止 `eval()`, `Function()`, `setTimeout()`, `setInterval()`, `new` 关键字
- **循环拦截**：禁止 `while`, `for`, `do` 语句
- **长度限制**：表达式不超过 500 字符
- **执行超时**：单次执行不超过 100ms
- **编译缓存**：LRU 缓存，最多 1000 条

违反安全规则的表达式会被静默阻断（求值返回 false），并在控制台输出警告。

## 4. Widget 触发器集成

SchemaNode 统一处理事件绑定，Widget 组件自身无需调用事件引擎。

### 事件分发流程

```
DOM 事件 (click/change/focus/blur)
  → SchemaNode.handleWidgetEvent(trigger, value)
    → triggerWidgetEvent(widget, trigger, context)
      → 遍历 widget.events，匹配 trigger
        → 条件检查 (condition)
        → 确认提示 (confirm)
        → 执行动作链 (actions)
```

### 执行上下文

`triggerWidgetEvent` 接收的 context 包含：

- `widgetStore` — Widget Store 实例，用于操作组件状态
- `formData` — 当前表单所有字段值（响应式计算）
- `value` — DOM 事件传递的值（如 change 事件的新值）

### 组件类型与事件映射

SchemaNode 内部维护两个集合控制事件绑定：

- `FORM_COMPONENT_TYPES` — 绑定 `change` 事件的表单组件
- `INPUT_COMPONENT_TYPES` — 绑定 `focus` / `blur` 事件的输入组件

只有 button 类型单独绑定 `click` 事件。容器组件不直接参与表单事件。

## 5. Widget 配置示例

### 按钮点击显示/隐藏区域

```json
{
  "id": "btn-toggle",
  "name": "FgButton",
  "type": "button",
  "label": "展开详情",
  "props": { "text": "展开详情" },
  "position": { "x": 0, "y": 0, "w": 120, "h": 40 },
  "events": [
    {
      "trigger": "click",
      "actions": [
        { "type": "show", "target": "detail-section" },
        { "type": "hide", "target": "btn-toggle" }
      ]
    }
  ]
}
```

### 条件触发 + 确认提示

```json
{
  "id": "btn-submit",
  "name": "FgButton",
  "type": "button",
  "label": "提交",
  "props": { "text": "提交" },
  "position": { "x": 0, "y": 0, "w": 100, "h": 40 },
  "events": [
    {
      "trigger": "click",
      "condition": "${agree} === true",
      "confirm": "确认提交？",
      "actions": [
        { "type": "submit", "target": "" }
      ]
    }
  ]
}
```

### 联动：字段变化后切换 Tab

```json
{
  "id": "select-type",
  "name": "FgSelect",
  "type": "select",
  "field": "type",
  "label": "类型",
  "position": { "x": 0, "y": 0, "w": 200, "h": 40 },
  "events": [
    {
      "trigger": "change",
      "actions": [
        { "type": "switch-tab", "target": "tab-container", "value": "typeA" }
      ]
    }
  ]
}
```

### 输入框失焦后设置默认值

```json
{
  "id": "input-name",
  "name": "FgInput",
  "type": "input",
  "field": "name",
  "label": "名称",
  "position": { "x": 0, "y": 0, "w": 200, "h": 40 },
  "events": [
    {
      "trigger": "blur",
      "condition": "${name} === '' || ${name} === undefined",
      "actions": [
        { "type": "set-value", "target": "input-name", "value": "未填写" }
      ]
    }
  ]
}
```

### 弹窗打开与关闭

```json
{
  "id": "btn-edit",
  "name": "FgButton",
  "type": "button",
  "label": "编辑",
  "props": { "text": "编辑" },
  "position": { "x": 0, "y": 0, "w": 80, "h": 40 },
  "events": [
    {
      "trigger": "click",
      "actions": [
        { "type": "open-dialog", "target": "dialog-edit" }
      ]
    }
  ]
}
```
