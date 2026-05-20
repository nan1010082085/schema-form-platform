# Schema Form Platform 开发进度文档

> 更新时间：2026-05-20

## 项目概述

基于 Schema 驱动的低代码表单引擎，包含可视化编辑器和渲染器，支持拖拽编辑、属性配置、联动系统、发布部署。

---

## 一、整体完成度概览

| 模块 | 完成度 | 状态 |
|------|--------|------|
| 可视化编辑器 | 95% | ✅ 核心功能完成 |
| 表单渲染引擎 | 90% | ✅ 核心功能完成 |
| 组件库 | 85% | ✅ 37个组件已实现 |
| 状态管理 | 95% | ✅ 6个 Store 已完成 |
| 后端 API | 90% | ✅ CRUD + 发布系统 |
| 测试覆盖 | 70% | 🟡 需要补充覆盖率报告 |
| 用户认证 | 30% | 🟡 模型就位，路由待实施 |
| 部署配置 | 95% | ✅ Vercel + qiankun |

---

## 二、已完成功能清单

### 2.1 可视化编辑器（95%）

**核心能力：**
- ✅ 画布拖拽编辑（ComponentNode 模式）
- ✅ 组件面板分类展示（布局/基础/业务）
- ✅ 结构树拖拽重排（before/after/inside）
- ✅ 属性面板动态配置
- ✅ 撤销/重做（50步历史栈）
- ✅ 剪贴板复制/粘贴
- ✅ 分组/取消分组
- ✅ 多选（Ctrl/Shift）
- ✅ JSON 导入/导出
- ✅ Schema 校验（9种规则）
- ✅ 草稿发布系统
- ✅ 预览模式
- ✅ 未保存检测
- ✅ 画布缩略图
- ✅ 画布尺寸预设
- ✅ ComponentNode <-> FormSchemaItem 双向转换

**编辑器组件（14个）：**
- EditorToolbar - 顶部工具栏
- ComponentPanel - 组件面板
- EditorCanvas - 画布
- CanvasNode - 节点渲染
- PropertyPanel - 属性面板
- PropertySection - 属性段落
- SchemaTree - 结构树
- JsonImporter - JSON导入器
- ApiConfig - API配置
- LinkageConfig - 联动配置
- RulesEditor - 校验规则
- ColumnsEditor - 表格列编辑
- SearchFieldsEditor - 搜索字段
- RowActionsEditor - 行操作

### 2.2 表单渲染引擎（90%）

**核心能力：**
- ✅ Schema 驱动递归渲染
- ✅ 栅格布局（响应式 span）
- ✅ 表单数据管理（useFormData）
- ✅ 动态选项加载（API/字典，带缓存）
- ✅ 字段联动（6种类型，循环依赖检测）
- ✅ 表达式引擎（沙箱化，LRU缓存）
- ✅ 生命周期钩子
- ✅ 搜索列表（完整 CRUD）
- ✅ 可编辑表格
- ✅ 动作系统（8种类型）
- ✅ 国际化（zh-CN/en-US）
- ✅ 响应式断点
- ✅ CSV/Excel 导出
- ✅ postMessage API（iframe嵌入）

### 2.3 组件库（37个组件）

**基础组件（9个）：**
- FormInput - 文本输入
- FormNumber - 数字输入
- FormSelect - 下拉选择
- FormRadio - 单选
- FormCheckbox - 多选
- FormDate - 日期选择
- FormDateRange - 日期范围
- FormTextarea - 多行文本
- FormRichText - 富文本

**布局组件（8个）：**
- FgPage - 页面容器
- FgToolbar - 工具栏容器
- FgCard - 卡片容器
- FgTitle - 标题
- FgDivider - 分割线
- FgSpacer - 间距
- FgSteps - 分步布局
- FgTabs - 标签页布局

**业务组件（20个）：**
- FgSchemaButtonList - Schema按钮列表
- FgDialog - 弹窗
- FgUpload - 文件上传
- FgTable - 数据表格
- FgPagination - 分页
- FgFileList - 文件列表
- FgFilePreview - 文件预览
- FgPersonSelect - 人员选择
- FgDeptSelect - 部门选择
- FgTransfer - 穿梭框
- FgDetailForm - 详情表单
- FgBanner - 横幅提示
- FgTreeLayout - 树形布局
- FgDateTimeSlot - 日期时间槽
- FgToolbarButtons - 工具栏按钮组
- FgSearchList - 搜索列表
- FgEditableTable - 可编辑表格
- FgButtonList - 按钮列表
- FgFormContainer - 表单容器
- FgWorkflowForm - 工作流表单

### 2.4 状态管理（6个 Store）

