/**
 * AI API routes.
 *
 * POST /api/ai/chat            — SSE streaming chat endpoint (LangGraph streamEvents)
 * POST /api/ai/publish         — Publish generated artifact
 * GET  /api/ai/conversations   — List conversations
 * GET  /api/ai/conversations/:id — Get conversation detail
 * DELETE /api/ai/conversations/:id — Delete a conversation
 */

import Router from '@koa/router'
import { PassThrough } from 'node:stream'
import { v4 as uuidv4 } from 'uuid'
import { HumanMessage, AIMessage as LangChainAIMessage, ToolMessage } from '@langchain/core/messages'
import { Command } from '@langchain/langgraph'
import { isGraphInterrupt } from '@langchain/langgraph'
import { validate } from '../middleware/validate.js'
import { authMiddleware } from '../middleware/auth.js'
import { chatRequestSchema, publishRequestSchema, behaviorRequestSchema } from './schemas/aiSchemas.js'
import { graph } from './graph/graph.js'
import {
  createConversation,
  getConversation,
  appendMessage,
  listConversations,
  deleteConversation,
  maybeGenerateSummary,
  searchConversations,
} from './services/conversationService.js'
import {
  createVersion,
  getVersions,
  getVersion,
} from './services/versionService.js'
import { FormSchemaModel } from '../models/FormSchema.js'
import { PublishedSchemaModel } from '../models/PublishedSchema.js'
import { FlowDefinitionModel } from '../flow-models/FlowDefinition.js'
import { FlowVersionModel } from '../flow-models/FlowVersion.js'
import { PromptVersionModel } from './models/promptVersion.js'
import { promptOptimizer } from './services/promptOptimizer.js'
import { EDITOR_SYSTEM_PROMPT } from './prompts/editor.js'
import { FLOW_SYSTEM_PROMPT } from './prompts/flow.js'
import { ROUTER_SYSTEM_PROMPT } from './prompts/router.js'
import type { AIMessage } from './graph/state.js'
import { recordBehavior, analyzeUserPreferences, getBehaviorStats } from './services/behaviorService.js'
import { getAvailableIndustries, getIndustryTemplates, type IndustryType } from './config/industryAgents.js'
import { semanticSearch } from './services/ragService.js'

const router = new Router({ prefix: '/api/ai' })

// ────────────────────────────────────────────
// Interrupted thread tracking for HITL resume
// ────────────────────────────────────────────

interface InterruptedThread {
  conversationId: string
  threadId: string
  interruptValue: unknown
  timestamp: Date
}

/** Map of threadId -> interrupted state, used to resume after user confirmation */
const interruptedThreads = new Map<string, InterruptedThread>()

// No parser utilities needed — deepseek-chat returns content
// as structured fields with JSON Mode enabled.

// ────────────────────────────────────────────
// Tool names that produce structured payloads
// ────────────────────────────────────────────

const SCHEMA_TOOLS = new Set(['validate_schema'])
const FLOW_TOOLS = new Set(['validate_flow'])
const UPDATE_SCHEMA_TOOL = 'update_schema'
const UPDATE_FLOW_TOOL = 'update_flow'
const GENERATE_SCHEMA_TOOL = 'generate_schema'
const BIND_TOOLS = new Set(['save_and_bind_schema', 'bind_schema_to_flow_node'])

// ────────────────────────────────────────────
// POST /api/ai/chat  (SSE via LangGraph streamEvents)
// ────────────────────────────────────────────

