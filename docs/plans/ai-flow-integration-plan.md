# AI-Flow 集成规划文档

> 文档版本：v1.0
> 制定日期：2026/06/04
> 制定人：产品经理

---

## 一、项目概述

### 1.1 项目背景和目标

**背景**：
Schema-Form-Platform 是一个 Schema 驱动的可视化自由布局设计器与渲染器平台，包含 Editor（表单设计器）、Flow（流程设计器）和 AI（智能助手）三个核心子项目。当前三个子项目独立发展，AI 能力尚未深度融入 Flow 工作流引擎。

**目标**：
1. 将 AI 能力深度集成到 Flow 流程引擎，实现智能工作流
2. 对标 N8N 等工作流平台，找到差异化定位
3. 构建 AI-Native 的智能工作流生态系统

### 1.2 当前状态总结

| 项目 | 完成度 | 核心能力 | 状态 |
|------|--------|----------|------|
| **Editor** | 85% | 49 个 Widget、Schema 驱动渲染、事件引擎、联动系统 | ✅ 生产就绪 |
| **Flow** | 78% | BPMN 引擎、流程设计器、审批日志、表单集成 | 🔄 核心完成 |
| **AI** | 82% | LangGraph 多智能体、SSE 流式对话、任务链 | 🔄 核心完成 |

**总体完成度：82%**

### 1.3 核心价值主张

**差异化定位：AI-Native 智能工作流**

与传统工作流平台（N8N、Camunda）相比，本平台的核心优势：

| 维度 | 传统工作流平台 | 本平台定位 |
|------|--------------|-----------|
| **流程设计** | 手动拖拽节点 | AI 对话生成流程 |
| **节点配置** | 手动填写属性 | AI 智能推荐配置 |
| **表单设计** | 独立表单设计器 | AI 生成 + Schema 驱动 |
| **审批决策** | 人工判断 | AI 辅助决策 |
| **异常处理** | 预定义规则 | AI 智能诊断 |
| **流程优化** | 人工分析 | AI 数据驱动优化 |

---

## 二、AI 应用现状分析

### 2.1 核心功能完成度

#### 2.1.1 LangGraph 架构（完成度：90%）

**已实现**：
- StateGraph 完整流程：START → thinker → router → agent → allTools → summarizer → END
- Annotation 状态定义完善
- 节点间状态传递机制

**待优化**：
- Checkpointer 使用 MemorySaver（Critical 风险）
- 图编译缓存机制

#### 2.1.2 SSE 流式对话（完成度：95%）

**已实现**：
- fetch + ReadableStream 流式传输
- AbortSignal 取消支持
- 7 种 SSE 事件类型：thinking、text、tool_call、agent_switch、task_chain、done、error

**待优化**：
- SSE 解析存在丢帧风险（High）
- 流式渲染无防抖（High）

#### 2.1.3 Editor Agent（完成度：85%）

**已实现**：
- 6 个编辑器工具：search_schemas、get_schema_detail、create_schema、update_schema、validate_schema、generate_schema
- Schema 生成和验证能力
- 多轮对话上下文维护

**待优化**：
- 伪语义搜索需重命名
- 消息历史截断逻辑

#### 2.1.4 Flow Agent（完成度：80%）

**已实现**：
- 6 个流程工具：search_flows、get_flow_detail、create_flow、update_flow、validate_flow、generate_flow
- BPMN 流程生成能力
- 流程校验

**待优化**：
- 工具错误处理不完善
- 协作上下文传递断裂

### 2.2 测试覆盖率

| 模块 | 测试文件 | 测试代码行数 | 状态 |
|------|----------|--------------|------|
| 前端 ai-app | 11 个 | 1878 行 | ✅ 全部通过 |
| 后端 server/ai | 11 个 | 2466 行 | ✅ 全部通过 |
| **总计** | **22 个** | **4344 行** | ✅ |

### 2.3 技术债务

#### Critical 级别（必须立即修复）

| 问题 | 影响 | 工作量 |
|------|------|--------|
| MemorySaver 替换为 MongoDB | 进程重启丢失所有状态 | 2 天 |
| 协作请求状态传递断裂 | 多智能体协作失效 | 2 天 |
| SSE 解析丢帧 | 消息丢失 | 0.5 天 |

