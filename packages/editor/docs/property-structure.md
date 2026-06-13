# 属性结构

## 属性面板架构

属性面板是一套统一的 form 体系，通过 provide/inject 实现动态渲染。

### 核心设计

1. **统一 form**：整个属性面板是一个 form，通过 provide 传递表单数据
2. **动态组件**：每种输入样式是一个独立动态组件，根据属性类型 resolve
3. **无分组区分**：不做"公共/特有"的视觉区分，所有属性统一渲染
4. **每行一个属性**：label + value 水平排列，一组输入占一行

### 渲染流程

```
widgetConfig.propertyPanel
  → 遍历属性列表
    → 根据属性类型 resolve 动态组件（DynamicComponent）
      → provide(formValues) → inject 到每个输入组件
        → 用户修改 → emit → useWidgetStore.updateWidget()
```

### 动态组件类型

属性面板根据 `type` 字段 dispatch 不同的输入组件：

| type 值 | 渲染组件 | 适用场景 |
|---|---|---|
| `text` | `el-input` | 单行文本（field、label、placeholder） |
| `number` | `el-input-number` | 数字输入（width、height、zIndex） |
| `color` | `el-color-picker` | 颜色选择（backgroundColor、color） |
| `select` | `el-select` | 下拉选择（type 枚举、textAlign） |
| `switch` | `el-switch` | 布尔开关（hidden、disabled、clearable） |
| `options` | `OptionsEditor` | 选项列表编辑（DictItem[]），独立行组件 |
| `rules` | PropertyField 内联 | 校验规则编辑 |
| `columns` | `TableColumnsEditor` | 表格列配置 |
| `array-editor` | `GenericArrayEditor` | 通用数组 CRUD（tabs、button-list 等） |

### configPanels 声明式配置入口

属性面板顶部的配置入口按钮（事件、规则、数据源）由 Widget config 的 `configPanels` 数组声明驱动，使用 `el-scrollbar` 包裹实现横向超出滚动：

```typescript
// Widget config.ts
configPanels: ['events', 'rules', 'api']  // 按需声明
```

PropertyPanel 根据 `configPanels` 动态渲染对应的按钮和弹框：

| 值 | 按钮文本 | 弹框组件 |
|---|---|---|
| `'events'` | 事件配置 | `EventConfigDialog` |
| `'rules'` | 规则配置 | `RuleConfigDialog` |
| `'api'` | 数据源 | `OptionsApiConfigDialog` |

不需要配置入口的组件（divider、spacer、title 等容器组件）省略 `configPanels` 即可。

### GenericArrayEditor

通用数组 CRUD 编辑器，根据 `fields` 声明动态渲染每个数组项的字段。支持 text / select / number / switch 四种字段类型。

**使用方式**：在 Widget config 的 `propertyPanel.props` 中声明 `type: 'array-editor'`：

```typescript
{
  key: 'tabs',
  label: '页签',
  type: 'array-editor',
  fields: [
    { key: 'key', label: '标识', type: 'text', placeholder: 'tab1' },
    { key: 'label', label: '标签', type: 'text', placeholder: '标签名' },
  ],
}
```

**ArrayFieldSchema 类型**：

```typescript
interface ArrayFieldSchema {
  key: string
  label: string
  type: 'text' | 'select' | 'number' | 'switch'
  options?: { label: string; value: string | number | boolean }[]
  default?: unknown
  placeholder?: string
}
```

### 布局

```
┌──────────────────────────────────┐
│ 属性配置                         │
├──────────────────────────────────┤
│ 输入框                field_abc  │
├──────────────────────────────────┤
│ [事件配置] [规则配置] [数据源]    │  ← 顶部横向按钮（el-scrollbar）
├──────────────────────────────────┤
│ ▼ 基础属性 (3)                   │
│   字段名: [________________]     │
│   标签:   [________________]     │
│   默认值: [________________]     │
│ ▼ 位置 (5)                       │
│   X: [0]  Y: [0]                │
│   宽: [240]  高: [40]           │
│ ▼ 样式 (10)                      │
│   宽度: [100%]                   │
│   高度: [40px]                   │
│ ▼ 组件属性 (2)                   │
│   占位文字: [请输入]              │
│   选项:                          │  ← OptionsEditor 独立行组件
│     ├ label: [___] value: [___]  │
│     └ label: [___] value: [___]  │
└──────────────────────────────────┘
```

## 属性面板可配置项

以下为所有可配置的属性项，各 Widget 通过 `config.propertyPanel` 声明支持哪些：

### 基础属性

| 属性 | 类型 | 动态组件 | 说明 |
|---|---|---|---|
| `type` | `SchemaType` | 只读 | 组件类型 |
| `id` | `string` | 只读 | 唯一标识 |
| `field` | `string` | InputText | 表单字段名 |
| `label` | `string` | InputText | 组件标签 |
| `defaultValue` | `FormFieldValue` | InputText | 默认值 |
| `hidden` | `boolean` | Switch | 设计时隐藏 |

### 位置属性（position）

| 属性 | 类型 | 动态组件 | 说明 |
|---|---|---|---|
| `position.x` | `number` | InputNumber | 画布 x 坐标 |
| `position.y` | `number` | InputNumber | 画布 y 坐标 |
| `position.w` | `number` | InputNumber | 组件宽度 |
| `position.h` | `number` | InputNumber | 组件高度 |
| `position.zIndex` | `number` | InputNumber | 层级 |

### 样式属性（style）

#### 公共样式（所有组件共享，base 定义）

