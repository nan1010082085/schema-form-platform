# 组件架构（Widget 体系）

## 概念定义

- **Board**：画布，整个表单实例的顶层容器
- **Widget**：部件（组件），画布上的每个元素
- 每个 Widget 是一个独立文件夹，包含实现、配置、样式、schema 初始化

## Board（画布）数据结构

Board 是整个表单实例的顶层数据结构，包含画布配置、顶层数据、Widget 集合：

```typescript
interface Board {
  // === 实例基本信息 ===
  id: string                         // 表单实例 ID
  name: string                       // 表单名称
  type: 'form' | 'search_list'       // 表单类型
  status: 'draft' | 'published'      // 状态

  // === 画布配置 ===
  canvas: {
    width: number                    // 画布宽度，默认 1920
    height: number                   // 画布高度，默认 1080
    backgroundColor: string          // 背景色
    padding: string                  // 内边距
    zoom: number                     // 缩放比例，100-150
  }

  // === 顶层变量集合 ===
  variables: BoardVariable[]         // 全局变量，供 Widget 引用

  // === 顶层事件集合 ===
  events: BoardEvent[]               // 全局事件（如页面加载、提交等）

  // === Widget 集合 ===
  widgets: Widget[]                  // 所有部件（组件）
}

/** 顶层变量 */
interface BoardVariable {
  name: string                       // 变量名
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  defaultValue?: unknown             // 默认值
  description?: string               // 描述
}

/** 顶层事件 */
interface BoardEvent {
  trigger: 'mount' | 'submit' | 'reset' | 'custom'
  name?: string                      // 自定义事件名
  actions: SchemaEventAction[]       // 动作列表
}
```

## Widget（部件）数据结构

每个 Widget 是画布上的一个独立组件实例：

```typescript
interface Widget {
  // === 基础标识 ===
  id: string                         // 唯一 ID（组件Key + 5位随机Hash）
  name: string                       // 组件名称（如 'FgInput'）
  type: SchemaType                   // 组件类型

  // === 属性配置 ===
  field?: string                     // 表单字段名
  label?: string                     // 组件标签
  props?: Record<string, unknown>    // 组件特有属性
  options?: DictItem[]               // 选项列表
  defaultValue?: FormFieldValue      // 默认值

  // === 位置配置 ===
  position: {
    x: number
    y: number
    w: number
    h: number
    zIndex?: number
  }

  // === 样式配置 ===
  style?: Record<string, unknown>    // 组件特有样式

  // === 变量 ===
  variables?: WidgetVariable[]       // 组件内部变量

  // === 事件 ===
  events?: WidgetEvent[]             // 组件事件列表

  // === 规则 ===
  rules?: WidgetRule[]               // 组件规则列表

  // === 容器绑定 ===
  formId?: string                    // 表单容器专用：绑定到哪个表单容器
  tabKey?: string                    // 页签容器专用：绑定到哪个标签

  // === 静态属性 ===
  hidden?: boolean                   // 设计时隐藏

  // === 子组件 ===
  children?: Widget[]                // 子 Widget 列表（容器组件）
}

/** Widget 内部变量 */
interface WidgetVariable {
  name: string                       // 变量名
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  defaultValue?: unknown
  description?: string
}

/** Widget 事件 */
interface WidgetEvent {
  trigger: string                    // 触发事件名（click / change / close 等）
  condition?: string                 // 执行条件表达式
  confirm?: string                   // 执行前确认提示
  actions: SchemaEventAction[]
}

/** Widget 规则 */
interface WidgetRule {
  watches: {
    type: 'field' | 'action' | 'dialog-callback'
    source: string
  }[]
  condition: string
  actions: {
    type: 'fetch-data' | 'set-value' | 'submit' | 'validate' | 'reset'
    config: Record<string, unknown>
    onSuccess?: SchemaEventAction[]
    onError?: SchemaEventAction[]
  }[]
}
```

## 容器组件分类

容器组件分为 4 类，各有不同的布局和行为：

### 1. 表单容器（form）

外层包裹 `el-form`，支持表单提交和校验：

```
┌─ 表单容器 ──────────────────────────────┐
│  el-form                                │
│  ├── input (field: name)                │
│  ├── select (field: type)               │
│  └── button-list (提交/刷新)            │
│                                         │
│  提交时：收集所有子组件值 → emit 对象     │
│  校验：检查 required 字段是否为空         │
└─────────────────────────────────────────┘
```

