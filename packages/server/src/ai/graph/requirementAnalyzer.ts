/**
 * Requirement Analyzer Node
 *
 * 深度理解用户需求，提取结构化信息。
 * 分析意图、提取实体、评估完整性、生成确认问题。
 */

import { SystemMessage, HumanMessage } from '@langchain/core/messages'
import { getLLM } from '../services/llmCache.js'
import { getModelForTask } from './agentBase.js'
import { callLLMWithFallback } from './agentErrorHandler.js'
import { logger } from '../../utils/logger.js'
import type { AgentStateAnnotation, RequirementAnalysis } from './state.js'

// ────────────────────────────────────────────
// System Prompt
// ────────────────────────────────────────────

const REQUIREMENT_ANALYZER_PROMPT = `你是一个需求分析专家，专门分析用户关于表单、流程和页面的需求。

## 你的任务

1. **理解用户意图**
   - create: 创建新的表单/流程/页面
   - modify: 修改现有的表单/流程/页面
   - query: 查询/搜索现有的内容
   - help: 寻求帮助或解释

2. **需求类型分类**
   - form: 纯表单需求
   - flow: 纯流程需求
   - page: 纯页面需求
   - mixed: 混合需求（包含多种类型）
   - general: 通用问答

3. **复杂度评估**
   - simple: 单一实体，字段明确，无需确认
   - medium: 需要少量确认或拆解
   - complex: 多实体关联，需要详细确认

4. **提取实体信息**
   - 表单：名称、用途、字段列表（名称、类型、是否必填）
   - 流程：名称、节点列表（类型、名称、审批人）、条件分支
   - 页面：名称、类型（列表/详情/仪表盘）、组件列表

5. **评估完整性**（0-100 分）
   - 100: 信息完整，可以直接执行
   - 80-99: 信息基本完整，可以执行但有假设
   - 60-79: 信息不足，需要确认关键细节
   - <60: 信息严重不足，需要大量确认

6. **生成确认问题**
   - 针对缺失的信息生成问题
   - 提供选项（如果可能）
   - 标记是否必填

7. **建议任务链**
   - 将复杂需求拆解为多个步骤
   - 指定每个步骤的 Agent
   - 标记依赖关系

## 输出格式

请输出严格的 JSON 格式，不要包含任何其他文本：

\`\`\`json
{
  "intent": "create|modify|query|help",
  "type": "form|flow|page|mixed|general",
  "complexity": "simple|medium|complex",
  "entities": {
    "forms": [...],
    "flows": [...],
    "pages": [...]
  },
  "completeness": {
    "score": 80,
    "missing": [...],
    "assumptions": [...]
  },
  "confirmQuestions": [...],
  "suggestedChain": [...]
}
\`\`\`

## 示例

用户输入：创建一个用户注册表单

输出：
\`\`\`json
{
  "intent": "create",
  "type": "form",
  "complexity": "simple",
  "entities": {
    "forms": [{
      "name": "用户注册表单",
      "purpose": "收集用户注册信息",
      "fields": [
        { "name": "用户名", "type": "input", "required": true },
        { "name": "邮箱", "type": "input", "required": true },
        { "name": "密码", "type": "input", "required": true }
      ]
    }]
  },
  "completeness": {
    "score": 85,
    "missing": ["手机号", "验证码"],
    "assumptions": ["使用默认样式", "包含提交按钮"]
  },
  "confirmQuestions": [
    {
      "id": "q1",
      "question": "是否需要手机号和验证码？",
      "options": ["需要", "不需要"],
      "required": false
    }
  ],
  "suggestedChain": [
    {
      "agent": "editor",
      "description": "生成用户注册表单",
      "priority": 1,
      "dependencies": []
    }
  ]
}
\`\`\`
`

// ────────────────────────────────────────────
// Helper functions
// ────────────────────────────────────────────

function extractUserContent(state: typeof AgentStateAnnotation.State): string {
  const lastHumanMessage = [...state.messages]
    .reverse()
    .find((m) => m.constructor.name === 'HumanMessage')

  if (!lastHumanMessage) {
    return ''
  }

  return typeof lastHumanMessage.content === 'string'
    ? lastHumanMessage.content
    : JSON.stringify(lastHumanMessage.content)
}

