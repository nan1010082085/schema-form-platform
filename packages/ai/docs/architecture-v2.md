# AI 架构设计 v2

> 增加需求分析和思考推理，提升 AI 对话的智能化程度

## 一、v1 架构问题分析

### 1.1 当前架构

```
START ──► router ──► agent ──► allTools ──► afterTools ──► router ──► END
```

### 1.2 存在的问题

| 问题 | 表现 | 影响 |
|------|------|------|
| **Router 只做路由** | 关键词匹配 + 简单 LLM 分析 | 无法理解复杂需求 |
| **缺少需求分析** | 用户说"创建审批流程"直接开始生成 | 生成结果不符合预期 |
| **任务链是静态的** | Router 阶段确定，无法动态调整 | 复杂任务拆解不准确 |
| **缺少确认环节** | 直接执行，无用户确认 | 错误累积，需要重新对话 |
| **无思考推理** | 跳过分析直接执行 | 无法评估任务复杂度 |

### 1.3 典型失败场景

**场景 1：需求不完整**
```
用户：创建一个审批流程
AI：（直接生成一个简单的审批流程）
问题：没有询问审批节点、审批人、条件分支等细节
```

**场景 2：需求理解错误**
```
用户：给表单添加一个提交按钮
AI：（生成一个完整的表单，包含提交按钮）
问题：用户只是想在现有表单上添加按钮，不是创建新表单
```

**场景 3：复杂任务拆解不当**
```
用户：创建一个订单管理系统
AI：（尝试一次性生成所有内容）
问题：应该拆解为：1)订单表单 2)订单列表 3)订单流程 4)统计页面
```

---

## 二、v2 架构设计

### 2.1 核心理念

```
┌─────────────────────────────────────────────────────────────────┐
│                        v2 架构理念                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   用户需求 ──► 需求分析 ──► 需求确认 ──► 任务规划 ──► 执行     │
│                    │            │            │          │       │
│                    ▼            ▼            ▼          ▼       │
│               理解意图      HITL 确认    动态拆解    工具调用   │
│               提取实体      补充细节     生成链      生成结果   │
│               评估复杂度    验证需求     优先排序     质量检查   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 新增节点

| 节点 | 职责 | 输入 | 输出 |
|------|------|------|------|
| **requirementAnalyzer** | 需求分析 | 用户消息 | 需求结构化数据 |
| **requirementConfirm** | 需求确认 | 需求数据 | 用户确认/补充 |
| **taskPlanner** | 任务规划 | 确认后的需求 | 动态任务链 |
| **thinker** | 思考推理 | 任务上下文 | 执行策略 |

### 2.3 v2 Graph 结构

```
START ──► router
              │
              ▼
    ┌─────────────────┐
    │   requirement   │
    │    Analyzer     │ ◄─── 分析需求，提取关键信息
    └─────────────────┘
              │
              ▼
    ┌─────────────────┐
    │   requirement   │ ◄─── HITL：等待用户确认
    │     Confirm     │
    └─────────────────┘
              │
              ▼
    ┌─────────────────┐
    │   taskPlanner   │ ◄─── 生成动态任务链
    └─────────────────┘
              │
              ▼
    ┌─────────────────┐
    │     thinker     │ ◄─── 思考执行策略
    └─────────────────┘
              │
              ▼
    ┌─────────────────┐
    │  taskChain      │ ◄─── 任务链执行
    └─────────────────┘
              │
              ▼
    ┌─────────────────┐
    │  agent          │ ◄─── Agent 执行
    │ (editor/flow/   │
    │  page/general)  │
    └─────────────────┘
              │
              ▼
    ┌─────────────────┐
    │   allTools      │ ◄─── 工具调用
    └─────────────────┘
              │
              ▼
    ┌─────────────────┐
    │   afterTools    │ ◄─── 后处理
    └─────────────────┘
              │
              ▼
    ┌─────────────────┐
    │   qualityCheck  │ ◄─── 质量检查（新增）
    └─────────────────┘
              │
              ▼
         summarizer ──► END
```

---

## 三、节点详细设计

### 3.1 RequirementAnalyzer（需求分析器）

**职责**：深度理解用户需求，提取结构化信息

**输入**：
```typescript
interface AnalyzerInput {
  messages: Message[]           // 对话历史
  context: {
    source: 'editor' | 'flow' | 'page' | 'standalone'
    currentSchema?: Widget[]    // 当前 Schema（如果有）
    currentFlow?: FlowGraph     // 当前 Flow（如果有）
  }
}
```

**输出**：
```typescript
interface RequirementAnalysis {
  // 意图分类
  intent: 'create' | 'modify' | 'query' | 'help'

