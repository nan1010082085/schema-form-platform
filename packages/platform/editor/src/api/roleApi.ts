/**
 * Role API — 角色管理相关接口
 *
 * 聚合角色 CRUD、权限分配等接口。
 * 底层委托 utils/apiClient。
 */
import { apiClient } from '@/utils/apiClient'

/** 角色列表项 */
export interface RoleItem {
  _id: string
  name: string
  description?: string
  permissions: string[]
  data_scope: 'all' | 'dept' | 'self' | 'custom'
  dept_ids: string[]
  createdAt: string
  updatedAt: string
}

/** 权限项 */
export interface PermissionItem {
  _id: string
  code: string
  name: string
  module: string
  description?: string
}

/** 分页响应 */
export interface RoleListResponse {
  items: RoleItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/** 创建角色参数 */
export interface CreateRolePayload {
  name: string
  description?: string
  permissions?: string[]
  data_scope?: 'all' | 'dept' | 'self' | 'custom'
  dept_ids?: string[]
}

/** 更新角色参数 */
export interface UpdateRolePayload {
  name?: string
  description?: string
  permissions?: string[]
  data_scope?: 'all' | 'dept' | 'self' | 'custom'
  dept_ids?: string[]
}

/** 获取角色列表 */
export function fetchRoles(params: {
  q?: string
  page?: number
  pageSize?: string
} = {}): Promise<{ success: boolean; data: RoleListResponse }> {
  return apiClient.get('/api/roles', params as Record<string, unknown>)
}

/** 获取单个角色 */
export function fetchRoleById(id: string): Promise<{ success: boolean; data: RoleItem }> {
  return apiClient.get(`/api/roles/${encodeURIComponent(id)}`)
}

/** 创建角色 */
export function createRole(payload: CreateRolePayload): Promise<{ success: boolean; data: RoleItem }> {
  return apiClient.post('/api/roles', payload)
}

/** 更新角色 */
export function updateRole(id: string, payload: UpdateRolePayload): Promise<{ success: boolean; data: RoleItem }> {
  return apiClient.put(`/api/roles/${encodeURIComponent(id)}`, payload)
}

/** 删除角色 */
export function deleteRole(id: string): Promise<{ success: boolean; data: null }> {
  return apiClient.delete(`/api/roles/${encodeURIComponent(id)}`)
}

/** 获取可用权限列表 */
export function fetchPermissions(): Promise<{ success: boolean; data: PermissionItem[] }> {
  return apiClient.get('/api/roles/permissions')
}
