# FormGrid 迭代进度与验收表

**更新日期**: 2026-05-15
**当前 Sprint**: Sprint 20（已完成）— 1.0 RC

---

## 一、已完成 Sprint 总览

| Sprint | 核心交付 | 完成日期 | 状态 |
|--------|----------|----------|------|
| S7 | 全宽组件 + 编辑器工具栏（复制/删除/移动/对齐/快捷键） | — | ✅ Done |
| S8 | 属性面板深度配置（联动/API/JSON导入/分段布局） | — | ✅ Done |
| S9 | 撤销/重做 + 拖拽排序 + Group/Ungroup | — | ✅ Done |
| S10 | 嵌套容器拖拽 + 多选 + Schema 结构树 | — | ✅ Done |
| S11 | 递归容器拖拽 + Schema 校验 + LinkageConfig 性能修复 | — | ✅ Done |
| A-D | search-list SchemaType（业务列表渲染器） | — | ✅ Done |
| API-Schema | Test Connection → Analyze → Generate Schema 链路打通 | — | ✅ Done |
| 批量/badge | search-list 批量操作 + badge colored pill 渲染 | — | ✅ Done |

---

## 二、Sprint 14 进度

### 已完成

| 任务 | 内容 | 交付物 | 状态 |
|------|------|--------|------|
| T1 | search-list 属性面板可视化编辑 | `ColumnsEditor.vue`, `SearchFieldsEditor.vue`, `RowActionsEditor.vue`, `ButtonEditor.vue` | ✅ Done |
| T1 | PropertyPanel 集成 | 替换所有 "configured in JSON view" 占位 | ✅ Done |
| T2 | 核心单元测试（228 个测试） | 12 个 spec 文件覆盖 12 个模块 | ✅ Done |
| T2 | CI 流水线 | `.github/workflows/ci.yml` | ✅ Done |

**Sprint 14 状态**: ✅ 已完成（2026-05-15 验收通过）

---

## 三、Sprint 15 进度

**主题**: Production Hardening（生产就绪加固）
**预估**: 10 人天 | **开始**: 2026-05-15

### 已完成

| 任务 | 优先级 | 内容 | 预估 | 负责 | 状态 |
|------|--------|------|------|------|------|
| T4 | P0 | 错误边界组件 | 1.5 天 | 开发 A | ✅ Done |
| T3 | P0 | 列表导出功能 (CSV/Excel) | 3 天 | 开发 B | ✅ Done |
| NEW-1 | P0 | 搜索列表渲染器加固（加载/空/错误状态） | 2 天 | 开发 A | ✅ Done |
| NEW-2 | P0 | 编辑器→渲染器集成测试 | 2 天 | 开发 A | ✅ Done |
| T6 | P1 | 样式穿透问题修复（CSS 变量方案） | 1.5 天 | 开发 B | ✅ Done |

**Sprint 15 状态**: ✅ 已完成（2026-05-15）

### Sprint 15 交付总结

| 指标 | 数值 |
|------|------|
| 新增文件 | 5 个（ErrorBoundary.vue, exportUtils.ts, 3 个测试 spec） |
| 修改文件 | 5 个（SchemaRender.vue, index.vue, FgSearchList.vue, FgCard.vue, FgToolbar.vue） |
| 测试总数 | 228 → **257**（+29: +5 ErrorBoundary +14 export +10 integration） |
| 类型检查 | ✅ 零错误 |
| CI 就绪 | ✅ |

### 推迟（Sprint 16+）

| 任务 | 原因 |
|------|------|
| T5 API 推断精度增强 | 信心度低(60%)，需更多用户调研 |
| T7 表单校验规则 UI 编辑器 | 锦上添花，JSON 配置已可用 |
| 编辑器 gap 补齐（column/row action 缺失字段） | 仅高级用户影响，与编辑器 UX Sprint 批量处理 |
| ButtonEditor 结构化 SchemaAction 编辑 | 当前可用，推迟到编辑器 UX Sprint |
| 列可见性切换 | 依赖渲染器加固完成 |
| 批量操作 UI | 预留 Sprint 17「高级列表功能」 |