router.post('/chat', validate(chatRequestSchema), async (ctx) => {
  const { conversationId, message, context } = ctx.request.body as {
    conversationId?: string
    message: string
    context: {
      source: string
      schemaId?: string
      flowId?: string
      nodeId?: string
      version?: string
      preferences?: Record<string, unknown>
      historySummary?: string
    }
  }

  // ── Resolve or create conversation ──
  let convo
  let turnCount = 1

  if (conversationId) {
    convo = await getConversation(conversationId)
    if (!convo) {
      ctx.status = 404
      ctx.body = { success: false, error: { message: 'Conversation not found.' } }
      return
    }
    turnCount = convo.messages.filter((m) => m.role === 'user').length + 1
  } else {
    convo = await createConversation({
      source: context.source as 'editor' | 'flow' | 'page' | 'standalone',
      schemaId: context.schemaId,
      flowId: context.flowId,
      nodeId: context.nodeId,
      version: context.version,
    })
  }

  // ── Load current schema if schemaId provided ──
  let currentSchema: Record<string, unknown>[] | undefined
  if (context.schemaId) {
    const schema = await FormSchemaModel.findById(context.schemaId)
    if (schema) {
      if (context.version && schema.version !== context.version) {
        const snapshot = schema.versions.find((v: { version: string }) => v.version === context.version)
        if (snapshot) {
          currentSchema = Array.isArray(snapshot.json)
            ? snapshot.json as Record<string, unknown>[]
            : undefined
        }
      }
      if (!currentSchema && Array.isArray(schema.json)) {
        currentSchema = schema.json as Record<string, unknown>[]
      }
    }
  }

  // ── Load current flow graph if flowId provided ──
  let currentFlow: { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] } | undefined
  if (context.flowId) {
    const flowVersion = await FlowVersionModel.findOne({ definitionId: context.flowId })
      .sort({ version: -1 })
      .lean() as Record<string, unknown> | null
    if (flowVersion?.graph && typeof flowVersion.graph === 'object') {
      const g = flowVersion.graph as Record<string, unknown>
      currentFlow = {
        nodes: Array.isArray(g.nodes) ? g.nodes as Record<string, unknown>[] : [],
        edges: Array.isArray(g.edges) ? g.edges as Record<string, unknown>[] : [],
      }
    }
  }

  // ── Persist user message ──
  const userMessage: AIMessage = {
    role: 'user',
    content: message,
    timestamp: new Date(),
  }
  await appendMessage(convo._id, userMessage)

  // ── Reconstruct conversation history with ToolMessages ──
  function reconstructHistory(messages: Array<{ role: string; content: string; toolCalls?: Array<{ name: string; arguments: Record<string, unknown>; result?: unknown }> }>): Array<HumanMessage | LangChainAIMessage | ToolMessage> {
    const result: Array<HumanMessage | LangChainAIMessage | ToolMessage> = []

    for (const msg of messages) {
      if (msg.role === 'user') {
        result.push(new HumanMessage(msg.content))
      } else if (msg.role === 'assistant') {
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          // AIMessage with tool_calls
          const toolCalls = msg.toolCalls.map((tc, idx) => ({
            name: tc.name,
            args: tc.arguments,
            id: `call_${idx}_${tc.name}`,
            type: 'tool_call' as const,
          }))
          result.push(new LangChainAIMessage({
            content: msg.content || '',
            tool_calls: toolCalls,
          }))
          // Add ToolMessage for each tool call
          for (const tc of msg.toolCalls) {
            result.push(new ToolMessage({
              content: tc.result ? JSON.stringify(tc.result) : '工具执行完成',
              tool_call_id: `call_${msg.toolCalls.indexOf(tc)}_${tc.name}`,
              name: tc.name,
            }))
          }
        } else {
          // Regular AIMessage without tool_calls
          result.push(new LangChainAIMessage(msg.content))
        }
      }
    }

    return result
  }

  // ── Build LangGraph input state ──
  const threadId = convo._id
  const historyMessages = reconstructHistory(convo.messages.slice(0, -1)) // Exclude the current user message
  const graphInput = {
    messages: [...historyMessages, new HumanMessage(message)],
    context: {
      source: context.source as 'editor' | 'flow' | 'page' | 'standalone',
      schemaId: context.schemaId,
      flowId: context.flowId,
      nodeId: context.nodeId,
      currentSchema,
      currentFlow,
      turnCount,
    },
    session: {
      id: threadId,
      conversationId: convo._id,
      currentAgent: 'router' as const,
    },
    interaction: {
      clarificationRequest: null as string | null,
      clarificationOptions: [] as string[],
      preferences: (context.preferences ?? {}) as Record<string, unknown>,
      historySummary: (convo.historySummary ?? context.historySummary ?? '') as string,
      collaborationRequest: null as null,
    },
  }

  // ── SSE response setup ──
  ctx.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  ctx.status = 200

  const stream = new PassThrough()
  ctx.body = stream

  const send = (event: Record<string, unknown>) => {
    stream.write(`data: ${JSON.stringify(event)}\n\n`)
  }

  // SSE heartbeat to keep connection alive (every 15s)
  const heartbeat = setInterval(() => {
    stream.write(':heartbeat\n\n')
  }, 15_000)

  // ── Streaming state ──
  let currentAgent: 'router' | 'editor' | 'flow' | 'page' | 'general' = 'router'
  let accumulatedContent = ''
  const toolCallRegistry: Array<{ id?: string; name: string; arguments: Record<string, unknown>; result?: unknown }> = []
  const pendingPayloads = new Map<string, Record<string, unknown>[] | Record<string, unknown>>()
  let doneSent = false

  // S3: Track <think> tag state across chunks for streaming fallback
  let thinkBuffer = ''
  let insideThinkTag = false

  try {
    const eventStream = graph.streamEvents(graphInput, {
      version: 'v2',
      configurable: { thread_id: threadId },
    })

    for await (const event of eventStream) {
      switch (event.event) {
        // ── Node execution start ──
        case 'on_chain_start': {
          const nodeName = event.name as string
          console.log(`[stream] on_chain_start: ${nodeName}`)
          if (nodeName === 'thinker') {
            // S3: Emit initial thinking indicator so the UI shows feedback
            // even when the LLM doesn't support reasoning_content
            send({ type: 'thinking', content: '正在分析需求...\n' })
          }
          if (nodeName === 'editor' || nodeName === 'flow' || nodeName === 'page' || nodeName === 'general' || nodeName === 'summarizer') {
            currentAgent = nodeName === 'summarizer' ? 'general' : nodeName
            send({ type: 'agent_switch', agent: nodeName === 'summarizer' ? 'general' : nodeName })
          }
          break
        }

        // ── Node finished ──
        case 'on_chain_end': {
          const nodeName = event.name as string
          console.log(`[stream] on_chain_end: ${nodeName}`)

          // Thinker node completed — extract task chain
          if (nodeName === 'thinker') {
            const output = event.data?.output as Record<string, unknown> | undefined
            const taskGroup = output?.task as Record<string, unknown> | undefined
            if (taskGroup?.chain && Array.isArray(taskGroup.chain) && taskGroup.chain.length > 0) {
              const steps = taskGroup.chain as Array<{ agent: string; description: string; status: string }>
              send({
                type: 'task_chain',
                steps: steps.map((s) => ({
                  agent: s.agent,
                  description: s.description,
                  status: s.status,
                })),
                currentIndex: (taskGroup.currentStepIndex as number) ?? 0,
              })
            }
          }

          // Editor/Flow/Page node completed — update task chain status
          if (nodeName === 'editor' || nodeName === 'flow' || nodeName === 'page') {
            const output = event.data?.output as Record<string, unknown> | undefined
            const taskGroup = output?.task as Record<string, unknown> | undefined
            if (taskGroup?.chain && Array.isArray(taskGroup.chain)) {
              const steps = taskGroup.chain as Array<{ agent: string; description: string; status: string }>
              send({
                type: 'task_chain',
                steps: steps.map((s) => ({
                  agent: s.agent,
                  description: s.description,
                  status: s.status,
                })),
                currentIndex: (taskGroup.currentStepIndex as number) ?? 0,
              })
            }
          }

          // Graph finished
          if (nodeName === '__end__') {
            // No post-processing needed
          }
          break
        }

        // ── LLM token streaming ──
        case 'on_chat_model_stream': {
          const chunk = event.data?.chunk as {
            content?: unknown
            additional_kwargs?: { reasoning_content?: string }
          } | undefined

          // S3: 捕获 thinking 内容（三级 fallback）
          // 1. DeepSeek 私有字段 additional_kwargs.reasoning_content
          // 2. 标准 reasoning_content 字段（其他模型兼容）
          // 3. 从 content 中提取 <think>...</think> 标签（支持跨 chunk）
          const reasoningContent =
            chunk?.additional_kwargs?.reasoning_content ??
            (chunk as Record<string, unknown> | undefined)?.reasoning_content as string | undefined

          if (reasoningContent && typeof reasoningContent === 'string' && reasoningContent.trim().length > 0) {
            send({ type: 'thinking', content: reasoningContent })
            break
          }

          if (!chunk?.content || typeof chunk.content !== 'string') break

          const content = chunk.content

          // S3: Fallback — 跨 chunk 跟踪 <think> 标签状态
          if (insideThinkTag) {
            // 已在 <think> 标签内部，累积直到遇到 </think>
            const closeIdx = content.indexOf('</think>')
            if (closeIdx >= 0) {
              thinkBuffer += content.slice(0, closeIdx)
              if (thinkBuffer.trim().length > 0) {
                send({ type: 'thinking', content: thinkBuffer })
              }
              thinkBuffer = ''
              insideThinkTag = false
              const remaining = content.slice(closeIdx + 7).trim()
              if (remaining && currentAgent !== 'router') {
                accumulatedContent += remaining
                send({ type: 'text', content: remaining })
              }
            } else {
              thinkBuffer += content
            }
            break
          }

          // 检查是否进入 <think> 标签
          const thinkOpenIdx = content.indexOf('<think>')
          if (thinkOpenIdx >= 0) {
            const afterOpen = content.slice(thinkOpenIdx + 7)
            const closeIdx = afterOpen.indexOf('</think>')
            if (closeIdx >= 0) {
              // 开闭标签在同一 chunk 内
              const thinkContent = afterOpen.slice(0, closeIdx)
              if (thinkContent.trim().length > 0) {
                send({ type: 'thinking', content: thinkContent })
              }
              const remaining = afterOpen.slice(closeIdx + 7).trim()
              if (remaining && currentAgent !== 'router') {
                accumulatedContent += remaining
                send({ type: 'text', content: remaining })
              }
            } else {
              // 开始跨 chunk 的 <think> 标签
              insideThinkTag = true
              thinkBuffer = afterOpen
              const beforeThink = content.slice(0, thinkOpenIdx).trim()
              if (beforeThink && currentAgent !== 'router') {
                accumulatedContent += beforeThink
                send({ type: 'text', content: beforeThink })
              }
            }
            break
          }

          // Router 输出是内部 JSON，不流式传输给客户端
          // 但 Router 的 thinking 需要传输
          if (currentAgent === 'router') break

          // Stream content tokens
          accumulatedContent += content
          send({ type: 'text', content })
          break
        }

        // ── Tool call started ──
        case 'on_tool_start': {
          const toolName = event.name as string
          const toolArgs = (event.data?.input as Record<string, unknown>) ?? {}

          toolCallRegistry.push({
            id: event.run_id as string | undefined,
            name: toolName,
            arguments: toolArgs,
          })

          send({
            type: 'tool_call',
            phase: 'calling',
            tools: [{ id: event.run_id, name: toolName, arguments: toolArgs }],
          })

          // 协作请求：通知前端智能体切换
          if (toolName === 'request_collaboration') {
            const targetAgent = toolArgs.targetAgent as string
            if (targetAgent === 'editor' || targetAgent === 'flow' || targetAgent === 'page') {
              send({
                type: 'agent_switch',
                agent: targetAgent,
                collaboration: true,
                description: toolArgs.description as string,
              })
            }
          }

          // Capture schema/flow payloads from validation tool arguments
          if (SCHEMA_TOOLS.has(toolName) && toolArgs.widgets) {
            pendingPayloads.set(event.run_id as string, toolArgs.widgets as Record<string, unknown>[])
          }
          if (FLOW_TOOLS.has(toolName) && toolArgs.flow) {
            pendingPayloads.set(event.run_id as string, toolArgs.flow as Record<string, unknown>)
          }
          // Capture payloads from update tools
          if (toolName === UPDATE_SCHEMA_TOOL && toolArgs.widgets) {
            pendingPayloads.set(event.run_id as string, {
              type: 'update_schema',
              widgets: toolArgs.widgets,
              schemaId: toolArgs.schemaId,
              description: toolArgs.description,
            })
          }
          if (toolName === UPDATE_FLOW_TOOL && toolArgs.flow) {
            pendingPayloads.set(event.run_id as string, {
              type: 'update_flow',
              flow: toolArgs.flow,
              flowId: toolArgs.flowId,
              description: toolArgs.description,
            })
          }
          break
        }

        // ── Tool call finished ──
        case 'on_tool_end': {
          const toolName = event.name as string
          const toolResult = event.data?.output
          const toolRunId = event.run_id as string

          // Update registry — use run_id for precise matching (S4)
          const entry = toolCallRegistry.find((t) => t.id === toolRunId)
          if (entry) {
            entry.result = toolResult
          }

          // S5: Check for tool execution errors
          const isError = event.data?.error != null
            || (toolResult && typeof toolResult === 'object' && 'error' in (toolResult as Record<string, unknown>))

          if (isError) {
            const errorMessage = event.data?.error != null
              ? String(event.data.error)
              : String((toolResult as Record<string, unknown>)?.error ?? '工具执行失败')

            // Update registry entry with error info for persistence
            if (entry) {
              entry.result = { error: errorMessage }
            }

            // S5: Send structured tool_error with fields aligned to frontend expectations
            send({
              type: 'tool_error',
              toolName,
              runId: toolRunId,
              content: errorMessage,
            })
          } else {
            // S5: Only send regular result event when there's no error
            send({
              type: 'tool_call',
              phase: 'result',
              tools: [{ id: toolRunId, name: toolName, result: toolResult }],
            })
          }

          // Emit schema event from pending payload
          if (SCHEMA_TOOLS.has(toolName)) {
            const payload = pendingPayloads.get(toolRunId)
            if (payload) {
              send({
                type: 'schema',
                payload,
                description: accumulatedContent,
              })
              // Save version
              const v = await createVersion({
                conversationId: convo._id,
                messageId: toolRunId,
                type: 'schema',
                content: payload as Record<string, unknown>[],
                description: '生成 Schema',
              })
              send({ type: 'version_created', versionId: v._id, version: v.version })
              pendingPayloads.delete(toolRunId)
            }
          }

          // Emit flow event from pending payload
          if (FLOW_TOOLS.has(toolName)) {
            const payload = pendingPayloads.get(toolRunId)
            if (payload) {
              send({
                type: 'flow',
                payload,
                description: accumulatedContent,
              })
              // Save version
              const v = await createVersion({
                conversationId: convo._id,
                messageId: toolRunId,
                type: 'flow',
                content: payload as Record<string, unknown>,
                description: '生成流程',
              })
              send({ type: 'version_created', versionId: v._id, version: v.version })
              pendingPayloads.delete(toolRunId)
            }
          }

          // Emit schema from generate_schema tool result
          if (toolName === GENERATE_SCHEMA_TOOL) {
            const result = toolResult as Record<string, unknown> | undefined
            const resultData = result?.data as Record<string, unknown> | undefined
            if (resultData?.widgets) {
              send({
                type: 'schema',
                payload: resultData.widgets,
                description: (resultData.summary as string) ?? '',
              })
              // Save version
              const v = await createVersion({
                conversationId: convo._id,
                messageId: toolRunId,
                type: 'schema',
                content: resultData.widgets as Record<string, unknown>[],
                description: (resultData.summary as string) ?? '生成 Schema',
              })
              send({ type: 'version_created', versionId: v._id, version: v.version })
            }
          }

          // Emit schema + diff from update_schema tool result
          if (toolName === UPDATE_SCHEMA_TOOL) {
            const result = toolResult as Record<string, unknown> | undefined
            const resultData = result?.data as Record<string, unknown> | undefined
            if (resultData?.widgets) {
              // Send schema update event
              send({
                type: 'schema',
                payload: resultData.widgets,
                description: (resultData.description as string) ?? (resultData.summary as string) ?? '',
              })
              // Send diff event if available
              if (resultData.diff) {
                send({
                  type: 'schema_diff',
                  diff: resultData.diff,
                  description: (resultData.description as string) ?? '',
                })
              }
              // Save version via version service
              const v = await createVersion({
                conversationId: convo._id,
                messageId: toolRunId,
                type: 'schema',
                content: resultData.widgets as Record<string, unknown>[],
                description: (resultData.description as string) ?? '更新 Schema',
              })
              send({ type: 'version_created', versionId: v._id, version: v.version })
              pendingPayloads.delete(toolRunId)
            }
          }

          // Emit flow + diff from update_flow tool result
          if (toolName === UPDATE_FLOW_TOOL) {
            const result = toolResult as Record<string, unknown> | undefined
            const resultData = result?.data as Record<string, unknown> | undefined
            if (resultData?.flow) {
              // Send flow update event
              send({
                type: 'flow',
                payload: resultData.flow,
                description: (resultData.description as string) ?? (resultData.summary as string) ?? '',
              })
              // Send diff event if available
              if (resultData.diff) {
                send({
                  type: 'flow_diff',
                  diff: resultData.diff,
                  description: (resultData.description as string) ?? '',
                })
              }
              // Save version via version service
              const v = await createVersion({
                conversationId: convo._id,
                messageId: toolRunId,
                type: 'flow',
                content: resultData.flow as Record<string, unknown>,
                description: (resultData.description as string) ?? '更新流程',
              })
              send({ type: 'version_created', versionId: v._id, version: v.version })
              pendingPayloads.delete(toolRunId)
            }
          }

          // Emit binding event when schema is saved and bound to flow node
          if (BIND_TOOLS.has(toolName)) {
            const result = toolResult as Record<string, unknown> | undefined
            const resultData = result?.data as Record<string, unknown> | undefined
            if (resultData?.schemaId) {
              send({
                type: 'schema_bound',
                schemaId: resultData.schemaId,
                publishId: resultData.publishId,
                flowId: resultData.flowId,
                nodeId: resultData.nodeId,
                flowVersionId: resultData.flowVersionId,
              })
            }
          }
          break
        }
      }
    }

    // ── Persist assistant message ──
    const assistantMessage: AIMessage = {
      role: 'assistant',
      content: accumulatedContent,
      timestamp: new Date(),
    }
    if (toolCallRegistry.length > 0) {
      assistantMessage.toolCalls = toolCallRegistry.map((tc) => ({
        name: tc.name,
        arguments: tc.arguments,
        result: tc.result,
      }))
    }

    await appendMessage(convo._id, assistantMessage)

    // ── Auto-generate history summary if conversation is long ──
    maybeGenerateSummary(convo._id).catch(() => {
      // Summary generation is fire-and-forget; failures are non-fatal
    })

    // Done event
    send({ type: 'done', conversationId: convo._id })
    doneSent = true
  } catch (err) {
    // ── Detect Human-in-the-Loop interrupt ──
    if (isGraphInterrupt(err)) {
      const interruptValue = err.interrupts?.[0]?.value as Record<string, unknown> | undefined
      console.log(`[AI Chat] Interrupt detected (thread=${threadId}):`, interruptValue)

      // Store interrupted thread for later resume
      interruptedThreads.set(threadId, {
        conversationId: convo._id,
        threadId,
        interruptValue,
        timestamp: new Date(),
      })

      // Send interrupt event to frontend
      send({
        type: 'interrupt',
        threadId,
        interruptType: interruptValue?.type ?? 'unknown',
        message: interruptValue?.message ?? '操作需要确认',
        data: interruptValue?.data,
      })

      doneSent = true
      return
    }

    const errorMsg = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[AI Chat] Stream error (thread=${threadId}, agent=${currentAgent}):`, err)
    const phaseLabel = accumulatedContent ? '生成阶段' : '思考阶段'
    send({
      type: 'error',
      content: `[${phaseLabel}] ${errorMsg}`,
      agent: currentAgent,
    })
    // 如果已有部分内容，追加错误提示到消息中
    if (accumulatedContent) {
      send({ type: 'text', content: `\n\n⚠️ 生成中断：${errorMsg}` })
    }
  } finally {
    // Guarantee done event is sent even when stream errors out
    if (!doneSent) {
      send({ type: 'done', conversationId: convo._id })
    }
    clearInterval(heartbeat)
    stream.end()
  }
})

// ────────────────────────────────────────────
// GET /api/ai/chat/interrupt/:threadId  (check interrupt status)
// ────────────────────────────────────────────

router.get('/chat/interrupt/:threadId', async (ctx) => {
  const { threadId } = ctx.params
  const interrupted = interruptedThreads.get(threadId)

  if (!interrupted) {
    ctx.body = { success: true, data: { hasInterrupt: false } }
    return
  }

  ctx.body = {
    success: true,
    data: {
      hasInterrupt: true,
      interruptType: (interrupted.interruptValue as Record<string, unknown>)?.type ?? 'unknown',
      message: (interrupted.interruptValue as Record<string, unknown>)?.message ?? '操作需要确认',
      data: (interrupted.interruptValue as Record<string, unknown>)?.data,
      timestamp: interrupted.timestamp,
    },
  }
})

// ────────────────────────────────────────────
// POST /api/ai/chat/resume  (resume after HITL interrupt)
// ────────────────────────────────────────────

router.post('/chat/resume', async (ctx) => {
  const { threadId, confirmed } = ctx.request.body as {
    threadId: string
    confirmed: boolean
  }

  if (!threadId) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'threadId is required' } }
    return
  }

  const interrupted = interruptedThreads.get(threadId)
  if (!interrupted) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'No interrupted thread found for this threadId' } }
    return
  }

  // Remove from interrupted threads
  interruptedThreads.delete(threadId)

  // Set up SSE response
  ctx.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  ctx.status = 200

  const stream = new PassThrough()
  ctx.body = stream

  const send = (event: Record<string, unknown>) => {
    stream.write(`data: ${JSON.stringify(event)}\n\n`)
  }

  const heartbeat = setInterval(() => {
    stream.write(':heartbeat\n\n')
  }, 15_000)

  let doneSent = false

  try {
    // Resume graph with Command
    const config = { configurable: { thread_id: threadId } }
    const command = new Command({ resume: confirmed })

    const eventStream = graph.streamEvents(command, {
      version: 'v2',
      configurable: { thread_id: threadId },
    })

    for await (const event of eventStream) {
      // Forward relevant events to frontend
      if (event.event === 'on_chat_model_stream') {
        const chunk = event.data?.chunk as { content?: unknown } | undefined
        if (chunk?.content && typeof chunk.content === 'string') {
          send({ type: 'text', content: chunk.content })
        }
      }

      if (event.event === 'on_tool_start') {
        send({
          type: 'tool_call',
          phase: 'calling',
          tools: [{ id: event.run_id, name: event.name, arguments: event.data?.input }],
        })
      }

      if (event.event === 'on_tool_end') {
        send({
          type: 'tool_call',
          phase: 'result',
          tools: [{ id: event.run_id, name: event.name, result: event.data?.output }],
        })
      }
    }

    send({ type: 'done', conversationId: interrupted.conversationId })
    doneSent = true
  } catch (err) {
    // Check for nested interrupt (multiple interrupts in sequence)
    if (isGraphInterrupt(err)) {
      const interruptValue = err.interrupts?.[0]?.value as Record<string, unknown> | undefined
      console.log(`[AI Chat Resume] Nested interrupt detected (thread=${threadId}):`, interruptValue)

      interruptedThreads.set(threadId, {
        conversationId: interrupted.conversationId,
        threadId,
        interruptValue,
        timestamp: new Date(),
      })

      send({
        type: 'interrupt',
        threadId,
        interruptType: interruptValue?.type ?? 'unknown',
        message: interruptValue?.message ?? '操作需要确认',
        data: interruptValue?.data,
      })
      doneSent = true
      return
    }

    const errorMsg = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[AI Chat Resume] Error (thread=${threadId}):`, err)
    send({ type: 'error', content: errorMsg })
  } finally {
    if (!doneSent) {
      send({ type: 'done', conversationId: interrupted.conversationId })
    }
    clearInterval(heartbeat)
    stream.end()
  }
})

