# @schema-form/editor-web

Schema 驱动的可视化表单编辑器和渲染引擎。

## 技术栈

- Vue 3.5 Composition API + `<script setup>` + TypeScript 5.7
- Element Plus 2.9
- Pinia 状态管理（7 个 Store）
- Vue Router 4（支持 qiankun 微前端 + micro-app）
- Vite 6 构建
- ECharts 6.1（图表组件）

## 核心模块

### 状态管理（Pinia）

| Store | 路径 | 说明 |
|---|---|---|
| `useWidgetStore` | `stores/widget.ts` | Widget 集合 CRUD、树结构遍历、位置/容器操作 |
| `useEditorStore` | `stores/editor.ts` | 编辑器交互状态：选中、模式切换、撤销/重做、剪贴板 |
| `useSchemaStore` | `stores/api.ts` | Schema 后端 CRUD（列表、保存、发布） |
| `useDragStore` | `stores/drag.ts` | 拖拽状态 |
| `useBoardStore` | `stores/board.ts` | 画布视口状态 |
| `useAppStore` | `stores/app.ts` | 全局应用状态 |
| `useRequestStore` | `stores/request.ts` | HTTP 请求状态 |

### 编辑器

| 模块 | 路径 | 说明 |
|---|---|---|
| 组件面板 | `Editor/ComponentPanel.vue` | 左侧组件拖拽列表 |
| 画布 | `Editor/EditorOverlay.vue` | 中央拖拽编辑区域 |
| 属性面板 | `Editor/PropertyPanel.vue` | 右侧属性配置 |
| Schema 树 | `Editor/SchemaTree.vue` | 树形结构视图 |

### Widget 体系（49 个组件）

8 个分组，覆盖表单、布局、展示、数据、图表等场景：

| 分组 | Widget |
|---|---|
| **layout** | form, row-col, tabs, card, dialog, divider, spacer, tree-layout, banner, toolbar-buttons |
| **container** | search-list, tab-pane |
| **form** | input, number, select, radio, checkbox, date, date-time-slot, textarea, richtext, transfer, upload, file-list, editable-table, user-picker |
| **table** | table, table-column |
| **action** | button, submit, reset |
| **static** | title, text, image, html |
| **business** | entries, signature, rating, slider, color-picker, cascader, tree-select, mention |
| **chart** | chart-bar, chart-line, chart-pie, chart-radar |

每个 Widget 包含：
- 组件实现（`.vue`）
- 属性配置面板（Schema 驱动）
- Schema 默认值
- 事件/暴露/联动/变量系统接入

### 事件引擎

`engine/eventEngine.ts` — 纯逻辑层，14 种事件动作类型：

show, hide, set-value, open-dialog, close-dialog, navigate, reload, validate, reset, custom-js, emit-event, http-request, set-options, message

### Composables（32 个组合式函数）

覆盖拖拽、联动、历史、数据、选项、生命周期等：

`composables/` — useDrag, useHistory, useLinkage, useVariable, useOptions, useLifecycle, useRightPanelConfig 等

### 渲染引擎

`components/WidgetRenderer/` — Schema 驱动，通过 `getComponentMap()` 动态渲染

`components/FormGrid/` — 自由布局渲染：
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
pnpm dev:editor          # 启动开发服务器 (localhost:5173)
pnpm build:editor        # 构建
pnpm test                # 运行测试
```