配置项：
- `submitConfig`：提交配置（提交 API、提交方式等）
- `refreshConfig`：刷新配置
- `labelWidth`：标签宽度
- `labelPosition`：标签位置（left/right/top）
- `showSubmitButton`：是否显示内置提交按钮（默认 true）

行为：
- 提交时遍历所有子 Widget，按 `field` 收集值，组合成一个对象
- 提交前校验所有带 `required` 规则的字段是否为空
- 刷新时重置所有子 Widget 的值为 `defaultValue`
- 提交接口暴露给父容器调用（如 dialog 的 confirm 按钮可调用表单容器的提交）
- 表单容器嵌入 dialog 时，submit 交由 dialog 的 confirm 按钮触发，表单容器自身不显示提交按钮

### 2. 卡片容器（card）

仅一个容器包裹，无特殊行为：

```
┌─ 卡片容器 ──────────────────────────────┐
│  card wrapper                           │
│  ├── title                              │
│  ├── input                              │
│  └── select                             │
└─────────────────────────────────────────┘
```

配置项：
- `title`：卡片标题
- `shadow`：阴影模式（always/hover/never）

### 3. 行列容器（row-col）

使用 `el-row` + `el-col` 布局，仅支持选择 1/2/3/4 列：

```
┌─ 行列容器 ──────────────────────────────────────────────┐
│  el-row                                                 │
│  ├── el-col (span=12)    ├── el-col (span=12)          │
│  │   ├── input           │   ├── select                │
│  │   └── date            │   └── checkbox              │
└─────────────────────────────────────────────────────────┘
```

列选项（图标选择）：

| 列数 | 布局 | span 分配 |
|---|---|---|
| 1 列 | `[24]` | 单列占满 |
| 2 列 | `[12, 12]` | 各占一半 |
| 3 列 | `[8, 8, 8]` | 三等分 |
| 4 列 | `[6, 6, 6, 6]` | 四等分 |

配置项：
- `columns`：列数（1/2/3/4），通过图标选择
- `gutter`：列间距

每列支持独立拖入 Widget，Widget 绑定到对应列。

### 4. 页签容器（tabs）

页签通过特有属性配置动态添加，拖入的组件绑定到对应标签 key：

```
┌─ 页签容器 ──────────────────────────────────────┐
│  [基本信息]  [详细信息]  [审批记录]  [+ 添加]     │
│  ─────────────────────────────────────────────  │
│  基本信息 Tab：                                  │
│    ├── input (tabKey: 'basic')                  │
│    ├── select (tabKey: 'basic')                 │
│                                                 │
│  详细信息 Tab：                                  │
│    ├── textarea (tabKey: 'detail')              │
│    └── upload (tabKey: 'detail')                │
└─────────────────────────────────────────────────┘
```

配置项：
- `tabs`：标签列表 `[{ key, label, closable }]`
- `activeKey`：默认激活标签
- `type`：标签样式（card/border-card）

行为：
- 通过属性面板动态添加/删除/排序标签
- 拖入页签容器的 Widget 自动绑定当前激活标签的 `key`
- 切换标签时，仅显示绑定到该标签 `key` 的 Widget
- Widget 数据结构中增加 `tabKey` 字段标识归属标签

### 5. 弹窗容器（dialog）

弹窗容器提供 `el-dialog` 的 slot 结构，支持两种互斥模式：

#### 模式一：编辑模式

双击进入独立编辑画布，content 区域自由拖拽组件布局，拥有独立坐标系：

