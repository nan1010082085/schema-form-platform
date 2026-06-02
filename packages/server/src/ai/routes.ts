/**
 * AI API routes.
 *
 * POST /api/ai/chat            — SSE streaming chat endpoint
 * POST /api/ai/publish         — Publish generated artifact
 * GET  /api/ai/conversations   — List conversations
 * DELETE /api/ai/conversations/:id — Delete a conversation
 */

import Router from '@koa/router'
import { PassThrough } from 'node:stream'
import { v4 as uuidv4 } from 'uuid'
import { validate } from '../middleware/validate.js'
import { chatRequestSchema, publishRequestSchema } from './schemas/aiSchemas.js'
import { streamEditorAgent } from './graph/editorAgent.js'
import { streamFlowAgent } from './graph/flowAgent.js'
import { routerNode } from './graph/router.js'
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
import type { AIConversationState, AIMessage } from './graph/state.js'

const router = new Router({ prefix: '/api/ai' })

// ────────────────────────────────────────────
// POST /api/ai/chat  (SSE)
// ────────────────────────────────────────────

router.post('/chat', validate(chatRequestSchema), async (ctx) => {
  const { conversationId, message, context } = ctx.request.body as {
    conversationId?: string
    message: string
    context: { source: string; schemaId?: string; flowId?: string; nodeId?: string; version?: string }
  }

  // Resolve or create conversation
  let convo
  let existingMessages: AIMessage[] = []
  let turnCount = 1

  if (conversationId) {
    convo = await getConversation(conversationId)
    if (!convo) {
      ctx.status = 404
      ctx.body = { success: false, error: { message: 'Conversation not found.' } }
      return
    }
    existingMessages = convo.messages.map((m) => ({
      role: m.role,
      content: m.content,
      schema: m.schema,
      flow: m.flow,
      timestamp: m.timestamp,
    }))
    turnCount = existingMessages.filter((m) => m.role === 'user').length + 1
  } else {
    convo = await createConversation({
      source: context.source as 'editor' | 'flow' | 'standalone',
      schemaId: context.schemaId,
      flowId: context.flowId,
      nodeId: context.nodeId,
      version: context.version,
    })
  }

  // Load current schema if schemaId is provided
  let currentSchema: Record<string, unknown>[] | undefined
  if (context.schemaId) {
    const schema = await FormSchemaModel.findById(context.schemaId)
    if (schema) {
      if (context.version && schema.version !== context.version) {
        // Requested a historical version — look in versions array
        const snapshot = schema.versions.find((v: { version: string }) => v.version === context.version)
        if (snapshot) {
          currentSchema = Array.isArray(snapshot.json)
            ? snapshot.json as Record<string, unknown>[]
            : undefined
        }
      }
      // Fallback to current version if snapshot not found or no version requested
      if (!currentSchema && Array.isArray(schema.json)) {
        currentSchema = schema.json as Record<string, unknown>[]
      }
    }
  }

  // Load current flow graph if flowId is provided
  let currentFlow: { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] } | undefined
  if (context.flowId) {
    const flowVersion = await FlowVersionModel.findOne({ definitionId: context.flowId })
      .sort({ version: -1 })
      .lean() as Record<string, unknown> | null
    if (flowVersion?.graph && typeof flowVersion.graph === 'object') {
      const graph = flowVersion.graph as Record<string, unknown>
      currentFlow = {
        nodes: Array.isArray(graph.nodes) ? graph.nodes as Record<string, unknown>[] : [],
        edges: Array.isArray(graph.edges) ? graph.edges as Record<string, unknown>[] : [],
      }
    }
  }

  // Build state for the graph
  const userMessage: AIMessage = {
    role: 'user',
    content: message,
    timestamp: new Date(),
  }

  const graphState: AIConversationState = {
    messages: [...existingMessages, userMessage],
    activeAgent: 'router',
    context: {
      source: context.source as 'editor' | 'flow' | 'standalone',
      schemaId: context.schemaId,
      flowId: context.flowId,
      nodeId: context.nodeId,
      currentSchema,
      currentFlow,
      turnCount,
    },
  }

  // Persist the user message
  await appendMessage(convo._id, userMessage)

  // --- SSE response ---
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

  try {
    // Resolve agent — use router for standalone, direct for editor/flow
    let resolvedAgent: 'editor' | 'flow'
    if (context.source === 'standalone') {
      const routerResult = await routerNode(graphState)
      resolvedAgent = routerResult.activeAgent === 'flow' ? 'flow' : 'editor'
      graphState.activeAgent = resolvedAgent
    } else {
      resolvedAgent = context.source as 'editor' | 'flow'
    }

    const streamGen = resolvedAgent === 'flow'
      ? streamFlowAgent(graphState)
      : streamEditorAgent(graphState)

    const accumulatedMessage: AIMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }
    const accumulatedToolCalls: Array<{ name: string; arguments: Record<string, unknown>; result?: unknown }> = []

    for await (const event of streamGen) {
      switch (event.type) {
        case 'thinking':
          send({ type: 'thinking', content: event.content })
          break

        case 'text':
          accumulatedMessage.content = event.content ?? ''
          send({ type: 'text', content: event.content })
          break

        case 'tip':
          accumulatedMessage.tip = event.content
          send({ type: 'tip', content: event.content })
          break

        case 'schema':
          accumulatedMessage.schema = event.payload as unknown as AIMessage['schema']
          send({ type: 'schema', payload: event.payload, description: accumulatedMessage.content })
          break

        case 'flow':
          accumulatedMessage.flow = event.payload as AIMessage['flow']
          send({ type: 'flow', payload: event.payload, description: accumulatedMessage.content })
          break

        case 'tool_call':
          if (event.toolCalls) {
            for (const tc of event.toolCalls) {
              accumulatedToolCalls.push({ name: tc.name, arguments: tc.arguments })
            }
            send({
              type: 'tool_call',
              phase: 'calling',
              tools: event.toolCalls.map((tc) => ({ id: tc.id, name: tc.name, arguments: tc.arguments })),
            })
          }
          if (event.toolResults) {
            for (const tr of event.toolResults) {
              const existing = accumulatedToolCalls.find((t) => t.name === tr.name && !t.result)
              if (existing) {
                existing.result = tr.result
              }
            }
            send({
              type: 'tool_call',
              phase: 'result',
              tools: event.toolResults.map((tr) => ({ id: tr.id, name: tr.name, result: tr.result })),
            })
          }
          break

        case 'error':
          send({ type: 'error', content: event.content })
          break
      }
    }

    // Persist the assistant message
    if (accumulatedToolCalls.length > 0) {
      accumulatedMessage.toolCalls = accumulatedToolCalls
    }
    await appendMessage(convo._id, accumulatedMessage)

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

    // Create or update flow definition
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

    // Generate timestamp version
    const pad = (n: number, len: number) => String(n).padStart(len, '0')
    const nextVersion = `v${now.getFullYear()}${pad(now.getMonth() + 1, 2)}${pad(now.getDate(), 2)}${pad(now.getHours(), 2)}${pad(now.getMinutes(), 2)}${pad(now.getSeconds(), 2)}`

    // Create flow version
    const version = await FlowVersionModel.create({
      _id: uuidv4(),
      definitionId,
      version: nextVersion,
      graph: flowGraph,
    })

    // Update definition's current version
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