// ────────────────────────────────────────────
// POST /api/ai/publish
// ────────────────────────────────────────────

router.post('/publish', validate(publishRequestSchema), async (ctx) => {
  const { conversationId, type, payload, target } = ctx.request.body as {
    conversationId: string
    type: 'schema' | 'flow'
    payload: Record<string, unknown>[] | Record<string, unknown>
    target?: { type: 'flow_node'; flowId: string; nodeId: string }
  }

  const convo = await getConversation(conversationId)
  if (!convo) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Conversation not found.' } }
    return
  }

  if (type === 'schema') {
    const widgets = payload as Record<string, unknown>[]
    const editId = uuidv4()
    const now = new Date()
    const version = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join('')

    const schema = await FormSchemaModel.create({
      _id: uuidv4(),
      editId,
      version,
      name: `AI Generated ${now.toISOString()}`,
      type: 'form',
      status: 'draft',
      json: widgets,
    })

    const publishId = uuidv4()
    await PublishedSchemaModel.create({
      _id: uuidv4(),
      sourceId: editId,
      publishId,
      name: schema.name,
      type: schema.type,
      json: schema.json,
      version: schema.version,
      publishedAt: now,
    })

    ctx.status = 201
    ctx.body = {
      success: true,
      data: {
        id: schema._id,
        publishId,
        ...(target ? { boundTo: { flowId: target.flowId, nodeId: target.nodeId } } : {}),
      },
    }
    return
  }

  // type === 'flow'
  if (type === 'flow') {
    const flowGraph = payload as { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] }
    const now = new Date()

    let definitionId = target?.flowId
    if (!definitionId) {
      const def = await FlowDefinitionModel.create({
        _id: uuidv4(),
        name: `AI Generated Flow ${now.toISOString()}`,
        description: '由 AI 生成的流程',
        status: 'draft',
        createdBy: 'ai-agent',
        permissions: { editors: [], launchers: [], viewers: [] },
      })
      definitionId = def._id
    }

    const pad = (n: number, len: number) => String(n).padStart(len, '0')
    const nextVersion = `v${now.getFullYear()}${pad(now.getMonth() + 1, 2)}${pad(now.getDate(), 2)}${pad(now.getHours(), 2)}${pad(now.getMinutes(), 2)}${pad(now.getSeconds(), 2)}`

    const version = await FlowVersionModel.create({
      _id: uuidv4(),
      definitionId,
      version: nextVersion,
      graph: flowGraph,
    })

    await FlowDefinitionModel.findByIdAndUpdate(definitionId, {
      currentVersionId: version._id,
    })

    ctx.status = 201
    ctx.body = {
      success: true,
      data: {
        id: definitionId,
        versionId: version._id,
        version: nextVersion,
      },
    }
    return
  }

  ctx.status = 400
  ctx.body = {
    success: false,
    error: { message: `Unknown publish type: ${type}` },
  }
})

