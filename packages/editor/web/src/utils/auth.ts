/**
 * 认证工具函数
 *
 * 职责：
 * - 从 cookie 字符串中提取 Sinosoft-Auth token
 * - 构建认证请求头
 *
 * 分离自 stores/app.ts，避免 store 中混杂 cookie 解析逻辑
 */

/** Sinosoft-Auth cookie 键名 */
export const SINOSOFT_AUTH_KEY = 'Sinosoft-Auth'

/** 认证请求头键名（请求拦截器中统一注入） */
export const AUTH_HEADER = 'Sinosoft-Auth'

/**
 * 从 cookie 字符串中提取指定 key 的值
 *
 * @param cookie - 完整的 cookie 字符串（document.cookie 或 qiankun props.cookie）
 * @param key - 要提取的 cookie 键名，默认为 Sinosoft-Auth
 * @returns 提取到的值，未找到时返回 null
 *
 * @example
 * ```ts
 * const token = extractCookieValue('Sinosoft-Auth=abc123; other=val', 'Sinosoft-Auth')
 * // => 'abc123'
 * ```
 */
export function extractCookieValue(cookie: string, key: string = SINOSOFT_AUTH_KEY): string | null {
  if (!cookie || typeof cookie !== 'string') {
    return null
  }

  // 构建正则：匹配 key=value，value 为非分号字符
  const pattern = new RegExp(`${escapeRegExp(key)}=([^;]+)`)
  const match = cookie.match(pattern)

  return match ? decodeURIComponent(match[1].trim()) : null
}

/**
 * 从 cookie 字符串中提取 Sinosoft-Auth token（便捷方法）
 *
 * @param cookie - 完整的 cookie 字符串
 * @returns 提取到的 token，未找到时返回 null
 */
export function extractAuthToken(cookie: string): string | null {
  return extractCookieValue(cookie, SINOSOFT_AUTH_KEY)
}

/**
 * 根据 token 构建认证请求头对象
 *
 * @param token - 认证 token
 * @returns 包含 Authorization 和 Sinosoft-Auth 的请求头对象
 */
export function createAuthHeaders(token: string): Record<string, string> {
  if (!token) {
    return {}
  }

  return {
    Authorization: `Bearer ${token}`,
    [SINOSOFT_AUTH_KEY]: token,
  }
}

// ---- 内部辅助 ----

/**
 * 转义正则表达式特殊字符，防止注入
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