function parseAnalysisResponse(raw: string): RequirementAnalysis | null {
  try {
    // 尝试提取 JSON
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      logger.error({ msg: '[requirementAnalyzer] No JSON found in response' })
      return null
    }

    const parsed = JSON.parse(jsonMatch[0]) as RequirementAnalysis

    // 验证必需字段
    if (!parsed.intent || !parsed.type || !parsed.complexity) {
      logger.error({ msg: '[requirementAnalyzer] Missing required fields', parsed })
      return null
    }

    // 确保 completeness 有默认值
    if (!parsed.completeness) {
      parsed.completeness = { score: 50, missing: [], assumptions: [] }
    }

    // 确保数组字段有默认值
    if (!parsed.confirmQuestions) {
      parsed.confirmQuestions = []
    }
    if (!parsed.suggestedChain) {
      parsed.suggestedChain = []
    }
    if (!parsed.entities) {
      parsed.entities = {}
    }

    return parsed
  } catch (err) {
    logger.error({ msg: '[requirementAnalyzer] Failed to parse response', error: err })
    return null
  }
}

// ────────────────────────────────────────────
// Main node function
// ────────────────────────────────────────────

export async function requirementAnalyzerNode(
  state: typeof AgentStateAnnotation.State,
): Promise<Partial<typeof AgentStateAnnotation.State>> {
  const userContent = extractUserContent(state)

  if (!userContent) {
    logger.warn({ msg: '[requirementAnalyzer] No user content found' })
    return {
      requirement: {
        analysis: null,
        userConfirmations: {},
        needsConfirmation: false,
        status: 'pending',
      },
    }
  }

  logger.info({
    msg: '[requirementAnalyzer] Analyzing requirement',
    content: userContent.substring(0, 100),
    source: state.context.source,
  })

  // 所有模式都进行需求分析（包括显式模式）
  // 显式模式会将用户选择的 Agent 作为上下文传入 LLM
  try {
    const model = await getLLM({
      model: getModelForTask('analyze'),
      temperature: 0,
      maxTokens: 4096,
      jsonMode: true,
    })

    // 构建上下文信息
    let contextInfo = userContent

    // 显式模式：告知 LLM 用户已选择的 Agent
    if (state.context.source !== 'standalone') {
      const agentLabel = state.context.source === 'editor' ? '表单编辑器' :
        state.context.source === 'flow' ? '流程编辑器' : '页面编辑器'
      contextInfo = `[用户已选择使用 ${agentLabel}]\n\n${userContent}`

      // 如果有当前 Schema 或 Flow，也传入
      if (state.context.currentSchema && state.context.currentSchema.length > 0) {
        contextInfo += `\n\n[当前已有 Schema，包含 ${state.context.currentSchema.length} 个组件]`
      }
      if (state.context.currentFlow) {
        contextInfo += `\n\n[当前已有 Flow，包含 ${state.context.currentFlow.nodes?.length || 0} 个节点]`
      }
    }

    const stream = await model.stream([
      new SystemMessage(REQUIREMENT_ANALYZER_PROMPT),
      new HumanMessage(contextInfo),
    ])

    let raw = ''
    for await (const chunk of stream) {
      const content = typeof chunk.content === 'string' ? chunk.content : ''
      if (content) raw += content
    }

    const analysis = parseAnalysisResponse(raw)

    if (!analysis) {
      logger.warn({ msg: '[requirementAnalyzer] Failed to parse analysis, using fallback' })
      return {
        requirement: {
          analysis: null,
          userConfirmations: {},
          needsConfirmation: false,
          status: 'pending',
        },
      }
    }

    // 根据复杂度和完整性决定是否需要确认
    const needsConfirmation = analysis.complexity !== 'simple' ||
      analysis.completeness.score < 80

    logger.info({
      msg: '[requirementAnalyzer] Analysis complete',
      intent: analysis.intent,
      type: analysis.type,
      complexity: analysis.complexity,
      completeness: analysis.completeness.score,
      needsConfirmation,
      confirmQuestions: analysis.confirmQuestions.length,
      suggestedChain: analysis.suggestedChain.length,
    })

    return {
      requirement: {
        analysis,
        userConfirmations: {},
        needsConfirmation,
        status: 'analyzed',
      },
    }
  } catch (err) {
    logger.error({ msg: '[requirementAnalyzer] LLM call failed', error: err })
    return {
      requirement: {
        analysis: null,
        userConfirmations: {},
        needsConfirmation: false,
        status: 'pending',
      },
    }
  }
}

// ────────────────────────────────────────────
// Routing function
// ────────────────────────────────────────────

export function routeAfterRequirementAnalyzer(
  state: typeof AgentStateAnnotation.State,
): string {
  const { requirement } = state

  // 如果分析失败或不需要确认，直接进入 taskPlanner
  if (!requirement.analysis || !requirement.needsConfirmation) {
    console.log('[routeAfterRequirementAnalyzer] No confirmation needed -> taskPlanner')
    return 'taskPlanner'
  }

  // 需要确认，进入 requirementConfirm
  console.log('[routeAfterRequirementAnalyzer] Confirmation needed -> requirementConfirm')
  return 'requirementConfirm'
}
