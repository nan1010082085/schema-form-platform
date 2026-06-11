/**
 * useTokenRefresh -- 自动 token 刷新逻辑
 *
 * 在 token 过期前 60 秒自动调用 SSOClient.refresh() 轮转 token，
 * 更新 authStore 中的 accessToken / refreshToken。
 *
 * 用法：
 *   const { scheduleRefresh, cancelRefresh } = useTokenRefresh(ssoClient)
 *   // 登录成功后
 *   scheduleRefresh(expiresIn)  // expiresIn 单位秒
 *   // 登出时
 *   cancelRefresh()
 */
import { onUnmounted } from 'vue'
import type { SSOClient } from '../utils/sso.js'
import { useAuthStore } from '../utils/stores/authStore.js'

/** 提前多少毫秒触发刷新（60 秒） */
const REFRESH_AHEAD_MS = 60_000

export function useTokenRefresh(ssoClient: SSOClient) {
  const authStore = useAuthStore()
  let timerId: ReturnType<typeof setTimeout> | null = null

  /**
   * 调度一次自动刷新。
   * @param expiresIn token 剩余有效时间，单位秒
   */
  function scheduleRefresh(expiresIn: number): void {
    cancelRefresh()

    const delayMs = Math.max(expiresIn * 1000 - REFRESH_AHEAD_MS, 0)

    timerId = setTimeout(async () => {
      const currentRefreshToken = authStore.refreshToken
      if (!currentRefreshToken) return

      try {
        const tokens = await ssoClient.refresh(currentRefreshToken)
        authStore.setTokens(tokens.accessToken, tokens.refreshToken)
        // 用新 token 的 expiresIn 递归调度下一次刷新
        scheduleRefresh(tokens.expiresIn)
      } catch {
        // 刷新失败时清除认证状态，由 apiClient 401 handler 处理跳转
        authStore.reset()
      }
    }, delayMs)
  }

  /** 取消已调度的自动刷新 */
  function cancelRefresh(): void {
    if (timerId !== null) {
      clearTimeout(timerId)
      timerId = null
    }
  }

  // 组件卸载时自动清理定时器
  onUnmounted(cancelRefresh)

  return { scheduleRefresh, cancelRefresh }
}