---

## 四、项目能力矩阵

| 维度 | 完成度（Sprint 15 后） | 评分 | 冲刺 16 目标 |
|------|------------------------|------|-------------|
| 表单渲染 | 87% | B+ | 87% |
| 列表渲染 | 78% | B+ | 82% |
| 可视化编辑器 | 68% | B- | 72% |
| API→Schema 生成 | 55% | C+ | 55% |
| 工程化质量 | 68% | B- | 72% |
| **综合** | **~72%** | — | **~76%** |

---

## 四 B、Sprint 16 进度

**主题**: Linkage & API Deepening（联动与请求配置深化）
**预估**: 10 人天 | **开始**: 2026-05-15 | **状态**: ✅ 已完成

### 已完成

| # | 任务 | 优先级 | 内容 | 状态 |
|---|------|--------|------|------|
| SP16-001 | P0 | API Config 添加 dataPath | ✅ Done |
| SP16-002 | P0 | 响应解析归一化 (responseNormalizer.ts) | ✅ Done |
| SP16-003 | P1 | API 模板参数 + SearchFields/Columns 编辑器补全 | ✅ Done |
| SP16-004 | P0 | 联动 elseValue 运行时实现 | ✅ Done |
| SP16-005 | P1 | set-value 联动类型（字面值 + 字段引用） | ✅ Done |
| SP16-006 | P1 | Dialog Schema 渲染 + 数据隔离 + 编辑器 | ✅ Done |
| SP16-007 | P1 | 集成测试 + 回归守卫 | ✅ Done |

### Sprint 16 交付总结

| 指标 | 数值 |
|------|------|
| 新增文件 | 2 个（responseNormalizer.ts, useDynamicOptions.spec.ts） |
| 修改文件 | 10 个（types.ts, useDynamicOptions.ts, useListData.ts, useLinkage.ts, ApiConfig.vue, SearchFieldsEditor.vue, ColumnsEditor.vue, LinkageConfig.vue, RowActionsEditor.vue, PropertyPanel.vue, SchemaRender.vue, index.vue, FgSearchList.vue, FgDialog.vue, editor-renderer-integration.spec.ts, useLinkage.spec.ts, sprint-progress.md） |
| 测试总数 | 257 → **290**（+33: +19 responseNormalizer +8 linkage +6 integration） |
| 类型检查 | ✅ 零错误 |
| CI 就绪 | ✅ |

### 推迟（Sprint 17+）

| 任务 | 原因 |
|------|------|
| ButtonEditor 结构化 SchemaAction 编辑 | 当前 JSON textarea 可用，S16 已补 dialogSchema |
| 批量操作 UI | 高价值但独立模块 |
| 列可见性切换 | 依赖稳定后推进 |
| 校验规则 UI 编辑器 | JSON 配置已可用 |
| API 推断精度增强 | 需更多用户调研 |

---

## 四 C、项目能力矩阵（Sprint 17 后）

| 维度 | 完成度 | 评分 | 冲刺 18 目标 |
|------|--------|------|-------------|
| 表单渲染 | 87% | B+ | 87% |
| 列表渲染 | 82% | B+ | 88% |
| 可视化编辑器 | 75% | B- | 88% |
| API→Schema 生成 | 55% | C+ | 55% |
| 工程化质量 | 78% | B | 78% |
| **综合** | **~78%** | — | **~85%** |

---

## 四 D、Sprint 17 进度

**主题**: Options & Table Deepening（选项与表格深化）
**预估**: 8.5 人天 | **开始**: 2026-05-15 | **状态**: ✅ 已完成

### 已完成

| # | 任务 | 优先级 | 内容 | 状态 |
|---|------|--------|------|------|
| SP17-001 | P0 | childrenKey 树形选项消费 | ✅ Done |
| SP17-002 | P0 | FgTable 显示态列 label 增强 | ✅ Done |
| SP17-003 | P1 | reset-fields 联动类型 | ✅ Done |
| SP17-004 | P1 | 选项缓存 TTL 支持 | ✅ Done |
| SP17-005 | P1 | Schema 校验规则扩展 (4 P0 rules) | ✅ Done |