- ✅ useEditorStore - 编辑器核心状态（路径选择模式）
- ✅ useSchemaStore (canvas) - 画布编辑器状态（ComponentNode模式）
- ✅ useSchemaStore (API) - Schema CRUD 交互
- ✅ useAppStore - 应用全局状态（qiankun）
- ✅ usePropertyStore - 属性面板 UI 状态
- ✅ useRequestStore - 请求队列与缓存

### 2.5 Composables（16个）

- ✅ useBreakpoint - 响应式断点
- ✅ useConstant - 全局常量
- ✅ useDragEditor - 画布拖拽
- ✅ useDynamicOptions - 动态选项
- ✅ useEditorLayout - 面板可见性
- ✅ useFormData - 表单数据
- ✅ useHistory - 撤销重做
- ✅ useIdGenerate - ID生成
- ✅ useInteractionControl - 交互控制
- ✅ useLeftPanelManage - 结构树交互
- ✅ useLifecycle - 生命周期
- ✅ useLinkage - 字段联动
- ✅ useListData - 列表数据
- ✅ useLocale - 国际化
- ✅ useModeControl - 模式管理
- ✅ useRightPanelConfig - 属性面板配置

### 2.6 后端 API（90%）

**已实现：**
- ✅ Schema CRUD（REST API）
- ✅ 发布系统（双表设计，upsert）
- ✅ 分页搜索（关键词/类型筛选）
- ✅ 健康检查（/api/health）
- ✅ 错误处理中间件
- ✅ CORS 配置
- ✅ UUID 主键

**API 路由：**
- GET /api/schemas - 列表
- POST /api/schemas - 创建
- GET /api/schemas/published/:sourceId - 获取发布版本
- GET /api/schemas/:id - 获取单个
- PUT /api/schemas/:id - 更新
- POST /api/schemas/:id/publish - 发布
- DELETE /api/schemas/:id - 删除

**待实现：**
- 🟡 用户认证路由（模型已就位）
- 🟡 权限控制中间件

### 2.7 测试覆盖（70%）

**前端测试（19个文件，5783行）：**
- ✅ SchemaRender.spec.ts (820行) - 渲染引擎
- ✅ useLinkage.spec.ts (645行) - 联动系统
- ✅ schemaTransform.spec.ts (474行) - 树操作
- ✅ editor-renderer-integration.spec.ts (403行) - 集成测试
- ✅ useListData.spec.ts (397行) - 列表数据
- ✅ jsonToSchema.spec.ts (346行) - JSON推断
- ✅ e2e-smoke.spec.ts (294行) - E2E冒烟
- ✅ useHistory.spec.ts (278行) - 历史管理
- ✅ useLifecycle.spec.ts (263行) - 生命周期
- ✅ expression.spec.ts (246行) - 表达式引擎
- ✅ schemaValidate.spec.ts (245行) - 校验
- ✅ FgTabs.spec.ts (230行) - Tabs组件
- ✅ FgSteps.spec.ts (240行) - Steps组件
- ✅ useBreakpoint.spec.ts (207行) - 断点
- ✅ FormGrid.smoke.test.ts (175行) - 冒烟测试
- ✅ useDynamicOptions.spec.ts (166行) - 动态选项
- ✅ exportUtils.spec.ts (136行) - 导出工具
- ✅ performance.spec.ts (114行) - 性能测试
- ✅ ErrorBoundary.spec.ts (104行) - 错误边界

**后端测试（1个文件，213行）：**
- ✅ backend-smoke.spec.ts - 完整CRUD流程

**待补充：**
- 🟡 覆盖率报告生成
- 🟡 属性面板组件测试
- 🟡 编辑器交互测试

### 2.8 基础设施（95%）

- ✅ Vercel 部署配置
- ✅ qiankun 微前端支持
- ✅ 双 API 客户端（fetch + axios）
- ✅ TypeScript 配置
- ✅ pnpm monorepo 结构

---

## 三、技术债务与待优化项

### 3.1 架构层面
- 双 Store 架构（editorStore vs schemaStore）需要统一或明确边界
- ComponentNode <-> FormSchemaItem 转换逻辑可抽取为独立模块

### 3.2 代码质量
- 部分组件缺少单元测试
- 覆盖率报告未生成
- 部分 utils 函数可迁移到 composables

### 3.3 功能完善
- 用户认证系统待实施
- 权限控制待实现
- 操作日志/审计功能缺失

---

## 四、下一步开发建议

### 优先级 P0（核心功能）
1. 用户认证路由实现
2. 权限控制中间件
3. 覆盖率报告配置

### 优先级 P1（体验优化）
1. 属性面板组件测试补充
2. 编辑器交互测试
3. 性能优化（大 schema 场景）

### 优先级 P2（扩展功能）
1. 更多业务组件
2. 模板市场
3. 版本管理
4. 协同编辑

---

## 五、团队角色与职责划分

详见 [ROLES.md](./ROLES.md)