// ────────────────────────────────────────────
// GET /api/ai/conversations
// ────────────────────────────────────────────

router.get('/conversations', async (ctx) => {
  const conversations = await listConversations()
  ctx.body = {
    success: true,
    data: conversations.map((c) => ({
      id: c._id,
      title: c.messages.length > 0
        ? c.messages[0].content.slice(0, 50)
        : 'New conversation',
      source: c.source,
      activeAgent: c.activeAgent,
      version: c.version,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
  }
})

// ────────────────────────────────────────────
// GET /api/ai/conversations/search
// ────────────────────────────────────────────

/**
 * GET /api/ai/conversations/search — Search and filter conversations
 *
 * Query params:
 * - keyword: Search keyword (matches message content, case-insensitive regex)
 * - startDate: Filter by created date >= startDate (ISO 8601)
 * - endDate: Filter by created date <= endDate (ISO 8601)
 * - source: Filter by conversation source (editor | flow | standalone)
 * - page: Page number (default 1)
 * - pageSize: Items per page (default 20, max 50)
 */
router.get("/conversations/search", async (ctx) => {
  const { keyword, startDate, endDate, source, page: pageStr, pageSize: pageSizeStr } = ctx.query as {
    keyword?: string
    startDate?: string
    endDate?: string
    source?: string
    page?: string
    pageSize?: string
  }

  const page = Math.max(parseInt(pageStr ?? "1", 10) || 1, 1)
  const pageSize = Math.min(Math.max(parseInt(pageSizeStr ?? "20", 10) || 20, 1), 50)

  const result = await searchConversations({
    keyword,
    startDate,
    endDate,
    source,
    page,
    pageSize,
  })

  ctx.body = {
    success: true,
    data: {
      conversations: result.conversations.map((c) => ({
        id: c._id,
        title: c.messages.length > 0
          ? c.messages[0].content.slice(0, 50)
          : "New conversation",
        source: c.source,
        activeAgent: c.activeAgent,
        version: c.version,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    },
  }
})

// ────────────────────────────────────────────
// GET /api/ai/mention/search/:type
// ────────────────────────────────────────────

/**
 * GET /api/ai/mention/search/:type — Search resources for @mention autocomplete
 *
 * Params:
 * - type: 'schema' | 'flow' | 'widget'
 * Query:
 * - q: search keyword
 * - limit: max results (default 10)
 */
router.get('/mention/search/:type', async (ctx) => {
  const { type } = ctx.params
  const { q, limit: limitStr } = ctx.query as { q?: string; limit?: string }
  const limit = Math.min(Math.max(parseInt(limitStr ?? '10', 10) || 10, 1), 50)
  const keyword = (q ?? '').trim()

  if (!['schema', 'flow', 'widget'].includes(type)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'type must be schema, flow, or widget' } }
    return
  }

  const regex = keyword ? { $regex: keyword, $options: 'i' } : undefined

  if (type === 'schema') {
    const filter: Record<string, unknown> = {}
    if (regex) filter.name = regex
    const docs = await FormSchemaModel.find(filter)
      .select('_id name type updatedAt')
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean() as Record<string, unknown>[]
    ctx.body = {
      success: true,
      data: docs.map((d) => ({
        id: d._id,
        type: 'schema',
        name: d.name,
        description: d.type,
        updatedAt: d.updatedAt,
      })),
    }
    return
  }

  if (type === 'flow') {
    const filter: Record<string, unknown> = {}
    if (regex) filter.name = regex
    const docs = await FlowDefinitionModel.find(filter)
      .select('_id name description updatedAt')
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean() as Record<string, unknown>[]
    ctx.body = {
      success: true,
      data: docs.map((d) => ({
        id: d._id,
        type: 'flow',
        name: d.name,
        description: d.description,
        updatedAt: d.updatedAt,
      })),
    }
    return
  }

  // type === 'widget' — search schemas and extract widget labels
  const schemas = await FormSchemaModel.find({})
    .select('json name')
    .lean() as Record<string, unknown>[]

  const widgets: Array<{ id: string; type: string; name: string; description?: string }> = []
  const seen = new Set<string>()

  for (const schema of schemas) {
    const json = schema.json as Record<string, unknown>[] | undefined
    if (!Array.isArray(json)) continue
    for (const widget of json) {
      const wId = widget.id as string
      const wLabel = (widget.label as string) ?? (widget.field as string) ?? (widget.type as string) ?? ''
      const wType = (widget.type as string) ?? 'unknown'
      if (seen.has(wId)) continue
      if (keyword && !wLabel.toLowerCase().includes(keyword.toLowerCase()) && !wType.toLowerCase().includes(keyword.toLowerCase())) continue
      seen.add(wId)
      widgets.push({
        id: wId,
        type: 'widget',
        name: wLabel || wType,
        description: `类型: ${wType}`,
      })
      if (widgets.length >= limit) break
    }
    if (widgets.length >= limit) break
  }

  ctx.body = {
    success: true,
    data: widgets,
  }
})

// ────────────────────────────────────────────
// GET /api/ai/conversations/:id
// ────────────────────────────────────────────

router.get('/conversations/:id', async (ctx) => {
  const { id } = ctx.params
  const convo = await getConversation(id)
  if (!convo) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Conversation not found.' } }
    return
  }
  ctx.body = {
    success: true,
    data: {
      id: convo._id,
      title: convo.messages.length > 0
        ? convo.messages[0].content.slice(0, 50)
        : 'New conversation',
      source: convo.source,
      activeAgent: convo.activeAgent,
      version: convo.version,
      messages: convo.messages.map((m) => ({
        role: m.role,
        content: m.content,
        thinking: m.thinking,
        tip: m.tip,
        toolCalls: m.toolCalls,
        schema: m.schema,
        flow: m.flow,
        timestamp: m.timestamp,
      })),
      createdAt: convo.createdAt,
      updatedAt: convo.updatedAt,
    },
  }
})

// ────────────────────────────────────────────
// DELETE /api/ai/conversations/:id
// ────────────────────────────────────────────

router.delete('/conversations/:id', async (ctx) => {
  const { id } = ctx.params
  const deleted = await deleteConversation(id)
  if (!deleted) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Conversation not found.' } }
    return
  }
  ctx.body = { success: true }
})


// ────────────────────────────────────────────
// Version History API
// ────────────────────────────────────────────

/**
 * GET /api/ai/conversations/:id/versions
 *
 * List all versions for a conversation (for version history panel).
 */
router.get('/conversations/:id/versions', async (ctx) => {
  const { id } = ctx.params
  const versions = await getVersions(id)

  ctx.body = {
    success: true,
    data: versions.map((v) => ({
      id: v._id,
      version: v.version,
      type: v.type,
      description: v.description,
      createdAt: v.createdAt,
    })),
  }
})

/**
 * GET /api/ai/versions/:versionId
 *
 * Get a specific version's content.
 */
router.get('/versions/:versionId', async (ctx) => {
  const { versionId } = ctx.params
  const version = await getVersion(versionId)

  if (!version) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Version not found.' } }
    return
  }

  ctx.body = {
    success: true,
    data: {
      id: version._id,
      conversationId: version.conversationId,
      version: version.version,
      type: version.type,
      content: version.content,
      description: version.description,
      createdAt: version.createdAt,
    },
  }
})

/**
 * POST /api/ai/conversations/:id/rollback
 *
 * Rollback to a specific version. Restores the version content
 * as the current schema/flow and sends it back.
 */
router.post('/conversations/:id/rollback', async (ctx) => {
  const { id } = ctx.params
  const { versionId } = ctx.request.body as { versionId: string }

  if (!versionId) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'versionId is required' } }
    return
  }

  const convo = await getConversation(id)
  if (!convo) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Conversation not found.' } }
    return
  }

  const version = await getVersion(versionId)
  if (!version || version.conversationId !== id) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Version not found in this conversation.' } }
    return
  }

  // Create a new version from the rollback target
  const newVersion = await createVersion({
    conversationId: id,
    messageId: 'rollback',
    type: version.type,
    content: version.content,
    description: `回滚到版本 v${version.version}`,
  })

  ctx.body = {
    success: true,
    data: {
      id: newVersion._id,
      version: newVersion.version,
      type: newVersion.type,
      content: newVersion.content,
      description: newVersion.description,
      rollbackFrom: versionId,
    },
  }
})


