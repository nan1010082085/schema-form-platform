# SaaS Agent Workflow 工作流产品方案

## 一、产品定位

**一句话**：让用户通过"描述需求 → AI 生成 → 可视化调整 → 一键发布"四步，完成从表单搭建到审批流程的全链路配置。

**与 Dify 的差异**：Dify 是 AI 应用编排平台，我们是**业务流程自动化平台**。Dify 编排的是 LLM 调用链，我们编排的是"表单 → 审批 → 数据更新"的业务链。

---

## 二、现有能力盘点

| 能力 | 包 | 成熟度 | 可直接复用 |
|------|-----|--------|-----------|
| 可视化表单编辑器 | editor | 高（53 Widget） | 表单搭建、Schema 驱动渲染 |
| BPMN 流程设计器 | flow | 高（完整引擎） | 流程建模、UserTask、网关、多实例 |
| 审批任务收件箱 | flow | 高 | 待办/已办、委派、驳回到节点、批量审批 |
| 表单提交 + 状态管理 | server | 中 | FormSubmission CRUD、状态流转 |
| AI 对话式生成 | ai-app | 中 | Schema 生成、Flow 生成、增量编辑 |
| 跨节点数据透传 | flow | 中 | 上游表单数据 → 下游节点 |
| 节点表单关联 | flow | 高 | formSchemaId + formMode + editableFields |
| 审计日志 | server | 高 | 全操作审计 |
| 多租户 | server | 高 | tenantPlugin 全局注入 |

**关键缺口**：
1. **Workflow 概念层缺失** — 没有"Workflow"实体将表单 + 流程 + 数据更新串联为一个完整业务单元
2. **表单提交 → 流程启动的自动触发** — 当前是断开的
3. **审批完成 → 数据更新** — 没有自动回调机制
4. **Workflow 可视化编排界面** — 没有统一的"创建 Workflow"入口

---

## 三、用户角色与核心场景

### 角色

| 角色 | 描述 | 核心诉求 |
|------|------|---------|
| **流程管理员** | 配置业务流程的人 | 快速搭建完整 Workflow，不需要写代码 |
| **审批人** | 处理审批任务的人 | 清晰看到审批内容，快速处理 |
| **表单填写人** | 发起业务申请的人 | 简单填写，实时看到进度 |

### 核心场景（用户旅程）

```
流程管理员：
  创建 Workflow → 描述需求(AI 生成) → 调整表单 → 配置审批流程 → 发布

表单填写人：
  打开表单 → 填写 → 提交 → 查看审批进度

审批人：
  收到通知 → 查看审批表单 → 填写意见 → 通过/驳回

系统自动：
  审批完成 → 更新数据 → 通知相关人
```

---

## 四、产品方案设计

### 4.1 Workflow 实体设计

Workflow 是顶层业务单元，包含三个子资源：

```typescript
interface Workflow {
  id: string
  name: string                    // "请假审批" / "采购申请"
  description?: string
  status: 'draft' | 'published' | 'archived'

  // 三个核心关联
  formSchemaId: string            // 关联的表单 Schema
  flowDefinitionId: string        // 关联的流程定义
  dataUpdateRules: DataUpdateRule[]  // 审批完成后的数据更新规则

  // 发布配置
  publishConfig: {
    entryUrl: string              // 发布后的访问地址
    permissions: {
      launchers: string[]         // 谁可以发起
      viewers: string[]           // 谁可以查看
    }
  }

  tenantId: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

interface DataUpdateRule {
  trigger: 'on-approved' | 'on-rejected' | 'on-completed'
  targetCollection: string        // 目标数据集合
  fieldMapping: Record<string, string>  // 表单字段 → 数据字段映射
  condition?: string              // 条件表达式
}
```

### 4.2 Workflow 编排界面

**设计原则**：一个入口，三步完成。

