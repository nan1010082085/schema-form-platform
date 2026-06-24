# @schema-form/editor-web

Schema 驱动的可视化自由布局表单设计器与运行时渲染引擎。

## 项目定位

可视化低代码表单平台的核心编辑器，支持拖拽编排、属性配置、事件联动、图表集成，通过 Schema JSON 描述表单结构，实现设计态与运行态分离。

## 技术栈

- Vue 3.5 Composition API + `<script setup>` + TypeScript 5.7
- Element Plus 2.9
- Pinia 状态管理（7 个 Store，大量使用 shallowRef 优化性能）
- Vue Router 4（支持 qiankun 微前端 + micro-app）
- Vite 6 构建
- ECharts 6.1（图表组件）
- CSS Module 样式隔离（所有组件 .module.scss）

## 核心功能

### 可视化设计器

三栏布局：左侧面板（部件库 + 结构树）+ 中间画布 + 右侧属性面板。工具栏居中放置面板抽屉控制、撤销/重做、复制/删除等操作按钮，右侧为缩放、模式切换、保存发布。

### Widget 体系（49 个组件）

8 个分组，覆盖表单、布局、展示、数据、图表等场景：

| 分组 | Widget |
|---|---|
| **layout** | form, single-col, double-col, triple-col, quad-col, card, tabs, dialog, divider, spacer, tree-layout, banner, toolbar-buttons |
| **container** | search-list |
| **form** | input, number, select, radio, checkbox, date, date-time-slot, textarea, richtext, transfer, upload, file-list, editable-table, switch, slider, rate, cascader, color-picker, tag-input, autocomplete, time-picker |
| **table** | table |
| **action** | button |
| **static** | title |
| **business** | entries |
| **chart** | bar-chart, line-chart, pie-chart, scatter-chart, radar, gauge, heatmap, funnel, candlestick |

每个 Widget 包含：
- 组件实现（`.vue`）
- 属性配置面板（Schema 驱动）
- Schema 默认值
- 事件/暴露/联动/变量系统接入

### 事件引擎

`engine/eventEngine.ts` — 纯逻辑层，14 种事件动作类型：

show, hide, set-value, open-dialog, close-dialog, switch-tab, close-tab, navigate, reload, validate, reset, custom-js, emit-event, http-request, set-options, message, set-variable, trigger-event, post-message, copy, refresh, api, navigate

### 联动系统

6 种联动类型：visible / disabled / required / options / set-value / reset-fields。通过 watchFields 监听字段变化，条件表达式驱动 then/else 分支，支持 optionsApi 动态加载。

### 拖拽系统

useDrag + useDragEditor 双层 composable 管理拖拽逻辑。dragStore 维护全局拖拽状态，支持从组件面板拖入画布、画布内排序、跨布局容器拖动，对齐辅助线和碰撞检测。

### 属性面板

Schema 驱动的右侧属性配置面板，通过 useRightPanelConfig 动态渲染。包含 15+ 专用编辑器：BorderEditor、SpacingEditor、ConditionBuilder、OptionsEditor、TableColumnsEditor、EventConfigDialog、VariableConfigDialog 等。

### 自由布局

Widget 携带 position（x, y, w, h, zIndex）实现绝对定位自由布局。EditorCanvas 处理画布缩放、拖拽定位，EditorOverlay 提供选中框和拖拽手柄。支持画布尺寸预设切换。

## 状态管理（Pinia）

| Store | 路径 | 说明 |
|---|---|---|
| `useWidgetStore` | `stores/widget.ts` | Widget 集合 CRUD、树结构遍历、位置/容器操作（shallowRef） |
| `useEditorStore` | `stores/editor.ts` | 编辑器交互状态：选中、模式切换、撤销/重做、剪贴板（shallowRef history） |
| `useSchemaStore` | `stores/api.ts` | Schema 后端 CRUD（列表、保存、发布） |
| `useDragStore` | `stores/drag.ts` | 拖拽状态 |
| `useBoardStore` | `stores/board.ts` | 画布视口状态（MIN_ZOOM/MAX_ZOOM 常量） |
| `useAppStore` | `stores/app.ts` | 全局应用状态 |
| `useRequestStore` | `stores/request.ts` | HTTP 请求状态（shallowRef Map） |

### 性能优化

- `widgets`、`history`、`dialogHistory` 使用 `shallowRef` 避免深层响应式代理
- `pendingRequests`、`requestCache` 使用 `shallowRef(new Map())` 避免 Map 变异陷阱
- undo/redo/copy/delete 操作提取为 editorStore composite actions，消除组件间代码重复
- zoom 阈值统一为 `MIN_ZOOM`/`MAX_ZOOM` 常量，store 和 UI 共享