### Sprint 17 交付总结

| 指标 | 数值 |
|------|------|
| 新增文件 | 0 |
| 修改文件 | 9（types.ts, useDynamicOptions.ts, optionsCache.ts, schemaValidate.ts, ApiConfig.vue, LinkageConfig.vue, FgTable.vue, index.vue, useDynamicOptions.spec.ts） |
| 测试总数 | 290 → **295**（+5: +4 TTL +1 childrenKey） |
| 类型检查 | ✅ 零错误 |
| CI 就绪 | ✅ |

---

## 五、验收清单（Sprint 14）

### 功能验收

- [x] 编辑器中选中 search-list 组件，属性面板显示 Columns/Search Fields/Row Actions/Buttons 四个真实编辑器
- [x] ColumnsEditor 可增删改列定义，支持上移下移排序
- [x] SearchFieldsEditor 可配置 7 种搜索字段类型，支持动态选项 API URL
- [x] RowActionsEditor 按 action type 条件显示配置字段
- [x] ButtonEditor 可编辑工具栏按钮的 text/type/actions JSON
- [x] PropertyPanel 中不再出现 "configured in JSON view" 占位文字
- [x] button-list/toolbar-buttons 类型有 Buttons 编辑面板
- [x] API Config 测试连接成功后显示 "Analyze & Generate Schema" 按钮
- [x] 点击 Analyze 后弹出对话框，可选 "Use as Form Fields" 或 "Use as Table Columns"
- [x] JsonImporter 支持 "Paste JSON" 和 "Fetch from URL" 两种输入模式
- [x] search-list badge 列渲染为 colored pill

### 工程验收

- [x] `npx vue-tsc --noEmit` 零错误
- [x] `pnpm test` 全部通过（当前 257 个测试，15 个 spec 文件覆盖 15 个模块）
- [x] `.github/workflows/ci.yml` 存在且配置正确

### 已知不足（Sprint 15/16 计划修复）

- ColumnsEditor 缺少 `tooltipField`、`linkEvent`、`imageWidth`、`renderFn` UI
- RowActionsEditor 缺少 `icon`、`navigateQuery`、`dialogSchema` UI
- ButtonEditor actions 为 JSON 自由文本（非结构化编辑）
- 缺少编辑器组件单元测试和编辑器→渲染器集成测试

---

## 六、Sprint 15 验收清单

### 功能验收

- [x] 向 schema 注入故意出错的组件，整个表单不崩溃，其他组件正常工作
- [x] 错误边界显示错误信息 + 重试按钮，点击重试重新渲染
- [x] 有数据时点击导出按钮下载有效 CSV 文件
- [x] 有数据时点击导出按钮下载有效 Excel 文件
- [x] 加载中显示骨架屏而非空白
- [x] 数据为空时显示空状态（非光秃秃的"无数据"）
- [x] 请求失败时显示错误信息和重试按钮
- [x] 复杂嵌套布局（card > tabs > form）中样式不穿透不冲突

### 工程验收

- [x] `npx vue-tsc --noEmit` 零错误
- [x] `pnpm test` 全部通过（257 个测试，15 个 spec 文件）
- [x] CI 流水线（typecheck + test）绿色
- [x] 新增编辑器→渲染器集成测试全部通过

---

## 七、Sprint 16 验收清单

### API Config
- [x] `SchemaApiConfig.dataPath` 支持 dot-notation（如 `result.records`）
- [x] 无 dataPath 时向后兼容（回退链不变）
- [x] `responseNormalizer.ts` 为唯一数据提取源（4 处归一为一）
- [x] `${formData.field}` 模板替换在 params 中工作
- [x] SearchFieldsEditor 暴露完整 API 配置字段（method/params/dataPath/labelKey/valueKey）
- [x] ColumnsEditor 暴露列的 API 配置（tag/badge 类型）
- [x] ApiConfig.vue 有 dataPath 输入

