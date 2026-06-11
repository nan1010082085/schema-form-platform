import { z } from 'zod'

export const createWorkflowSchema = z.object({
  name: z.string().min(1, 'name is required').max(200),
  description: z.string().max(2000).optional().default(''),
  formSchemaId: z.string().uuid('Invalid formSchemaId UUID format'),
  flowDefinitionId: z.string().uuid('Invalid flowDefinitionId UUID format'),
  dataUpdateRules: z.array(z.object({
    trigger: z.string().min(1),
    targetField: z.string().min(1),
    sourceField: z.string().min(1),
    transform: z.string().optional(),
  })).optional().default([]),
  publishConfig: z.object({
    entryUrl: z.string().optional().default(''),
    permissions: z.object({
      launchers: z.array(z.string()).optional().default([]),
      viewers: z.array(z.string()).optional().default([]),
    }).optional().default({}),
  }).optional().default({}),
}).strict()

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  formSchemaId: z.string().uuid('Invalid formSchemaId UUID format').optional(),
  flowDefinitionId: z.string().uuid('Invalid flowDefinitionId UUID format').optional(),
  dataUpdateRules: z.array(z.object({
    trigger: z.string().min(1),
    targetField: z.string().min(1),
    sourceField: z.string().min(1),
    transform: z.string().optional(),
  })).optional(),
  publishConfig: z.object({
    entryUrl: z.string().optional().default(''),
    permissions: z.object({
      launchers: z.array(z.string()).optional().default([]),
      viewers: z.array(z.string()).optional().default([]),
    }).optional(),
  }).optional(),
}).strict()

export const startWorkflowSchema = z.object({
  data: z.record(z.unknown()).refine((d) => Object.keys(d).length > 0, {
    message: 'Field "data" must be a non-empty object.',
  }),
  variables: z.record(z.unknown()).optional(),
}).strict()