// ────────────────────────────────────────────
// RAG Semantic Search API
// ────────────────────────────────────────────

/**
 * GET /api/ai/rag/search — Semantic search for schemas via vector embeddings
 *
 * Query params:
 * - query: Natural language search query (required)
 * - limit: Max results (default 5)
 * - type: Filter by schema type (form | search_list)
 */
router.get('/rag/search', async (ctx) => {
  const { query, limit: limitStr, type } = ctx.query as {
    query?: string
    limit?: string
    type?: string
  }

  if (!query || query.trim().length === 0) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'query parameter is required' } }
    return
  }

  const limit = Math.min(Math.max(parseInt(limitStr ?? '5', 10) || 5, 1), 20)
  const schemaType = type === 'form' || type === 'search_list' ? type : undefined

  const results = await semanticSearch(query.trim(), { limit, type: schemaType, minScore: 5 })

  ctx.body = {
    success: true,
    data: {
      total: results.length,
      schemas: results.map((r) => ({
        id: r.schemaId,
        editId: r.editId,
        name: r.name,
        type: r.type,
        score: r.score,
        widgetTypes: r.metadata.widgetTypes,
        fieldNames: r.metadata.fieldNames,
        labels: r.metadata.labels,
        description: r.metadata.description,
      })),
    },
  }
})