  // 需求类型
  type: 'form' | 'flow' | 'page' | 'mixed' | 'general'

  // 复杂度评估
  complexity: 'simple' | 'medium' | 'complex'

  // 提取的实体
  entities: {
    forms?: Array<{
      name: string
      purpose: string
      fields: Array<{ name: string; type: string; required: boolean }>
    }>
    flows?: Array<{
      name: string
      nodes: Array<{ type: string; name: string; assignee?: string }>
      conditions?: Array<{ from: string; to: string; condition: string }>
    }>
    pages?: Array<{
      name: string
      type: 'list' | 'detail' | 'dashboard'
      components: string[]
    }>
  }

  // 需求完整性
  completeness: {
    score: number              // 0-100
    missing: string[]          // 缺失的信息
    assumptions: string[]      // AI 做出的假设
  }

  // 确认问题
  confirmQuestions: Array<{
    id: string
    question: string
    options?: string[]
    required: boolean
  }>

  // 建议的任务链
  suggestedChain: Array<{
    agent: 'editor' | 'flow' | 'page'
    description: string
    priority: number
    dependencies: string[]     // 依赖的任务 ID
  }>
}
```

**实现**：
```typescript
async function requirementAnalyzerNode(state: AgentState): Promise<Partial<AgentState>> {
  const lastMessage = state.messages[state.messages.length - 1]
  const userContent = extractUserContent(lastMessage)

  // 调用 LLM 进行需求分析
  const analysis = await analyzeRequirement(userContent, state.context)

  // 根据复杂度决定是否需要确认
  const needsConfirmation = analysis.complexity !== 'simple' ||
    analysis.completeness.score < 80

  return {
    requirement: {
      analysis,
      needsConfirmation,
      status: 'analyzed',
    },
  }
}
```

**System Prompt**：
```
你是一个需求分析专家。你的任务是：

1. 理解用户的真实意图（创建/修改/查询/帮助）
2. 提取关键实体（表单字段、流程节点、页面组件）
3. 评估需求完整性（是否有足够信息开始执行）
4. 生成确认问题（如果信息不足）
5. 建议任务拆解方案

输出格式：JSON
```

---

### 3.2 RequirementConfirm（需求确认器）

**职责**：与用户确认需求，支持 HITL

**流程**：
```
需求分析结果
    │
    ▼
┌─────────────────┐
│ 是否需要确认？  │
└─────────────────┘
    │
    ├── 否 ──► 直接进入 taskPlanner
    │
    └── 是 ──► 发送确认请求给用户
                  │
                  ▼
              等待用户响应
                  │
                  ├── 确认 ──► 进入 taskPlanner
                  │
                  └── 补充 ──► 重新分析
```

**确认消息格式**：
```typescript
interface ConfirmRequest {
  type: 'requirement_confirm'
  analysis: RequirementAnalysis
  questions: Array<{
    id: string
    question: string
    options?: string[]
    required: boolean
  }>
  preview: {
    summary: string              // 需求摘要
    estimatedSteps: number       // 预估步骤数
    estimatedTime: string        // 预估时间
  }
}
```

**前端渲染**：
```vue
<!-- RequirementConfirmCard.vue -->
<template>
  <div class="requirement-confirm">
    <div class="summary">{{ analysis.summary }}</div>

    <div class="questions">
      <div v-for="q in questions" :key="q.id" class="question">
        <div class="question-text">{{ q.question }}</div>
        <div class="options" v-if="q.options">
          <button v-for="opt in q.options" :key="opt" @click="answer(q.id, opt)">
            {{ opt }}
          </button>
        </div>
        <input v-else v-model="answers[q.id]" :placeholder="q.question" />
      </div>
    </div>

    <div class="actions">
      <button @click="confirm">确认，开始执行</button>
      <button @click="modify">修改需求</button>
    </div>
  </div>
</template>
```

---

### 3.3 TaskPlanner（任务规划器）

**职责**：根据确认后的需求生成动态任务链

**输入**：
```typescript
interface PlannerInput {
  requirement: RequirementAnalysis
  userConfirmations: Record<string, string>  // 用户的回答
}
```

**输出**：
```typescript
interface TaskPlan {
  // 任务链
  chain: Array<{
    id: string
    agent: 'editor' | 'flow' | 'page'
    description: string
    inputs: Record<string, unknown>          // 该步骤需要的输入
    outputs: Record<string, unknown>         // 该步骤的输出
    dependencies: string[]                   // 依赖的任务 ID
    priority: number
    status: 'pending' | 'running' | 'done' | 'error'
  }>

