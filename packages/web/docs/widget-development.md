# Widget 开发规范

## 概念

每个组件（Widget）是一个独立单元，包含实现、配置、样式、schema 初始化。通过 `index.ts` 唯一对外暴露。

## 目录结构

```
widgets/
├── base/                              # 公共基础（所有 Widget 共享）
│   ├── BaseWidget.vue                 # 公共组件基类
│   ├── publicSchema.ts                # 公共 schema 字段
│   └── types.ts                       # 公共类型定义
│
├── {widget-name}/                     # 每个 Widget 独立文件夹
│   ├── Fg{WidgetName}.vue             # 组件实现
│   ├── schema.ts                      # Schema 初始化配置
│   ├── config.ts                      # 组件特有配置
│   ├── style.module.scss              # 组件特有样式
│   ├── components/                    # 子组件（复合组件可选）
│   └── index.ts                       # 唯一对外入口
```

## 开发步骤

### 1. 创建文件夹

```
mkdir widgets/my-widget
```

### 2. 编写 config.ts

声明组件的元信息、默认值、属性面板配置。config 对象必须满足 `WidgetConfig` 类型：

```typescript
// widgets/my-widget/config.ts
import type { WidgetConfig } from '../base/types'

export const myWidgetConfig: WidgetConfig = {
  // 组件名称
  name: 'FgMyWidget',
  displayName: '我的组件',

  // 默认样式（每个组件不同）
  defaultStyle: {
    width: '240px',
    height: '32px',
    fontSize: '14px',
  },

  // 默认属性
  defaultProps: {
    placeholder: '请输入',
    clearable: true,
  },

  // 属性面板声明（控制哪些属性可编辑）
  propertyPanel: {
    basic: ['field', 'label', 'defaultValue'],
    style: ['width', 'height', 'fontSize', 'color', 'backgroundColor'],
    props: [
      { key: 'placeholder', label: '占位文字', type: 'input', default: '请输入' },
      { key: 'clearable', label: '可清空', type: 'switch', default: true },
    ],
  },

  // 配置面板入口（声明式，不需要的组件可省略）
  configPanels: ['events', 'rules'],
}
```

#### WidgetConfig 类型

```typescript
interface WidgetConfig {
  name: string
  displayName: string
  defaultStyle?: Record<string, unknown>
  defaultProps?: Record<string, unknown>
  propertyPanel?: PropertyPanelConfig
  configPanels?: ConfigPanelType[]  // 'events' | 'rules' | 'api'
}
```

#### configPanels 声明

`configPanels` 控制属性面板底部显示哪些配置入口按钮。每个 Widget 按需声明：

| 值 | 说明 | 适用组件 |
|---|---|---|
| `'events'` | 事件配置弹框 | 所有可交互组件 |
| `'rules'` | 规则配置弹框 | 表单组件 |
| `'api'` | 数据源配置弹框 | select / checkbox / radio / table |

不需要配置入口的组件（如 divider、spacer、title）可省略 `configPanels`。

### 3. 编写 schema.ts

定义拖入画布时的初始数据：

```typescript
// widgets/my-widget/schema.ts
import { publicSchema } from '../base/publicSchema'
import { myWidgetConfig } from './config'
import type { Widget } from '../base/types'

export function createMyWidgetSchema(id: string): Widget {
  return {
    ...publicSchema(id, 'my-widget'),
    name: myWidgetConfig.name,
    field: `field_${id}`,
    label: '我的组件',
    position: { x: 0, y: 0, w: 240, h: 32, zIndex: 1 },
    style: { ...myWidgetConfig.defaultStyle },
    props: { ...myWidgetConfig.defaultProps },
    options: [],
    variables: [],
    events: [],
    rules: [],
  }
}
```

### 4. 编写 style.module.scss（仅在需要隔离样式时）

大多数基础组件不需要 `style.module.scss`。SchemaNode 的 `.nodeWrapper > *` 已经强制所有 widget 根元素填满容器（`width: 100%; height: 100%`），无需在组件内部重复设置。

仅当组件有隔离样式需求时才创建此文件（如复合组件内部的子元素布局）。

### 5. 编写 FgMyWidget.vue

组件实现，通过 inject 接收自身数据。

**核心规则：禁止使用 wrapper div。** SchemaNode 已通过 `.nodeWrapper > *` 强制拉伸 widget 根元素，组件内部不得再用 div 包裹。

