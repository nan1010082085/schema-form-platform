# Changelog

## [Unreleased] - 2026-06-01

### Fixed
- AI Agent 工具调用后无输出：增加 fallback 逻辑，当模型未使用 `<answer>` 标签时提取 `<think>` 外的内容
- AI Agent 工具调用后不继续思考：在 system prompt 中增加工具调用行为规范，明确要求工具调用后必须用 XML 标签格式输出
- Portal 子应用白屏 + 路径错误：将三个子应用的 Vue Router 从模块顶层单例改为工厂函数，在 `createApp` 回调内延迟创建，确保 `__MICRO_APP_ENVIRONMENT__` 已注入

### Added
- AI 对话版本关联：`AIConversationModel` 增加 `version` 字段，对话记录 Schema 版本，加载历史对话时按版本恢复上下文
- 文档全面更新：`docs/ai.html` 重写为实际架构（移除 LangGraph，更新工具列表、SSE 事件、目录结构等），`README.md` 更新项目结构和端口

### Changed
- `createChildApp()` 支持 `getRouter` 延迟获取 router（`packages/shared/micro-app/child.ts`）
- Editor/Flow/AI 子应用 router 改为工厂函数导出（`createEditorRouter` / `createFlowRouter` / `createAiRouter`）

## [1.0.0-rc.2] - 2026-05-25

### Fixed
- 规则配置面板：LinkageConfigDialog 重写为直接输出 `WidgetEvent[]` + `SchemaEventAction[]`，与事件引擎对齐，移除桥接层
- 属性面板：规则配置保存到 `widget.events` 而非废弃的 `widget.rules`
- 条件构建器：等于判断从严格等于 (`===`) 改为宽松等于 (`==`)，兼容字符串/数字类型
- 预览/发布模式：禁止键盘快捷键删除组件
- 弹窗容器：编辑模式下多个弹窗容器可正常选中
- 表单组件值变化事件：8 个表单组件 (input/select/number/checkbox/radio/date/date-time-slot/textarea) 转发原生 DOM change 事件
- 字段选择器：`useWidgetOptions` 新增 `allWidgetOptions`，包含所有组件 ID

### Removed
- 移除 `useRuleEngine` 桥接 composable（用户要求直接对齐事件引擎）

## [1.0.0-rc.1] - 2026-05-21

### Added
- 全部 13 个阶段实现完成
- 28 个组件接入变量/exposed 系统
- 结构化条件构建器
- 事件配置对话框
- 规则配置对话框