#### High 级别（应尽快修复）

| 问题 | 影响 | 工作量 |
|------|------|--------|
| thinking 事件依赖私有字段 | 切换模型时失效 | 1 天 |
| 工具结果 ID 匹配错误 | 并发工具调用错乱 | 1 天 |
| 工具执行失败静默吞掉 | 用户看不到错误 | 1 天 |
| 伪语义搜索误导 LLM | 搜索策略错误 | 0.5 天 |
| 流式渲染无防抖 | 界面卡顿 | 0.5 天 |

#### Medium 级别（计划修复）

| 问题 | 影响 | 工作量 |
|------|------|--------|
| 流结束 DONE 保证 | 对话列表不刷新 | 1 小时 |
| thinker 静默失败 | 用户无感知 | 0.5 小时 |
| 协作上下文丢失 | 目标 agent 无上下文 | 2 小时 |
| API Key 重复读取 | 错误处理分散 | 0.5 小时 |
| 消息历史截断优化 | 上下文断裂 | 1 小时 |

### 2.4 已知问题和改进方向

#### RAG 能力缺失（Large）

**现状**：当前"语义搜索"是 Jaccard 相似度，不是真正的向量检索

**影响**：
- 无法基于语义相似度检索历史 Schema
- 无法学习用户偏好
- 无法参考最佳实践
- LLM 每次都是从零开始生成

**建议方案**：
```
用户消息
  ↓
Embedding 模型 (DeepSeek / @xenova/transformers)
  ↓
向量检索 (Chroma / MongoDB Atlas Vector Search)
  ↓
Top-K 结果注入 LLM context
  ↓
LLM 生成响应
```

**工作量**：5-7 天

---

## 三、AI 与 Flow 集成方案

### 3.1 AI Task 节点设计（P0）

#### 3.1.1 节点定义

在 Flow 设计器中新增 `AITask` 节点类型，作为 BPMN ServiceTask 的扩展：

```typescript
// 节点类型扩展
interface AITaskConfig {
  agentType: 'editor' | 'flow' | 'general' | 'custom'
  prompt: string                    // AI 提示词模板
  inputVariables: string[]          // 从流程变量中读取的变量
  outputVariable: string            // AI 输出写入的流程变量
  model?: string                    // 可选：指定 LLM 模型
  maxTokens?: number                // 可选：最大 token 数
  timeout?: number                  // 可选：超时时间（秒）
  retryPolicy?: {
    maxRetries: number
    retryDelay: number
  }
}
```

#### 3.1.2 执行流程

```
流程推进到 AITask 节点
  ↓
FlowEngine 调用 AI Service
  ↓
AI Service 构建 prompt（注入流程变量）
  ↓
调用 LangGraph 执行
  ↓
返回结果写入流程变量
  ↓
流程继续推进
```

#### 3.1.3 应用场景

| 场景 | 示例 |
|------|------|
| 智能表单填写 | 根据用户输入自动生成表单内容 |
| 数据提取 | 从非结构化文本中提取结构化数据 |
| 文档生成 | 自动生成审批意见、报告摘要 |
| 智能路由 | AI 判断下一步流向 |
| 内容审核 | AI 审核用户提交的内容 |

### 3.2 AI 辅助审批（P1）

#### 3.2.1 功能设计

在 UserTask 审批节点中集成 AI 辅助能力：

```typescript
interface AIAssistedApproval {
  enabled: boolean
  aiSuggestion: {
    enabled: boolean                // AI 推荐意见
    prompt: string                  // 推荐提示词
    showReason: boolean             // 显示推荐理由
  }
  aiAutoApprove: {
    enabled: boolean                // AI 自动审批
    confidenceThreshold: number     // 置信度阈值（0-1）
    conditions: string[]            // 自动审批条件
  }
  aiRiskAssessment: {
    enabled: boolean                // AI 风险评估
    factors: string[]               // 评估因素
  }
}
```

#### 3.2.2 用户体验

