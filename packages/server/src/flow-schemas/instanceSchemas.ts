import { z } from 'zod'

export const startInstanceSchema = z.object({
  definitionId: z.string().min(1, 'Definition ID is required'),
  variables: z.record(z.string(), z.unknown()).optional(),
})

export const completeTaskSchema = z.object({
  formData: z.record(z.string(), z.unknown()).optional(),
  outcome: z.string().optional(),
})

export const delegateTaskSchema = z.object({
  targetUserId: z.string().min(1, 'Target user ID is required'),
})
