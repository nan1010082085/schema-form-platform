import { z } from 'zod'

export const createRoleSchema = z.object({
  name: z.string().min(1, '角色名称不能为空').max(50, '角色名称最多50个字符'),
  description: z.string().max(200, '描述最多200个字符').optional(),
}).strict()

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field (name or description) is required.',
})
