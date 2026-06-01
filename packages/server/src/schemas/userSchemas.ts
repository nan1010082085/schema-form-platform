import { z } from 'zod'

export const createUserSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters').max(50),
  password: z.string().min(4, 'Password must be at least 4 characters').max(100),
  displayName: z.string().min(1, 'Display name is required').max(50),
  roles: z.array(z.string()).default([]),  // 角色ID数组
}).strict()

export const updateUserSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  roles: z.array(z.string()).optional(),  // 角色ID数组
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field (displayName or roles) is required.',
})

export const resetPasswordSchema = z.object({
  password: z.string().min(4, 'Password must be at least 4 characters').max(100),
}).strict()