  // 执行策略
  strategy: {
    mode: 'sequential' | 'parallel' | 'mixed'
    retryPolicy: 'none' | 'simple' | 'exponential'
    timeout: number
  }

  // 上下文传递
  contextFlow: Array<{
    from: string
    to: string
    data: string[]               // 传递的数据字段
  }>
}
```

**实现**：
```typescript
async function taskPlannerNode(state: AgentState): Promise<Partial<AgentState>> {
  const { requirement, userConfirmations } = state.requirement

  // 合并用户确认到需求分析
  const mergedRequirement = mergeConfirmations(requirement, userConfirmations)

  // 调用 LLM 生成任务计划
  const plan = await generateTaskPlan(mergedRequirement)

  // 优化任务顺序（考虑依赖关系）
  const optimizedPlan = optimizeTaskOrder(plan)

  return {
    task: {
      plan: optimizedPlan,
      chain: optimizedPlan.chain,
      currentStepIndex: 0,
      type: 'planned',
    },
  }
}
```

---

### 3.4 Thinker（思考推理器）

**职责**：在执行前进行推理，评估和调整执行策略

**触发条件**：
- 任务开始前
- 工具调用失败后
- 检测到需求变化时

**推理内容**：
```typescript
interface ThinkerOutput {
  // 执行策略调整
  adjustments: {
    skipSteps?: string[]         // 跳过的步骤
    addSteps?: TaskStep[]        // 新增的步骤
    reorderSteps?: string[]      // 重新排序
    changeAgent?: {              // 更换 Agent
      stepId: string
      newAgent: string
    }
  }

  // 风险评估
  risks: Array<{
    type: 'complexity' | 'ambiguity' | 'dependency'
    description: string
    mitigation: string
  }>

  // 执行建议
  suggestions: Array<{
    type: 'optimize' | 'simplify' | 'split'
    description: string
    impact: 'low' | 'medium' | 'high'
  }>
}
```

---

### 3.5 QualityCheck（质量检查器）

**职责**：检查执行结果的质量

**检查维度**：
```typescript
interface QualityCheckResult {
  // 结构检查
  structure: {
    valid: boolean
    errors: string[]
    warnings: string[]
  }

  // 完整性检查
  completeness: {
    score: number                // 0-100
    missing: string[]
  }

  // 一致性检查
  consistency: {
    score: number                // 0-100
    conflicts: string[]
  }

  // 建议
  suggestions: Array<{
    type: 'fix' | 'improve' | 'add'
    description: string
    priority: 'low' | 'medium' | 'high'
  }>

  // 是否需要重新执行
  needsRetry: boolean
  retryReason?: string
}
```

---

## 四、完整流程示例

### 4.1 示例：创建订单管理系统

**用户输入**：
```
创建一个订单管理系统，包含订单录入、审批流程和订单列表
```

**流程**：

```
1. RequirementAnalyzer（需求分析）
   │
   ▼
   分析结果：
   - 意图：create
   - 类型：mixed（表单 + 流程 + 页面）
   - 复杂度：complex
   - 实体：
     - 表单：订单录入表单（订单号、客户、金额、日期）
     - 流程：订单审批流程（提交 → 审批 → 完成）
     - 页面：订单列表页（搜索、列表、详情）
   - 完整性：60%（缺少字段细节、审批人、列表列配置）
   - 确认问题：
     1. 订单表单需要哪些字段？
     2. 审批流程有几个节点？审批人是谁？
     3. 订单列表需要显示哪些列？

2. RequirementConfirm（需求确认）
   │
   ▼
   发送确认请求，等待用户回答

   用户回答：
   - 字段：订单号(自动)、客户名称、金额、日期、备注
   - 审批：提交 → 部门经理审批 → 财务审批 → 完成
   - 列表：订单号、客户、金额、状态、日期

3. TaskPlanner（任务规划）
   │
   ▼
   生成任务链：
   Step 1: editor - 生成订单录入表单
   Step 2: flow - 生成订单审批流程（绑定表单）
   Step 3: page - 生成订单列表页面

4. Thinker（思考推理）
   │
   ▼
   推理结果：
   - 风险：表单和流程需要关联，需要先生成表单
   - 建议：Step 2 依赖 Step 1 的输出
   - 策略：顺序执行，确保依赖关系

5. 执行任务链
   │
   ▼
   Step 1: editor 生成表单 → allTools 执行 → 获得 schemaId
   Step 2: flow 生成流程 → allTools 执行 → 绑定 schemaId
   Step 3: page 生成列表 → allTools 执行 → 关联流程