// ────────────────────────────────────────────
// Industry Agent API
// ────────────────────────────────────────────

/**
 * GET /api/ai/industries
 * List available industry agent configurations.
 */
router.get('/industries', async (ctx) => {
  const industries = getAvailableIndustries()
  ctx.body = {
    success: true,
    data: industries,
  }
})

/**
 * GET /api/ai/industries/:industry/templates
 * Get templates for a specific industry.
 */
router.get('/industries/:industry/templates', async (ctx) => {
  const { industry } = ctx.params
  const { type } = ctx.query as { type?: string }

  const validIndustries = ['medical', 'finance', 'education']
  if (!validIndustries.includes(industry)) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: `Invalid industry: ${industry}. Must be one of: ${validIndustries.join(', ')}` } }
    return
  }

  const templates = getIndustryTemplates(
    industry as IndustryType,
    type === 'form' || type === 'flow' ? type : undefined,
  )

  ctx.body = {
    success: true,
    data: {
      industry,
      total: templates.length,
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        type: t.type,
      })),
    },
  }
})


// ────────────────────────────────────────────
// User Behavior Learning
// ────────────────────────────────────────────

/**
 * POST /api/ai/behavior — Record user behavior
 *
 * Track user actions for preference learning.
 */
router.post('/behavior', authMiddleware(), validate(behaviorRequestSchema), async (ctx) => {
  const { action, target, data } = ctx.request.body as {
    action: 'use_component' | 'set_property' | 'create_schema' | 'generate_ai'
    target?: string
    data?: Record<string, unknown>
  }

  const userId = ctx.state.user.id

  await recordBehavior({ userId, action, target, data })

  ctx.body = { success: true }
})

