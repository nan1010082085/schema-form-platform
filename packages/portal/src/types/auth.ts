/**
 * 认证相关类型定义
 * 与后端 /api/auth 契约对齐
 */

/** 用户信息（后端 toJSON 后不含 password） */
export interface AuthUser {
  id: string
  username: string
  displayName: string
  roles: string[]
  createdAt: string
  updatedAt: string
}

/** 登录请求体 */
export interface LoginPayload {
  username: string
  password: string
}

/** 登录响应 */
export interface LoginResponse {
  token: string
  user: AuthUser
}

/** 认证 Store 加载状态 */
export interface AuthLoadingState {
  login: boolean
  fetchUser: boolean
}