## Composables（32 个组合式函数）

覆盖拖拽、联动、历史、数据、选项、生命周期等：

| 分类 | Composables |
|---|---|
| 拖拽 | useDrag, useDragEditor |
| 联动 | useLinkage, useConditionReferences |
| 生命周期 | useLifecycle, useWidgetLifecycle |
| 数据 | useFormData, useListData, useDynamicOptions, useWidgetOptions |
| 历史 | useHistory, useSnapshot, useClipboard |
| 布局 | useEditorLayout, useResize, useLeftPanelManage, useWidgetPanel |
| 交互 | useInteractionControl, useModeControl, useEventLog |
| 配置 | useRightPanelConfig, usePropertyAdapters |
| 暴露 | useExposeWidget |
| 工具 | useIdGenerate, useLocale, useLogger, useConstant, useCache, useBreakpoint, useApiRequest, useWorkerRequest |

## 编辑器组件（39 个）

| 分类 | 组件 |
|---|---|
| 画布 & 布局 | EditorCanvas, EditorOverlay, EditorLeftPanel, EditorRightPanel, EditorToolbar |
| 属性编辑器 | PropertyPanel, PropertyField, PropertySection, BorderEditor, BorderRadiusEditor, SpacingEditor, ColumnsEditor, ButtonEditor, OptionsEditor |
| 配置对话框 | EventConfigDialog, LinkageConfigDialog, OptionsApiConfigDialog, RequestConfigDialog, VariableConfigDialog, VersionDiffDialog, VersionHistoryDialog, SaveTemplateDialog |
| 数据 & 列表 | TableColumnsEditor, SearchFieldsEditor, RowActionsEditor, ActionListEditor, GenericArrayEditor |
| 规则 & 条件 | ConditionBuilder, RulesEditor, LinkageConfig |
| 工具 & 面板 | ComponentPanel, WidgetTree, SchemaTree, WidgetContextMenu, JsonImporter, EventLogPanel, FlowPreview, ApiConfig, TemplatePanel |

## 渲染引擎

`components/WidgetRenderer/` — Schema 驱动，通过 `getComponentMap()` 动态渲染

`components/FormGrid/` — 自由布局渲染：
- 拖拽排序（vuedraggable）
- 条件渲染（visible/disabled schema 属性）
- 布局网格系统
- 预览模式

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

## 微前端集成

支持 qiankun 子应用模式。路由自动切换 memory history，AI 协作通过 @schema-form/socket 实现实时同步。

## 开发

```bash
pnpm dev:editor          # 启动开发服务器 (localhost:5173)
pnpm build:editor        # 构建
pnpm test                # 运行测试
pnpm test:coverage       # 测试覆盖率
```

## API 层

所有后端接口调用聚合到 `src/api/` 目录，组件/stores 禁止直接调用 apiClient：

| 文件 | 说明 |
|---|---|
| `src/api/schemaApi.ts` | Schema CRUD、版本管理、导入导出 |
| `src/api/authApi.ts` | 认证接口 |
| `src/api/dataApi.ts` | 数据/实例/流程接口 |
| `src/api/widgetApi.ts` | Widget 远程选项、字典接口 |

底层 HTTP 客户端：`src/utils/apiClient.ts`

## 项目结构

```
packages/platform/editor/
├── src/
│   ├── api/                 // API 聚合层（4 个文件）
│   ├── components/
│   │   ├── Editor/          // 可视化设计器核心（39 子模块）
│   │   ├── WidgetRenderer/  // Schema 驱动动态渲染引擎
│   │   └── FormGrid/        // 表单栅格渲染 + 拖拽排序
│   ├── widgets/             // 49 个 Widget 目录 + registry
│   │   ├── registry.ts      // Widget 注册表 Map<SchemaType, WidgetRegistryItem>
│   │   ├── base/types.ts    // 核心类型定义
│   │   └── entries/         // 入口文件 + renderer
│   ├── stores/              // Pinia 状态管理（7 Store，shallowRef 优化）
│   ├── composables/         // 32 个组合式函数
│   ├── engine/              // 事件执行引擎（纯逻辑层）
│   ├── utils/               // 工具函数
│   ├── views/               // 页面视图（EditorView 拆分为 4 个子组件）
│   └── router/              // Vue Router + qiankun/micro-app 支持
├── vite.config.ts           // 标准 SPA 构建
├── vite.widget.config.ts    // Widget 库构建
└── vite.microapp.config.ts  // Microapp 构建
```