/**
 * POST /api/ai/behavior/batch — Record multiple behaviors
 *
 * Efficiently record multiple user actions at once.
 */
router.post('/behavior/batch', authMiddleware(), async (ctx) => {
  const { behaviors } = ctx.request.body as {
    behaviors: Array<{
      action: 'use_component' | 'set_property' | 'create_schema' | 'generate_ai'
      target?: string
      data?: Record<string, unknown>
    }>
  }

  if (!Array.isArray(behaviors) || behaviors.length === 0) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'behaviors array is required' } }
    return
  }

  if (behaviors.length > 50) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Maximum 50 behaviors per batch' } }
    return
  }

  const userId = ctx.state.user.id

  for (const behavior of behaviors) {
    await recordBehavior({
      userId,
      action: behavior.action,
      target: behavior.target,
      data: behavior.data,
    })
  }

  ctx.body = { success: true, data: { recorded: behaviors.length } }
})

/**
 * GET /api/ai/behavior/preferences — Get user preferences
 *
 * Analyze and return user behavior preferences.
 */
router.get('/behavior/preferences', authMiddleware(), async (ctx) => {
  const userId = ctx.state.user.id

  const preferences = await analyzeUserPreferences(userId)

  ctx.body = {
    success: true,
    data: preferences,
  }
})

/**
 * GET /api/ai/behavior/stats — Get user behavior statistics
 *
 * Returns activity statistics for the current user.
 */
router.get('/behavior/stats', authMiddleware(), async (ctx) => {
  const userId = ctx.state.user.id

  const stats = await getBehaviorStats(userId)

  ctx.body = {
    success: true,
    data: stats,
  }
})

// ────────────────────────────────────────────
// Editor/Flow 双向同步 API
// ────────────────────────────────────────────

/**
 * GET /api/ai/sync/schema/:schemaId/flows
 *
 * 查找引用了指定 Schema 的所有流程节点（Schema → Flow 反向查询）
 */
router.get('/sync/schema/:schemaId/flows', async (ctx) => {
  const { schemaId } = ctx.params

  const schema = await FormSchemaModel.findById(schemaId)
    .select('_id name type version')
    .lean() as Record<string, unknown> | null

  if (!schema) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Schema not found' } }
    return
  }

  const versions = await FlowVersionModel.find({
    'graph.nodes.data.formSchemaId': schemaId,
  })
    .select('_id definitionId version graph.nodes')
    .lean() as unknown as Array<Record<string, unknown>>

  const refs: Array<{
    flowId: string
    flowName: string
    versionId: string
    flowVersion: string
    nodeId: string
    nodeLabel: string
    bpmnType: string
    formMode: string
  }> = []

  for (const ver of versions) {
    const graph = ver.graph as Record<string, unknown> | undefined
    const def = await FlowDefinitionModel.findById(ver.definitionId)
      .select('_id name')
      .lean() as Record<string, unknown> | null

    const nodes = (graph?.nodes ?? []) as Array<Record<string, unknown>>
    for (const node of nodes) {
      const data = node.data as Record<string, unknown> | undefined
      if (data?.formSchemaId === schemaId) {
        refs.push({
          flowId: ver.definitionId as string,
          flowName: (def?.name as string) ?? 'Unknown',
          versionId: ver._id as string,
          flowVersion: ver.version as string,
          nodeId: node.id as string,
          nodeLabel: (data.label as string) ?? (node.id as string),
          bpmnType: (data.bpmnType as string) ?? 'unknown',
          formMode: (data.formMode as string) ?? 'edit',
        })
      }
    }
  }

  ctx.body = {
    success: true,
    data: {
      schema: { id: schema._id, name: schema.name, type: schema.type, version: schema.version },
      references: refs,
      total: refs.length,
    },
  }
})

/**
 * GET /api/ai/sync/flow/:flowId/node/:nodeId/schema
 *
 * 获取流程节点绑定的表单 Schema 详情（Flow → Schema 正向查询）
 */
router.get('/sync/flow/:flowId/node/:nodeId/schema', async (ctx) => {
  const { flowId, nodeId } = ctx.params

  const version = await FlowVersionModel.findOne({ definitionId: flowId })
    .sort({ version: -1 })
    .lean() as Record<string, unknown> | null

  if (!version?.graph) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Flow has no version' } }
    return
  }

  const graph = version.graph as Record<string, unknown>
  const nodes = (graph.nodes ?? []) as Array<Record<string, unknown>>
  const node = nodes.find((n) => n.id === nodeId)

  if (!node) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Node not found' } }
    return
  }

  const data = node.data as Record<string, unknown> | undefined
  const formSchemaId = data?.formSchemaId as string | undefined

  if (!formSchemaId) {
    ctx.body = {
      success: true,
      data: { nodeId, hasSchema: false },
    }
    return
  }

  const schema = await FormSchemaModel.findById(formSchemaId)
    .select('_id name type version json')
    .lean() as Record<string, unknown> | null

  ctx.body = {
    success: true,
    data: {
      nodeId,
      hasSchema: true,
      formSchemaId,
      formPublishId: data?.formPublishId,
      formVersion: data?.formVersion,
      formMode: data?.formMode,
      schema: schema
        ? { id: schema._id, name: schema.name, type: schema.type, version: schema.version, json: schema.json }
        : null,
    },
  }
})