**审批界面增强**：
```
┌─────────────────────────────────────────┐
│ 审批详情                                 │
├─────────────────────────────────────────┤
│ 申请内容：...                            │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🤖 AI 推荐意见                       │ │
│ │ 建议：通过                            │ │
│ │ 理由：申请内容符合政策要求，预算合理   │ │
│ │ 置信度：92%                           │ │
│ │ [采纳推荐] [忽略]                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 审批意见：[                      ]       │
│                                         │
│ [通过] [驳回] [转办]                     │
└─────────────────────────────────────────┘
```

### 3.3 智能网关（P2）

#### 3.3.1 AI Exclusive Gateway

传统排他网关需要预定义条件表达式，AI 网关可以动态决策：

```typescript
interface AIExclusiveGatewayConfig {
  mode: 'ai_decision' | 'ai_assisted'
  prompt: string                    // 决策提示词
  options: {
    label: string                   // 选项标签
    condition: string               // 传统条件（降级方案）
  }[]
  fallbackToTraditional: boolean    // AI 失败时降级到传统条件
}
```

#### 3.3.2 应用场景

| 场景 | 传统方式 | AI 方式 |
|------|----------|---------|
| 贷款审批 | 预定义金额阈值 | AI 综合评估风险 |
| 内容审核 | 关键词过滤 | AI 语义理解 |
| 智能路由 | 规则引擎 | AI 动态决策 |

### 3.4 技术实现细节

#### 3.4.1 AI Service 集成

```typescript
// packages/server/src/services/AIService.ts
export class AIService {
  private graph: CompiledGraph

  constructor() {
    this.graph = compileGraph()
  }

  async executeAITask(config: AITaskConfig, variables: Record<string, any>): Promise<any> {
    // 1. 构建 prompt
    const prompt = this.buildPrompt(config.prompt, variables)

    // 2. 调用 LangGraph
    const result = await this.graph.invoke({
      messages: [new HumanMessage(prompt)],
      context: {
        agentType: config.agentType,
        source: 'flow'
      }
    })

    // 3. 提取结果
    return this.extractResult(result, config.outputVariable)
  }
}
```

#### 3.4.2 FlowEngine 扩展

```typescript
// packages/flow/shared/src/engine/FlowEngine.ts
private async executeAITask(node: ExecutableNode): Promise<void> {
  const config = node.config as AITaskConfig

  // 1. 读取输入变量
  const inputVariables = {}
  for (const varName of config.inputVariables) {
    inputVariables[varName] = this.instance.variables[varName]
  }

  // 2. 调用 AI Service
  const aiService = AIService.getInstance()
  const result = await aiService.executeAITask(config, inputVariables)

  // 3. 写入输出变量
  this.instance.variables[config.outputVariable] = result

  // 4. 记录日志
  this.addExecutionLog(node.id, 'ai_task_completed', {
    input: inputVariables,
    output: result
  })
}
```

---

## 四、N8N 可行性评估

### 4.1 架构对比分析

| 维度 | N8N | 本平台 | 差距分析 |
|------|-----|--------|----------|
| **核心定位** | 通用工作流自动化 | 表单+流程+AI 一体化 | 定位不同，各有所长 |
| **节点数量** | 400+ 预置节点 | 12 种 BPMN 节点 | 差距大，但可扩展 |
| **触发方式** | Webhook/Cron/事件 | 手动启动/定时事件 | 需补充触发机制 |
| **数据连接** | 丰富的第三方集成 | HTTP 请求任务 | 需补充连接器 |
| **执行引擎** | 自研引擎 | BPMN 标准引擎 | 本平台更标准 |
| **AI 能力** | 插件式集成 | 原生多智能体 | 本平台更强 |
| **表单能力** | 基础表单 | 49 个 Widget 的 Schema 驱动 | 本平台更强 |
| **部署方式** | Docker/云服务 | Docker/PM2 | 相当 |

### 4.2 差距分析

#### 4.2.1 功能差距

