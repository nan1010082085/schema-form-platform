# Schema Form Platform 团队角色定义

> 更新时间：2026-05-20

---

## 角色概览

| 角色 | 人数 | 核心职责 |
|------|------|----------|
| 前端架构师 | 1 | 整体架构设计、公共基础支撑、技术决策 |
| 前端组件工程师 | 1 | 组件开发、属性配置联动、渲染引擎 |
| 服务端工程师 | 1 | API 开发、数据库设计、部署运维 |
| 产品经理 | 1 | 需求管理、用户体验、项目推进 |

---

## 一、前端架构师

### 角色定位
负责前端整体架构设计与公共基础能力建设，确保系统可扩展性、可维护性和性能表现。

### 核心职责

#### 1.1 架构设计与治理
- 主导前端技术架构演进方向
- 制定并推行编码规范、组件规范、样式规范
- 设计 EditorView 与 FormGrid 的交互边界
- 规划双 Store（editorStore/schemaStore）的统一或隔离策略
- 评估引入新技术/框架的可行性

#### 1.2 公共基础支撑
- **状态管理（6个 Store）**
  - useEditorStore - 编辑器核心状态
  - useSchemaStore - 画布编辑器状态
  - useSchemaStore (API) - Schema CRUD
  - useAppStore - 应用全局状态
  - usePropertyStore - 属性面板状态
  - useRequestStore - 请求队列与缓存

- **Composables（16个）**
  - 核心：useFormData、useHistory、useLinkage、useLifecycle
  - 编辑器：useDragEditor、useEditorLayout、useModeControl、useLeftPanelManage
  - 渲染：useDynamicOptions、useBreakpoint、useListData
  - 工具：useConstant、useIdGenerate、useLocale、useInteractionControl、useRightPanelConfig

- **工具函数（11个）**
  - 核心：expression.ts（表达式引擎）、actionExecutor.ts（动作系统）
  - 数据：apiClient.ts、request.ts、requestQueue.ts
  - 转换：schemaTransform.ts、jsonToSchema.ts、schemaDefaults.ts
  - 校验：schemaValidate.ts
  - 导出：exportUtils.ts
  - 缓存：optionsCache.ts
  - 认证：auth.ts

#### 1.3 基础设施建设
- Vercel 部署配置与优化
- qiankun 微前端集成
- TypeScript 配置与类型系统设计
- 构建流程优化（Vite 配置）
- 测试框架搭建与覆盖率体系

#### 1.4 性能与质量保障
- 大 Schema 场景性能优化
- 组件懒加载策略
- 内存泄漏防范
- 代码审查与技术债务治理

### 技术决策范围
- Store 架构设计
- Composables 抽象层级
- 类型系统设计
- 构建与部署策略
- 测试策略

### 协作关系
- 指导**前端组件工程师**的组件实现方案
- 与**服务端工程师**对齐 API 契约
- 向**产品经理**评估技术可行性与工期

---

## 二、前端组件工程师

### 角色定位
专注于组件开发与属性配置联动，确保每个组件都有完整的属性配置能力，且配置必须能正常生效。

### 核心职责

#### 2.1 组件开发（37个组件）

**核心原则：每个组件必须有对应的属性配置面板，组件的每一个可配置行为都通过 Schema 属性驱动。**

**基础组件（9个）维护与扩展：**
- FormInput / FormNumber / FormSelect / FormRadio / FormCheckbox
- FormDate / FormDateRange / FormTextarea / FormRichText
- 关注点：Element Plus 集成、表单校验、数据绑定、属性配置

**布局组件（8个）维护与扩展：**
- FgPage / FgToolbar / FgCard / FgTitle / FgDivider / FgSpacer
- FgSteps / FgTabs
- 关注点：插槽机制、嵌套规则、响应式布局、属性配置

**业务组件（20个）维护与扩展：**
- 数据展示：FgTable、FgPagination、FgFileList、FgFilePreview
- 选择器：FgPersonSelect、FgDeptSelect、FgTransfer
- 容器：FgDialog、FgFormContainer、FgTreeLayout、FgBanner
- 按钮：FgSchemaButtonList、FgButtonList、FgToolbarButtons
- 高级：FgSearchList、FgEditableTable、FgWorkflowForm、FgDetailForm
- 上传：FgUpload
- 时间：FgDateTimeSlot

#### 2.2 属性配置系统（每个组件的核心配套）

**属性配置是组件开发不可分割的一部分，每个组件都必须：**
1. 定义完整的 Schema 类型接口（所有可配置项）
2. 实现对应的属性面板编辑器
3. 确保配置变更能实时生效
4. 提供合理的默认值

**属性面板编辑器组件（14个）：**
- PropertyPanel - 属性面板主容器
- PropertySection - 折叠段落
- ApiConfig - API 配置编辑器
- LinkageConfig - 联动配置编辑器
- RulesEditor - 校验规则编辑器
- ColumnsEditor - 表格列编辑器
- SearchFieldsEditor - 搜索字段编辑器
- RowActionsEditor - 行操作编辑器
- ButtonEditor - 按钮编辑器

**配置联动逻辑：**
- 根据 SchemaType 动态渲染属性项
- 属性变更实时预览
- 联动规则配置（visible/disabled/required/options/set-value/reset-fields）
- API 配置（动态选项、数据回填）
- 校验规则配置

#### 2.3 渲染引擎

**核心模块：**
- SchemaRender.vue - 递归渲染引擎
- compMap.ts - 组件映射注册
- types.ts - 类型定义（653行）

