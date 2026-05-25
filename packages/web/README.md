# @schema-form/web

Schema 驱动的可视化表单编辑器和渲染引擎。

## 技术栈

- Vue 3 Composition API + `<script setup>` + TypeScript
- Element Plus 2.9
- Pinia 状态管理
- Vue Router 4（支持 qiankun 微前端）
- Vite 构建

## 核心模块

### 状态管理

- `useSchemaStore` — Schema CRUD、发布、版本管理
- `useEditorStore` — 编辑器画布状态、撤销/重做、选中态

### 编辑器

| 模块 | 路径 | 说明 |
|---|---|---|
| 组件面板 | `Editor/ComponentPanel.vue` | 左侧组件拖拽列表 |
| 画布 | `Editor/EditorOverlay.vue` | 中央拖拽编辑区域 |
| 属性面板 | `Editor/PropertyPanel.vue` | 右侧属性配置 |
| Schema 树 | `Editor/SchemaTree.vue` | 树形结构视图 |

### 四大配置弹框

| 弹框 | 说明 |
|---|---|
| `EventConfigDialog.vue` | 事件/动作配置 |
| `LinkageConfigDialog.vue` | 联动规则配置 |
| `VariableConfigDialog.vue` | 变量/暴露配置 |
| `OptionsApiConfigDialog.vue` | 远程选项 API 配置 |

### 属性面板编辑器

| 编辑器 | 说明 |
|---|---|
| `BorderEditor.vue` | 边框样式 |
| `BorderRadiusEditor.vue` | 圆角 |
| `SpacingEditor.vue` | 间距 (margin/padding) |
| `ConditionBuilder.vue` | 条件构建器 |
| `OptionsEditor.vue` | 选项列表 |
| `RulesEditor.vue` | 校验规则 |
| `ColumnsEditor.vue` | 列配置 |
| `TableColumnsEditor.vue` | 表格列配置 |
| `SearchFieldsEditor.vue` | 搜索字段配置 |
| `ActionListEditor.vue` | 动作列表 |

### Widget 体系

32 个 Widget，覆盖表单、布局、展示、数据四大类：

**表单类**: input, number, select, radio, checkbox, date, date-time-slot, textarea, richtext, transfer, upload, file-list, editable-table

**布局类**: form, row-col, tabs, card, dialog, divider, spacer, tree-layout, banner, toolbar-buttons, search-list

**展示类**: title, base, button, button-list, table

**数据类**: entries

每个 Widget 包含：
- 组件实现（`.vue`）
- 属性配置面板
- Schema 默认值
- 事件/暴露系统接入

### 渲染引擎

`src/components/FormGrid/` — Schema 驱动的表单渲染：
- 拖拽排序（vuedraggable）
- 条件渲染（visible/disabled schema 属性）
- 布局网格系统
- 预览模式

### API 通信

`src/utils/apiClient.ts` — 基于 fetch 的薄封装：
- `ApiError` 统一错误类型
- `configureApiClient()` 初始化 baseUrl 和 token

## 路由

| 路径 | 页面 |
|---|---|
| `/` | Schema 列表 |
| `/editor/:id` | 编辑器 |
| `/preview/:id` | 预览 |
| `/publish/:id` | 发布管理 |
| `/instances` | 实例管理 |
| `/login` | 登录 |
| `/docs` | 组件文档 |

## 开发

```bash
pnpm dev:web          # 启动开发服务器 (localhost:5173)
pnpm build:web        # 构建
pnpm test             # 运行测试
```