**N8N 优势**：
1. **丰富的预置节点**：400+ 节点覆盖各种集成场景
2. **成熟的连接器生态**：Slack、Gmail、数据库、API 等
3. **灵活的触发机制**：Webhook、Cron、事件驱动
4. **可视化调试**：节点执行数据可视化
5. **社区活跃**：大量模板和插件

**本平台优势**：
1. **AI-Native 架构**：原生多智能体支持
2. **强大的表单能力**：49 个 Widget 的 Schema 驱动
3. **BPMN 标准**：符合行业标准的流程引擎
4. **一体化体验**：表单+流程+AI 无缝集成

#### 4.2.2 技术差距

| 能力 | N8N 实现 | 本平台现状 | 实现难度 |
|------|----------|-----------|----------|
| 节点市场 | 成熟的 npm 包机制 | 无 | 中 |
| 数据映射 | 表达式引擎 + JSONata | 基础表达式 | 中 |
| 错误处理 | 重试/降级/告警 | 基础 try-catch | 低 |
| 并发控制 | 队列 + 限流 | 无 | 中 |
| 版本管理 | Git 集成 | 基础版本管理 | 低 |

### 4.3 可行性结论

**结论：不建议直接对标 N8N，建议走差异化路线**

**理由**：
1. **资源投入巨大**：补齐 N8N 的节点生态需要 6-12 个月
2. **竞争激烈**：N8N、Make、Zapier 已经很成熟
3. **差异化机会**：AI-Native 是蓝海市场
4. **用户价值**：AI 能力可以显著降低使用门槛

**建议**：聚焦 AI-Native 智能工作流，而不是通用工作流自动化

### 4.4 差异化定位：AI-Native 智能工作流

#### 4.4.1 定位声明

> **"用对话设计流程，用 AI 驱动执行"**
> 
> 面向非技术用户，通过自然语言对话创建和管理智能工作流，
> 让 AI 成为流程的"大脑"，而不仅仅是"手脚"。

#### 4.4.2 目标用户

| 用户类型 | 痛点 | 解决方案 |
|----------|------|----------|
| **业务人员** | 不懂技术，无法自己设计流程 | AI 对话生成流程 |
| **管理者** | 审批效率低，决策依据不足 | AI 辅助审批 |
| **IT 人员** | 流程维护成本高 | AI 智能诊断和优化 |

#### 4.4.3 核心场景

**场景 1：AI 对话生成流程**
```
用户：帮我创建一个请假审批流程，3 天以内主管审批，3 天以上需要 HR 审批
AI：好的，我为您创建了以下流程：
    [开始] → [填写请假单] → [判断天数]
                              ├─ ≤3 天 → [主管审批] → [结束]
                              └─ >3 天 → [主管审批] → [HR 审批] → [结束]
    是否需要调整？
```

**场景 2：AI 智能审批**
```
审批界面：
┌─────────────────────────────────────┐
│ 🤖 AI 分析报告                       │
│                                     │
│ 申请内容：请假 5 天                   │
│ 历史记录：该员工近 6 个月无请假记录    │
│ 团队状态：当前项目处于非关键阶段       │
│ 同类申请：过去 3 个月 85% 获批        │
│                                     │
│ 推荐：通过 ✅                        │
│ 置信度：88%                          │
└─────────────────────────────────────┘
```

**场景 3：AI 流程诊断**
```
用户：为什么这个流程卡了 3 天？
AI：经分析，流程卡在「财务审批」节点：
    - 节点负责人：张经理
    - 待处理任务：3 个
    - 平均处理时间：2 小时
    - 建议：发送催办通知或临时委派给李经理
```

---

## 五、路线图规划

### Phase 1（4 周）- AI-Flow 深度融合

**目标**：实现 AI 与 Flow 的基础集成，验证技术可行性

| 周次 | 任务 | 工作量 | 优先级 |
|------|------|--------|--------|
| 第 1 周 | AI Task 节点后端实现 | 3 天 | P0 |
| 第 1 周 | AI Task 节点前端配置面板 | 2 天 | P0 |
| 第 2 周 | AI Service 集成到 FlowEngine | 2 天 | P0 |
| 第 2 周 | 流程变量与 AI 输入输出映射 | 2 天 | P0 |
| 第 3 周 | AI 辅助审批后端实现 | 3 天 | P1 |
| 第 3 周 | AI 辅助审批前端界面 | 2 天 | P1 |
| 第 4 周 | 集成测试和 Bug 修复 | 3 天 | P0 |