```
┌─ 弹窗容器（编辑模式）──────────────────────────┐
│  header slot                                    │
│  ┌─────────────────────────────────────────────┐│
│  │  标题（独有配置中设置）                       ││
│  └─────────────────────────────────────────────┘│
│                                                 │
│  content slot（独立画布，自由拖拽）               │
│  ┌─────────────────────────────────────────────┐│
│  │  form 容器                                   ││
│  │  ├── input                                   ││
│  │  └── select                                  ││
│  │  card 容器                                   ││
│  │  └── ...                                     ││
│  └─────────────────────────────────────────────┘│
│                                                 │
│  footer slot（支持拖入按钮）                     │
│  ┌─────────────────────────────────────────────┐│
│  │  [取消]  [确认]                               ││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

- 主画布上 Dialog 显示为缩略卡片（标题 + 基本信息）
- 双击进入独立编辑模式，content 区域有独立画布和坐标系
- content 支持拖入 form 容器、card 容器和基础 Widget
- footer 支持拖入按钮 Widget
- 确认按钮可触发 content 中 form 容器的提交
- 退出编辑模式回到主画布

#### 模式二：微前端模式

content 通过 microapp 加载已发布表单，不可编辑，仅配置加载参数：

- content 不支持拖拽，通过属性面板配置 publishId 和传参
- 加载已发布表单的独立构建产物
- 支持 postMessage 通信
- 适用于复用已发布的表单资源

#### 两种模式互斥

一个 Dialog 实例只能选择一种模式，通过配置项 `contentMode: 'edit' | 'microapp'` 切换。

#### 公共配置项

- `title`：弹窗标题
- `width`：弹窗宽度
- `header`：header slot 配置（标题样式等）
- `footer`：footer slot 配置（按钮列表等）
- `confirmText`：确认按钮文本
- `cancelText`：取消按钮文本
- `destroyOnClose`：关闭时销毁内容
- `contentMode`：内容模式，`'edit'`（编辑模式）或 `'microapp'`（微前端模式）

## Widget 文件结构

每个 Widget 是一个独立文件夹，只通过 `index.ts` 对外暴露：

```
widgets/
├── base/                              # 公共基础
│   ├── BaseWidget.vue                 # 公共组件基类
│   ├── publicSchema.ts                # 公共 schema 字段
│   └── types.ts                       # 公共类型定义
│
├── input/                             # 输入框 Widget
│   ├── FgInput.vue                    # 组件实现
│   ├── schema.ts                      # Schema 初始化配置
│   ├── config.ts                      # 组件特有配置
│   ├── style.module.scss              # 组件特有样式
│   └── index.ts                       # 唯一对外入口
│
├── select/                            # 下拉选择 Widget
│   ├── FgSelect.vue
│   ├── schema.ts
│   ├── config.ts
│   ├── style.module.scss
│   └── index.ts
│
├── form/                              # 表单容器 Widget
│   ├── FgForm.vue
│   ├── schema.ts
│   ├── config.ts
│   ├── style.module.scss
│   └── index.ts
│
├── card/                              # 卡片容器 Widget
│   ├── FgCard.vue
│   ├── schema.ts
│   ├── config.ts
│   ├── style.module.scss
│   └── index.ts
│
├── row-col/                           # 行列容器 Widget
│   ├── FgRowCol.vue
│   ├── schema.ts
│   ├── config.ts
│   ├── style.module.scss
│   └── index.ts
│
├── tabs/                              # 页签容器 Widget
│   ├── FgTabs.vue
│   ├── schema.ts
│   ├── config.ts
│   ├── style.module.scss
│   └── index.ts
│
├── search-list/                       # 搜索列表 Widget（复合组件）
│   ├── FgSearchList.vue               # 主组件
│   ├── components/                    # 子组件（内部使用，不对外暴露）
│   │   ├── SearchForm.vue
│   │   ├── DataTable.vue
│   │   └── Pagination.vue
│   ├── schema.ts
│   ├── config.ts
│   ├── style.module.scss
│   └── index.ts                       # 唯一对外入口
│
├── dialog/                            # 弹窗容器 Widget
│   ├── FgDialog.vue
│   ├── schema.ts
│   ├── config.ts
│   ├── style.module.scss
│   └── index.ts
│
├── richtext/                          # 富文本 Widget
├── upload/                            # 上传 Widget
├── banner/                            # 横幅 Widget
├── tree-layout/                       # 树形布局 Widget
├── date-time-slot/                    # 日期时间区间 Widget
├── file-list/                         # 文件列表 Widget
├── person-select/                     # 人员选择 Widget
├── dept-select/                       # 部门选择 Widget
├── transfer/                          # 穿梭框 Widget
├── detail-form/                       # 详情表单 Widget
├── editable-table/                    # 可编辑表格 Widget
│
└── ...
```

**对外暴露规则**：每个 Widget 只有 `index.ts` 对外暴露，内部实现（`.vue`、`config.ts`、样式等）不直接引用。复合组件的 `components/` 目录为内部使用，不对外暴露。

### 样式文件

每个 Widget 有独立的 `style.module.scss`，通过 CSS Modules 隔离：

```scss
// input/style.module.scss
.wrapper {
  display: inline-flex;
  align-items: center;
}

