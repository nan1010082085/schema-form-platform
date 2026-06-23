/**
 * SSOClient -- 共享 SSO 客户端
 *
 * 封装完整的 OAuth2 Authorization Code 流程：
 *   login → 重定向到 SSO 授权页
 *   handleCallback → 用 code 换取 access/refresh token
 *   refresh → token 轮转
 *   checkSession → 检查 SSO 会话
 *   logout → 销毁会话
 *
 * 与后端 /api/auth/sso/* 契约对齐。
 */
import type { SSOConfig, SSOTokens } from './authTypes.js'

// 向后兼容别名
export type { SSOConfig }
/** @deprecated 使用 SSOTokens 代替 */
export type TokenResponse = SSOTokens

/** SSO 会话中的用户信息 */
export interface SSOSessionUser {
  id: string
  username: string
  displayName: string
  roles: string[]
  tenantId?: string
  deptId?: string
  email?: string
  avatar?: string
}

/** 服务端统一响应体 */
interface ServerResponse<T> {
  success: boolean
  data: T
  error?: { message: string; details?: unknown }
}

export class SSOError extends Error {
  public readonly status: number
  public readonly details: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'SSOError'
    this.status = status
    this.details = details
    Object.setPrototypeOf(this, SSOError.prototype)
  }
}

export class SSOClient {
  private readonly clientId: string
  private readonly redirectUri: string
  private readonly ssoBaseUrl: string

  constructor(config: SSOConfig) {
    this.clientId = config.clientId
    this.redirectUri = config.redirectUri
    this.ssoBaseUrl = config.ssoBaseUrl.replace(/\/+$/, '')
  }

  /**
   * 重定向到 SSO 授权页。
   * 用户在 SSO 端完成登录后会被重定向回 redirectUri，携带 code 和 state。
   */
  login(state?: string): void {
    const url = new URL(`${this.ssoBaseUrl}/api/auth/sso/authorize`)
    url.searchParams.set('client_id', this.clientId)
    url.searchParams.set('redirect_uri', this.redirectUri)
    url.searchParams.set('response_type', 'code')
    if (state) {
      url.searchParams.set('state', state)
    }
    window.location.href = url.toString()
  }

  /**
   * 处理授权回调：从 URL query 提取 code，调用 /api/auth/sso/token 换取 token。
   *
   * @returns Token 包含 accessToken、refreshToken 等
   * @throws SSOError 当 URL 中无 code 或 token 交换失败时
   */
  async handleCallback(): Promise<TokenResponse> {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (!code) {
      throw new SSOError('Authorization code not found in callback URL.', 400)
    }

    const json = await this.request<ServerResponse<TokenResponse>>('/api/auth/sso/token', {
      method: 'POST',
      body: {
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        redirect_uri: this.redirectUri,
      },
    })

    if (!json.success) {
      throw new SSOError(json.error?.message ?? 'Token exchange failed', 400, json.error?.details)
    }

    return json.data
  }

  /**
   * 刷新 token（token 轮转）。
   * 使用当前 refreshToken 获取新的 access + refresh token 对。
   */
  async refresh(refreshToken: string): Promise<TokenResponse> {
    const json = await this.request<ServerResponse<TokenResponse>>('/api/auth/sso/refresh', {
      method: 'POST',
      body: {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
      },
    })

    if (!json.success) {
      throw new SSOError(json.error?.message ?? 'Token refresh failed', 401, json.error?.details)
    }

    return json.data
  }

  /**
   * 检查当前 SSO 会话是否有效。
   * 基于浏览器 cookie 中的 SSO session，不依赖 accessToken。
   */
  async checkSession(): Promise<SSOSessionUser> {
    const json = await this.request<ServerResponse<SSOSessionUser>>('/api/auth/sso/session')

    if (!json.success) {
      throw new SSOError(json.error?.message ?? 'No active session', 401, json.error?.details)
    }

    return json.data
  }

  /**
   * 销毁 SSO 会话。
   * @param all 是否销毁所有关联会话（当前实现仅销毁当前 session cookie）
   */
  async logout(all?: boolean): Promise<void> {
    const json = await this.request<ServerResponse<null>>('/api/auth/sso/logout', {
      method: 'POST',
      body: { all_sessions: all ?? false },
    })

    if (!json.success) {
      throw new SSOError(json.error?.message ?? 'Logout failed', 500, json.error?.details)
    }
  }

  // ── Private ──

  private async request<T>(
    path: string,
    options?: { method?: string; body?: unknown },
  ): Promise<T> {
    const method = options?.method ?? 'GET'
    const headers: Record<string, string> = {}
    let body: string | undefined

    if (options?.body !== undefined) {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify(options.body)
    }

    const response = await fetch(`${this.ssoBaseUrl}${path}`, {
      method,
      headers,
      body,
      credentials: 'include', // 携带 cookie（SSO session）
    })

    return response.json() as Promise<T>
  }
}