**阶段产出**：
- AI Task 节点可用
- AI 辅助审批基础功能可用
- 端到端演示流程

### Phase 2（4 周）- 工作流能力补齐

**目标**：补齐核心工作流能力，提升用户体验

| 周次 | 任务 | 工作量 | 优先级 |
|------|------|--------|--------|
| 第 5 周 | 触发器机制（Webhook/Cron） | 3 天 | P1 |
| 第 5 周 | 错误处理和重试机制 | 2 天 | P1 |
| 第 6 周 | 数据映射增强 | 2 天 | P1 |
| 第 6 周 | 流程版本对比 | 2 天 | P1 |
| 第 7 周 | 批量审批功能 | 2 天 | P1 |
| 第 7 周 | 通知机制完善 | 2 天 | P1 |
| 第 8 周 | 性能优化和压力测试 | 3 天 | P0 |

**阶段产出**：
- 触发器机制可用
- 错误处理完善
- 性能达标

### Phase 3（4 周）- 生态建设

**目标**：构建节点生态，提升平台扩展性

| 周次 | 任务 | 工作量 | 优先级 |
|------|------|--------|--------|
| 第 9 周 | 自定义节点 SDK 设计 | 3 天 | P1 |
| 第 9 周 | 节点注册和发现机制 | 2 天 | P1 |
| 第 10 周 | 内置节点开发（10 个常用） | 5 天 | P1 |
| 第 11 周 | 节点市场 MVP | 3 天 | P2 |
| 第 11 周 | 流程模板库 | 2 天 | P2 |
| 第 12 周 | 文档和示例 | 3 天 | P1 |

**阶段产出**：
- 自定义节点 SDK
- 10+ 内置节点
- 节点市场 MVP

### Phase 4（持续）- AI 智能化

**目标**：深化 AI 能力，实现真正的智能工作流

| 任务 | 工作量 | 优先级 |
|------|--------|--------|
| AI 流程诊断 | 5 天 | P1 |
| AI 流程优化建议 | 5 天 | P1 |
| AI 智能网关 | 3 天 | P2 |
| RAG 知识库集成 | 7 天 | P1 |
| 用户行为学习 | 5 天 | P2 |
| 多模态输入（截图生成流程） | 5 天 | P2 |

**阶段产出**：
- AI 流程诊断可用
- AI 优化建议可用
- RAG 知识库可用

---

## 六、技术方案

### 6.1 AI Agent 节点设计

#### 6.1.1 节点架构

```
┌─────────────────────────────────────────────────────────┐
│                    AI Agent 节点                         │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  Prompt      │  │  LLM        │  │  Output     │    │
│  │  Template    │→ │  Service    │→ │  Parser     │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
│         ↑                ↑                ↓            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  Variables   │  │  Context    │  │  Result     │    │
│  │  Resolver    │  │  Manager    │  │  Writer     │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────┘
```

#### 6.1.2 核心组件

```typescript
// Prompt Template - 提示词模板
interface PromptTemplate {
  template: string                  // 支持 {{variable}} 占位符
  variables: string[]               // 模板变量列表
  examples?: Array<{                // Few-shot 示例
    input: string
    output: string
  }>
}

// LLM Service - LLM 服务
interface LLMService {
  invoke(prompt: string, options?: LLMOptions): Promise<string>
  stream(prompt: string, options?: LLMOptions): AsyncGenerator<string>
}

// Output Parser - 输出解析器
interface OutputParser<T> {
  parse(raw: string): T
  validate(parsed: T): boolean
}
```

### 6.2 工具注册和调用机制

#### 6.2.1 工具注册表

