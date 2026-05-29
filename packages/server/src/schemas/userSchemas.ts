import { z } from 'zod'

export const createUserSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters').max(50),
  password: z.string().min(4, 'Password must be at least 4 characters').max(100),
  displayName: z.string().min(1, 'Display name is required').max(50),
  role: z.enum(['admin', 'editor', 'viewer']).default('viewer'),
}).strict()

export const updateUserSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  role: z.enum(['admin', 'editor', 'viewer']).optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field (displayName or role) is required.',
})

export const resetPasswordSchema = z.object({
  password: z.string().min(4, 'Password must be at least 4 characters').max(100),
}).strict()
