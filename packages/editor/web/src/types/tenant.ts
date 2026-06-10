/**
 * 租户相关类型定义
 *
 * 与 packages/server 的 Tenant REST API 契约对齐
 */

/** 租户状态 */
export type TenantStatus = 'active' | 'inactive' | 'suspended'

/** 租户配置 */
export interface TenantConfig {
  maxUsers: number
  features: string[]
}

/** 租户列表项 */
export interface TenantItem {
  id: string
  name: string
  code: string
  status: TenantStatus
  config: TenantConfig
  createdAt: string
  updatedAt: string
}

/** 租户创建请求体 */
export interface TenantCreatePayload {
  name: string
  code: string
  status?: TenantStatus
  config?: {
    maxUsers?: number
    features?: string[]
  }
}

/** 租户更新请求体 */
export interface TenantUpdatePayload {
  name?: string
  code?: string
  status?: TenantStatus
  config?: {
    maxUsers?: number
    features?: string[]
  }
}
