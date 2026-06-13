/**
 * Credential type definitions
 *
 * Aligned with packages/server Credential REST API contract.
 */

export type CredentialType = 'api_key' | 'basic_auth' | 'bearer_token'

/** Credential list item (data field excluded) */
export interface CredentialItem {
  id: string
  name: string
  type: CredentialType
  tenantId: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

/** Credential detail (with decrypted data) */
export interface CredentialDetail extends CredentialItem {
  data: Record<string, string>
}

/** Credential create payload */
export interface CredentialCreatePayload {
  name: string
  type: CredentialType
  data: Record<string, string>
}

/** Credential update payload */
export interface CredentialUpdatePayload {
  name?: string
  type?: CredentialType
  data?: Record<string, string>
}

/** Type display labels */
export const CREDENTIAL_TYPE_LABELS: Record<CredentialType, string> = {
  api_key: 'API Key',
  basic_auth: 'Basic Auth',
  bearer_token: 'Bearer Token',
}

/** Default data fields per credential type */
export const CREDENTIAL_TYPE_FIELDS: Record<CredentialType, string[]> = {
  api_key: ['apiKey'],
  basic_auth: ['username', 'password'],
  bearer_token: ['token'],
}

export const CREDENTIAL_TYPE_FIELD_LABELS: Record<string, string> = {
  apiKey: 'API Key',
  username: 'Username',
  password: 'Password',
  token: 'Token',
}