```typescript
// packages/server/src/ai/tools/registry.ts
class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map()

  register(definition: ToolDefinition): void {
    this.tools.set(definition.name, definition)
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name)
  }

  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values())
  }

  getByCategory(category: string): ToolDefinition[] {
    return this.getAll().filter(t => t.category === category)
  }
}

interface ToolDefinition {
  name: string
  description: string
  category: 'editor' | 'flow' | 'general' | 'integration'
  parameters: ZodSchema
  handler: (params: any, context: ToolContext) => Promise<any>
  requiredPermissions?: string[]
}
```

#### 6.2.2 工具调用流程

```
LLM 返回 tool_calls
  ↓
ToolRegistry 查找工具
  ↓
权限校验
  ↓
参数验证（Zod）
  ↓
执行工具 handler
  ↓
返回结果给 LLM
```

### 6.3 变量传递和上下文管理

#### 6.3.1 流程变量作用域

```typescript
interface FlowVariableScope {
  global: Record<string, any>       // 全局变量
  process: Record<string, any>      // 流程实例变量
  task: Record<string, any>         // 任务局部变量
  ai: Record<string, any>           // AI 节点输出变量
}
```

#### 6.3.2 变量传递机制

```typescript
// AI Task 节点变量映射
interface VariableMapping {
  // 输入映射：流程变量 → AI 输入
  input: {
    [aiParamName: string]: {
      source: 'global' | 'process' | 'task'
      path: string                  // JSONPath
    }
  }
  // 输出映射：AI 输出 → 流程变量
  output: {
    [flowVarName: string]: {
      source: 'ai'
      path: string                  // JSONPath
    }
  }
}
```

### 6.4 错误处理和重试机制

#### 6.4.1 错误分类

```typescript
enum AIErrorType {
  TIMEOUT = 'timeout',              // 超时
  RATE_LIMIT = 'rate_limit',        // 限流
  INVALID_RESPONSE = 'invalid',     // 响应格式错误
  TOOL_ERROR = 'tool_error',        // 工具执行错误
  NETWORK_ERROR = 'network',        // 网络错误
  UNKNOWN = 'unknown'
}
```

#### 6.4.2 重试策略

```typescript
interface RetryPolicy {
  maxRetries: number                // 最大重试次数
  retryDelay: number                // 重试间隔（ms）
  backoffMultiplier: number         // 退避系数
  retryableErrors: AIErrorType[]    // 可重试的错误类型
}

const defaultRetryPolicy: RetryPolicy = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
  retryableErrors: [
    AIErrorType.TIMEOUT,
    AIErrorType.RATE_LIMIT,
    AIErrorType.NETWORK_ERROR
  ]
}
```

#### 6.4.3 降级策略

```typescript
interface FallbackStrategy {
  type: 'default_value' | 'skip' | 'human_intervention'
  defaultValue?: any
  notification?: {
    enabled: boolean
    recipients: string[]
  }
}
```

### 6.5 性能优化建议

#### 6.5.1 LLM 调用优化

| 优化点 | 方案 | 预期效果 |
|--------|------|----------|
| 实例缓存 | 复用 ChatOpenAI 实例 | 减少初始化开销 |
| Prompt 缓存 | 相同 prompt 返回缓存结果 | 减少 API 调用 |
| 批处理 | 多个 AI Task 并行执行 | 提升吞吐量 |
| 流式处理 | 长文本使用流式输出 | 降低首字延迟 |

#### 6.5.2 数据库优化

| 优化点 | 方案 | 预期效果 |
|--------|------|----------|
| 索引优化 | 为常用查询添加索引 | 查询提速 10x |
| 连接池 | 复用 MongoDB 连接 | 减少连接开销 |
| 查询优化 | 避免全表扫描 | 降低 DB 负载 |
| 缓存层 | Redis 缓存热点数据 | 减少 DB 查询 |

#### 6.5.3 并发控制

```typescript
interface ConcurrencyConfig {
  maxConcurrentTasks: number        // 最大并发任务数
  queueSize: number                 // 队列大小
  timeout: number                   // 单任务超时
  rateLimit: {
    requests: number                // 请求数
    window: number                  // 时间窗口（秒）
  }
}
```

---

## 七、资源和风险评估

### 7.1 人力需求

#### 7.1.1 团队配置

**最小配置（2 人）**：
- 前端工程师 × 1：负责 Flow 前端 + AI 节点配置面板
- 全栈工程师 × 1：负责 AI Service + FlowEngine 集成

