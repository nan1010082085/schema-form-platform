/**
 * 后端 API 类型定义
 *
 * 与 packages/server 的 REST API 契约对齐
 * 参考：packages/server/docs/api.md
 */

import type { PartialWidget } from '@/widgets/base/types'

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
  code?: string
  details?: Array<{ path: string; message: string }>
}

// ---- Schema 资源类型 ----

export type SchemaTypeValue = 'form' | 'search-list'
export type SchemaStatusValue = 'draft'

/** Schema 列表项（编辑表 — 仅草稿） */
export interface SchemaListItem {
  id: string
  editId: string
  version: string
  name: string
  type: SchemaTypeValue
  status: SchemaStatusValue
  json?: PartialWidget[] | { widgets: PartialWidget[]; board?: Record<string, unknown> }
  thumbnail?: string
  publishId?: string
  createdAt: string
  updatedAt: string
}

/** Schema 详情（含完整 JSON schema 定义） */
export interface SchemaDetail extends SchemaListItem {
  json: PartialWidget[] | { widgets: PartialWidget[]; board?: Record<string, unknown> }
}

/** 发布 Schema（发布表 — 每个源 Schema 最多一条） */
export interface PublishedSchemaItem {
  id: string
  sourceId: string
  name: string
  type: SchemaTypeValue
  json: PartialWidget[]
  thumbnail?: string
  publishId: string
  version: string
  publishedAt: string
  createdAt: string
  updatedAt: string
}

/** Schema 创建请求体 */
export interface SchemaCreatePayload {
  name: string
  type: SchemaTypeValue
  json: PartialWidget[] | { widgets: PartialWidget[]; board?: Record<string, unknown> }
  editId?: string
  thumbnail?: string
}

/** Schema 更新请求体（至少一个字段） */
export interface SchemaUpdatePayload {
  name?: string
  json?: PartialWidget[] | { widgets: PartialWidget[]; board?: Record<string, unknown> }
  type?: SchemaTypeValue
  thumbnail?: string
}

// ---- 分页格式 ----

/** 分页查询参数 */
export interface PaginationParams {
  page?: number
  pageSize?: number
  search?: string
  type?: SchemaTypeValue
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ---- 版本管理 ----

/** 版本列表项 */
export interface VersionEntry {
  id: string
  version: string
  createdAt: string
  published: boolean
}

/** 版本列表响应 */
export interface VersionListResponse {
  items: VersionEntry[]
  total: number
}

// ---- 导入 ----

/** Schema 导入请求体 */
export interface SchemaImportPayload {
  name: string
  type: SchemaTypeValue
  json: PartialWidget[]
  thumbnail?: string
}

// ---- 缓存与预取 ----

/** 缓存条目 */
export interface CacheEntry {
  data: unknown
  timestamp: number
  ttl: number
}

/** 预取任务 */
export interface PrefetchTask {
  key: string
  url: string
  method: string
  params?: Record<string, unknown>
  labelKey: string
  valueKey: string
}