/**
 * POST /api/ai/sync/schema/:schemaId/update-flows
 *
 * 当 Schema 更新时，同步更新所有引用该 Schema 的流程节点的 formVersion。
 * 可选地传入 targetFlowId 只更新指定流程。
 */
router.post('/sync/schema/:schemaId/update-flows', async (ctx) => {
  const { schemaId } = ctx.params
  const { targetFlowId } = ctx.request.body as { targetFlowId?: string }

  const schema = await FormSchemaModel.findById(schemaId)
    .select('_id editId name version')
    .lean() as Record<string, unknown> | null

  if (!schema) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Schema not found' } }
    return
  }

  const { PublishedSchemaModel } = await import('../models/PublishedSchema.js')
  const published = await PublishedSchemaModel.findOne({ sourceId: schema.editId })
    .sort({ publishedAt: -1 })
    .select('publishId version')
    .lean() as Record<string, unknown> | null

  const publishId = (published?.publishId as string) ?? ''

  // 查找引用该 Schema 的 FlowVersion
  const filter: Record<string, unknown> = {
    'graph.nodes.data.formSchemaId': schemaId,
  }
  if (targetFlowId) {
    filter.definitionId = targetFlowId
  }

  const versions = await FlowVersionModel.find(filter).lean() as unknown as Array<Record<string, unknown>>
  const updated: Array<{ flowId: string; nodeId: string; newVersion: string }> = []

  for (const ver of versions) {
    const graph = ver.graph as Record<string, unknown> | undefined
    const nodes = (graph?.nodes ?? []) as Array<Record<string, unknown>>
    let changed = false

    const updatedNodes = nodes.map((node) => {
      const data = node.data as Record<string, unknown> | undefined
      if (data?.formSchemaId === schemaId) {
        changed = true
        return {
          ...node,
          data: {
            ...data,
            formPublishId: publishId,
            formVersion: schema.version,
          },
        }
      }
      return node
    })

    if (changed) {
      const { FlowDefinitionModel } = await import('../flow-models/FlowDefinition.js')
      const { v4: uuidv4 } = await import('uuid')

      const now = new Date()
      const pad = (n: number, len: number) => String(n).padStart(len, '0')
      const nextVersion = `v${now.getFullYear()}${pad(now.getMonth() + 1, 2)}${pad(now.getDate(), 2)}${pad(now.getHours(), 2)}${pad(now.getMinutes(), 2)}${pad(now.getSeconds(), 2)}`

      const newVersion = await FlowVersionModel.create({
        _id: uuidv4(),
        definitionId: ver.definitionId,
        version: nextVersion,
        graph: {
          nodes: updatedNodes,
          edges: (graph?.edges as unknown[]) ?? [],
        },
      })

      await FlowDefinitionModel.findByIdAndUpdate(ver.definitionId, {
        currentVersionId: newVersion._id,
      })

      // 收集更新信息
      for (const node of updatedNodes) {
        const data = node.data as Record<string, unknown> | undefined
        if (data?.formSchemaId === schemaId) {
          updated.push({
            flowId: ver.definitionId as string,
            nodeId: node.id as string,
            newVersion: nextVersion,
          })
        }
      }
    }
  }

  ctx.body = {
    success: true,
    data: {
      schemaId,
      schemaVersion: schema.version,
      publishId,
      updatedFlows: updated,
      total: updated.length,
    },
  }
})

/**
 * POST /api/ai/sync/bind
 *
 * 将 Schema 绑定到 Flow 节点的通用 API（前端直接调用）
 */
router.post('/sync/bind', async (ctx) => {
  const { schemaId, flowId, nodeId, formMode } = ctx.request.body as {
    schemaId: string
    flowId: string
    nodeId: string
    formMode?: 'edit' | 'view'
  }

  if (!schemaId || !flowId || !nodeId) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'schemaId, flowId, nodeId are required' } }
    return
  }

  const schema = await FormSchemaModel.findById(schemaId)
    .select('_id editId name version')
    .lean() as Record<string, unknown> | null

  if (!schema) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Schema not found' } }
    return
  }

  const { PublishedSchemaModel } = await import('../models/PublishedSchema.js')
  const published = await PublishedSchemaModel.findOne({ sourceId: schema.editId })
    .sort({ publishedAt: -1 })
    .select('publishId version')
    .lean() as Record<string, unknown> | null

  const publishId = (published?.publishId as string) ?? ''
  const version = (published?.version as string) ?? (schema.version as string) ?? ''

  const flowVersion = await FlowVersionModel.findOne({ definitionId: flowId })
    .sort({ version: -1 })
    .lean() as Record<string, unknown> | null

  if (!flowVersion?.graph) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Flow has no version' } }
    return
  }

  const flowGraph = flowVersion.graph as Record<string, unknown>
  const nodes = (flowGraph.nodes ?? []) as Array<Record<string, unknown>>
  const nodeIndex = nodes.findIndex((n) => n.id === nodeId)

  if (nodeIndex === -1) {
    ctx.status = 404
    ctx.body = { success: false, error: { message: 'Node not found' } }
    return
  }

  const nodeData = nodes[nodeIndex].data as Record<string, unknown>
  if (nodeData.bpmnType !== 'userTask') {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'Only userTask nodes can bind schemas' } }
    return
  }

  const updatedNodes = [...nodes]
  updatedNodes[nodeIndex] = {
    ...updatedNodes[nodeIndex],
    data: {
      ...nodeData,
      formSchemaId: schemaId,
      formPublishId: publishId,
      formVersion: version,
      formMode: formMode ?? (nodeData.formMode as string) ?? 'edit',
    },
  }

  const { v4: uuidv4 } = await import('uuid')
  const now = new Date()
  const pad = (n: number, len: number) => String(n).padStart(len, '0')
  const nextVersion = `v${now.getFullYear()}${pad(now.getMonth() + 1, 2)}${pad(now.getDate(), 2)}${pad(now.getHours(), 2)}${pad(now.getMinutes(), 2)}${pad(now.getSeconds(), 2)}`

  const newVersion = await FlowVersionModel.create({
    _id: uuidv4(),
    definitionId: flowId,
    version: nextVersion,
    graph: {
      nodes: updatedNodes,
      edges: (flowGraph.edges as unknown[]) ?? [],
    },
  })

  await FlowDefinitionModel.findByIdAndUpdate(flowId, {
    currentVersionId: newVersion._id,
  })

  ctx.status = 201
  ctx.body = {
    success: true,
    data: {
      flowId,
      nodeId,
      schemaId,
      publishId,
      formVersion: version,
      flowVersionId: newVersion._id,
      flowVersion: nextVersion,
    },
  }
})

export default router
