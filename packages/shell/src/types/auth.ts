/**
 * Auth types -- aligned with /api/auth contract
 */

/** User info (backend toJSON excludes password) */
export interface AuthUser {
  id: string
  username: string
  displayName: string
  roles: string[]
  tenantId: string
  deptId?: string
  createdAt: string
  updatedAt: string
}

/** Login request body */
export interface LoginPayload {
  username: string
  password: string
  tenantCode?: string
}

/** Login response */
export interface LoginResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  user: AuthUser
}

/** Auth store loading state */
export interface AuthLoadingState {
  login: boolean
  fetchUser: boolean
}
