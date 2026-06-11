import { z } from 'zod'

export const applyWorkflowTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
})