.input {
  // 组件内部样式，可被 style 配置覆盖
}
```

组件内部通过 `inject` 接收 style 配置，用 JS-in-CSS 动态应用：

```typescript
const injectedStyle = inject(widgetStyleKey)
const computedStyle = computed(() => ({
  ...injectedStyle.value,
  // 组件特有逻辑
}))
```

### 复合组件

部分 Widget 由多个子组件组成（如 search-list），在 `components/` 目录下管理子组件：

```
search-list/
├── FgSearchList.vue           # 主组件：组合子组件
├── components/
│   ├── SearchForm.vue         # 搜索表单子组件
│   ├── DataTable.vue          # 数据表格子组件
│   └── Pagination.vue         # 分页子组件
├── schema.ts
├── config.ts
├── style.module.scss          # 主样式（包含子组件样式）
└── index.ts
```

主组件负责组合子组件，子组件只管自身渲染，不直接对外通信。

## 公共配置 vs Widget 独有配置

### 公共配置（base）

所有 Widget 共享的字段：

```typescript
// base/publicSchema.ts
export interface PublicWidgetFields {
  id: string
  name: string                   // 组件名称
  type: SchemaType
  field?: string
  label?: string
  position: {
    x: number
    y: number
    w: number
    h: number
    zIndex?: number
  }
  hidden?: boolean
}

// 公共样式（所有组件共享）
export interface PublicStyleFields {
  width?: string
  height?: string
  margin?: string
  padding?: string
  backgroundColor?: string
  border?: string
  borderRadius?: string
  fontSize?: string
  fontWeight?: string
  color?: string
}

// 公共样式面板声明
export const publicStylePanel = [
  'width', 'height', 'margin', 'padding',
  'backgroundColor', 'border', 'borderRadius',
  'fontSize', 'fontWeight', 'color',
]
```

### Widget 独有配置（config.ts）

每个 Widget 内部维护自己的配置：

```typescript
// input/config.ts
export const inputConfig = {
  name: 'FgInput',
  displayName: '输入框',

  defaultStyle: {
    width: '240px',
    height: '32px',
    fontSize: '14px',
  },

  defaultProps: {
    placeholder: '请输入',
    clearable: true,
  },

  // 声明支持的属性面板配置项
  propertyPanel: {
    basic: ['field', 'label', 'defaultValue', 'placeholder'],
    style: ['width', 'height', 'fontSize', 'color', 'backgroundColor', 'border'],
    validation: ['rules'],
    events: ['click', 'change', 'focus', 'blur'],
    variables: true,                 // 支持变量配置
  },

  supportsEvents: true,
  supportsRules: true,
  supportsVariables: true,
}
```

样式、事件、规则、变量都是 Widget 独有的，不同 Widget 配置完全不同。

## Schema 初始化

每个 Widget 的 `schema.ts` 定义拖入画布时的初始数据：

```typescript
// input/schema.ts
import { publicSchema } from '../base/publicSchema'
import { inputConfig } from './config'

export function createInputWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'input'),
    name: inputConfig.name,
    field: `field_${id}`,
    label: '输入框',
    position: { x: 0, y: 0, w: 240, h: 32, zIndex: 1 },
    style: { ...inputConfig.defaultStyle },
    props: { ...inputConfig.defaultProps },
    options: [],
    variables: [],
    events: [],
    rules: [],
  }
}
```

Widget 拖入画布时：
1. 调用 `createInputWidget(id)` 生成初始 Widget 数据
2. 合并到 Store（`board.widgets`）
3. 属性面板读取 `inputConfig.propertyPanel` 渲染可编辑属性

## 构建策略

每个 Widget 独立构建，支持 microapp 单独加载：

```
build/
├── widgets/
│   ├── input.js                     # 独立构建的输入框 Widget
│   ├── select.js                    # 独立构建的下拉选择 Widget
│   ├── card.js                      # 独立构建的卡片容器 Widget
│   ├── search-list.js               # 独立构建的搜索列表 Widget
│   ├── dialog.js                    # 独立构建的弹窗容器 Widget
│   └── ...
├── base.js                          # 公共基础
├── board.js                         # Board 管理（画布、顶层变量、顶层事件）
└── renderer.js                      # 渲染引擎（SchemaRender）
```

### Vite 配置

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        'widgets/input': 'src/widgets/input/index.ts',
        'widgets/select': 'src/widgets/select/index.ts',
        'widgets/card': 'src/widgets/card/index.ts',
        'widgets/dialog': 'src/widgets/dialog/index.ts',
        // ...
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
      },
    },
  },
})
```

### Microapp 加载

已发布的表单资源可通过 microapp 单独加载：

```typescript
// 在 dialog 等容器 Widget 中加载已发布表单
import { loadMicroApp } from '@micro/app'

const microApp = loadMicroApp({
  name: 'published-form',
  url: '/published-forms/publish-xxx.js',
  container: '#dialog-content',
  props: {
    publishId: 'publish-xxx',
    formData: initialData,
  },
})
```
