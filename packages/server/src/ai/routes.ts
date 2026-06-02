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
import { HumanMessage } from '@langchain/core/messages'
import { validate } from '../middleware/validate.js'
import { chatRequestSchema, publishRequestSchema } from './schemas/aiSchemas.js'
import { graph } from './graph/graph.js'
import {
  createConversation,
  getConversation,
  appendMessage,
  listConversations,
  deleteConversation,
} from './services/conversationService.js'
import { FormSchemaModel } from '../models/FormSchema.js'
import { PublishedSchemaModel } from '../models/PublishedSchema.js'
import { FlowDefinitionModel } from '../flow-models/FlowDefinition.js'
import { FlowVersionModel } from '../flow-models/FlowVersion.js'
import type { AIMessage } from './graph/state.js'

const router = new Router({ prefix: '/api/ai' })

// ────────────────────────────────────────────
// Structured output streaming parser
// ────────────────────────────────────────────

interface ThinkingState {
  inThink: boolean
  thinkClosed: boolean
  fullContent: string
}

function createThinkingState(): ThinkingState {
  return { inThink: false, thinkClosed: false, fullContent: '' }
}

/**
 * Process a content delta for structured tag extraction.
 *
 * Handles incremental parsing of <think>, <answer>, <tip> tags
 * from the LLM's streamed output. Returns events to emit.
 */
function processStructuredDelta(
  content: string,
  state: ThinkingState,
): Array<{ type: string; content?: string }> {
  const events: Array<{ type: string; content?: string }> = []
  state.fullContent += content

  // Phase 1: looking for <think> opening tag
  if (!state.inThink && !state.thinkClosed) {
    const thinkStart = state.fullContent.indexOf('<think>')
    if (thinkStart !== -1) {
      const afterTag = state.fullContent.slice(thinkStart + 7)
      if (afterTag.length > 0) {
        state.inThink = true
        events.push({ type: 'thinking', content: afterTag })
      }
    }
    return events
  }

  // Phase 2: inside <think> block
  if (state.inThink && !state.thinkClosed) {
    const thinkEnd = state.fullContent.indexOf('</think>')
    if (thinkEnd !== -1) {
      const thinkContent = state.fullContent.slice(
        state.fullContent.indexOf('<think>') + 7,
        thinkEnd,
      )
      events.push({ type: 'thinking', content: thinkContent })
      state.thinkClosed = true
      state.inThink = false
    } else {
      events.push({ type: 'thinking', content })
    }
  }

  return events
}

/**
 * Extract content between XML-style tags from accumulated text.
 */
function extractTagContent(text: string, tag: string): string {
  const re = new RegExp(`<${tag}>\\s*([\\s\\S]*?)\\s*</${tag}>`)
  const m = text.match(re)
  return m ? m[1].trim() : ''
}

// ────────────────────────────────────────────
// Tool names that produce structured payloads
// ────────────────────────────────────────────