| 属性 | 类型 | 动态组件 | 说明 |
|---|---|---|---|
| `style.width` | `string` | InputText | CSS 宽度 |
| `style.height` | `string` | InputText | CSS 高度 |
| `style.margin` | `string` | InputText | 外边距 |
| `style.padding` | `string` | InputText | 内边距 |
| `style.backgroundColor` | `string` | ColorPicker | 背景色 |
| `style.border` | `string` | InputText | 边框 |
| `style.borderRadius` | `string` | InputText | 圆角 |
| `style.fontSize` | `string` | InputText | 字号 |
| `style.fontWeight` | `string` | Select | 字重 |
| `style.color` | `string` | ColorPicker | 字体颜色 |

#### 组件特有样式（各组件 config.ts 中声明）

| 属性 | 类型 | 动态组件 | 说明 |
|---|---|---|---|
| `style.borderTop` | `string` | InputText | 上边框 |
| `style.borderRight` | `string` | InputText | 右边框 |
| `style.borderBottom` | `string` | InputText | 下边框 |
| `style.borderLeft` | `string` | InputText | 左边框 |
| `style.boxShadow` | `string` | InputText | 阴影 |
| `style.opacity` | `number` | InputNumber | 透明度 |
| `style.textAlign` | `'left' \| 'center' \| 'right'` | Select | 文字对齐 |
| `style.customClass` | `string` | InputText | 自定义 CSS 类名 |

### 组件属性（props）

组件特有属性，不同组件类型有不同的 props 配置。通用属性：

| 属性 | 类型 | 动态组件 | 说明 |
|---|---|---|---|
| `props.placeholder` | `string` | InputText | 占位文本 |
| `props.disabled` | `boolean` | Switch | 禁用 |
| `props.readonly` | `boolean` | Switch | 只读 |
| `props.clearable` | `boolean` | Switch | 可清空 |
| `props.multiple` | `boolean` | Switch | 多选 |

### 选项属性（options）

适用于 select / radio / checkbox 等组件：

| 属性 | 类型 | 动态组件 | 说明 |
|---|---|---|---|
| `options` | `DictItem[]` | ArrayEditor | 静态选项列表 |
| `api` | `SchemaApiConfig` | ObjectEditor | 动态选项 API 配置 |

### 校验属性（validationRules）

| 属性 | 类型 | 动态组件 | 说明 |
|---|---|---|---|
| `validationRules` | `SchemaRules` | ArrayEditor | 表单校验规则 |

### 事件配置

通过弹框配置，属性面板中显示"配置事件"按钮：

```
┌──────────────────────────────────┐
│ 事件:  [已配置 2 个事件]  [编辑]  │
└──────────────────────────────────┘
```

点击打开事件配置弹框。

### 规则配置

通过弹框配置，属性面板中显示"配置规则"按钮：

```
┌──────────────────────────────────┐
│ 规则:  [已配置 1 条规则]  [编辑]  │
└──────────────────────────────────┘
```

点击打开规则配置弹框。

## 类型定义

核心类型定义位于 `widgets/base/types.ts`，所有 Widget 共享：

```typescript
/** 配置面板类型 */
type ConfigPanelType = 'events' | 'rules' | 'api'

/** 属性面板声明中的基础属性快捷键 */
type BasicPropKey = 'field' | 'label' | 'defaultValue' | 'hidden' | 'options' | 'validationRules'

/** 属性面板声明中的属性项 */
type PropertyPanelItem =
  | BasicPropKey
  | {
      key: string
      label: string
      type: string
      default?: unknown
      desc?: string
      placeholder?: string
      options?: { label: string; value: string | number | boolean }[]
      fields?: ArrayFieldSchema[]
      visibleOn?: string
    }

/** 属性面板声明 */
interface PropertyPanelConfig {
  basic?: PropertyPanelItem[]
  style?: string[]
  props?: PropertyPanelItem[]
}

/** Widget 完整配置 */
interface WidgetConfig {
  name: string
  displayName: string
  defaultStyle?: Record<string, unknown>
  defaultProps?: Record<string, unknown>
  propertyPanel?: PropertyPanelConfig
  configPanels?: ConfigPanelType[]
}

/** 通用数组编辑器字段声明 */
interface ArrayFieldSchema {
  key: string
  label: string
  type: 'text' | 'select' | 'number' | 'switch'
  options?: { label: string; value: string | number | boolean }[]
  default?: unknown
  placeholder?: string
}

/** 动态数据请求配置 */
interface SchemaApiConfig {
  url: string
  method?: 'get' | 'post'
  params?: Record<string, unknown>
  dataPath?: string
  labelKey?: string
  valueKey?: string
  childrenKey?: string
  ttl?: number
  immediate?: boolean
  dictCode?: string
}

/** 字典项 */
interface DictItem {
  label: string
  value: string | number | boolean
  id?: string | number
  children?: DictItem[]
}

/** 校验规则 */
type SchemaRules = FormItemRule[]

/** 表单字段值类型 */
type FormFieldValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | string[]
  | number[]
  | Record<string, unknown>
  | Record<string, unknown>[]
```

## 样式应用方式

每个组件通过 inject 接收自身 style 配置，在组件内部用 CSS Modules + JS-in-CSS 应用：

```
inject(widgetStyleKey)
  → 组件内部 computed 生成样式对象
    → CSS Modules 绑定到内部元素
```

样式同时作用于：
- 真实组件：组件内部通过 CSS Modules 应用
- 编辑器附加层：EditorOverlay 同步应用尺寸/位置
