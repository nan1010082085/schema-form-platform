/**
 * User API — 用户管理相关接口
 *
 * 聚合用户 CRUD、重置密码等接口。
 * 底层委托 utils/apiClient。
 */
import { apiClient } from '@/utils/apiClient'

/** 用户列表项 */
export interface UserItem {
  _id: string
  username: string
  displayName: string
  roles: string[]
  tenantId: string
  deptId?: string
  email?: string
  phone?: string
  avatar?: string
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

/** 分页响应 */
export interface UserListResponse {
  items: UserItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/** 创建用户参数 */
export interface CreateUserPayload {
  username: string
  password: string
  displayName: string
  phone?: string
  email?: string
  deptId?: string
  status?: 'active' | 'inactive'
  roles?: string[]
}

/** 更新用户参数 */
export interface UpdateUserPayload {
  displayName?: string
  phone?: string
  email?: string
  deptId?: string
  status?: 'active' | 'inactive'
  roles?: string[]
}

/** 获取用户列表 */
export function fetchUsers(params: {
  q?: string
  page?: number
  pageSize?: string
  status?: string
  deptId?: string
} = {}): Promise<{ success: boolean; data: UserListResponse }> {
  return apiClient.get('/api/users', params as Record<string, unknown>)
}

/** 获取单个用户 */
export function fetchUserById(id: string): Promise<{ success: boolean; data: UserItem }> {
  return apiClient.get(`/api/users/${encodeURIComponent(id)}`)
}

/** 创建用户 */
export function createUser(payload: CreateUserPayload): Promise<{ success: boolean; data: UserItem }> {
  return apiClient.post('/api/users', payload)
}

/** 更新用户 */
export function updateUser(id: string, payload: UpdateUserPayload): Promise<{ success: boolean; data: UserItem }> {
  return apiClient.put(`/api/users/${encodeURIComponent(id)}`, payload)
}

/** 删除用户 */
export function deleteUser(id: string): Promise<{ success: boolean; data: null }> {
  return apiClient.delete(`/api/users/${encodeURIComponent(id)}`)
}

/** 重置用户密码 */
export function resetUserPassword(id: string, password: string): Promise<{ success: boolean; data: null }> {
  return apiClient.put(`/api/users/${encodeURIComponent(id)}/password`, { password })
}
