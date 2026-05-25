# Changelog

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
