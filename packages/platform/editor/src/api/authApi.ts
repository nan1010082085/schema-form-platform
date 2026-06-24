/**
 * Auth API — 认证相关接口
 *
 * 聚合登录、登出、获取当前用户等接口。
 * 底层委托 utils/apiClient。
 */
export {
  login,
  logout,
  fetchCurrentUser,
} from '@/utils/apiClient'

export type {
  LoginPayload,
  LoginResponse,
  CurrentUser,
} from '@/utils/apiClient'