const SCHEMA_TOOLS = new Set(['validate_schema'])
const FLOW_TOOLS = new Set(['validate_flow'])
const GENERATE_SCHEMA_TOOL = 'generate_schema'

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
      source: context.source as 'editor' | 'flow' | 'standalone',
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

  // ── Build LangGraph input state ──
  const threadId = convo._id
  const graphInput = {
    messages: [new HumanMessage(message)],
    context: {
      source: context.source as 'editor' | 'flow' | 'standalone',
      schemaId: context.schemaId,
      flowId: context.flowId,
      nodeId: context.nodeId,
      currentSchema,
      currentFlow,
      turnCount,
      preferences: context.preferences,
      historySummary: context.historySummary,
    },
    sessionId: threadId,
    currentAgent: 'router' as const,
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
  let currentAgent: 'router' | 'editor' | 'flow' = 'router'
  const thinkingState = createThinkingState()
  let accumulatedContent = ''
  const toolCallRegistry: Array<{ id?: string; name: string; arguments: Record<string, unknown>; result?: unknown }> = []
  const pendingPayloads = new Map<string, Record<string, unknown>[] | Record<string, unknown>>()

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
          if (nodeName === 'editor' || nodeName === 'flow') {
            currentAgent = nodeName
            send({ type: 'agent_switch', agent: nodeName })
          }
          break
        }

        // ── Router node finished — extract task chain ──
        case 'on_chain_end': {
          const nodeName = event.name as string

          if (nodeName === 'router') {
            const output = event.data?.output as Record<string, unknown> | undefined
            if (output?.taskChain && Array.isArray(output.taskChain) && output.taskChain.length > 0) {
              const steps = output.taskChain as Array<{ agent: string; description: string; status: string }>
              send({
                type: 'task_chain',
                steps: steps.map((s) => ({
                  agent: s.agent,
                  description: s.description,
                  status: s.status,
                })),
                currentIndex: (output.currentStepIndex as number) ?? 0,
              })
            }
          }

          // Graph finished
          if (nodeName === '__end__') {
            // Extract final tip if present and not yet emitted
            if (!thinkingState.inThink && thinkingState.thinkClosed) {
              const tip = extractTagContent(thinkingState.fullContent, 'tip')
              if (tip) {
                send({ type: 'tip', content: tip })
              }
            }
          }
          break
        }

        // ── LLM token streaming ──
        case 'on_chat_model_stream': {
          const chunk = event.data?.chunk as { content?: unknown } | undefined
          if (!chunk?.content || typeof chunk.content !== 'string') break

          // Router output is internal JSON — don't stream to client
          if (currentAgent === 'router') break

          const delta = chunk.content
          accumulatedContent += delta

          // Parse structured output tags
          const parsedEvents = processStructuredDelta(delta, thinkingState)
          for (const pe of parsedEvents) {
            send(pe)
          }

          // After think tag closes, emit answer text
          if (thinkingState.thinkClosed) {
            const answerContent = extractTagContent(thinkingState.fullContent, 'answer')
            if (answerContent) {
              // Emit the full answer (not incremental — frontend replaces content)
              send({ type: 'text', content: answerContent })
            } else {
              // No <answer> tag — stream raw content after think block
              const afterThink = thinkingState.fullContent.slice(
                thinkingState.fullContent.indexOf('</think>') + 8,
              )
              if (afterThink) {
                send({ type: 'text', content: afterThink })
              }
            }
          }
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

          // Capture schema/flow payloads from validation tool arguments
          if (SCHEMA_TOOLS.has(toolName) && toolArgs.widgets) {
            pendingPayloads.set(event.run_id as string, toolArgs.widgets as Record<string, unknown>[])
          }
          if (FLOW_TOOLS.has(toolName) && toolArgs.flow) {
            pendingPayloads.set(event.run_id as string, toolArgs.flow as Record<string, unknown>)
          }
          break
        }

        // ── Tool call finished ──
        case 'on_tool_end': {
          const toolName = event.name as string
          const toolResult = event.data?.output

          // Update registry
          const entry = toolCallRegistry.find((t) => t.name === toolName && !t.result)
          if (entry) {
            entry.result = toolResult
          }

          send({
            type: 'tool_call',
            phase: 'result',
            tools: [{ id: event.run_id, name: toolName, result: toolResult }],
          })

          // Emit schema event from pending payload
          if (SCHEMA_TOOLS.has(toolName)) {
            const payload = pendingPayloads.get(event.run_id as string)
            if (payload) {
              send({
                type: 'schema',
                payload,
                description: extractTagContent(thinkingState.fullContent, 'answer') || accumulatedContent,
              })
              pendingPayloads.delete(event.run_id as string)
            }
          }

          // Emit flow event from pending payload
          if (FLOW_TOOLS.has(toolName)) {
            const payload = pendingPayloads.get(event.run_id as string)
            if (payload) {
              send({
                type: 'flow',
                payload,
                description: extractTagContent(thinkingState.fullContent, 'answer') || accumulatedContent,
              })
              pendingPayloads.delete(event.run_id as string)
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
            }
          }
          break
        }
      }
    }

    // ── Persist assistant message ──
    const answerContent = extractTagContent(thinkingState.fullContent, 'answer')
    const tipContent = extractTagContent(thinkingState.fullContent, 'tip')
    const finalContent = answerContent || accumulatedContent

    const assistantMessage: AIMessage = {
      role: 'assistant',
      content: finalContent,
      timestamp: new Date(),
    }
    if (tipContent) {
      assistantMessage.tip = tipContent
    }
    if (toolCallRegistry.length > 0) {
      assistantMessage.toolCalls = toolCallRegistry.map((tc) => ({
        name: tc.name,
        arguments: tc.arguments,
        result: tc.result,
      }))
    }

    await appendMessage(convo._id, assistantMessage)

    // Done event
    send({ type: 'done', conversationId: convo._id })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'
    send({ type: 'error', content: errorMsg })
  } finally {
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

export default router
