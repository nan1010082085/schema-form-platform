/**
 * Auth API -- centralized authentication API layer
 *
 * All auth backend calls go through this file.
 */
import { apiClient } from '@schema-form/platform-shared/utils/apiClient'
import type { LoginPayload, LoginResponse, AuthUser } from '@schema-form/business-shared/utils/authTypes'

export function login(payload: LoginPayload) {
  return apiClient.post<LoginResponse>('/auth/login', payload)
}

export function fetchCurrentUser() {
  return apiClient.get<AuthUser>('/auth/me')
}

export function refreshToken(refreshToken: string) {
  return apiClient.post<{ accessToken: string; expiresIn: number }>('/auth/refresh', { refreshToken })
}

export function ssoToken(code: string, clientId: string, redirectUri: string) {
  return apiClient.post<{ accessToken: string; refreshToken: string; expiresIn: number }>('/auth/sso/token', {
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
  })
}

export function logout() {
  return apiClient.post('/auth/logout')
}

export function register(data: { username: string; password: string; nickname?: string; phone?: string }) {
  return apiClient.post('/auth/register', data)
}

export function changePassword(data: { oldPassword: string; newPassword: string }) {
  return apiClient.post('/auth/change-password', data)
}