```
┌─────────────────────────────────────────────────────┐
│  Workflow 编排器                                      │
│                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐       │
│  │ 1. 表单   │───→│ 2. 流程   │───→│ 3. 数据   │       │
│  │          │    │          │    │          │       │
│  │ [AI 生成] │    │ [AI 生成] │    │ [自动配置] │       │
│  │ [可视化]  │    │ [可视化]  │    │ [手动调整] │       │
│  └──────────┘    └──────────┘    └──────────┘       │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │  AI 助手面板                                  │    │
│  │  "我需要一个请假审批流程，请假类型包含         │    │
│  │   年假/事假/病假，需要部门经理和HR两级审批"    │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

**Step 1：表单搭建**
- 方式 A：AI 对话生成（输入需求描述，AI 生成 Schema）
- 方式 B：从模板选择（预置常用审批表单模板）
- 方式 C：可视化拖拽（打开 editor 编辑器）
- 产出：FormSchema（关联到 Workflow）

**Step 2：流程配置**
- 方式 A：AI 根据表单字段自动推荐流程（如检测到"请假类型"→ 推荐两级审批）
- 方式 B：打开 flow 设计器可视化配置
- 方式 C：从流程模板选择
- 产出：FlowDefinition（关联到 Workflow）

**Step 3：数据更新配置**
- 审批通过后：更新业务数据状态
- 审批驳回后：回写驳回原因
- 可视化字段映射：表单字段 → 数据字段

### 4.3 审批表单机制

**已有能力**：flow 的 BpmnNodeConfig 已支持 `formSchemaId` + `formMode` + `editableFields`。

**需要增强**：

| 能力 | 现状 | 增强 |
|------|------|------|
| 节点表单关联 | 已有 formSchemaId | 增加"使用发起人表单"快捷选项 |
| 表单模式 | edit/view/readonly/partial | 保持现有，增加"仅查看特定区域" |
| 表单数据回填 | 已有 CrossNodeResolver | 自动回填发起人填写的数据 |
| 审批意见 | 已有 comment | 增加"审批意见"专用字段组件 |

### 4.4 数据更新机制

**设计方案**：ServiceTask + 数据更新配置

```
审批完成
  ↓
ServiceTask 触发
  ↓
读取 DataUpdateRule
  ↓
执行字段映射
  ↓
更新目标数据集合
  ↓
记录审计日志
```

**实现方式**：
- 在 FlowDefinition 的 EndEvent 前插入自动 ServiceTask
- ServiceTask 的 serviceConfig 包含数据更新规则
- 流程引擎执行 ServiceTask 时调用数据更新 API

### 4.5 AI 能力集成

**AI 在 Workflow 中的角色**：

| 场景 | AI 能力 | 实现方式 |
|------|---------|---------|
| 创建 Workflow | 自然语言 → Schema + Flow | ai-app 的 editor/flow Agent |
| 智能推荐 | 根据表单字段推荐审批流程 | 新增 workflow Agent |
| 审批辅助 | 总结申请内容、推荐审批意见 | 新增审批 Agent |
| 数据映射 | 自动识别字段对应关系 | 表单字段分析 |

---

## 五、技术架构

### 5.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    Portal (主入口)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Editor   │  │  Flow    │  │  AI App  │  │Workflow │ │
│  │ (表单)   │  │ (流程)   │  │ (AI)    │  │(编排器) │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │              │              │              │      │
│       └──────────────┴──────────────┴──────────────┘      │
│                          │                                │
│                    ┌─────┴─────┐                          │
│                    │  Server   │                          │
│                    │  ┌─────┐  │                          │
│                    │  │ API │  │                          │
│                    │  └──┬──┘  │                          │
│                    │     │     │                          │
│                    │  ┌──┴──┐  │                          │
│                    │  │ DB  │  │                          │
│                    │  └─────┘  │                          │
│                    └───────────┘                          │
└─────────────────────────────────────────────────────────┘
```

### 5.2 新增数据模型

```typescript
// packages/server/src/models/Workflow.ts
interface IWorkflow {
  _id: string
  name: string
  description?: string
  status: 'draft' | 'published' | 'archived'
  formSchemaId: string          // 关联 FormSchema
  flowDefinitionId: string      // 关联 FlowDefinition
  dataUpdateRules: DataUpdateRule[]
  publishConfig: {
    entryUrl: string
    permissions: {
      launchers: string[]
      viewers: string[]
    }
  }
  tenantId: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}
```

### 5.3 新增 API

```
POST   /api/workflows                    # 创建 Workflow
GET    /api/workflows                    # 列表
GET    /api/workflows/:id                # 详情
PUT    /api/workflows/:id                # 更新
DELETE /api/workflows/:id                # 删除
POST   /api/workflows/:id/publish        # 发布
POST   /api/workflows/:id/start          # 发起流程实例
GET    /api/workflows/:id/instances      # 流程实例列表
```

### 5.4 前端路由规划

```
/workflow                    # Workflow 列表页
/workflow/create             # 创建 Workflow（AI 对话 + 向导）
/workflow/:id                # Workflow 详情/编排
/workflow/:id/preview        # 预览（表单 + 流程可视化）
/workflow/:id/start          # 发起申请（填写表单）
```

