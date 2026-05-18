/**
 * 后端 API 类型定义
 *
 * 与 packages/server 的 REST API 契约对齐
 * 参考：packages/server/docs/api.md
 */

import type { FormSchemaItem } from '@/components/FormGrid/types'

// ---- 通用响应格式 ----

/** API 统一响应信封 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiErrorDetail
}

/** API 错误详情 */
export interface ApiErrorDetail {
  message: string
}

// ---- Schema 资源类型 ----

export type SchemaTypeValue = 'form' | 'search-list'
export type SchemaStatusValue = 'draft' | 'published'

/** Schema 列表项 */
export interface SchemaListItem {
  id: string
  name: string
  type: SchemaTypeValue
  status: SchemaStatusValue
  publishId?: string | null
  publishedAt?: string | null
  json?: FormSchemaItem[]
  createdAt: string
  updatedAt: string
}

/** Schema 详情（含完整 JSON schema 定义） */
export interface SchemaDetail extends SchemaListItem {
  json: FormSchemaItem[]
}

/** Schema 创建请求体 */
export interface SchemaCreatePayload {
  name: string
  type: SchemaTypeValue
  json: FormSchemaItem[]
}

/** Schema 更新请求体（至少一个字段） */
export interface SchemaUpdatePayload {
  name?: string
  json?: FormSchemaItem[]
  status?: SchemaStatusValue
  type?: SchemaTypeValue
}

// ---- 分页格式 ----

/** 分页查询参数 */
export interface PaginationParams {
  page?: number
  pageSize?: number
  search?: string
  type?: SchemaTypeValue
  status?: SchemaStatusValue
  publishId?: string
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