6. QualityCheck（质量检查）
   │
   ▼
   检查结果：
   - 结构：有效
   - 完整性：95%
   - 一致性：无冲突
   - 建议：添加表单验证规则

7. Summarizer（总结）
   │
   ▼
   输出：已创建订单管理系统，包含：
   - 订单录入表单（5 个字段）
   - 订单审批流程（4 个节点）
   - 订单列表页面（5 列）
```

---

## 五、State 扩展

### 5.1 新增 State 字段

```typescript
const AgentStateV2Annotation = Annotation.Root({
  // ... 原有字段

  // 需求分析
  requirement: Annotation({
    analysis: RequirementAnalysis | null
    userConfirmations: Record<string, string>
    needsConfirmation: boolean
    status: 'pending' | 'analyzed' | 'confirmed' | 'rejected'
  }),

  // 任务计划
  taskPlan: Annotation({
    plan: TaskPlan | null
    currentStepId: string | null
    executionLog: Array<{
      stepId: string
      startTime: Date
      endTime?: Date
      status: 'running' | 'done' | 'error'
      result?: unknown
    }>
  }),

  // 思考推理
  thinking: Annotation({
    lastThinkTime: Date | null
    adjustments: ThinkerOutput['adjustments']
    risks: ThinkerOutput['risks']
  }),

  // 质量检查
  quality: Annotation({
    lastCheckTime: Date | null
    result: QualityCheckResult | null
    retryCount: number
  }),
})
```

---

## 六、事件协议扩展

### 6.1 新增事件类型

```typescript
type AgentEventTypeV2 = AgentEventType |
  // 需求分析
  | 'requirement_analysis_start'
  | 'requirement_analysis_complete'
  | 'requirement_confirm_request'
  | 'requirement_confirm_response'
  // 任务规划
  | 'task_plan_start'
  | 'task_plan_complete'
  // 思考推理
  | 'thinker_start'
  | 'thinker_complete'
  // 质量检查
  | 'quality_check_start'
  | 'quality_check_complete'
```

### 6.2 事件示例

```json
{
  "type": "requirement_confirm_request",
  "analysis": {
    "intent": "create",
    "type": "mixed",
    "complexity": "complex",
    "entities": { ... },
    "completeness": { "score": 60, "missing": [...] }
  },
  "questions": [
    {
      "id": "q1",
      "question": "订单表单需要哪些字段？",
      "options": ["订单号", "客户名称", "金额", "日期", "备注"],
      "required": true
    }
  ]
}
```

---

## 七、实现优先级

| Phase | 内容 | 复杂度 | 预计工时 |
|-------|------|--------|----------|
| **P0** | RequirementAnalyzer 节点 | 中 | 4h |
| **P0** | 前端确认卡片组件 | 中 | 3h |
| **P1** | TaskPlanner 节点 | 高 | 6h |
| **P1** | Thinker 节点 | 中 | 4h |
| **P2** | QualityCheck 节点 | 中 | 4h |
| **P2** | 动态任务链执行 | 高 | 6h |
| **P3** | 并行任务执行 | 高 | 8h |

**总计**：约 35h

---

## 八、迁移策略

### 8.1 向后兼容

- v1 和 v2 共存，通过配置切换
- 简单需求仍走 v1 快速路径
- 复杂需求走 v2 完整流程

### 8.2 渐进式迁移

```
Phase 1: 添加 RequirementAnalyzer，可选启用
Phase 2: 添加 RequirementConfirm，HITL 支持
Phase 3: 添加 TaskPlanner，动态任务链
Phase 4: 添加 Thinker 和 QualityCheck
```

### 8.3 配置开关

```typescript
const AI_CONFIG = {
  // 启用需求分析
  enableRequirementAnalysis: true,

  // 启用需求确认（HITL）
  enableRequirementConfirm: true,

  // 启用动态任务规划
  enableDynamicTaskPlanning: true,

  // 启用思考推理
  enableThinker: true,

  // 启用质量检查
  enableQualityCheck: true,

  // 需求完整性阈值（低于此值需要确认）
  completenessThreshold: 80,

  // 最大重试次数
  maxRetryCount: 3,
}
```

---

## 九、相关文档

- [架构 v1](./architecture.md) — 当前架构
- [Agent 说明](./agent.md) — Agent 类型和职责
- [Tool 说明](./tool.md) — 工具定义和执行
- [MCP 说明](./mcp.md) — Model Context Protocol
- [事件协议](./events.md) — 流式通信事件
