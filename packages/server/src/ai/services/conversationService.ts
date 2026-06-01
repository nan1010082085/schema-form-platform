/**
 * AI Conversation persistence service.
 *
 * Manages the `AIConversation` MongoDB collection for long-term memory.
 * Supports CRUD, message append, and active agent tracking.
 */

import mongoose from 'mongoose'
import { v4 as uuidv4 } from 'uuid'
import type { AIMessage, ActiveAgent, AgentSource } from '../graph/state.js'

// ────────────────────────────────────────────
// Mongoose model
// ────────────────────────────────────────────

interface AIConversationMessage {
  role: AIMessage['role']
  content: string
  thinking?: string
  tip?: string
  toolCalls?: Array<{ name: string; arguments: Record<string, unknown>; result?: unknown }>
  schema?: Record<string, unknown>[]
  flow?: Record<string, unknown>
  timestamp: Date
}

export interface IAIConversation {
  _id: string
  source: AgentSource
  schemaId?: string
  flowId?: string
  nodeId?: string
  messages: AIConversationMessage[]
  activeAgent: ActiveAgent
  createdAt: Date
  updatedAt: Date
}

const messageSchema = new mongoose.Schema<AIConversationMessage>(
  {
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    thinking: { type: String },
    tip: { type: String },
    toolCalls: [{
      name: { type: String, required: true },
      arguments: { type: mongoose.Schema.Types.Mixed, default: {} },
      result: { type: mongoose.Schema.Types.Mixed },
    }],
    schema: { type: mongoose.Schema.Types.Mixed },
    flow: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
)

const aiConversationSchema = new mongoose.Schema<IAIConversation>(
  {
    _id: { type: String, required: true },
    source: { type: String, enum: ['editor', 'flow', 'standalone'], required: true },
    schemaId: { type: String },
    flowId: { type: String },
    nodeId: { type: String },
    messages: { type: [messageSchema], default: [] },
    activeAgent: { type: String, enum: ['router', 'editor', 'flow'], default: 'router' },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc: unknown, ret: Record<string, unknown>) {
        ret.id = ret._id
        delete ret._id
        delete ret.__v
      },
    },
  },
)

aiConversationSchema.index({ updatedAt: -1 })

export const AIConversationModel =
  mongoose.models.AIConversation ??
  mongoose.model<IAIConversation>('AIConversation', aiConversationSchema)

// ────────────────────────────────────────────
// Service functions
// ────────────────────────────────────────────

/**
 * Create a new conversation.
 */
export async function createConversation(params: {
  source: AgentSource
  schemaId?: string
  flowId?: string
  nodeId?: string
}): Promise<IAIConversation> {
  return AIConversationModel.create({
    _id: uuidv4(),
    source: params.source,
    schemaId: params.schemaId,
    flowId: params.flowId,
    nodeId: params.nodeId,
    messages: [],
    activeAgent: 'router',
  })
}

/**
 * Get a conversation by ID.
 */
export async function getConversation(id: string): Promise<IAIConversation | null> {
  return AIConversationModel.findById(id)
}

/**
 * Append a message to an existing conversation.
 */
export async function appendMessage(
  conversationId: string,
  message: AIMessage,
): Promise<IAIConversation | null> {
  return AIConversationModel.findByIdAndUpdate(
    conversationId,
    {
      $push: {
        messages: {
          role: message.role,
          content: message.content,
          thinking: message.thinking,
          tip: message.tip,
          toolCalls: message.toolCalls,
          schema: message.schema,
          flow: message.flow,
          timestamp: message.timestamp,
        },
      },
    },
    { new: true },
  )
}

/**
 * Update the active agent for a conversation.
 */
export async function updateActiveAgent(
  conversationId: string,
  agent: ActiveAgent,
): Promise<void> {
  await AIConversationModel.findByIdAndUpdate(conversationId, {
    $set: { activeAgent: agent },
  })
}

/**
 * List all conversations (most recently updated first).
 */
export async function listConversations(): Promise<IAIConversation[]> {
  return AIConversationModel.find().sort({ updatedAt: -1 }).limit(50)
}

/**
 * Delete a conversation by ID.
 */
export async function deleteConversation(id: string): Promise<boolean> {
  const result = await AIConversationModel.findByIdAndDelete(id)
  return result !== null
}

/**
 * Get messages for a conversation (for restoring context).
 */
export async function getMessages(conversationId: string): Promise<AIMessage[]> {
  const convo = await AIConversationModel.findById(conversationId).select('messages')
  if (!convo) return []
  return convo.messages.map((m: AIConversationMessage) => ({
    role: m.role,
    content: m.content,
    thinking: m.thinking,
    tip: m.tip,
    toolCalls: m.toolCalls,
    schema: m.schema,
    flow: m.flow,
    timestamp: m.timestamp,
  }))
}