**推荐配置（3 人）**：
- 前端工程师 × 1：负责 Flow 前端
- 后端工程师 × 1：负责 AI Service + 工具开发
- 全栈工程师 × 1：负责 FlowEngine 集成 + 测试

#### 7.1.2 工作量估算

| 阶段 | 工作量 | 人力投入 |
|------|--------|----------|
| Phase 1 | 17 天 | 2 人 × 2 周 |
| Phase 2 | 19 天 | 2 人 × 2 周 |
| Phase 3 | 18 天 | 2 人 × 2 周 |
| Phase 4 | 25 天 | 1 人持续 |
| **总计** | **79 天** | - |

### 7.2 技术风险

#### 7.2.1 高风险项

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| LLM 响应不稳定 | 流程执行失败 | 中 | 重试机制 + 降级策略 |
| AI 成本超预期 | 预算超支 | 中 | Token 限制 + 缓存优化 |
| 性能瓶颈 | 用户体验差 | 中 | 异步执行 + 队列化 |
| 数据安全 | 信息泄露 | 低 | 数据脱敏 + 权限控制 |

#### 7.2.2 中风险项

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 技术方案不成熟 | 返工 | 中 | 先做 POC 验证 |
| 依赖外部 API | 功能受限 | 中 | 多模型备选 |
| 测试覆盖不足 | 质量问题 | 中 | 自动化测试 |

### 7.3 依赖项

#### 7.3.1 技术依赖

| 依赖 | 版本 | 状态 | 风险 |
|------|------|------|------|
| LangGraph | latest | ✅ 已集成 | 低 |
| DeepSeek API | V4 Pro | ✅ 已集成 | 中 |
| MongoDB | 8.0 | ✅ 已部署 | 低 |
| Vue Flow | latest | ✅ 已集成 | 低 |

#### 7.3.2 外部依赖

| 依赖 | 用途 | 备选方案 |
|------|------|----------|
| DeepSeek API | LLM 调用 | OpenAI / Claude |
| Embedding API | 向量化 | @xenova/transformers |
| 向量数据库 | RAG 存储 | MongoDB Atlas Vector Search |

---

## 八、附录

### 8.1 相关文档链接

| 文档 | 路径 | 说明 |
|------|------|------|
| AI 项目完善计划 | `docs/ai-improvement-plan.md` | AI 功能完善详细方案 |
| Flow 项目完善计划 | `docs/flow-improvement-plan.md` | Flow 功能完善详细方案 |
| Editor 项目完善计划 | `docs/editor-improvement-plan.md` | Editor 功能完善详细方案 |
| AI 风险分析报告 | `docs/ai-risk-analysis.md` | AI 项目风险深度分析 |
| AI 任务分发方案 | `docs/ai-project-task-distribution.md` | 任务分发和进度监控 |
| AI 前后端分工 | `docs/ai-dev-alignment.md` | 服务端与前端分工对齐 |
| 项目整体完善计划 | `docs/overall-improvement-plan.md` | 三个项目的统一规划 |

### 8.2 术语表

| 术语 | 说明 |
|------|------|
| **LangGraph** | LangChain 的图执行框架，用于构建多智能体工作流 |
| **SSE** | Server-Sent Events，服务端推送事件，用于流式传输 |
| **BPMN** | Business Process Model and Notation，业务流程建模标准 |
| **Schema** | JSON Schema，定义表单/流程的数据结构 |
| **Widget** | 表单组件，Editor 的核心抽象 |
| **RAG** | Retrieval-Augmented Generation，检索增强生成 |
| **AITask** | AI 任务节点，Flow 中调用 AI 的节点类型 |
| **Tool** | AI 工具，LLM 可调用的外部能力 |
| **Agent** | AI 智能体，具有特定能力的 LLM 封装 |
| **N8N** | 开源工作流自动化平台 |

### 8.3 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026/06/04 | 初始版本，包含完整规划 |

---

**文档维护**：本文档随项目进展持续更新，每完成一个阶段后更新完成度和下一步计划。