#### 基础组件模板（无 wrapper）

```vue
<!-- widgets/my-widget/FgMyWidget.vue -->
<script setup lang="ts">
import { inject, computed } from 'vue'
import { widgetDataKey, widgetStyleKey } from '../base/types'

const widgetData = inject(widgetDataKey)!
const widgetStyle = inject(widgetStyleKey)!

// 仅传递有意义的样式属性，禁止 width/height（SchemaNode 已处理）
const dynamicStyle = computed(() => ({
  fontSize: widgetStyle.value?.fontSize as string,
  color: widgetStyle.value?.color as string,
}))
</script>

<template>
  <!-- 直接渲染 Element Plus 组件，无需 wrapper div -->
  <el-input
    v-model="widgetData.defaultValue as string"
    :style="dynamicStyle"
    :placeholder="(widgetData.props?.placeholder as string) || '请输入'"
  />
</template>

<!-- 需要撑满高度时，用 :deep() 设置 Element Plus 内部样式 -->
<style scoped>
:deep(.el-input__wrapper) {
  height: 100%;
}
</style>
```

#### Element Plus 组件 :deep() 规范

SchemaNode 的 `.nodeWrapper > *` 设置 `width: 100% !important; height: 100% !important`，但 Element Plus 组件内部的容器不会自动继承高度。需要用 `:deep()` 设置内部样式：

| 组件 | :deep() 规则 |
|---|---|
| `el-input` | `:deep(.el-input__wrapper) { height: 100%; }` |
| `el-input` (textarea) | `:deep(.el-textarea__inner) { height: 100%; }` |
| `el-select` | `:deep(.el-select__wrapper) { height: 100%; }` |
| `el-input-number` | `:deep(.el-input-number) { width: 100%; height: 100%; }` + `:deep(.el-input__wrapper) { height: 100%; }` |
| `el-date-picker` | `:deep(.el-date-editor) { width: 100% !important; height: 100%; }` + `:deep(.el-input__wrapper) { height: 100%; }` |
| `el-button` | `:deep(.el-button) { width: 100%; height: 100%; }` |
| `el-checkbox-group` | 无需 :deep()，组件本身支持宽度填充 |
| `el-radio-group` | 无需 :deep()，组件本身支持宽度填充 |
| `el-table` | 无需 :deep()，通过 `:height` prop 控制 |
| `el-divider` | 无需 :deep()，组件本身支持宽度填充 |

**禁止在 dynamicStyle 中写 `width: '100%'` 或 `height: '100%'`。** 这些由 SchemaNode 全局处理，组件内部不要重复。

### 6. 编写 index.ts

唯一对外入口，暴露组件和创建函数：

```typescript
// widgets/my-widget/index.ts
export { default as FgMyWidget } from './FgMyWidget.vue'
export { createMyWidgetSchema } from './schema'
export { myWidgetConfig } from './config'
```

## 容器 Widget 开发

容器 Widget 需要额外处理子 Widget 的渲染：

### 表单容器（form）

```vue
<!-- widgets/form/FgForm.vue -->
<script setup lang="ts">
import { inject, computed } from 'vue'
import { widgetDataKey } from '../base/types'
import SchemaRender from '../../SchemaRender.vue'

const widgetData = inject(widgetDataKey)

// 收集子组件值
function collectValues() {
  const values = {}
  // 遍历 children，按 field 收集值
  return values
}

// 校验 required 字段
function validate() {
  // 遍历 children，检查 required 规则
}

// 提交
function handleSubmit() {
  if (validate()) {
    emit('submit', collectValues())
  }
}
</script>

<template>
  <el-form :label-width="widgetData.props.labelWidth">
    <SchemaRender v-for="child in widgetData.children" :schema="child" />
    <el-button @click="handleSubmit">提交</el-button>
  </el-form>
</template>
```

### 行列容器（row-col）

```vue
<!-- widgets/row-col/FgRowCol.vue -->
<script setup lang="ts">
import { inject, computed } from 'vue'
import { widgetDataKey } from '../base/types'
import SchemaRender from '../../SchemaRender.vue'

const widgetData = inject(widgetDataKey)

const columns = computed(() => widgetData.props.columns || 2)
const span = computed(() => 24 / columns.value)
</script>

<template>
  <el-row :gutter="widgetData.props.gutter || 16">
    <el-col v-for="col in columns" :key="col" :span="span">
      <SchemaRender
        v-for="child in widgetData.children?.filter(c => c.colIndex === col)"
        :schema="child"
      />
    </el-col>
  </el-row>
</template>
```

