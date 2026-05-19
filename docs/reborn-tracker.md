# 通用界面编辑器重构 — 任务追踪

## 分工

- **架构师 (Architect)**: 数据结构、Store、Schema 默认值、类型系统
- **全栈 (Fullstack)**: 画布引擎、渲染器、组件适配、属性面板、拖拽系统

## 阶段 1: 数据结构 + Store（架构师） ✅

- [x] 1.1 `types.ts` — 定义 Transform、ComponentStyle、ActionDef、LinkageDef、ComponentNode、CanvasConfig
- [x] 1.2 `useSchemaStore.ts` — 重写：整棵树 CRUD、选中(单选/多选)、历史(撤销/重做)、层级(zIndex)
- [x] 1.3 `schemaDefaults.ts` — 每个组件默认 transform/style/props
- [x] 1.4 `useConstant.ts` — 更新组件分类：布局(4)、基础(16)、业务(不改)

## 阶段 2: 画布引擎（全栈，依赖 1.1-1.3） ✅

- [x] 2.1 `EditorCanvas.vue` — 重写：渲染层(FormGrid) + 交互层(选中框/缩放手柄)
- [x] 2.2 `CanvasNode.vue` — 新建：单节点渲染，transform 定位，选中/缩放交互
- [x] 2.3 画布边界约束 — 组件不能拖出画布，宽高不能超出画布
- [x] 2.4 画布属性 — 支持配置背景色/宽高/内边距

## 阶段 3: 渲染器适配（全栈，依赖 1.1-1.3） ✅

- [x] 3.1 `SchemaRender.vue` — 重写：根据 transform/style/data/linkage/events 渲染
- [x] 3.2 布局组件适配 — 行/列用栅格，卡片/tabs 用 transform
- [x] 3.3 基础组件适配 — 移除标签包裹，直接渲染真实 UI，style 直接作用于组件
- [x] 3.4 tabs 按 tab 分组 — 每个面板独立定位空间

## 阶段 4: 拖拽系统（全栈，依赖 2.1-2.2） ✅

- [x] 4.1 `useDragEditor.ts` — 重写：自由拖放 + 容器检测 + 边界约束
- [x] 4.2 组件面板拖出 → 画布创建节点
- [x] 4.3 画布内拖拽移动 → 更新 transform
- [x] 4.4 缩放手柄拖拽 → 更新宽高
- [x] 4.5 点击不冒泡 — stopPropagation，点击谁选中谁

## 阶段 5: 属性面板（全栈，依赖 1.1-1.3） ✅

- [x] 5.1 `PropertyPanel.vue` — 重写：el-collapse 手风琴模式
- [x] 5.2 基础配置区 — id(只读)、field、transform(x/y/w/h)、zIndex
- [x] 5.3 样式配置区 — margin/padding/border/背景/圆角/阴影/文字
- [x] 5.4 数据配置区 — api/选项/默认值/字段映射
- [x] 5.5 事件配置区 — onClick/onChange 动作绑定(弹窗/跳转/emit)
- [x] 5.6 联动配置区 — 条件表达式/监听字段/弹窗关联/联动规则
- [x] 5.7 底部 — JSON 预览/复制/恢复默认

## 阶段 6: 工具栏 + 快捷键（全栈，依赖 1.2） ✅

- [x] 6.1 适配新 store 接口
- [x] 6.2 zIndex 上移/下移按钮
- [x] 6.3 多选支持 (Ctrl+Click)
- [x] 6.4 复制粘贴（偏移 20px）

## 阶段 7: 结构树（全栈，依赖 1.2） ✅

- [x] 7.1 拖拽非布局组件到布局组件内
- [x] 7.2 展示完整树结构（transform 定位的组件）

## 阶段 8: 实例标签化（全栈） ✅

- [x] 8.1 移除 form/search_list 类型区分 — EditorView 中 schemaType 仅作为标签显示
- [x] 8.2 type 降级为可选标签 — 状态栏标签保留，不影响编辑器逻辑

## 验证清单

- [x] V1  画布固定 1920x1080，支持配置背景/宽高/内边距
- [x] V2  拖入组件直接渲染为真实 UI
- [x] V3  组件自由拖放，transform 实时更新
- [x] V4  缩放手柄调整宽高
- [x] V5  组件不能拖出画布边界
- [x] V6  点击选中组件，不冒泡到父容器
- [x] V7  z-index 自动递增，工具栏可调
- [x] V8  行/列内子组件栅格自动排列
- [x] V9  卡片/tabs 内子组件自由定位
- [x] V10 属性面板手风琴模式，修改直接作用于组件
- [ ] V11 事件：点击打开弹窗（双向数据流）、跳转
- [ ] V12 联动：监听字段变化、弹窗关联、条件表达式
- [x] V13 结构树拖拽非布局组件到布局组件内
- [x] V14 撤销/重做正常
- [x] V15 复制粘贴偏移 20px
- [ ] V16 预览/发布模式正常渲染
- [x] V17 保存/加载数据完整