---

## 六、实现路线图

### Phase 1：Workflow 基础框架（1-2 周）

**目标**：建立 Workflow 实体，打通表单 → 流程的关联。

**任务**：
1. [server] 新增 Workflow 数据模型 + API
2. [editor] 表单 Schema 增加 workflowId 关联字段
3. [flow] 流程定义增加 workflowId 关联字段
4. [portal] Workflow 列表页 + 详情页骨架

**验收标准**：
- 可以创建 Workflow 并关联已有表单和流程
- Workflow 列表页可以展示所有 Workflow

### Phase 2：Workflow 编排器（2-3 周）

**目标**：可视化编排界面，支持三步创建 Workflow。

**任务**：
1. [portal] Workflow 编排器组件（三步向导）
2. [ai-app] 新增 Workflow Agent（自然语言 → Schema + Flow）
3. [editor] 嵌入式表单编辑模式（在 Workflow 编排器中直接编辑）
4. [flow] 嵌入式流程编辑模式

**验收标准**：
- 可以通过 AI 对话一次性生成表单 + 流程
- 可以在编排器中分别编辑表单和流程

### Phase 3：审批流程打通（2-3 周）

**目标**：表单提交自动触发流程，审批任务关联表单。

**任务**：
1. [server] 表单提交 → 自动启动流程实例
2. [flow] 审批任务表单自动回填发起人数据
3. [flow] 审批意见组件（专用 Widget）
4. [portal] 发起申请页面（填写表单 → 提交 → 启动流程）

**验收标准**：
- 填写表单提交后自动创建流程实例
- 审批人可以看到发起人填写的数据
- 审批人可以填写审批意见

### Phase 4：数据自动更新（1-2 周）

**目标**：审批完成后自动更新业务数据。

**任务**：
1. [server] 数据更新规则执行引擎
2. [flow] ServiceTask 数据更新节点类型
3. [portal] 数据更新配置界面（字段映射可视化）

**验收标准**：
- 审批通过后业务数据自动更新
- 审批驳回后回写驳回原因
- 支持条件更新（如金额 > 10000 才更新）

### Phase 5：体验优化（1-2 周）

**目标**：提升整体使用体验。

**任务**：
1. [portal] Workflow 预览（表单 + 流程可视化）
2. [portal] 审批进度跟踪（流程图高亮当前节点）
3. [ai-app] 审批辅助（AI 总结申请内容、推荐审批意见）
4. [portal] Workflow 模板库

**验收标准**：
- 可以预览完整 Workflow
- 发起人可以实时看到审批进度
- AI 可以辅助审批人做出决策

---

## 七、成功指标

| 指标 | 目标 | 衡量方式 |
|------|------|---------|
| Workflow 创建时间 | < 10 分钟（AI 辅助） | 从创建到发布的耗时 |
| 表单填写完成率 | > 90% | 提交数 / 打开数 |
| 审批处理时间 | < 24 小时 | 从任务创建到完成 |
| AI 使用率 | > 60% | 使用 AI 生成的 Workflow 占比 |
| 用户满意度 | > 4.0/5.0 | 定期问卷 |

---

## 八、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| AI 生成质量不稳定 | 用户体验差 | 提供模板兜底，AI 生成后必须人工确认 |
| 流程引擎复杂度高 | 开发周期长 | 复用现有 BPMN 引擎，不重新开发 |
| 数据更新规则复杂 | 配置困难 | 提供可视化字段映射，AI 辅助配置 |
| 跨包集成难度 | 联调困难 | Phase 1 先打通接口契约，后续并行开发 |

---

## 九、与 Dify 的差异化定位

| 维度 | Dify | 本项目 |
|------|------|--------|
| 核心能力 | LLM 应用编排 | 业务流程自动化 |
| 编排对象 | AI 模型调用链 | 表单 → 审批 → 数据更新 |
| 用户画像 | AI 开发者 | 业务流程管理员 |
| 输出物 | AI 应用 | 完整业务流程 |
| AI 角色 | 核心引擎 | 辅助工具（降低门槛） |

**我们的优势**：
1. 可视化表单编辑器（53 个 Widget）— Dify 没有
2. BPMN 流程引擎 — Dify 没有
3. 审批任务管理 — Dify 没有
4. 多租户支持 — Dify 没有

**我们的定位**：不是"AI 应用平台"，而是"AI 驱动的业务流程自动化平台"。AI 是手段，业务流程自动化是目的。