**渲染能力：**
- Schema 驱动递归渲染
- 栅格布局（响应式 span）
- 动态选项加载（API/字典）
- 字段联动执行
- 表达式求值
- 生命周期钩子触发

#### 2.4 编辑器画布

**画布组件：**
- EditorCanvas - 中央画布
- CanvasNode - 节点渲染
- ComponentPanel - 组件面板
- SchemaTree - 结构树

**交互能力：**
- 拖拽添加/移动组件
- 多选操作
- 分组/取消分组
- 对齐与分布
- 缩放与平移

### 技术关注点
- 组件 API 一致性
- CSS Module 样式隔离
- Schema 配置驱动
- 组件嵌套唯一规则（只嵌套在布局组件内）
- 无障碍访问（a11y）

### 协作关系
- 接受**前端架构师**的技术指导
- 与**服务端工程师**对接数据结构
- 向**产品经理**演示组件能力与交互效果

---

## 三、服务端工程师

### 角色定位
负责后端 API 开发、数据库设计、系统部署与运维，保障服务端的稳定性、安全性和可扩展性。

### 核心职责

#### 3.1 API 开发

**已实现 API（7个）：**
- GET /api/schemas - Schema 列表（分页+搜索+筛选）
- POST /api/schemas - 创建 Schema
- GET /api/schemas/published/:sourceId - 获取发布版本
- GET /api/schemas/:id - 获取单个 Schema
- PUT /api/schemas/:id - 更新 Schema
- POST /api/schemas/:id/publish - 发布 Schema（upsert）
- DELETE /api/schemas/:id - 删除 Schema（同时删除发布版本）

**待实现 API：**
- 用户认证（登录/注册/登出）
- 权限校验中间件
- 操作日志记录

#### 3.2 数据库设计

**已实现模型：**
- FormSchema - 草稿表（UUID主键、name/type/status/json/publishId）
- PublishedSchema - 发布表（upsert 策略）
- User - 用户模型（bcrypt 密码加密）

**待实现：**
- 权限模型（Role/Permission）
- 操作日志模型（AuditLog）

#### 3.3 中间件与安全

**已实现：**
- errorHandler - 统一错误处理
- helmet - 安全头
- bodyParser - 请求解析
- CORS - 跨域配置

**待实现：**
- JWT 认证中间件
- 权限校验中间件
- 请求限流
- 日志记录

#### 3.4 部署与运维

**已实现：**
- Vercel Serverless Functions 配置
- MongoDB Atlas 生产环境
- Docker MongoDB 本地开发
- 环境变量管理

**待优化：**
- 监控告警
- 日志收集
- 性能监控
- 备份策略

### 技术栈
- **运行时**: Node.js + ESM
- **框架**: Koa.js
- **数据库**: MongoDB (Mongoose ODM)
- **认证**: JWT + bcryptjs
- **部署**: Vercel Serverless

### 协作关系
- 与**前端架构师**对齐 API 契约与数据结构
- 响应**前端组件工程师**的数据需求
- 向**产品经理**汇报后端进度与风险

---

## 四、产品经理

### 角色定位
负责产品需求管理、用户体验设计、项目推进与跨角色协调，确保产品方向正确、交付及时。

### 核心职责

#### 4.1 需求管理

**需求来源：**
- 用户反馈与调研
- 业务方需求
- 技术驱动需求
- 竞品分析

**需求处理：**
- 需求收集与整理
- 需求优先级排序（P0/P1/P2）
- 需求文档编写
- 需求评审组织

#### 4.2 用户体验

**核心用户场景：**
- 表单设计（可视化编辑器）
- 表单填写（渲染器）
- 表单管理（实例列表）
- Schema 发布与预览

**体验优化方向：**
- 编辑器易用性
- 组件配置效率
- 表单填写体验
- 错误提示友好性

#### 4.3 项目推进

**项目管理：**
- 迭代计划制定
- 进度跟踪与风险预警
- 跨角色协调
- 交付验收

**里程碑管理：**
- 功能完整性检查
- 质量标准把控
- 发布计划协调

#### 4.4 数据驱动

**关键指标：**
- Schema 创建数量
- 表单提交量
- 用户活跃度
- 功能使用率

**数据收集：**
- 埋点方案设计
- 数据看板搭建
- 用户行为分析

### 协作关系
- 向**前端架构师**提出架构需求与体验优化建议
- 向**前端组件工程师**明确组件功能与交互要求
- 向**服务端工程师**提出 API 需求与数据要求
- 协调三方解决跨领域问题

---

## 五、协作流程

### 5.1 需求流程
```
产品经理（需求） → 前端架构师（技术评估） → 分配至组件工程师/服务端工程师
```

### 5.2 开发流程
```
前端架构师（方案设计） → 前端组件工程师（实现） → 前端架构师（代码审查）
服务端工程师（API 开发） → 前端组件工程师（联调） → 产品经理（验收）
```

### 5.3 发布流程
```
前端组件工程师（功能完成） → 前端架构师（质量检查） → 服务端工程师（部署） → 产品经理（验收）
```

---

## 六、当前工作重点

### 前端架构师
- 双 Store 架构统一方案
- 测试覆盖率体系建设
- 性能优化方案

### 前端组件工程师
- 属性面板组件测试补充
- 编辑器交互测试
- 新业务组件开发

### 服务端工程师
- 用户认证路由实现
- 权限控制中间件
- 日志系统搭建

### 产品经理
- 用户认证需求梳理
- 操作日志需求定义
- 下一迭代规划