### 联动
- [x] elseValue 运行时生效（条件 false → 回退值写入 LinkageState）
- [x] set-value 联动类型工作（A 变化 → targetValue 反映在 LinkageState）
- [x] set-value + valueSource 字段值复制
- [x] set-value + thenValue 字面值设置
- [x] 循环检测对 set-value 仍然有效
- [x] LinkageConfig.vue 有 "Set Value" 类型选项及 thenValue/valueSource 输入
- [x] SchemaRender 监听 linkageState elseValue/targetValue 并写入 formData

### Dialog
- [x] FgDialog 通过 SchemaRender 渲染 dialogSchema
- [x] Dialog 有独立 formData（与父表单隔离）
- [x] Dialog confirm 回传内部 formData
- [x] Dialog cancel 丢弃修改
- [x] PropertyPanel 有 Dialog 编辑区（title/width/schema JSON）
- [x] RowActionsEditor 暴露 dialogSchema 编辑（JSON textarea）
- [x] index.vue 内置 open-dialog 事件处理并渲染 FgDialog

### 工程
- [x] `npx vue-tsc --noEmit` 零错误
- [x] `pnpm test` 全部通过（290 个测试，16 个 spec 文件）
- [x] CI 绿色
- [x] 现有测试零回归

---

## 八、Sprint 17 预览

| 任务 | 理由 |
|------|------|
| ButtonEditor 结构化 SchemaAction 编辑 | 当前 JSON textarea 可用，S16 已补 dialogSchema |
| 批量操作 UI | 高价值但独立模块，需列表功能稳定后推进 |
| 列可见性切换 | 依赖渲染器稳定 |
| 校验规则 UI 编辑器 | JSON 配置已可用，锦上添花 |
| API 推断精度增强 | 需更多用户调研实际 API 响应格式 |
| FgTable 消费列 API 动态选项 | 列 api 字段已有编辑器，运行时消费待补 |

---

## 九、Sprint 18 进度

**主题**: Editor UX Completion（编辑器补齐）
**预估**: 10.5 人天 | **状态**: ✅ 已完成

| # | 任务 | 优先级 | 内容 | 状态 |
|---|------|--------|------|------|
| SP18-001 | P0 | ButtonEditor 结构化 SchemaAction 编辑 | ✅ Done |
| SP18-002 | P0 | RulesEditor 校验规则可视化编辑器 | ✅ Done |
| SP18-003 | P1 | 编辑器字段补齐（tooltipField/linkEvent/imageWidth/renderFn/icon/navigateQuery） | ✅ Done |
| SP18-004 | P1 | 组件属性面板补齐（注入 validateSchema 实时校验） | ✅ Done |
| SP18-005 | P1 | 编辑器 Schema 校验实时反馈 | ✅ Done |

**交付**: 新增 RulesEditor.vue | 重写 ButtonEditor（JSON textarea → 结构化 per-action 表单）| 295 测试零回归

---

## 十、Sprint 19 — 业务组件深化 + 文档

**主题**: 文件预览组件 / 复杂按钮联动 / 组件文档预览
**预估**: 8 人天 | **开始**: 2026-05-15

| # | 任务 | 优先级 | 内容 |
|---|------|--------|------|
| SP19-001 | P0 | 文件选择预览组件 FgFilePreview（两列布局：左文件列表 + 右选择按钮弹窗） |
| SP19-002 | P0 | 复杂按钮/多选联动配置（多选→单选联动、checkbox→visible联动细化） |
| SP19-003 | P1 | 组件文档预览页面（按分类展示、每组件一页含预览/schema/props/API配置） |
| SP19-004 | P0 | 一期目标对齐验收（搜索列表+表单详情+联动配置完整闭环验证） |

### Sprint 19 交付总结

