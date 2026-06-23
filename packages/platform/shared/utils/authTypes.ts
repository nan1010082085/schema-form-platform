/**
 * 共享认证类型定义
 * 与后端 /api/auth 契约对齐
 * 各子项目统一使用这些类型
 */

/** 用户信息（后端 toJSON 后不含 password） */
export interface AuthUser {
  id: string
  username: string
  displayName: string
  roles: string[]
  tenantId?: string
  deptId?: string
  createdAt: string
  updatedAt: string
}

/** 登录请求体 */
export interface LoginPayload {
  username: string
  password: string
  tenantCode?: string
}

/** 登录响应 */
export interface LoginResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  user: AuthUser
}

/** 认证 Store 加载状态 */
export interface AuthLoadingState {
  login: boolean
  fetchUser: boolean
}

// ── SSO 相关类型 ──

/** SSO 客户端配置 */
export interface SSOConfig {
  /** 已注册的 client_id */
  clientId: string
  /** 授权完成后的回调地址，必须在服务端 redirectUris 中注册 */
  redirectUri: string
  /** SSO 服务根地址，如 https://example.com */
  ssoBaseUrl: string
}

/** SSO token 交换 / 刷新的响应体 */
export interface SSOTokens {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
}
