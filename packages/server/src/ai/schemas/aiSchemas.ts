import { z } from 'zod'

// ────────────────────────────────────────────
// POST /api/ai/chat request schema
// ────────────────────────────────────────────
export const chatRequestSchema = z.object({
  conversationId: z.string().uuid('Invalid conversationId format').optional(),
  message: z
    .string()
    .min(1, 'Message is required')
    .max(10000, 'Message must be 10000 characters or fewer'),
  context: z.object({
    source: z.enum(['editor', 'flow', 'standalone']),
    schemaId: z.string().optional(),
    flowId: z.string().optional(),
    nodeId: z.string().optional(),
    version: z.string().optional(),
  }),
}).strict()

export type ChatRequest = z.infer<typeof chatRequestSchema>

// ────────────────────────────────────────────
// POST /api/ai/publish request schema
// ────────────────────────────────────────────
export const publishRequestSchema = z.object({
  conversationId: z.string().uuid('Invalid conversationId format'),
  type: z.enum(['schema', 'flow']),
  payload: z.union([
    z.array(z.record(z.string(), z.unknown())),   // Widget[]
    z.record(z.string(), z.unknown()),            // FlowGraph
  ]),
  target: z.object({
    type: z.enum(['flow_node']),
    flowId: z.string().min(1),
    nodeId: z.string().min(1),
  }).optional(),
}).strict()

export type PublishRequest = z.infer<typeof publishRequestSchema>