### 页签容器（tabs）

```vue
<!-- widgets/tabs/FgTabs.vue -->
<script setup lang="ts">
import { inject, computed, ref } from 'vue'
import { widgetDataKey } from '../base/types'
import SchemaRender from '../../SchemaRender.vue'

const widgetData = inject(widgetDataKey)
const activeKey = ref(widgetData.props.activeKey || '')

const currentChildren = computed(() =>
  widgetData.children?.filter(c => c.tabKey === activeKey.value)
)
</script>

<template>
  <el-tabs v-model="activeKey" :type="widgetData.props.type">
    <el-tab-pane
      v-for="tab in widgetData.props.tabs"
      :key="tab.key"
      :label="tab.label"
      :name="tab.key"
    >
      <SchemaRender
        v-for="child in widgetData.children?.filter(c => c.tabKey === tab.key)"
        :schema="child"
      />
    </el-tab-pane>
  </el-tabs>
</template>
```

## 复合 Widget 开发

复合 Widget 由多个子组件组成，子组件在 `components/` 目录下，不对外暴露：

```
search-list/
├── FgSearchList.vue           # 主组件：组合子组件
├── components/
│   ├── SearchForm.vue         # 搜索表单
│   ├── DataTable.vue          # 数据表格
│   └── Pagination.vue         # 分页
├── schema.ts
├── config.ts
├── style.module.scss
└── index.ts                   # 唯一对外入口
```

主组件负责组合子组件，子组件只管自身渲染。

## inject 注入

每个 Widget 通过 inject 接收自身数据，不通过 props 层层传递：

```typescript
// base/types.ts
import type { InjectionKey, ComputedRef } from 'vue'
import type { Widget } from './types'

export const widgetDataKey: InjectionKey<ComputedRef<Widget>> = Symbol('WidgetData')
export const widgetStyleKey: InjectionKey<ComputedRef<Record<string, unknown>>> = Symbol('WidgetStyle')
```

SchemaRender 在渲染每个 Widget 时 provide 对应数据：

```typescript
// SchemaRender 中
provide(widgetDataKey, computed(() => widgetData))
provide(widgetStyleKey, computed(() => widgetData.style))
```

## 样式应用

组件内部通过 CSS Modules + JS-in-CSS 应用样式：

```vue
<script setup lang="ts">
import { inject, computed } from 'vue'
import { widgetStyleKey } from '../base/types'
import styles from './style.module.scss'

const widgetStyle = inject(widgetStyleKey)

// 动态样式：将注入的 style 配置转换为 CSS 属性
const dynamicStyle = computed(() => {
  const s = widgetStyle?.value || {}
  return {
    fontSize: s.fontSize,
    color: s.color,
    backgroundColor: s.backgroundColor,
    // ...
  }
})
</script>

<template>
  <div :class="styles.wrapper" :style="dynamicStyle">
    <!-- 组件内容 -->
  </div>
</template>
```

## 注册组件

新 Widget 开发完成后，需要在 `widgets/index.ts` 中注册：

```typescript
// widgets/index.ts
import { registerWidget } from './registry'
import { FgMyWidget, createMyWidget, myWidgetConfig } from './my-widget'

export function registerAllWidgets() {
  // ... 其他组件

  registerWidget({
    name: myWidgetConfig.name,
    displayName: myWidgetConfig.displayName,
    type: 'my-widget',                  // SchemaType
    group: 'form',                      // 'container' | 'form' | 'basic' | 'table'
    component: FgMyWidget,
    create: createMyWidget,
    config: myWidgetConfig,
  })
}
```

`registerWidget` 将组件注册到内部 Map，组件面板从 `getAllWidgets()` / `getWidgetsByGroup()` 读取可拖拽列表。

### Widget 分组

| group | 说明 | 包含组件 |
|---|---|---|
| `container` | 容器组件 | form, card, row-col, tabs, dialog |
| `form` | 表单组件 | input, select, number, radio, checkbox, date, textarea, richtext, upload, date-time-slot, person-select, dept-select |
| `basic` | 基础组件 | button-list, title, divider, spacer, toolbar-buttons, button, banner, tree-layout, file-list, transfer, detail-form |
| `table` | 表格组件 | table, search-list, editable-table |