| 指标 | 数值 |
|------|------|
| 新增文件 | 3（FgFilePreview.vue, component-catalog.html, linkage-demo.ts） |
| 修改文件 | 5（compMap.ts, SchemaRender.vue, index.vue, FgTable.vue, PropertyPanel.vue） |
| 测试总数 | 295（零回归） |
| 类型检查 | ✅ 零错误 |
| CI 就绪 | ✅ |

**Sprint 19 状态**: ✅ 已完成（2026-05-15）

---

## 十一、项目能力矩阵（Sprint 19 最终）

| 维度 | 完成度 | 评分 | 一期目标 | 差距 |
|------|--------|------|----------|------|
| 表单渲染 | 87% | B+ | 90% | 大规模 schema 性能未验证 |
| 列表渲染 | 88% | B+ | 90% | 批量操作 UI 未完成 |
| 可视化编辑器 | 88% | B+ | 85% | 校验规则可视编辑器缺位 |
| API→Schema 生成 | 55% | C+ | 55% | 推断精度待用户反馈 |
| 工程化质量 | 78% | B | 90% | 组件测试覆盖不足 |
| **综合** | **~80%** | **B+** | **85%** | **测试+文档+性能** |

---

## 十二、Sprint 20 — Testing & Hardening（1.0 RC 目标）

**主题**: 测试补全 + 性能基线 + 文档交付
**预估**: 12 人天 | **目标**: 1.0-rc.0

| # | 任务 | 优先级 | 内容 | 预估 |
|---|------|--------|------|------|
| SP20-001 | P0 | SchemaRender.vue 单元测试（4 条渲染路径 + 边界用例） | 3d |
| SP20-002 | P0 | FgTable / FgSearchList 组件测试 + 响应式数据流 | 2.5d |
| SP20-003 | P1 | Playwright E2E 冒烟测试（5 条关键用户路径） | 2d |
| SP20-004 | P1 | 性能基准测试 + 大规模 schema 压力测试（200 项） | 1.5d |
| SP20-005 | P1 | CLAUDE.md + 架构文档更新（29 类型、新文件、数据流） | 1d |
| SP20-006 | P1 | 宿主应用集成指南（qiankun props 协议、CSS 隔离、API） | 1.5d |
| SP20-007 | P2 | 无障碍基线（表单控件 ARIA 标签、键盘导航审计） | 1d |

### Sprint 20 Exit Criteria

- [ ] 360+ 测试（目标 +65 新增）
- [ ] SchemaRender.vue 行覆盖率 >= 70%
- [ ] E2E 冒烟套件 CI 通过
- [ ] 100 项 schema 渲染 <2s
- [ ] 集成指南已发布
- [ ] 0 个 Critical/High 级未关闭风险

---

## 十三、Post-1.0 待办

| 条目 | 预估 | 价值 |
|------|------|------|
| 完整无障碍审计（WCAG 2.1 AA） | 5d | 合规与包容性 |
| 列可见性切换 UI | 1.5d | 用户需求 |
| 批量操作 UI（search-list） | 3d | 高级用户需求 |
| API 推断精度增强 | 3d | 需用户调研 |
| 校验规则可视化编辑器 | 2d | 消除最后 JSON textarea |
| person-select/dept-select 树深度支持 | 2.5d | 企业需求 |
| qiankun 多实例测试 | 1.5d | 生产加固 |
| 打包体积优化（Element Plus tree-shaking） | 2d | 性能 |

---

## 十四、历史风险关闭记录

| 风险 | 发现 | 关闭 | 方案 |
|------|------|------|------|
| childrenKey 死代码 | S16 PM Audit | S17 | 实现树形选项消费 |
| optionsCache 无 TTL | S16 PM Audit | S17 | 逐条目 TTL 过期 |
| 响应解析 4 处重复 | S16 发现 | S16 | responseNormalizer 归一 |
| ButtonEditor JSON textarea | S14 已知不足 | S18 | 结构化 per-action 表单 |
| FgTable 列 API 非响应式 | S16 PM Audit | S17 | 改为 watch props |
